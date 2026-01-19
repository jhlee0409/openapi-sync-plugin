//! OpenAPI parser service

use crate::types::*;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;

/// HTTP cache headers extracted from response
#[derive(Debug, Default)]
pub struct HttpHeaders {
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

/// OpenAPI parser service
pub struct OpenApiParser;

impl OpenApiParser {
    /// Parse OpenAPI spec from a source (URL or file path)
    pub async fn parse(source: &str) -> OasResult<ParsedSpec> {
        let (spec, _headers) = Self::parse_with_headers(source).await?;
        Ok(spec)
    }

    /// Parse OpenAPI spec and return HTTP headers (for caching)
    pub async fn parse_with_headers(source: &str) -> OasResult<(ParsedSpec, HttpHeaders)> {
        let (content, headers) = Self::fetch_content(source).await?;
        let spec = Self::parse_content(&content, source)?;
        Ok((spec, headers))
    }

    /// Fetch content from URL or file
    async fn fetch_content(source: &str) -> OasResult<(String, HttpHeaders)> {
        if source.starts_with("http://") || source.starts_with("https://") {
            Self::fetch_remote(source).await
        } else {
            let content = Self::read_local(source)?;
            Ok((content, HttpHeaders::default()))
        }
    }

    /// Fetch from remote URL
    async fn fetch_remote(url: &str) -> OasResult<(String, HttpHeaders)> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| OasError::ConnectionFailed(e.to_string()))?;

        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| OasError::ConnectionFailed(e.to_string()))?;

        if !response.status().is_success() {
            return Err(OasError::HttpError {
                status: response.status().as_u16(),
                message: response.status().to_string(),
            });
        }

        // Extract cache headers
        let headers = HttpHeaders {
            etag: response
                .headers()
                .get("etag")
                .and_then(|v| v.to_str().ok())
                .map(String::from),
            last_modified: response
                .headers()
                .get("last-modified")
                .and_then(|v| v.to_str().ok())
                .map(String::from),
        };

        let content = response
            .text()
            .await
            .map_err(|e| OasError::ConnectionFailed(e.to_string()))?;

        Ok((content, headers))
    }

    /// Read from local file
    fn read_local(path: &str) -> OasResult<String> {
        let path = Path::new(path);

        // Security: prevent path traversal
        // 1. Block explicit ".." in path
        if path.to_string_lossy().contains("..") {
            return Err(OasError::PathTraversal(path.display().to_string()));
        }

        // 2. Canonicalize and verify the path is valid
        let canonical = path.canonicalize().map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => OasError::FileNotFound(path.display().to_string()),
            _ => OasError::PathTraversal(format!(
                "Cannot resolve path: {} ({})",
                path.display(),
                e
            )),
        })?;

        // 3. Ensure canonical path doesn't contain suspicious patterns
        let canonical_str = canonical.to_string_lossy();
        if canonical_str.contains("..") {
            return Err(OasError::PathTraversal(canonical.display().to_string()));
        }

        std::fs::read_to_string(&canonical)
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::NotFound => OasError::FileNotFound(path.display().to_string()),
                std::io::ErrorKind::PermissionDenied => {
                    OasError::PermissionDenied(path.display().to_string())
                }
                _ => OasError::ReadError(e.to_string()),
            })
    }

    /// Parse content as JSON or YAML
    fn parse_content(content: &str, source: &str) -> OasResult<ParsedSpec> {
        // Try JSON first, then YAML
        let value: serde_json::Value = if content.trim().starts_with('{') {
            serde_json::from_str(content)
                .map_err(|e| OasError::InvalidJson(e.to_string()))?
        } else {
            serde_yaml::from_str(content)
                .map_err(|e| OasError::InvalidYaml(e.to_string()))?
        };

        // Detect OpenAPI version
        let version = Self::detect_version(&value)?;

        // Parse based on version
        match version {
            OpenApiVersion::Swagger2 => Self::parse_swagger2(value, source),
            OpenApiVersion::OpenApi30 | OpenApiVersion::OpenApi31 => {
                Self::parse_openapi3(value, source, version)
            }
        }
    }

    /// Detect OpenAPI version from spec
    fn detect_version(value: &serde_json::Value) -> OasResult<OpenApiVersion> {
        if let Some(swagger) = value.get("swagger").and_then(|v| v.as_str()) {
            if swagger.starts_with("2.") {
                return Ok(OpenApiVersion::Swagger2);
            }
        }

        if let Some(openapi) = value.get("openapi").and_then(|v| v.as_str()) {
            if openapi.starts_with("3.0") {
                return Ok(OpenApiVersion::OpenApi30);
            }
            if openapi.starts_with("3.1") {
                return Ok(OpenApiVersion::OpenApi31);
            }
            return Err(OasError::UnsupportedVersion(openapi.to_string()));
        }

        Err(OasError::InvalidOpenApi(
            "Missing 'openapi' or 'swagger' field".to_string(),
        ))
    }

    /// Parse Swagger 2.0 spec
    fn parse_swagger2(value: serde_json::Value, source: &str) -> OasResult<ParsedSpec> {
        let info = value.get("info").ok_or_else(|| {
            OasError::InvalidOpenApi("Missing 'info' field".to_string())
        })?;

        let title = info
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown API")
            .to_string();

        let version = info
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("0.0.0")
            .to_string();

        let description = info.get("description").and_then(|v| v.as_str()).map(String::from);

        // Parse definitions (Swagger 2.0 schemas)
        let schemas = Self::parse_swagger2_definitions(&value);

        // Parse paths
        let endpoints = Self::parse_swagger2_paths(&value, &schemas);

        // Collect tags
        let tags: Vec<String> = endpoints
            .values()
            .flat_map(|e| e.tags.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        // Compute spec hash
        let spec_hash = Self::compute_hash(&value);

        Ok(ParsedSpec {
            metadata: SpecMetadata {
                title,
                version,
                description,
                openapi_version: OpenApiVersion::Swagger2,
                endpoint_count: endpoints.len(),
                schema_count: schemas.len(),
                tag_count: tags.len(),
            },
            endpoints,
            schemas,
            tags,
            spec_hash,
            source: source.to_string(),
        })
    }

    /// Parse Swagger 2.0 definitions
    fn parse_swagger2_definitions(value: &serde_json::Value) -> HashMap<String, Schema> {
        let mut schemas = HashMap::new();

        if let Some(definitions) = value.get("definitions").and_then(|v| v.as_object()) {
            for (name, def) in definitions {
                let refs = Self::extract_refs(def);
                let hash = Self::compute_hash(def);

                schemas.insert(
                    name.clone(),
                    Schema {
                        name: name.clone(),
                        schema_type: Self::parse_schema_type(def),
                        description: def.get("description").and_then(|v| v.as_str()).map(String::from),
                        refs,
                        hash,
                    },
                );
            }
        }

        schemas
    }

    /// Parse Swagger 2.0 paths
    fn parse_swagger2_paths(
        value: &serde_json::Value,
        _schemas: &HashMap<String, Schema>,
    ) -> HashMap<String, Endpoint> {
        let mut endpoints = HashMap::new();

        if let Some(paths) = value.get("paths").and_then(|v| v.as_object()) {
            for (path, path_item) in paths {
                if let Some(path_obj) = path_item.as_object() {
                    for (method, operation) in path_obj {
                        if let Some(http_method) = Self::parse_http_method(method) {
                            let endpoint = Self::parse_swagger2_operation(
                                path,
                                http_method,
                                operation,
                            );
                            endpoints.insert(endpoint.key(), endpoint);
                        }
                    }
                }
            }
        }

        endpoints
    }

    /// Parse a single Swagger 2.0 operation
    fn parse_swagger2_operation(
        path: &str,
        method: HttpMethod,
        operation: &serde_json::Value,
    ) -> Endpoint {
        let operation_id = operation
            .get("operationId")
            .and_then(|v| v.as_str())
            .map(String::from);

        let summary = operation
            .get("summary")
            .and_then(|v| v.as_str())
            .map(String::from);

        let description = operation
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from);

        let tags: Vec<String> = operation
            .get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        let deprecated = operation
            .get("deprecated")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Parse parameters
        let parameters = Self::parse_swagger2_parameters(operation);

        // Parse request body (from body parameter in Swagger 2.0)
        let request_body = Self::parse_swagger2_body(operation);

        // Parse responses
        let responses = Self::parse_swagger2_responses(operation);

        // Collect schema refs
        let schema_refs = Self::extract_refs(operation);

        let hash = Self::compute_hash(operation);

        Endpoint {
            path: path.to_string(),
            method,
            operation_id,
            summary,
            description,
            tags,
            parameters,
            request_body,
            responses,
            deprecated,
            hash,
            schema_refs,
        }
    }

    /// Parse Swagger 2.0 parameters
    fn parse_swagger2_parameters(operation: &serde_json::Value) -> Vec<Parameter> {
        let mut params = Vec::new();

        if let Some(parameters) = operation.get("parameters").and_then(|v| v.as_array()) {
            for param in parameters {
                let in_value = param.get("in").and_then(|v| v.as_str()).unwrap_or("");

                // Skip body parameters (handled separately)
                if in_value == "body" {
                    continue;
                }

                let location = match in_value {
                    "path" => ParameterLocation::Path,
                    "query" => ParameterLocation::Query,
                    "header" => ParameterLocation::Header,
                    _ => continue,
                };

                params.push(Parameter {
                    name: param
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    location,
                    required: param
                        .get("required")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(location == ParameterLocation::Path),
                    description: param
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                    schema_ref: None,
                    schema_type: param.get("type").and_then(|v| v.as_str()).map(String::from),
                });
            }
        }

        params
    }

    /// Parse Swagger 2.0 body parameter as request body
    fn parse_swagger2_body(operation: &serde_json::Value) -> Option<RequestBody> {
        if let Some(parameters) = operation.get("parameters").and_then(|v| v.as_array()) {
            for param in parameters {
                if param.get("in").and_then(|v| v.as_str()) == Some("body") {
                    let schema_ref = param
                        .get("schema")
                        .and_then(|s| s.get("$ref"))
                        .and_then(|v| v.as_str())
                        .map(|r| r.replace("#/definitions/", ""));

                    return Some(RequestBody {
                        required: param
                            .get("required")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false),
                        description: param
                            .get("description")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        content_types: operation
                            .get("consumes")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_else(|| vec!["application/json".to_string()]),
                        schema_ref,
                    });
                }
            }
        }
        None
    }

    /// Parse Swagger 2.0 responses
    fn parse_swagger2_responses(operation: &serde_json::Value) -> HashMap<String, Response> {
        let mut responses = HashMap::new();

        if let Some(resp_obj) = operation.get("responses").and_then(|v| v.as_object()) {
            for (status, resp) in resp_obj {
                let schema_ref = resp
                    .get("schema")
                    .and_then(|s| s.get("$ref"))
                    .and_then(|v| v.as_str())
                    .map(|r| r.replace("#/definitions/", ""));

                responses.insert(
                    status.clone(),
                    Response {
                        status_code: status.clone(),
                        description: resp
                            .get("description")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        content_types: operation
                            .get("produces")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_else(|| vec!["application/json".to_string()]),
                        schema_ref,
                    },
                );
            }
        }

        responses
    }

    /// Parse OpenAPI 3.x spec
    fn parse_openapi3(
        value: serde_json::Value,
        source: &str,
        version: OpenApiVersion,
    ) -> OasResult<ParsedSpec> {
        let info = value.get("info").ok_or_else(|| {
            OasError::InvalidOpenApi("Missing 'info' field".to_string())
        })?;

        let title = info
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown API")
            .to_string();

        let spec_version = info
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("0.0.0")
            .to_string();

        let description = info.get("description").and_then(|v| v.as_str()).map(String::from);

        // Parse components/schemas
        let schemas = Self::parse_openapi3_schemas(&value);

        // Parse paths
        let endpoints = Self::parse_openapi3_paths(&value);

        // Collect tags
        let tags: Vec<String> = endpoints
            .values()
            .flat_map(|e| e.tags.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        // Compute spec hash
        let spec_hash = Self::compute_hash(&value);

        Ok(ParsedSpec {
            metadata: SpecMetadata {
                title,
                version: spec_version,
                description,
                openapi_version: version,
                endpoint_count: endpoints.len(),
                schema_count: schemas.len(),
                tag_count: tags.len(),
            },
            endpoints,
            schemas,
            tags,
            spec_hash,
            source: source.to_string(),
        })
    }

    /// Parse OpenAPI 3.x schemas
    fn parse_openapi3_schemas(value: &serde_json::Value) -> HashMap<String, Schema> {
        let mut schemas = HashMap::new();

        if let Some(components) = value.get("components") {
            if let Some(schema_obj) = components.get("schemas").and_then(|v| v.as_object()) {
                for (name, def) in schema_obj {
                    let refs = Self::extract_refs(def);
                    let hash = Self::compute_hash(def);

                    schemas.insert(
                        name.clone(),
                        Schema {
                            name: name.clone(),
                            schema_type: Self::parse_schema_type(def),
                            description: def.get("description").and_then(|v| v.as_str()).map(String::from),
                            refs,
                            hash,
                        },
                    );
                }
            }
        }

        schemas
    }

    /// Parse OpenAPI 3.x paths
    fn parse_openapi3_paths(value: &serde_json::Value) -> HashMap<String, Endpoint> {
        let mut endpoints = HashMap::new();

        if let Some(paths) = value.get("paths").and_then(|v| v.as_object()) {
            for (path, path_item) in paths {
                if let Some(path_obj) = path_item.as_object() {
                    for (method, operation) in path_obj {
                        if let Some(http_method) = Self::parse_http_method(method) {
                            let endpoint = Self::parse_openapi3_operation(
                                path,
                                http_method,
                                operation,
                            );
                            endpoints.insert(endpoint.key(), endpoint);
                        }
                    }
                }
            }
        }

        endpoints
    }

    /// Parse a single OpenAPI 3.x operation
    fn parse_openapi3_operation(
        path: &str,
        method: HttpMethod,
        operation: &serde_json::Value,
    ) -> Endpoint {
        let operation_id = operation
            .get("operationId")
            .and_then(|v| v.as_str())
            .map(String::from);

        let summary = operation
            .get("summary")
            .and_then(|v| v.as_str())
            .map(String::from);

        let description = operation
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from);

        let tags: Vec<String> = operation
            .get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        let deprecated = operation
            .get("deprecated")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Parse parameters
        let parameters = Self::parse_openapi3_parameters(operation);

        // Parse request body
        let request_body = Self::parse_openapi3_body(operation);

        // Parse responses
        let responses = Self::parse_openapi3_responses(operation);

        // Collect schema refs
        let schema_refs = Self::extract_refs(operation);

        let hash = Self::compute_hash(operation);

        Endpoint {
            path: path.to_string(),
            method,
            operation_id,
            summary,
            description,
            tags,
            parameters,
            request_body,
            responses,
            deprecated,
            hash,
            schema_refs,
        }
    }

    /// Parse OpenAPI 3.x parameters
    fn parse_openapi3_parameters(operation: &serde_json::Value) -> Vec<Parameter> {
        let mut params = Vec::new();

        if let Some(parameters) = operation.get("parameters").and_then(|v| v.as_array()) {
            for param in parameters {
                let in_value = param.get("in").and_then(|v| v.as_str()).unwrap_or("");

                let location = match in_value {
                    "path" => ParameterLocation::Path,
                    "query" => ParameterLocation::Query,
                    "header" => ParameterLocation::Header,
                    "cookie" => ParameterLocation::Cookie,
                    _ => continue,
                };

                let schema_ref = param
                    .get("schema")
                    .and_then(|s| s.get("$ref"))
                    .and_then(|v| v.as_str())
                    .map(|r| r.replace("#/components/schemas/", ""));

                let schema_type = param
                    .get("schema")
                    .and_then(|s| s.get("type"))
                    .and_then(|v| v.as_str())
                    .map(String::from);

                params.push(Parameter {
                    name: param
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    location,
                    required: param
                        .get("required")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(location == ParameterLocation::Path),
                    description: param
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                    schema_ref,
                    schema_type,
                });
            }
        }

        params
    }

    /// Parse OpenAPI 3.x request body
    fn parse_openapi3_body(operation: &serde_json::Value) -> Option<RequestBody> {
        let body = operation.get("requestBody")?;

        let content = body.get("content").and_then(|v| v.as_object())?;

        let content_types: Vec<String> = content.keys().cloned().collect();

        // Get schema from first content type
        let schema_ref = content
            .values()
            .next()
            .and_then(|c| c.get("schema"))
            .and_then(|s| s.get("$ref"))
            .and_then(|v| v.as_str())
            .map(|r| r.replace("#/components/schemas/", ""));

        Some(RequestBody {
            required: body
                .get("required")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            description: body
                .get("description")
                .and_then(|v| v.as_str())
                .map(String::from),
            content_types,
            schema_ref,
        })
    }

    /// Parse OpenAPI 3.x responses
    fn parse_openapi3_responses(operation: &serde_json::Value) -> HashMap<String, Response> {
        let mut responses = HashMap::new();

        if let Some(resp_obj) = operation.get("responses").and_then(|v| v.as_object()) {
            for (status, resp) in resp_obj {
                let (content_types, schema_ref) = if let Some(content) =
                    resp.get("content").and_then(|v| v.as_object())
                {
                    let types: Vec<String> = content.keys().cloned().collect();
                    let schema = content
                        .values()
                        .next()
                        .and_then(|c| c.get("schema"))
                        .and_then(|s| s.get("$ref"))
                        .and_then(|v| v.as_str())
                        .map(|r| r.replace("#/components/schemas/", ""));
                    (types, schema)
                } else {
                    (vec![], None)
                };

                responses.insert(
                    status.clone(),
                    Response {
                        status_code: status.clone(),
                        description: resp
                            .get("description")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        content_types,
                        schema_ref,
                    },
                );
            }
        }

        responses
    }

    /// Parse HTTP method string
    fn parse_http_method(method: &str) -> Option<HttpMethod> {
        match method.to_lowercase().as_str() {
            "get" => Some(HttpMethod::Get),
            "post" => Some(HttpMethod::Post),
            "put" => Some(HttpMethod::Put),
            "patch" => Some(HttpMethod::Patch),
            "delete" => Some(HttpMethod::Delete),
            "head" => Some(HttpMethod::Head),
            "options" => Some(HttpMethod::Options),
            "trace" => Some(HttpMethod::Trace),
            _ => None,
        }
    }

    /// Parse schema type
    fn parse_schema_type(schema: &serde_json::Value) -> SchemaType {
        if let Some(ref_str) = schema.get("$ref").and_then(|v| v.as_str()) {
            return SchemaType::Ref {
                reference: ref_str
                    .replace("#/definitions/", "")
                    .replace("#/components/schemas/", ""),
            };
        }

        if let Some(one_of) = schema.get("oneOf").and_then(|v| v.as_array()) {
            return SchemaType::OneOf {
                variants: one_of.iter().map(Self::parse_schema_type).collect(),
            };
        }

        if let Some(any_of) = schema.get("anyOf").and_then(|v| v.as_array()) {
            return SchemaType::AnyOf {
                variants: any_of.iter().map(Self::parse_schema_type).collect(),
            };
        }

        if let Some(all_of) = schema.get("allOf").and_then(|v| v.as_array()) {
            return SchemaType::AllOf {
                variants: all_of.iter().map(Self::parse_schema_type).collect(),
            };
        }

        match schema.get("type").and_then(|v| v.as_str()) {
            Some("string") => SchemaType::String {
                format: schema.get("format").and_then(|v| v.as_str()).map(String::from),
                enum_values: schema.get("enum").and_then(|v| v.as_array()).map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                }),
            },
            Some("number") => SchemaType::Number {
                format: schema.get("format").and_then(|v| v.as_str()).map(String::from),
            },
            Some("integer") => SchemaType::Integer {
                format: schema.get("format").and_then(|v| v.as_str()).map(String::from),
            },
            Some("boolean") => SchemaType::Boolean,
            Some("array") => {
                let items = schema
                    .get("items")
                    .map(Self::parse_schema_type)
                    .unwrap_or(SchemaType::Unknown);
                SchemaType::Array {
                    items: Box::new(items),
                }
            }
            Some("object") | None if schema.get("properties").is_some() => {
                let properties = schema
                    .get("properties")
                    .and_then(|v| v.as_object())
                    .map(|obj| {
                        obj.iter()
                            .map(|(k, v)| (k.clone(), Self::parse_schema_type(v)))
                            .collect()
                    })
                    .unwrap_or_default();

                let required = schema
                    .get("required")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                SchemaType::Object {
                    properties,
                    required,
                }
            }
            _ => SchemaType::Unknown,
        }
    }

    /// Extract all $ref references from a JSON value
    fn extract_refs(value: &serde_json::Value) -> Vec<String> {
        let mut refs = Vec::new();
        Self::collect_refs(value, &mut refs);
        refs.sort();
        refs.dedup();
        refs
    }

    fn collect_refs(value: &serde_json::Value, refs: &mut Vec<String>) {
        match value {
            serde_json::Value::Object(obj) => {
                if let Some(ref_str) = obj.get("$ref").and_then(|v| v.as_str()) {
                    let clean_ref = ref_str
                        .replace("#/definitions/", "")
                        .replace("#/components/schemas/", "");
                    refs.push(clean_ref);
                }
                for v in obj.values() {
                    Self::collect_refs(v, refs);
                }
            }
            serde_json::Value::Array(arr) => {
                for v in arr {
                    Self::collect_refs(v, refs);
                }
            }
            _ => {}
        }
    }

    /// Compute SHA256 hash of a JSON value
    fn compute_hash(value: &serde_json::Value) -> String {
        let normalized = serde_json::to_string(value).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let result = hasher.finalize();
        hex::encode(&result[..8]) // Use first 8 bytes (16 hex chars)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_refs() {
        let json = serde_json::json!({
            "schema": {
                "$ref": "#/components/schemas/User"
            },
            "items": {
                "$ref": "#/components/schemas/Post"
            }
        });

        let refs = OpenApiParser::extract_refs(&json);
        assert!(refs.contains(&"User".to_string()));
        assert!(refs.contains(&"Post".to_string()));
    }
}
