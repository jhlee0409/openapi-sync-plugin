//! Diff engine for comparing OpenAPI specs

use crate::types::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Diff result between two specs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecDiff {
    pub added_endpoints: Vec<EndpointChange>,
    pub modified_endpoints: Vec<EndpointChange>,
    pub removed_endpoints: Vec<EndpointChange>,
    pub unchanged_endpoints: usize,

    pub added_schemas: Vec<SchemaChange>,
    pub modified_schemas: Vec<SchemaChange>,
    pub removed_schemas: Vec<SchemaChange>,
    pub unchanged_schemas: usize,

    pub breaking_changes: Vec<BreakingChange>,
}

/// Endpoint change details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointChange {
    pub key: String,
    pub path: String,
    pub method: HttpMethod,
    pub operation_id: Option<String>,
    pub tags: Vec<String>,
    /// For modified: what changed
    pub changes: Vec<String>,
    /// Affected by schema changes (for modified)
    pub affected_by_schemas: Vec<String>,
}

/// Schema change details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaChange {
    pub name: String,
    /// For modified: what changed
    pub changes: Vec<String>,
    /// Endpoints affected by this schema change
    pub affected_endpoints: Vec<String>,
}

/// Breaking change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakingChange {
    pub category: BreakingChangeCategory,
    pub message: String,
    pub location: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BreakingChangeCategory {
    EndpointRemoved,
    ParameterAdded,
    ParameterTypeChanged,
    ResponseTypeChanged,
    SchemaRemoved,
    SchemaFieldRemoved,
    SchemaFieldTypeChanged,
}

/// Diff engine
pub struct DiffEngine;

