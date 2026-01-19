//! OpenAPI type definitions

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported OpenAPI versions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OpenApiVersion {
    #[serde(rename = "2.0")]
    Swagger2,
    #[serde(rename = "3.0")]
    OpenApi30,
    #[serde(rename = "3.1")]
    OpenApi31,
}

impl std::fmt::Display for OpenApiVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Swagger2 => write!(f, "Swagger 2.0"),
            Self::OpenApi30 => write!(f, "OpenAPI 3.0"),
            Self::OpenApi31 => write!(f, "OpenAPI 3.1"),
        }
    }
}

/// Parsed OpenAPI specification metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecMetadata {
    pub title: String,
    pub version: String,
    pub description: Option<String>,
    pub openapi_version: OpenApiVersion,
    pub endpoint_count: usize,
    pub schema_count: usize,
    pub tag_count: usize,
}

/// HTTP method
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
    Trace,
}

impl std::fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Get => write!(f, "GET"),
            Self::Post => write!(f, "POST"),
            Self::Put => write!(f, "PUT"),
            Self::Patch => write!(f, "PATCH"),
            Self::Delete => write!(f, "DELETE"),
            Self::Head => write!(f, "HEAD"),
            Self::Options => write!(f, "OPTIONS"),
            Self::Trace => write!(f, "TRACE"),
        }
    }
}

/// Parameter location
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ParameterLocation {
    Path,
    Query,
    Header,
    Cookie,
}

/// Parameter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub location: ParameterLocation,
    pub required: bool,
    pub description: Option<String>,
    pub schema_ref: Option<String>,
    pub schema_type: Option<String>,
}

/// Request body definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    pub required: bool,
    pub description: Option<String>,
    pub content_types: Vec<String>,
    pub schema_ref: Option<String>,
}

/// Response definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub status_code: String,
    pub description: Option<String>,
    pub content_types: Vec<String>,
    pub schema_ref: Option<String>,
}

/// Parsed endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Endpoint {
    pub path: String,
    pub method: HttpMethod,
    pub operation_id: Option<String>,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub parameters: Vec<Parameter>,
    pub request_body: Option<RequestBody>,
    pub responses: HashMap<String, Response>,
    pub deprecated: bool,
    /// Hash for change detection
    pub hash: String,
    /// Schema references used by this endpoint
    pub schema_refs: Vec<String>,
}

impl Endpoint {
    /// Get a unique key for this endpoint
    pub fn key(&self) -> String {
        format!("{}:{}", self.method.to_string().to_lowercase(), self.path)
    }

    /// Generate operation ID if not present
    pub fn effective_operation_id(&self) -> String {
        self.operation_id.clone().unwrap_or_else(|| {
            let method = self.method.to_string().to_lowercase();
            let path_parts: Vec<&str> = self.path
                .split('/')
                .filter(|p| !p.is_empty() && !p.starts_with('{'))
                .collect();
            format!("{}_{}", method, path_parts.join("_"))
        })
    }
}

/// Schema type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum SchemaType {
    String {
        format: Option<String>,
        #[serde(rename = "enum")]
        enum_values: Option<Vec<String>>,
    },
    Number {
        format: Option<String>,
    },
    Integer {
        format: Option<String>,
    },
    Boolean,
    Array {
        items: Box<SchemaType>,
    },
    Object {
        properties: HashMap<String, SchemaType>,
        required: Vec<String>,
    },
    Ref {
        #[serde(rename = "$ref")]
        reference: String,
    },
    OneOf {
        variants: Vec<SchemaType>,
    },
    AnyOf {
        variants: Vec<SchemaType>,
    },
    AllOf {
        variants: Vec<SchemaType>,
    },
    Unknown,
}

/// Parsed schema definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schema {
    pub name: String,
    pub schema_type: SchemaType,
    pub description: Option<String>,
    /// Other schemas this schema references
    pub refs: Vec<String>,
    /// Hash for change detection
    pub hash: String,
}

/// Complete parsed OpenAPI specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSpec {
    pub metadata: SpecMetadata,
    pub endpoints: HashMap<String, Endpoint>,
    pub schemas: HashMap<String, Schema>,
    pub tags: Vec<String>,
    /// Full spec hash for quick comparison
    pub spec_hash: String,
    /// Source location (URL or file path)
    pub source: String,
}
