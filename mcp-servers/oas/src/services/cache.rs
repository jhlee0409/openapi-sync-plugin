//! Cache management service

use crate::types::*;
use chrono::{DateTime, Utc};
use std::path::Path;

/// Default TTL in seconds (24 hours)
/// API specs rarely change frequently, so a longer TTL is reasonable
pub const DEFAULT_TTL_SECONDS: u64 = 86400;

/// Cache manager for OpenAPI specs
pub struct CacheManager {
    project_dir: String,
}

impl CacheManager {
    pub fn new(project_dir: &str) -> Self {
        Self {
            project_dir: project_dir.to_string(),
        }
    }

    /// Get cache file path
    fn cache_path(&self) -> std::path::PathBuf {
        Path::new(&self.project_dir).join(".openapi-sync.cache.json")
    }

    /// Get state file path
    #[allow(dead_code)]
    fn state_path(&self) -> std::path::PathBuf {
        Path::new(&self.project_dir).join(".openapi-sync.state.json")
    }

    /// Load cache from file
    pub fn load_cache(&self) -> OasResult<OasCache> {
        let path = self.cache_path();
        let content = std::fs::read_to_string(&path)
            .map_err(|_| OasError::CacheNotFound)?;

        serde_json::from_str(&content)
            .map_err(|e| OasError::CacheCorrupted(e.to_string()))
    }

    /// Save cache to file
    pub fn save_cache(&self, cache: &OasCache) -> OasResult<()> {
        let path = self.cache_path();

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;
        }

        let content = serde_json::to_string_pretty(cache)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        // Atomic write using temp file
        let temp_path = path.with_extension("json.tmp");
        std::fs::write(&temp_path, &content)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        std::fs::rename(&temp_path, &path)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        Ok(())
    }

    /// Load state from file
    #[allow(dead_code)]
    pub fn load_state(&self) -> OasResult<OasState> {
        let path = self.state_path();
        let content = std::fs::read_to_string(&path)
            .map_err(|_| OasError::CacheNotFound)?;

        serde_json::from_str(&content)
            .map_err(|e| OasError::CacheCorrupted(e.to_string()))
    }

    /// Save state to file
    #[allow(dead_code)]
    pub fn save_state(&self, state: &OasState) -> OasResult<()> {
        let path = self.state_path();

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;
        }

        let content = serde_json::to_string_pretty(state)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        // Atomic write
        let temp_path = path.with_extension("json.tmp");
        std::fs::write(&temp_path, &content)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        std::fs::rename(&temp_path, &path)
            .map_err(|e| OasError::CacheWriteFailed(e.to_string()))?;

        Ok(())
    }

    /// Create cache from parsed spec
    #[allow(dead_code)]
    pub fn create_cache(&self, spec: &ParsedSpec, source: &str, ttl_seconds: Option<u64>) -> OasCache {
        self.create_cache_with_headers(spec, source, ttl_seconds, None)
    }

    /// Create cache from parsed spec with HTTP headers
    pub fn create_cache_with_headers(
        &self,
        spec: &ParsedSpec,
        source: &str,
        ttl_seconds: Option<u64>,
        http_headers: Option<&super::parser::HttpHeaders>,
    ) -> OasCache {
        OasCache {
            version: "1.0.0".to_string(),
            last_fetch: Utc::now().to_rfc3339(),
            spec_hash: spec.spec_hash.clone(),
            source: source.to_string(),
            ttl_seconds: ttl_seconds.unwrap_or(DEFAULT_TTL_SECONDS),
            http_cache: HttpCacheInfo {
                etag: http_headers.and_then(|h| h.etag.clone()),
                last_modified: http_headers.and_then(|h| h.last_modified.clone()),
            },
            local_cache: LocalCacheInfo::default(),
            meta: CachedMeta {
                title: Some(spec.metadata.title.clone()),
                version: Some(spec.metadata.version.clone()),
                openapi_version: Some(serde_json::to_string(&spec.metadata.openapi_version).unwrap_or_default().trim_matches('"').to_string()),
                endpoint_count: spec.metadata.endpoint_count,
                schema_count: spec.metadata.schema_count,
            },
        }
    }

    /// Check if cache has expired based on TTL
    pub fn is_cache_expired(&self, cache: &OasCache) -> bool {
        let last_fetch = match DateTime::parse_from_rfc3339(&cache.last_fetch) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(_) => return true, // If we can't parse, assume expired
        };

        let now = Utc::now();
        let elapsed = now.signed_duration_since(last_fetch);

        elapsed.num_seconds() > cache.ttl_seconds as i64
    }

    /// Check if cache is valid for a URL (using HEAD request + TTL)
    pub async fn check_remote_cache(&self, url: &str, cache: &OasCache) -> bool {
        // First check TTL - if expired, don't even bother with HTTP check
        if self.is_cache_expired(cache) {
            return false;
        }

        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
        {
            Ok(c) => c,
            Err(_) => return false,
        };

        let response = match client.head(url).send().await {
            Ok(r) => r,
            Err(_) => {
                // Network error - use cache if within TTL (already checked above)
                return true;
            }
        };

        // Check ETag
        if let Some(etag) = response.headers().get("etag") {
            if let Ok(etag_str) = etag.to_str() {
                if let Some(cached_etag) = &cache.http_cache.etag {
                    return etag_str == cached_etag;
                }
            }
        }

        // Check Last-Modified
        if let Some(last_modified) = response.headers().get("last-modified") {
            if let Ok(lm_str) = last_modified.to_str() {
                if let Some(cached_lm) = &cache.http_cache.last_modified {
                    return lm_str == cached_lm;
                }
            }
        }

        // No cache headers - fall back to TTL only (already passed TTL check above)
        true
    }

    /// Check if local file cache is valid (mtime + TTL)
    pub fn check_local_cache(&self, path: &str, cache: &OasCache) -> bool {
        // First check TTL
        if self.is_cache_expired(cache) {
            return false;
        }

        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return false,
        };

        if let Ok(modified) = metadata.modified() {
            let mtime = chrono::DateTime::<Utc>::from(modified).to_rfc3339();
            if let Some(cached_mtime) = &cache.local_cache.mtime {
                return &mtime == cached_mtime;
            }
        }

        false
    }

    /// Update HTTP cache info from response headers
    #[allow(dead_code)]
    pub fn update_http_cache_info(
        cache: &mut OasCache,
        headers: &reqwest::header::HeaderMap,
    ) {
        if let Some(etag) = headers.get("etag") {
            if let Ok(etag_str) = etag.to_str() {
                cache.http_cache.etag = Some(etag_str.to_string());
            }
        }

        if let Some(last_modified) = headers.get("last-modified") {
            if let Ok(lm_str) = last_modified.to_str() {
                cache.http_cache.last_modified = Some(lm_str.to_string());
            }
        }

        cache.last_fetch = Utc::now().to_rfc3339();
    }

    /// Update local cache info from file metadata
    #[allow(dead_code)]
    pub fn update_local_cache_info(cache: &mut OasCache, path: &str) {
        if let Ok(metadata) = std::fs::metadata(path) {
            if let Ok(modified) = metadata.modified() {
                let mtime = chrono::DateTime::<Utc>::from(modified).to_rfc3339();
                cache.local_cache.mtime = Some(mtime);
            }
        }

        cache.last_fetch = Utc::now().to_rfc3339();
    }
}
