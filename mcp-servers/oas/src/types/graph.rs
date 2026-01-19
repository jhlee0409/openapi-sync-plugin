//! Dependency graph types for tracking schema-path relationships

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Direction for dependency queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum DependencyDirection {
    #[default]
    /// Find what depends on this (downstream)
    Downstream,
    /// Find what this depends on (upstream)
    Upstream,
    /// Both directions
    Both,
}

/// Dependency graph tracking relationships between schemas and paths
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DependencyGraph {
    /// Schema → Paths that use this schema
    #[serde(default)]
    schema_to_paths: HashMap<String, HashSet<String>>,

    /// Path → Schemas used by this path
    #[serde(default)]
    path_to_schemas: HashMap<String, HashSet<String>>,

    /// Schema → Other schemas this schema references
    #[serde(default)]
    schema_to_schemas: HashMap<String, HashSet<String>>,

    /// Schema → Schemas that reference this schema
    #[serde(default)]
    schema_refs: HashMap<String, HashSet<String>>,
}

impl DependencyGraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a path -> schema dependency
    pub fn add_path_schema_dep(&mut self, path: &str, schema: &str) {
        self.path_to_schemas
            .entry(path.to_string())
            .or_default()
            .insert(schema.to_string());

        self.schema_to_paths
            .entry(schema.to_string())
            .or_default()
            .insert(path.to_string());
    }

    /// Add a schema -> schema dependency
    pub fn add_schema_schema_dep(&mut self, from_schema: &str, to_schema: &str) {
        self.schema_to_schemas
            .entry(from_schema.to_string())
            .or_default()
            .insert(to_schema.to_string());

        self.schema_refs
            .entry(to_schema.to_string())
            .or_default()
            .insert(from_schema.to_string());
    }

    /// Get all paths that use a schema (directly or indirectly)
    pub fn get_affected_paths(&self, schema: &str) -> HashSet<String> {
        let mut affected = HashSet::new();
        let mut visited = HashSet::new();
        self.collect_affected_paths_recursive(schema, &mut affected, &mut visited);
        affected
    }

    fn collect_affected_paths_recursive(
        &self,
        schema: &str,
        affected: &mut HashSet<String>,
        visited: &mut HashSet<String>,
    ) {
        if visited.contains(schema) {
            return;
        }
        visited.insert(schema.to_string());

        // Direct paths using this schema
        if let Some(paths) = self.schema_to_paths.get(schema) {
            affected.extend(paths.clone());
        }

        // Schemas that reference this schema (upstream dependents)
        if let Some(refs) = self.schema_refs.get(schema) {
            for ref_schema in refs {
                self.collect_affected_paths_recursive(ref_schema, affected, visited);
            }
        }
    }

    /// Get all schemas used by a path (directly or indirectly)
    pub fn get_path_schemas(&self, path: &str) -> HashSet<String> {
        let mut schemas = HashSet::new();

        if let Some(direct) = self.path_to_schemas.get(path) {
            for schema in direct {
                self.collect_schema_deps_recursive(schema, &mut schemas, &mut HashSet::new());
            }
        }

        schemas
    }

    fn collect_schema_deps_recursive(
        &self,
        schema: &str,
        collected: &mut HashSet<String>,
        visited: &mut HashSet<String>,
    ) {
        if visited.contains(schema) {
            return;
        }
        visited.insert(schema.to_string());
        collected.insert(schema.to_string());

        // Schemas this schema depends on
        if let Some(deps) = self.schema_to_schemas.get(schema) {
            for dep in deps {
                self.collect_schema_deps_recursive(dep, collected, visited);
            }
        }
    }

    /// Get schemas that depend on a given schema
    pub fn get_schema_dependents(&self, schema: &str) -> HashSet<String> {
        let mut dependents = HashSet::new();
        self.collect_schema_dependents_recursive(schema, &mut dependents, &mut HashSet::new());
        dependents
    }

    fn collect_schema_dependents_recursive(
        &self,
        schema: &str,
        dependents: &mut HashSet<String>,
        visited: &mut HashSet<String>,
    ) {
        if visited.contains(schema) {
            return;
        }
        visited.insert(schema.to_string());

        if let Some(refs) = self.schema_refs.get(schema) {
            for ref_schema in refs {
                dependents.insert(ref_schema.clone());
                self.collect_schema_dependents_recursive(ref_schema, dependents, visited);
            }
        }
    }

    /// Query dependencies
    pub fn query(
        &self,
        target: &str,
        direction: DependencyDirection,
        is_schema: bool,
    ) -> DependencyQueryResult {
        let mut result = DependencyQueryResult {
            target: target.to_string(),
            is_schema,
            direction,
            affected_paths: HashSet::new(),
            affected_schemas: HashSet::new(),
            dependency_chain: Vec::new(),
        };

        if is_schema {
            match direction {
                DependencyDirection::Downstream => {
                    result.affected_paths = self.get_affected_paths(target);
                    result.affected_schemas = self.get_schema_dependents(target);
                }
                DependencyDirection::Upstream => {
                    if let Some(deps) = self.schema_to_schemas.get(target) {
                        result.affected_schemas = deps.clone();
                    }
                }
                DependencyDirection::Both => {
                    result.affected_paths = self.get_affected_paths(target);
                    result.affected_schemas = self.get_schema_dependents(target);
                    if let Some(deps) = self.schema_to_schemas.get(target) {
                        result.affected_schemas.extend(deps.clone());
                    }
                }
            }
        } else {
            // Target is a path
            result.affected_schemas = self.get_path_schemas(target);
        }

        result
    }

    /// Get statistics about the graph
    pub fn stats(&self) -> GraphStats {
        GraphStats {
            total_schemas: self.schema_to_paths.len(),
            total_paths: self.path_to_schemas.len(),
            schema_to_path_edges: self.schema_to_paths.values().map(|v| v.len()).sum(),
            schema_to_schema_edges: self.schema_to_schemas.values().map(|v| v.len()).sum(),
        }
    }
}

/// Result of a dependency query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyQueryResult {
    pub target: String,
    pub is_schema: bool,
    #[serde(skip)]
    #[allow(dead_code)]
    pub direction: DependencyDirection,
    pub affected_paths: HashSet<String>,
    pub affected_schemas: HashSet<String>,
    pub dependency_chain: Vec<String>,
}

/// Statistics about the dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphStats {
    pub total_schemas: usize,
    pub total_paths: usize,
    pub schema_to_path_edges: usize,
    pub schema_to_schema_edges: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_affected_paths() {
        let mut graph = DependencyGraph::new();

        // User schema used by /users and /posts
        graph.add_path_schema_dep("GET:/users", "User");
        graph.add_path_schema_dep("GET:/users/{id}", "User");
        graph.add_path_schema_dep("GET:/posts/{id}", "Post");

        // Post references User (author)
        graph.add_schema_schema_dep("Post", "User");

        // When User changes, /users, /users/{id}, and /posts/{id} should be affected
        let affected = graph.get_affected_paths("User");
        assert!(affected.contains("GET:/users"));
        assert!(affected.contains("GET:/users/{id}"));
        assert!(affected.contains("GET:/posts/{id}")); // Via Post -> User
    }
}