impl DiffEngine {
    /// Compare two parsed specs
    pub fn diff(
        old_spec: &ParsedSpec,
        new_spec: &ParsedSpec,
        graph: Option<&DependencyGraph>,
    ) -> SpecDiff {
        let mut diff = SpecDiff {
            added_endpoints: Vec::new(),
            modified_endpoints: Vec::new(),
            removed_endpoints: Vec::new(),
            unchanged_endpoints: 0,

            added_schemas: Vec::new(),
            modified_schemas: Vec::new(),
            removed_schemas: Vec::new(),
            unchanged_schemas: 0,

            breaking_changes: Vec::new(),
        };

        // Compare schemas first (to track affected endpoints)
        let schema_changes = Self::compare_schemas(old_spec, new_spec);

        for (name, change_type) in &schema_changes {
            match change_type {
                ChangeType::Added => {
                    diff.added_schemas.push(SchemaChange {
                        name: name.clone(),
                        changes: vec!["New schema".to_string()],
                        affected_endpoints: vec![],
                    });
                }
                ChangeType::Modified(changes) => {
                    let affected = graph
                        .map(|g| {
                            g.get_affected_paths(name)
                                .into_iter()
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();

                    diff.modified_schemas.push(SchemaChange {
                        name: name.clone(),
                        changes: changes.clone(),
                        affected_endpoints: affected,
                    });
                }
                ChangeType::Removed => {
                    diff.removed_schemas.push(SchemaChange {
                        name: name.clone(),
                        changes: vec!["Schema removed".to_string()],
                        affected_endpoints: vec![],
                    });

                    diff.breaking_changes.push(BreakingChange {
                        category: BreakingChangeCategory::SchemaRemoved,
                        message: format!("Schema '{name}' was removed"),
                        location: format!("#/components/schemas/{name}"),
                    });
                }
                ChangeType::Unchanged => {
                    diff.unchanged_schemas += 1;
                }
            }
        }

        // Build set of endpoints affected by schema changes
        let mut schema_affected_endpoints: HashSet<String> = HashSet::new();
        if let Some(g) = graph {
            for (name, change_type) in &schema_changes {
                if matches!(change_type, ChangeType::Modified(_)) {
                    schema_affected_endpoints.extend(g.get_affected_paths(name));
                }
            }
        }

        // Compare endpoints
        let old_keys: HashSet<_> = old_spec.endpoints.keys().collect();
        let new_keys: HashSet<_> = new_spec.endpoints.keys().collect();

        // Added endpoints
        for key in new_keys.difference(&old_keys) {
            let endpoint = &new_spec.endpoints[*key];
            diff.added_endpoints.push(EndpointChange {
                key: key.to_string(),
                path: endpoint.path.clone(),
                method: endpoint.method,
                operation_id: endpoint.operation_id.clone(),
                tags: endpoint.tags.clone(),
                changes: vec!["New endpoint".to_string()],
                affected_by_schemas: vec![],
            });
        }

        // Removed endpoints
        for key in old_keys.difference(&new_keys) {
            let endpoint = &old_spec.endpoints[*key];
            diff.removed_endpoints.push(EndpointChange {
                key: key.to_string(),
                path: endpoint.path.clone(),
                method: endpoint.method,
                operation_id: endpoint.operation_id.clone(),
                tags: endpoint.tags.clone(),
                changes: vec!["Endpoint removed".to_string()],
                affected_by_schemas: vec![],
            });

            diff.breaking_changes.push(BreakingChange {
                category: BreakingChangeCategory::EndpointRemoved,
                message: format!("Endpoint '{key}' was removed"),
                location: endpoint.path.clone(),
            });
        }

        // Modified or unchanged endpoints
        for key in old_keys.intersection(&new_keys) {
            let old_endpoint = &old_spec.endpoints[*key];
            let new_endpoint = &new_spec.endpoints[*key];

            // Check if directly modified
            let direct_changes = Self::compare_endpoints(old_endpoint, new_endpoint);

            // Check if affected by schema changes
            let affected_schemas: Vec<String> = new_endpoint
                .schema_refs
                .iter()
                .filter(|s| {
                    schema_changes.get(*s).is_some_and(|c| {
                        matches!(c, ChangeType::Modified(_))
                    })
                })
                .cloned()
                .collect();

            if !direct_changes.is_empty() || !affected_schemas.is_empty() {
                let mut all_changes = direct_changes;
                for schema in &affected_schemas {
                    all_changes.push(format!("Affected by schema change: {schema}"));
                }

                diff.modified_endpoints.push(EndpointChange {
                    key: key.to_string(),
                    path: new_endpoint.path.clone(),
                    method: new_endpoint.method,
                    operation_id: new_endpoint.operation_id.clone(),
                    tags: new_endpoint.tags.clone(),
                    changes: all_changes,
                    affected_by_schemas: affected_schemas,
                });
            } else {
                diff.unchanged_endpoints += 1;
            }
        }

        diff
    }

    /// Compare schemas and return change type for each
    fn compare_schemas(
        old_spec: &ParsedSpec,
        new_spec: &ParsedSpec,
    ) -> HashMap<String, ChangeType> {
        let mut changes = HashMap::new();

        let old_names: HashSet<_> = old_spec.schemas.keys().collect();
        let new_names: HashSet<_> = new_spec.schemas.keys().collect();

        // Added
        for name in new_names.difference(&old_names) {
            changes.insert((*name).clone(), ChangeType::Added);
        }

        // Removed
        for name in old_names.difference(&new_names) {
            changes.insert((*name).clone(), ChangeType::Removed);
        }

        // Modified or unchanged
        for name in old_names.intersection(&new_names) {
            let old_schema = &old_spec.schemas[*name];
            let new_schema = &new_spec.schemas[*name];

            if old_schema.hash != new_schema.hash {
                let field_changes = Self::compare_schema_details(old_schema, new_schema);
                changes.insert((*name).clone(), ChangeType::Modified(field_changes));
            } else {
                changes.insert((*name).clone(), ChangeType::Unchanged);
            }
        }

        changes
    }

    /// Compare two schemas in detail
    fn compare_schema_details(old: &Schema, new: &Schema) -> Vec<String> {
        let mut changes = Vec::new();

        // Compare refs
        let old_refs: HashSet<_> = old.refs.iter().collect();
        let new_refs: HashSet<_> = new.refs.iter().collect();

        for added in new_refs.difference(&old_refs) {
            changes.push(format!("Added reference to {added}"));
        }

        for removed in old_refs.difference(&new_refs) {
            changes.push(format!("Removed reference to {removed}"));
        }

        // Generic change if hash different but refs same
        if changes.is_empty() {
            changes.push("Schema definition changed".to_string());
        }

        changes
    }

    /// Compare two endpoints
    fn compare_endpoints(old: &Endpoint, new: &Endpoint) -> Vec<String> {
        let mut changes = Vec::new();

        // Hash comparison for quick check
        if old.hash == new.hash {
            return changes;
        }

        // Compare parameters
        let old_params: HashMap<_, _> = old
            .parameters
            .iter()
            .map(|p| (&p.name, p))
            .collect();
        let new_params: HashMap<_, _> = new
            .parameters
            .iter()
            .map(|p| (&p.name, p))
            .collect();

        for (name, param) in &new_params {
            if !old_params.contains_key(name) && param.required {
                changes.push(format!("Added required parameter: {name}"));
            }
        }

        for name in old_params.keys() {
            if !new_params.contains_key(name) {
                changes.push(format!("Removed parameter: {name}"));
            }
        }

        // Compare request body
        match (&old.request_body, &new.request_body) {
            (None, Some(_)) => changes.push("Added request body".to_string()),
            (Some(_), None) => changes.push("Removed request body".to_string()),
            (Some(old_body), Some(new_body)) => {
                if old_body.schema_ref != new_body.schema_ref {
                    changes.push("Request body schema changed".to_string());
                }
            }
            _ => {}
        }

        // Compare responses
        let old_responses: HashSet<_> = old.responses.keys().collect();
        let new_responses: HashSet<_> = new.responses.keys().collect();

        for status in new_responses.difference(&old_responses) {
            changes.push(format!("Added response: {status}"));
        }

        for status in old_responses.difference(&new_responses) {
            changes.push(format!("Removed response: {status}"));
        }

        // If no specific changes but hash different
        if changes.is_empty() {
            changes.push("Endpoint definition changed".to_string());
        }

        changes
    }
}

enum ChangeType {
    Added,
    Modified(Vec<String>),
    Removed,
    Unchanged,
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_breaking_change_detection() {
        // Test would create two specs and verify breaking changes are detected
    }
}
