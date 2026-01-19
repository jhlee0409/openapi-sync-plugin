//! Configuration types for OAS MCP server

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Main configuration file (.openapi-sync.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OasConfig {
    #[serde(default = "default_version")]
    pub version: String,

    pub openapi: OpenApiSource,

    pub samples: SamplePaths,

    #[serde(default)]
    pub tag_mapping: HashMap<String, String>,

    #[serde(default)]
    pub ignore: Vec<String>,

    #[serde(default)]
    pub validation: ValidationConfig,

    #[serde(default)]
    pub generation: GenerationConfig,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

/// OpenAPI spec source configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenApiSource {
    pub source: String,

    #[serde(default)]
    pub headers: HashMap<String, String>,
}

/// Sample file paths for pattern detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplePaths {
    /// API functions sample (required)
    pub api: String,

    /// Types sample
    pub types: Option<String>,

    /// Hooks sample (React Query, SWR, etc.)
    pub hooks: Option<String>,

    /// Query key factory sample
    pub keys: Option<String>,
}

/// Validation configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ValidationConfig {
    #[serde(default)]
    pub ignore_paths: Vec<String>,

    #[serde(default)]
    pub strict: bool,
}

/// Code generation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationConfig {
    #[serde(default = "default_output_dir")]
    pub output_dir: String,

    #[serde(default)]
    pub http_client: HttpClient,

    #[serde(default)]
    pub data_fetching: DataFetchingLib,

    #[serde(default = "default_true")]
    pub typescript: bool,
}

fn default_output_dir() -> String {
    "src/api".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for GenerationConfig {
    fn default() -> Self {
        Self {
            output_dir: default_output_dir(),
            http_client: HttpClient::default(),
            data_fetching: DataFetchingLib::default(),
            typescript: true,
        }
    }
}

/// HTTP client library
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HttpClient {
    #[default]
    Fetch,
    Axios,
    Ky,
}

/// Data fetching library
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DataFetchingLib {
    #[default]
    None,
    ReactQuery,
    Swr,
    RtkQuery,
}

/// Cache file (.openapi-sync.cache.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OasCache {
    pub version: String,
    pub last_fetch: String,
    pub spec_hash: String,
    pub source: String,

    /// TTL in seconds (default: 3600 = 1 hour)
    #[serde(default = "default_ttl")]
    pub ttl_seconds: u64,

    #[serde(default)]
    pub http_cache: HttpCacheInfo,

    #[serde(default)]
    pub local_cache: LocalCacheInfo,

    pub meta: CachedMeta,
}

fn default_ttl() -> u64 {
    86400 // 24 hours default - API specs rarely change frequently
}

/// HTTP cache headers
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HttpCacheInfo {
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

/// Local file cache info
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LocalCacheInfo {
    pub mtime: Option<String>,
}

/// Cached metadata
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CachedMeta {
    pub title: Option<String>,
    pub version: Option<String>,
    pub openapi_version: Option<String>,
    pub endpoint_count: usize,
    pub schema_count: usize,
}

/// Implementation state file (.openapi-sync.state.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OasState {
    pub version: String,
    pub last_sync: Option<String>,
    pub last_scan: Option<String>,

    #[serde(default)]
    pub implemented: HashMap<String, EndpointState>,

    #[serde(default)]
    pub partial: HashMap<String, EndpointState>,

    #[serde(default)]
    pub missing: Vec<String>,

    #[serde(default)]
    pub coverage: CoverageStats,
}

/// State of an implemented endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointState {
    pub file_path: String,
    pub function_name: String,
    pub last_synced: String,
    pub spec_hash: String,
}

/// Coverage statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CoverageStats {
    pub total: TotalCoverage,

    #[serde(default)]
    pub by_tag: HashMap<String, TagCoverage>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TotalCoverage {
    pub endpoints: usize,
    pub implemented: usize,
    pub partial: usize,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TagCoverage {
    pub endpoints: usize,
    pub implemented: usize,
    pub partial: usize,
}

/// Detected project patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedPatterns {
    pub structure: ProjectStructure,
    pub http_client: HttpClient,
    pub data_fetching: DataFetchingLib,
    pub type_style: TypeStyle,
    pub naming: NamingConventions,
    pub confidence: f32,
}

/// Project structure pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectStructure {
    Fsd,          // Feature-Sliced Design
    FeatureBased,
    Flat,
    ServiceBased,
}

/// Type definition style
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeStyle {
    pub prefer_interface: bool,
    pub entity_suffix: String,
    pub request_suffix: String,
    pub response_suffix: String,
}

/// Naming conventions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamingConventions {
    pub file_case: NamingCase,
    pub function_case: NamingCase,
    pub type_case: NamingCase,
    pub hook_prefix: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[allow(clippy::enum_variant_names)]
pub enum NamingCase {
    CamelCase,
    PascalCase,
    KebabCase,
    SnakeCase,
}
