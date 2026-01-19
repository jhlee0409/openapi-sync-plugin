//! OAS MCP Server - OpenAPI Sync MCP Server
//!
//! A high-performance MCP server for parsing, validating, and generating code
//! from OpenAPI specifications with full dependency tracking.
//!
//! Implements MCP protocol directly via JSON-RPC 2.0 over stdio.

mod services;
mod tools;
mod types;
mod utils;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{BufRead, Write};
use tracing::{debug, error, info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::tools::{diff_specs, generate_code, get_status, parse_spec, query_deps};

// ===== JSON-RPC Types =====

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct JsonRpcRequest {
    jsonrpc: String,  // Required by JSON-RPC spec, validated by serde
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

impl JsonRpcResponse {
    fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    fn error(id: Value, code: i32, message: String) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message,
                data: None,
            }),
        }
    }
}

// ===== MCP Protocol Handler =====

struct McpServer;

impl McpServer {
    fn new() -> Self {
        Self
    }

    async fn handle_request(&self, request: JsonRpcRequest) -> Option<JsonRpcResponse> {
        let id = request.id.clone().unwrap_or(Value::Null);

        // Notifications (no id) don't get responses
        if request.id.is_none() {
            debug!("Received notification: {}", request.method);
            return None;
        }

        let result = match request.method.as_str() {
            "initialize" => self.handle_initialize(&request.params),
            "initialized" => return None, // Notification
            "tools/list" => self.handle_tools_list(),
            "tools/call" => self.handle_tools_call(&request.params).await,
            "ping" => Ok(json!({})),
            _ => Err((
                -32601,
                format!("Method not found: {}", request.method),
            )),
        };

        Some(match result {
            Ok(value) => JsonRpcResponse::success(id, value),
            Err((code, message)) => JsonRpcResponse::error(id, code, message),
        })
    }

