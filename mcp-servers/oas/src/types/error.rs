//! Error types for OAS MCP server

use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum OasError {
    // Network errors (E1xx)
    #[error("E101: Connection failed - {0}")]
    ConnectionFailed(String),

    #[error("E102: Request timeout after {0}ms")]
    Timeout(u64),

    #[error("E103: HTTP error {status}: {message}")]
    HttpError { status: u16, message: String },

    #[error("E104: SSL/TLS error - {0}")]
    SslError(String),

    // Parse errors (E2xx)
    #[error("E201: Invalid JSON - {0}")]
    InvalidJson(String),

    #[error("E202: Invalid YAML - {0}")]
    InvalidYaml(String),

    #[error("E203: Invalid OpenAPI spec - {0}")]
    InvalidOpenApi(String),

    #[error("E204: Unsupported OpenAPI version: {0}")]
    UnsupportedVersion(String),

    #[error("E205: Unresolved reference: {0}")]
    UnresolvedRef(String),

    #[error("E206: Circular reference detected: {0}")]
    CircularRef(String),

    #[error("E207: Unsupported feature: {0}")]
    UnsupportedFeature(String),

    // File system errors (E3xx)
    #[error("E301: File not found: {0}")]
    FileNotFound(String),

    #[error("E302: Permission denied: {0}")]
    PermissionDenied(String),

    #[error("E303: Failed to read file: {0}")]
    ReadError(String),

    #[error("E304: Failed to write file: {0}")]
    WriteError(String),

    #[error("E305: Path traversal attempt blocked: {0}")]
    PathTraversal(String),

    // Code generation errors (E4xx)
    #[error("E401: Pattern detection failed - {0}")]
    PatternDetectionFailed(String),

    #[error("E402: Template error - {0}")]
    TemplateError(String),

    #[error("E403: Invalid identifier: {0}")]
    InvalidIdentifier(String),

    #[error("E404: Duplicate identifier: {0}")]
    DuplicateIdentifier(String),

    // Configuration errors (E5xx)
    #[error("E501: Configuration not found at {0}")]
    ConfigNotFound(String),

    #[error("E502: Invalid configuration - {0}")]
    InvalidConfig(String),

    #[error("E503: Missing required field: {0}")]
    MissingField(String),

    // Cache errors (E6xx)
    #[error("E601: Cache not found")]
    CacheNotFound,

    #[error("E602: Cache corrupted - {0}")]
    CacheCorrupted(String),

    #[error("E603: Cache write failed - {0}")]
    CacheWriteFailed(String),
}

#[allow(dead_code)]
impl OasError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::ConnectionFailed(_) => "E101",
            Self::Timeout(_) => "E102",
            Self::HttpError { .. } => "E103",
            Self::SslError(_) => "E104",
            Self::InvalidJson(_) => "E201",
            Self::InvalidYaml(_) => "E202",
            Self::InvalidOpenApi(_) => "E203",
            Self::UnsupportedVersion(_) => "E204",
            Self::UnresolvedRef(_) => "E205",
            Self::CircularRef(_) => "E206",
            Self::UnsupportedFeature(_) => "E207",
            Self::FileNotFound(_) => "E301",
            Self::PermissionDenied(_) => "E302",
            Self::ReadError(_) => "E303",
            Self::WriteError(_) => "E304",
            Self::PathTraversal(_) => "E305",
            Self::PatternDetectionFailed(_) => "E401",
            Self::TemplateError(_) => "E402",
            Self::InvalidIdentifier(_) => "E403",
            Self::DuplicateIdentifier(_) => "E404",
            Self::ConfigNotFound(_) => "E501",
            Self::InvalidConfig(_) => "E502",
            Self::MissingField(_) => "E503",
            Self::CacheNotFound => "E601",
            Self::CacheCorrupted(_) => "E602",
            Self::CacheWriteFailed(_) => "E603",
        }
    }

    pub fn is_recoverable(&self) -> bool {
        !matches!(
            self,
            Self::ConnectionFailed(_)
                | Self::SslError(_)
                | Self::InvalidOpenApi(_)
                | Self::FileNotFound(_)
                | Self::PermissionDenied(_)
                | Self::PathTraversal(_)
        )
    }
}

pub type OasResult<T> = Result<T, OasError>;
