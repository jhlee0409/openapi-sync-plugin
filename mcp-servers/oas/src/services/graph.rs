//! Dependency graph builder service

use crate::types::{DependencyGraph, ParsedSpec};

/// Build a dependency graph from a parsed OpenAPI spec
pub struct GraphBuilder;

impl GraphBuilder {
    /// Build dependency graph from parsed spec
    pub fn build(spec: &ParsedSpec) -> DependencyGraph {
        let mut graph = DependencyGraph::new();

        // Add schema -> schema dependencies
        for (name, schema) in &spec.schemas {
            for ref_name in &schema.refs {
                graph.add_schema_schema_dep(name, ref_name);
            }
        }

        // Add path -> schema dependencies
        for (key, endpoint) in &spec.endpoints {
            for schema_ref in &endpoint.schema_refs {
                graph.add_path_schema_dep(key, schema_ref);
            }
        }

        graph
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use std::collections::HashMap;

    fn create_test_spec() -> ParsedSpec {
        let mut schemas = HashMap::new();
        let mut endpoints = HashMap::new();

        // User schema
        schemas.insert(
            "User".to_string(),
            Schema {
                name: "User".to_string(),
                schema_type: SchemaType::Object {
                    properties: HashMap::new(),
                    required: vec![],
                },
                description: None,
                refs: vec![],
                hash: "abc123".to_string(),
            },
        );

        // Post schema that references User
        schemas.insert(
            "Post".to_string(),
            Schema {
                name: "Post".to_string(),
                schema_type: SchemaType::Object {
                    properties: HashMap::new(),
                    required: vec![],
                },
                description: None,
                refs: vec!["User".to_string()],
                hash: "def456".to_string(),
            },
        );

        // Comment schema that references User and Post
        schemas.insert(
            "Comment".to_string(),
            Schema {
                name: "Comment".to_string(),
                schema_type: SchemaType::Object {
                    properties: HashMap::new(),
                    required: vec![],
                },
                description: None,
                refs: vec!["User".to_string(), "Post".to_string()],
                hash: "ghi789".to_string(),
            },
        );

        // GET /users endpoint
        endpoints.insert(
            "get:/users".to_string(),
            Endpoint {
                path: "/users".to_string(),
                method: HttpMethod::Get,
                operation_id: Some("getUsers".to_string()),
                summary: None,
                description: None,
                tags: vec!["users".to_string()],
                parameters: vec![],
                request_body: None,
                responses: HashMap::new(),
                deprecated: false,
                hash: "ep1".to_string(),
                schema_refs: vec!["User".to_string()],
            },
        );

        // GET /posts endpoint
        endpoints.insert(
            "get:/posts".to_string(),
            Endpoint {
                path: "/posts".to_string(),
                method: HttpMethod::Get,
                operation_id: Some("getPosts".to_string()),
                summary: None,
                description: None,
                tags: vec!["posts".to_string()],
                parameters: vec![],
                request_body: None,
                responses: HashMap::new(),
                deprecated: false,
                hash: "ep2".to_string(),
                schema_refs: vec!["Post".to_string()],
            },
        );

        // GET /comments endpoint
        endpoints.insert(
            "get:/comments".to_string(),
            Endpoint {
                path: "/comments".to_string(),
                method: HttpMethod::Get,
                operation_id: Some("getComments".to_string()),
                summary: None,
                description: None,
                tags: vec!["comments".to_string()],
                parameters: vec![],
                request_body: None,
                responses: HashMap::new(),
                deprecated: false,
                hash: "ep3".to_string(),
                schema_refs: vec!["Comment".to_string()],
            },
        );

        ParsedSpec {
            metadata: SpecMetadata {
                title: "Test API".to_string(),
                version: "1.0.0".to_string(),
                description: None,
                openapi_version: OpenApiVersion::OpenApi30,
                endpoint_count: 3,
                schema_count: 3,
                tag_count: 3,
            },
            endpoints,
            schemas,
            tags: vec!["users".to_string(), "posts".to_string(), "comments".to_string()],
            spec_hash: "spec123".to_string(),
            source: "test.yaml".to_string(),
        }
    }

    #[test]
    fn test_graph_building() {
        let spec = create_test_spec();
        let graph = GraphBuilder::build(&spec);

        // User change should affect /users, /posts (via Post), /comments (via Comment)
        let affected = graph.get_affected_paths("User");
        assert!(affected.contains("get:/users"));
        assert!(affected.contains("get:/posts")); // Post -> User
        assert!(affected.contains("get:/comments")); // Comment -> User
    }

    #[test]
    fn test_schema_dependents() {
        let spec = create_test_spec();
        let graph = GraphBuilder::build(&spec);

        // User is referenced by Post and Comment
        let dependents = graph.get_schema_dependents("User");
        assert!(dependents.contains("Post"));
        assert!(dependents.contains("Comment"));
    }
}
