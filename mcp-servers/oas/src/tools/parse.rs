//! oas_parse tool implementation

use crate::services::{CacheManager, GraphBuilder, OpenApiParser};
use crate::types::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ParseInput {
    /// URL or file path to OpenAPI spec
    pub source: String,
    /// Output format
    #[serde(default)]
    pub format: ParseFormat,
    /// Project directory for caching
    pub project_dir: Option<String>,
    /// Whether to use cache
    #[serde(default)]
    pub use_cache: bool,
    /// Cache TTL in seconds (default: 3600 = 1 hour)
    pub ttl_seconds: Option<u64>,
    /// Limit number of results (for pagination)
    pub limit: Option<usize>,
    /// Offset for pagination
    #[serde(default)]
    pub offset: usize,
    /// Filter by tag
    pub tag: Option<String>,
    /// Filter by path prefix
    pub path_prefix: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ParseFormat {
    /// Just metadata and stats - minimal output
    #[default]
    Summary,
    /// List endpoint keys only (for discovery)
    EndpointsList,
    /// List schema names only (for discovery)
    SchemasList,
    /// Endpoint details (paginated)
    Endpoints,
    /// Schema details (paginated)
    Schemas,
    /// Full output (WARNING: can be large)
    Full,
}

#[derive(Debug, Serialize)]
pub struct ParseOutput {
    pub success: bool,
    pub metadata: Option<SpecMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoints: Option<Vec<EndpointSummary>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_keys: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schemas: Option<Vec<SchemaSummary>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema_names: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graph_stats: Option<GraphStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<PaginationInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

#[derive(Debug, Serialize)]
pub struct EndpointSummary {
    pub key: String,
    pub path: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    pub tags: Vec<String>,
    pub deprecated: bool,
    pub schema_refs: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct SchemaSummary {
    pub name: String,
    pub refs: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Parse an OpenAPI spec
pub async fn parse_spec(input: ParseInput) -> ParseOutput {
    // Try to use cache if enabled
    if input.use_cache {
        if let Some(ref project_dir) = input.project_dir {
            let cache_manager = CacheManager::new(project_dir);
            if let Ok(cache) = cache_manager.load_cache() {
                // Check if cache is still valid
                let is_valid = if input.source.starts_with("http") {
                    cache_manager.check_remote_cache(&input.source, &cache).await
                } else {
                    cache_manager.check_local_cache(&input.source, &cache)
                };

                if is_valid {
                    // Parse openapi_version from cache
                    let openapi_version = cache.meta.openapi_version
                        .as_deref()
                        .and_then(|v| match v {
                            "2.0" => Some(OpenApiVersion::Swagger2),
                            "3.0" => Some(OpenApiVersion::OpenApi30),
                            "3.1" => Some(OpenApiVersion::OpenApi31),
                            _ => None,
                        })
                        .unwrap_or(OpenApiVersion::OpenApi30);

                    return ParseOutput {
                        success: true,
                        metadata: Some(SpecMetadata {
                            title: cache.meta.title.unwrap_or_default(),
                            version: cache.meta.version.unwrap_or_default(),
                            description: None,
                            openapi_version,
                            endpoint_count: cache.meta.endpoint_count,
                            schema_count: cache.meta.schema_count,
                            tag_count: 0,
                        }),
                        endpoints: None,
                        endpoint_keys: None,
                        schemas: None,
                        schema_names: None,
                        graph_stats: None,
                        pagination: None,
                        error: Some("Using cached data. Use use_cache=false to force refresh.".to_string()),
                    };
                }
            }
        }
    }

    // Parse the spec (with HTTP headers for caching)
    let (spec, http_headers) = match OpenApiParser::parse_with_headers(&input.source).await {
        Ok(result) => result,
        Err(e) => {
            return ParseOutput {
                success: false,
                metadata: None,
                endpoints: None,
                endpoint_keys: None,
                schemas: None,
                schema_names: None,
                graph_stats: None,
                pagination: None,
                error: Some(e.to_string()),
            };
        }
    };

    // Build dependency graph
    let graph = GraphBuilder::build(&spec);

    // Save to cache if project_dir provided (including HTTP headers)
    if let Some(ref project_dir) = input.project_dir {
        let cache_manager = CacheManager::new(project_dir);
        let cache = cache_manager.create_cache_with_headers(
            &spec,
            &input.source,
            input.ttl_seconds,
            Some(&http_headers),
        );
        let _ = cache_manager.save_cache(&cache);
    }

    // Default limit for paginated outputs
    let limit = input.limit.unwrap_or(50);
    let offset = input.offset;

    // Filter endpoints by tag/path
    let filtered_endpoints: Vec<_> = spec
        .endpoints
        .values()
        .filter(|e| {
            if let Some(ref tag) = input.tag {
                if !e.tags.iter().any(|t| t.eq_ignore_ascii_case(tag)) {
                    return false;
                }
            }
            if let Some(ref prefix) = input.path_prefix {
                if !e.path.starts_with(prefix) {
                    return false;
                }
            }
            true
        })
        .collect();

    // Format output based on requested format
    match input.format {
        ParseFormat::Summary => ParseOutput {
            success: true,
            metadata: Some(spec.metadata),
            endpoints: None,
            endpoint_keys: None,
            schemas: None,
            schema_names: None,
            graph_stats: Some(graph.stats()),
            pagination: None,
            error: None,
        },

        ParseFormat::EndpointsList => {
            let keys: Vec<String> = filtered_endpoints.iter().map(|e| e.key()).collect();
            ParseOutput {
                success: true,
                metadata: Some(spec.metadata),
                endpoints: None,
                endpoint_keys: Some(keys),
                schemas: None,
                schema_names: None,
                graph_stats: Some(graph.stats()),
                pagination: None,
                error: None,
            }
        }

        ParseFormat::SchemasList => {
            let names: Vec<String> = spec.schemas.keys().cloned().collect();
            ParseOutput {
                success: true,
                metadata: Some(spec.metadata),
                endpoints: None,
                endpoint_keys: None,
                schemas: None,
                schema_names: Some(names),
                graph_stats: Some(graph.stats()),
                pagination: None,
                error: None,
            }
        }

        ParseFormat::Endpoints => {
            let total = filtered_endpoints.len();
            let paginated: Vec<_> = filtered_endpoints
                .into_iter()
                .skip(offset)
                .take(limit)
                .map(|e| EndpointSummary {
                    key: e.key(),
                    path: e.path.clone(),
                    method: e.method.to_string(),
                    operation_id: e.operation_id.clone(),
                    tags: e.tags.clone(),
                    deprecated: e.deprecated,
                    schema_refs: e.schema_refs.clone(),
                })
                .collect();

            ParseOutput {
                success: true,
                metadata: Some(spec.metadata),
                endpoints: Some(paginated),
                endpoint_keys: None,
                schemas: None,
                schema_names: None,
                graph_stats: Some(graph.stats()),
                pagination: Some(PaginationInfo {
                    total,
                    offset,
                    limit,
                    has_more: offset + limit < total,
                }),
                error: None,
            }
        }

        ParseFormat::Schemas => {
            let all_schemas: Vec<_> = spec.schemas.values().collect();
            let total = all_schemas.len();
            let paginated: Vec<_> = all_schemas
                .into_iter()
                .skip(offset)
                .take(limit)
                .map(|s| SchemaSummary {
                    name: s.name.clone(),
                    refs: s.refs.clone(),
                    description: s.description.clone(),
                })
                .collect();

            ParseOutput {
                success: true,
                metadata: Some(spec.metadata),
                endpoints: None,
                endpoint_keys: None,
                schemas: Some(paginated),
                schema_names: None,
                graph_stats: Some(graph.stats()),
                pagination: Some(PaginationInfo {
                    total,
                    offset,
                    limit,
                    has_more: offset + limit < total,
                }),
                error: None,
            }
        }

        ParseFormat::Full => {
            // Warning: can be very large! Apply pagination anyway
            let total_endpoints = filtered_endpoints.len();
            let total_schemas = spec.schemas.len();

            let paginated_endpoints: Vec<_> = filtered_endpoints
                .into_iter()
                .skip(offset)
                .take(limit)
                .map(|e| EndpointSummary {
                    key: e.key(),
                    path: e.path.clone(),
                    method: e.method.to_string(),
                    operation_id: e.operation_id.clone(),
                    tags: e.tags.clone(),
                    deprecated: e.deprecated,
                    schema_refs: e.schema_refs.clone(),
                })
                .collect();

            let paginated_schemas: Vec<_> = spec
                .schemas
                .values()
                .skip(offset)
                .take(limit)
                .map(|s| SchemaSummary {
                    name: s.name.clone(),
                    refs: s.refs.clone(),
                    description: s.description.clone(),
                })
                .collect();

            ParseOutput {
                success: true,
                metadata: Some(spec.metadata),
                endpoints: Some(paginated_endpoints),
                endpoint_keys: None,
                schemas: Some(paginated_schemas),
                schema_names: None,
                graph_stats: Some(graph.stats()),
                pagination: Some(PaginationInfo {
                    total: total_endpoints.max(total_schemas),
                    offset,
                    limit,
                    has_more: offset + limit < total_endpoints || offset + limit < total_schemas,
                }),
                error: None,
            }
        }
    }
}
