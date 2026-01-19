//! Hashing utilities

use sha2::{Digest, Sha256};

/// Compute SHA256 hash of a string, returning first 16 hex chars
pub fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    hex::encode(&result[..8])
}

/// Compute hash of a JSON value (normalized)
pub fn compute_json_hash(value: &serde_json::Value) -> String {
    let normalized = serde_json::to_string(value).unwrap_or_default();
    compute_hash(&normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_consistency() {
        let hash1 = compute_hash("hello world");
        let hash2 = compute_hash("hello world");
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_difference() {
        let hash1 = compute_hash("hello");
        let hash2 = compute_hash("world");
        assert_ne!(hash1, hash2);
    }
}
