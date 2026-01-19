//! oas_deps tool implementation

use crate::services::{GraphBuilder, OpenApiParser};
use crate::types::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DepsInput {
    /// URL or file path to OpenAPI spec
    pub source: String,
    /// Schema name to check (mutually exclusive with path)
    pub schema: Option<String>,
    /// Path to check (mutually exclusive with schema)
    pub path: Option<String>,
    /// Direction: upstream, downstream, or both
    #[serde(default)]
    pub direction: DepsDirection,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DepsDirection {
    Upstream,
    #[default]
    Downstream,
    Both,
}

#[derive(Debug, Serialize)]
pub struct DepsOutput {
    pub success: bool,
    pub target: String,
    pub is_schema: bool,
    pub affected_paths: Vec<String>,
    pub affected_schemas: Vec<String>,
    pub total_affected: usize,
    pub error: Option<String>,
}

/// Query dependency graph
pub async fn query_deps(input: DepsInput) -> DepsOutput {
    // Validate input
    if input.schema.is_none() && input.path.is_none() {
        return DepsOutput {
            success: false,
            target: String::new(),
            is_schema: false,
            affected_paths: vec![],
            affected_schemas: vec![],
            total_affected: 0,
            error: Some("Either 'schema' or 'path' must be provided".to_string()),
        };
    }

    if input.schema.is_some() && input.path.is_some() {
        return DepsOutput {
            success: false,
            target: String::new(),
            is_schema: false,
            affected_paths: vec![],
            affected_schemas: vec![],
            total_affected: 0,
            error: Some("Cannot specify both 'schema' and 'path'".to_string()),
        };
    }

    // Parse the spec
    let spec = match OpenApiParser::parse(&input.source).await {
        Ok(s) => s,
        Err(e) => {
            return DepsOutput {
                success: false,
                target: String::new(),
                is_schema: false,
                affected_paths: vec![],
                affected_schemas: vec![],
                total_affected: 0,
                error: Some(e.to_string()),
            };
        }
    };

    // Build dependency graph
    let graph = GraphBuilder::build(&spec);

    let (target, is_schema) = if let Some(ref schema) = input.schema {
        (schema.clone(), true)
    } else {
        (input.path.unwrap(), false)
    };

    // Convert direction
    let direction = match input.direction {
        DepsDirection::Upstream => DependencyDirection::Upstream,
        DepsDirection::Downstream => DependencyDirection::Downstream,
        DepsDirection::Both => DependencyDirection::Both,
    };

    // Query the graph
    let result = graph.query(&target, direction, is_schema);

    let affected_paths: Vec<String> = result.affected_paths.into_iter().collect();
    let affected_schemas: Vec<String> = result.affected_schemas.into_iter().collect();
    let total = affected_paths.len() + affected_schemas.len();

    DepsOutput {
        success: true,
        target,
        is_schema,
        affected_paths,
        affected_schemas,
        total_affected: total,
        error: None,
    }
}