    fn handle_initialize(&self, _params: &Value) -> Result<Value, (i32, String)> {
        Ok(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "oas-mcp",
                "version": env!("CARGO_PKG_VERSION")
            },
            "instructions": "OpenAPI Sync MCP Server - Parse, validate, and track dependencies in OpenAPI specifications."
        }))
    }

    fn handle_tools_list(&self) -> Result<Value, (i32, String)> {
        Ok(json!({
            "tools": [
                {
                    "name": "oas_parse",
                    "description": "Parse OpenAPI spec with pagination. Default format=summary returns just metadata. Use endpoints-list/schemas-list to discover, then endpoints/schemas for details.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "source": {
                                "type": "string",
                                "description": "URL or file path to OpenAPI spec"
                            },
                            "format": {
                                "type": "string",
                                "enum": ["summary", "endpoints-list", "schemas-list", "endpoints", "schemas", "full"],
                                "description": "Output format. summary=metadata only (default), endpoints-list/schemas-list=names only, endpoints/schemas=paginated details, full=paginated both"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max items to return (default: 50)"
                            },
                            "offset": {
                                "type": "integer",
                                "description": "Skip first N items (default: 0)"
                            },
                            "tag": {
                                "type": "string",
                                "description": "Filter endpoints by tag"
                            },
                            "path_prefix": {
                                "type": "string",
                                "description": "Filter endpoints by path prefix (e.g., /api/v1)"
                            },
                            "project_dir": {
                                "type": "string",
                                "description": "Project directory for caching"
                            },
                            "use_cache": {
                                "type": "boolean",
                                "description": "Use cached spec if available"
                            },
                            "ttl_seconds": {
                                "type": "integer",
                                "description": "Cache TTL in seconds (default: 86400 = 24 hours)"
                            }
                        },
                        "required": ["source"]
                    }
                },
                {
                    "name": "oas_deps",
                    "description": "Query dependency graph - find affected paths when schema changes. Essential for tracking impact of schema modifications.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "source": {
                                "type": "string",
                                "description": "URL or file path to OpenAPI spec"
                            },
                            "schema": {
                                "type": "string",
                                "description": "Schema name to check"
                            },
                            "path": {
                                "type": "string",
                                "description": "Path to check dependencies for"
                            },
                            "direction": {
                                "type": "string",
                                "enum": ["upstream", "downstream", "both"],
                                "description": "Direction (default: downstream)"
                            }
                        },
                        "required": ["source"]
                    }
                },
                {
                    "name": "oas_diff",
                    "description": "Compare two OpenAPI spec versions. Shows added, modified, removed endpoints and schemas, with breaking change detection.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "old_source": {
                                "type": "string",
                                "description": "Old spec source (URL or file path)"
                            },
                            "new_source": {
                                "type": "string",
                                "description": "New spec source (URL or file path)"
                            },
                            "include_affected_paths": {
                                "type": "boolean",
                                "description": "Include affected paths analysis"
                            },
                            "breaking_only": {
                                "type": "boolean",
                                "description": "Only show breaking changes"
                            }
                        },
                        "required": ["old_source", "new_source"]
                    }
                },
                {
                    "name": "oas_status",
                    "description": "Get cached status without fetching spec. Shows metadata, coverage, and optionally checks if remote has updates.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "project_dir": {
                                "type": "string",
                                "description": "Project directory"
                            },
                            "check_remote": {
                                "type": "boolean",
                                "description": "Check if remote has updates"
                            }
                        },
                        "required": ["project_dir"]
                    }
                },
                {
                    "name": "oas_generate",
                    "description": "Generate code from OpenAPI spec. Supports TypeScript (types, fetch, axios, react-query), Rust (serde, reqwest), Python (pydantic, httpx). Claude analyzes your codebase style, then passes style config here.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "source": {
                                "type": "string",
                                "description": "URL or file path to OpenAPI spec"
                            },
                            "target": {
                                "type": "string",
                                "enum": ["typescript-types", "typescript-fetch", "typescript-axios", "typescript-react-query", "rust-serde", "rust-reqwest", "python-pydantic", "python-httpx"],
                                "description": "Target language/framework"
                            },
                            "style": {
                                "type": "object",
                                "description": "Code style config (from Claude's analysis)",
                                "properties": {
                                    "type_naming": {
                                        "type": "string",
                                        "enum": ["PascalCase", "camelCase", "snake_case"],
                                        "description": "Naming convention for types"
                                    },
                                    "property_naming": {
                                        "type": "string",
                                        "enum": ["PascalCase", "camelCase", "snake_case"],
                                        "description": "Naming convention for properties"
                                    },
                                    "function_naming": {
                                        "type": "string",
                                        "enum": ["PascalCase", "camelCase", "snake_case"],
                                        "description": "Naming convention for functions"
                                    },
                                    "generate_docs": {
                                        "type": "boolean",
                                        "description": "Generate JSDoc/docstrings"
                                    },
                                    "base_url_env": {
                                        "type": "string",
                                        "description": "Environment variable name for base URL"
                                    },
                                    "type_mappings": {
                                        "type": "object",
                                        "description": "Custom type mappings (OpenAPI type -> target type)"
                                    }
                                }
                            },
                            "schemas": {
                                "type": "array",
                                "items": { "type": "string" },
                                "description": "Specific schemas to generate (empty = all)"
                            },
                            "endpoints": {
                                "type": "array",
                                "items": { "type": "string" },
                                "description": "Specific endpoints to generate (empty = all)"
                            }
                        },
                        "required": ["source", "target"]
                    }
                }
            ]
        }))
    }

    async fn handle_tools_call(&self, params: &Value) -> Result<Value, (i32, String)> {
        let name = params
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or((-32602, "Missing tool name".to_string()))?;

        let args = params
            .get("arguments")
            .cloned()
            .unwrap_or(json!({}));

        let result = match name {
            "oas_parse" => self.call_oas_parse(&args).await,
            "oas_deps" => self.call_oas_deps(&args).await,
            "oas_diff" => self.call_oas_diff(&args).await,
            "oas_status" => self.call_oas_status(&args).await,
            "oas_generate" => self.call_oas_generate(&args).await,
            _ => return Err((-32602, format!("Unknown tool: {name}"))),
        };

        match result {
            Ok(content) => Ok(json!({
                "content": [{
                    "type": "text",
                    "text": content
                }]
            })),
            Err(e) => Ok(json!({
                "content": [{
                    "type": "text",
                    "text": e
                }],
                "isError": true
            })),
        }
    }

    async fn call_oas_parse(&self, args: &Value) -> Result<String, String> {
        let source = args
            .get("source")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: source")?
            .to_string();

        let format = args.get("format").and_then(|v| v.as_str());
        let project_dir = args.get("project_dir").and_then(|v| v.as_str()).map(String::from);
        let use_cache = args.get("use_cache").and_then(|v| v.as_bool()).unwrap_or(false);
        let ttl_seconds = args.get("ttl_seconds").and_then(|v| v.as_u64());
        let limit = args.get("limit").and_then(|v| v.as_u64()).map(|v| v as usize);
        let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
        let tag = args.get("tag").and_then(|v| v.as_str()).map(String::from);
        let path_prefix = args.get("path_prefix").and_then(|v| v.as_str()).map(String::from);

        let input = tools::ParseInput {
            source,
            format: match format {
                Some("endpoints-list") => tools::ParseFormat::EndpointsList,
                Some("schemas-list") => tools::ParseFormat::SchemasList,
                Some("endpoints") => tools::ParseFormat::Endpoints,
                Some("schemas") => tools::ParseFormat::Schemas,
                Some("full") => tools::ParseFormat::Full,
                _ => tools::ParseFormat::Summary, // Default to summary (minimal)
            },
            project_dir,
            use_cache,
            ttl_seconds,
            limit,
            offset,
            tag,
            path_prefix,
        };

        let result = parse_spec(input).await;
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
    }

    async fn call_oas_deps(&self, args: &Value) -> Result<String, String> {
        let source = args
            .get("source")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: source")?
            .to_string();

        let schema = args.get("schema").and_then(|v| v.as_str()).map(String::from);
        let path = args.get("path").and_then(|v| v.as_str()).map(String::from);
        let direction = args.get("direction").and_then(|v| v.as_str());

        let input = tools::DepsInput {
            source,
            schema,
            path,
            direction: match direction {
                Some("upstream") => tools::DepsDirection::Upstream,
                Some("both") => tools::DepsDirection::Both,
                _ => tools::DepsDirection::Downstream,
            },
        };

        let result = query_deps(input).await;
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
    }

    async fn call_oas_diff(&self, args: &Value) -> Result<String, String> {
        let old_source = args
            .get("old_source")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: old_source")?
            .to_string();

        let new_source = args
            .get("new_source")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: new_source")?
            .to_string();

        let include_affected_paths = args
            .get("include_affected_paths")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        let breaking_only = args
            .get("breaking_only")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let input = tools::DiffInput {
            old_source,
            new_source,
            include_affected_paths,
            breaking_only,
        };

        let result = diff_specs(input).await;
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
    }

    async fn call_oas_status(&self, args: &Value) -> Result<String, String> {
        let project_dir = args
            .get("project_dir")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: project_dir")?
            .to_string();

        let check_remote = args
            .get("check_remote")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let input = tools::StatusInput {
            project_dir,
            check_remote,
        };

        let result = get_status(input).await;
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
    }

    async fn call_oas_generate(&self, args: &Value) -> Result<String, String> {
        let source = args
            .get("source")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: source")?
            .to_string();

        let target = args
            .get("target")
            .and_then(|v| v.as_str())
            .ok_or("Missing required parameter: target")?;

        let target = match target {
            "typescript-types" => tools::GenerateTarget::TypescriptTypes,
            "typescript-fetch" => tools::GenerateTarget::TypescriptFetch,
            "typescript-axios" => tools::GenerateTarget::TypescriptAxios,
            "typescript-react-query" => tools::GenerateTarget::TypescriptReactQuery,
            "rust-serde" => tools::GenerateTarget::RustSerde,
            "rust-reqwest" => tools::GenerateTarget::RustReqwest,
            "python-pydantic" => tools::GenerateTarget::PythonPydantic,
            "python-httpx" => tools::GenerateTarget::PythonHttpx,
            _ => return Err(format!("Unknown target: {target}")),
        };

        let style = if let Some(style_obj) = args.get("style") {
            serde_json::from_value(style_obj.clone()).unwrap_or_default()
        } else {
            tools::CodeStyle::default()
        };

        let schemas: Vec<String> = args
            .get("schemas")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        let endpoints: Vec<String> = args
            .get("endpoints")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        let input = tools::GenerateInput {
            source,
            target,
            style,
            schemas,
            endpoints,
        };

        let result = generate_code(input).await;
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
    }
}

