//! oas_status tool implementation

use crate::services::CacheManager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct StatusInput {
    /// Project directory
    pub project_dir: String,
    /// Check remote for updates
    #[serde(default)]
    pub check_remote: bool,
}

#[derive(Debug, Serialize)]
pub struct StatusOutput {
    pub success: bool,
    pub has_cache: bool,
    pub cache_info: Option<CacheInfo>,
    pub remote_status: Option<RemoteStatus>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CacheInfo {
    pub source: String,
    pub last_fetch: String,
    pub spec_hash: String,
    pub title: Option<String>,
    pub version: Option<String>,
    pub endpoint_count: usize,
    pub schema_count: usize,
}

#[derive(Debug, Serialize)]
pub struct RemoteStatus {
    pub is_stale: bool,
    pub message: String,
}

/// Get status of OpenAPI sync
pub async fn get_status(input: StatusInput) -> StatusOutput {
    let cache_manager = CacheManager::new(&input.project_dir);

    // Try to load cache
    let cache = match cache_manager.load_cache() {
        Ok(c) => c,
        Err(_) => {
            return StatusOutput {
                success: true,
                has_cache: false,
                cache_info: None,
                remote_status: None,
                error: None,
            };
        }
    };

    let cache_info = CacheInfo {
        source: cache.source.clone(),
        last_fetch: cache.last_fetch.clone(),
        spec_hash: cache.spec_hash.clone(),
        title: cache.meta.title.clone(),
        version: cache.meta.version.clone(),
        endpoint_count: cache.meta.endpoint_count,
        schema_count: cache.meta.schema_count,
    };

    // Check remote if requested
    let remote_status = if input.check_remote && cache.source.starts_with("http") {
        let is_valid = cache_manager
            .check_remote_cache(&cache.source, &cache)
            .await;

        Some(RemoteStatus {
            is_stale: !is_valid,
            message: if is_valid {
                "Cache is up to date with remote".to_string()
            } else {
                "Remote spec has been updated. Run sync to update.".to_string()
            },
        })
    } else {
        None
    };

    StatusOutput {
        success: true,
        has_cache: true,
        cache_info: Some(cache_info),
        remote_status,
        error: None,
    }
}
