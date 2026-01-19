//! oas_diff tool implementation

use crate::services::{DiffEngine, GraphBuilder, OpenApiParser, SpecDiff};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DiffInput {
    /// Old spec source (URL or file path)
    pub old_source: String,
    /// New spec source (URL or file path)
    pub new_source: String,
    /// Include affected paths analysis
    #[serde(default = "default_true")]
    pub include_affected_paths: bool,
    /// Only show breaking changes
    #[serde(default)]
    pub breaking_only: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize)]
pub struct DiffOutput {
    pub success: bool,
    pub summary: Option<DiffSummary>,
    pub diff: Option<SpecDiff>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DiffSummary {
    pub added_endpoints: usize,
    pub modified_endpoints: usize,
    pub removed_endpoints: usize,
    pub added_schemas: usize,
    pub modified_schemas: usize,
    pub removed_schemas: usize,
    pub breaking_changes: usize,
    pub has_breaking_changes: bool,
}

/// Compare two OpenAPI specs
pub async fn diff_specs(input: DiffInput) -> DiffOutput {
    // Parse old spec
    let old_spec = match OpenApiParser::parse(&input.old_source).await {
        Ok(s) => s,
        Err(e) => {
            return DiffOutput {
                success: false,
                summary: None,
                diff: None,
                error: Some(format!("Failed to parse old spec: {e}")),
            };
        }
    };

    // Parse new spec
    let new_spec = match OpenApiParser::parse(&input.new_source).await {
        Ok(s) => s,
        Err(e) => {
            return DiffOutput {
                success: false,
                summary: None,
                diff: None,
                error: Some(format!("Failed to parse new spec: {e}")),
            };
        }
    };

    // Build graph for affected paths analysis
    let graph = if input.include_affected_paths {
        Some(GraphBuilder::build(&new_spec))
    } else {
        None
    };

    // Compute diff
    let diff = DiffEngine::diff(&old_spec, &new_spec, graph.as_ref());

    let summary = DiffSummary {
        added_endpoints: diff.added_endpoints.len(),
        modified_endpoints: diff.modified_endpoints.len(),
        removed_endpoints: diff.removed_endpoints.len(),
        added_schemas: diff.added_schemas.len(),
        modified_schemas: diff.modified_schemas.len(),
        removed_schemas: diff.removed_schemas.len(),
        breaking_changes: diff.breaking_changes.len(),
        has_breaking_changes: !diff.breaking_changes.is_empty(),
    };

    // Filter to breaking only if requested
    let diff_output = if input.breaking_only {
        SpecDiff {
            added_endpoints: vec![],
            modified_endpoints: vec![],
            removed_endpoints: diff.removed_endpoints,
            unchanged_endpoints: 0,
            added_schemas: vec![],
            modified_schemas: vec![],
            removed_schemas: diff.removed_schemas,
            unchanged_schemas: 0,
            breaking_changes: diff.breaking_changes,
        }
    } else {
        diff
    };

    DiffOutput {
        success: true,
        summary: Some(summary),
        diff: Some(diff_output),
        error: None,
    }
}