// ===== Main =====

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging to stderr
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_writer(std::io::stderr)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // Check for CLI commands
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        match args[1].as_str() {
            "help" | "--help" | "-h" => {
                print_help();
                return Ok(());
            }
            "version" | "--version" | "-V" => {
                println!("oas-mcp {}", env!("CARGO_PKG_VERSION"));
                return Ok(());
            }
            _ => {
                eprintln!("Unknown command: {}", args[1]);
                print_help();
                std::process::exit(1);
            }
        }
    }

    info!("Starting OAS MCP Server v{}", env!("CARGO_PKG_VERSION"));

    // Run MCP server
    let server = McpServer::new();
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to read line: {}", e);
                continue;
            }
        };

        if line.is_empty() {
            continue;
        }

        debug!("Received: {}", line);

        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let response = JsonRpcResponse::error(
                    Value::Null,
                    -32700,
                    format!("Parse error: {e}"),
                );
                let output = serde_json::to_string(&response).unwrap();
                writeln!(stdout, "{output}")?;
                stdout.flush()?;
                continue;
            }
        };

        if let Some(response) = server.handle_request(request).await {
            let output = serde_json::to_string(&response).unwrap();
            debug!("Sending: {}", output);
            writeln!(stdout, "{output}")?;
            stdout.flush()?;
        }
    }

    Ok(())
}

fn print_help() {
    println!(
        r#"OAS MCP Server - OpenAPI Sync MCP Server

USAGE:
    oas-mcp              Run as MCP server (stdio transport)
    oas-mcp help         Show this help message
    oas-mcp version      Show version

DESCRIPTION:
    A high-performance MCP server for parsing, validating, and generating
    code from OpenAPI specifications with full dependency tracking.

TOOLS:
    oas_parse    Parse and validate OpenAPI spec
    oas_deps     Query dependency graph
    oas_diff     Compare two spec versions
    oas_status   Get cached status
    oas_generate Generate code from OpenAPI spec

For more information, visit:
    https://github.com/jhlee0409/claude-plugins/tree/main/mcp-servers/oas
"#
    );
}
