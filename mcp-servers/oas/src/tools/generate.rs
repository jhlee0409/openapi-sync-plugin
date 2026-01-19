//! oas_generate tool implementation - Hybrid code generation

use crate::services::{GraphBuilder, OpenApiParser};
use crate::types::{Endpoint, ParameterLocation, Schema, SchemaType};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct GenerateInput {
    /// OpenAPI spec source (URL or file path)
    pub source: String,
    /// Target language/framework
    pub target: GenerateTarget,
    /// Code style configuration (from Claude's analysis)
    #[serde(default)]
    pub style: CodeStyle,
    /// Specific schemas to generate (empty = all)
    #[serde(default)]
    pub schemas: Vec<String>,
    /// Specific endpoints to generate (empty = all)
    #[serde(default)]
    pub endpoints: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "kebab-case")]
pub enum GenerateTarget {
    /// TypeScript types only
    TypescriptTypes,
    /// TypeScript with fetch client
    TypescriptFetch,
    /// TypeScript with axios client
    TypescriptAxios,
    /// TypeScript with React Query hooks
    TypescriptReactQuery,
    /// Rust types with serde
    RustSerde,
    /// Rust with reqwest client
    RustReqwest,
    /// Python types with Pydantic
    PythonPydantic,
    /// Python with httpx client
    PythonHttpx,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct CodeStyle {
    /// Naming convention for types (PascalCase, camelCase, snake_case)
    #[serde(default)]
    pub type_naming: NamingConvention,
    /// Naming convention for properties
    #[serde(default)]
    pub property_naming: NamingConvention,
    /// Naming convention for functions/methods
    #[serde(default)]
    pub function_naming: NamingConvention,
    /// Generate JSDoc/docstrings
    #[serde(default)]
    pub generate_docs: bool,
    /// Custom type mappings (OpenAPI type -> target type)
    #[serde(default)]
    pub type_mappings: HashMap<String, String>,
    /// Base URL environment variable name
    #[serde(default)]
    pub base_url_env: Option<String>,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
#[allow(clippy::enum_variant_names)]
pub enum NamingConvention {
    #[default]
    PascalCase,
    CamelCase,
    SnakeCase,
    ScreamingSnakeCase,
}

#[derive(Debug, Serialize)]
pub struct GenerateOutput {
    pub success: bool,
    pub generated_files: Vec<GeneratedFile>,
    pub summary: GenerateSummary,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GeneratedFile {
    pub path: String,
    pub content: String,
    pub file_type: FileType,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FileType {
    Types,
    Client,
    Hooks,
    Index,
}

#[derive(Debug, Serialize)]
pub struct GenerateSummary {
    pub types_generated: usize,
    pub endpoints_generated: usize,
    pub files_created: usize,
    pub target: String,
}

// ===== Simplified views for code generation =====

struct SimpleSchema {
    name: String,
    description: Option<String>,
    properties: Vec<SimpleProperty>,
}

struct SimpleProperty {
    name: String,
    schema_type: String,
    format: Option<String>,
    required: bool,
    description: Option<String>,
    is_array: bool,
    is_ref: bool,
}

struct SimpleEndpoint {
    path: String,
    method: String,
    operation_id: String,
    summary: Option<String>,
    path_params: Vec<String>,
    query_params: Vec<String>,
    request_body_schema: Option<String>,
    response_schema: Option<String>,
}

/// Generate code from OpenAPI spec with style configuration
pub async fn generate_code(input: GenerateInput) -> GenerateOutput {
    // Parse spec
    let spec = match OpenApiParser::parse(&input.source).await {
        Ok(s) => s,
        Err(e) => {
            return GenerateOutput {
                success: false,
                generated_files: vec![],
                summary: GenerateSummary {
                    types_generated: 0,
                    endpoints_generated: 0,
                    files_created: 0,
                    target: format!("{:?}", input.target),
                },
                error: Some(format!("Failed to parse spec: {e}")),
            };
        }
    };

    // Build dependency graph for proper ordering (not currently used but available)
    let _graph = GraphBuilder::build(&spec);

    // Convert to simple views
    let schemas: Vec<SimpleSchema> = spec
        .schemas
        .iter()
        .filter(|(name, _)| input.schemas.is_empty() || input.schemas.contains(name))
        .map(|(_, schema)| simplify_schema(schema))
        .collect();

    let endpoints: Vec<SimpleEndpoint> = spec
        .endpoints
        .iter()
        .filter(|(key, _)| {
            if input.endpoints.is_empty() {
                return true;
            }
            input.endpoints.iter().any(|e| key.contains(e))
        })
        .map(|(_, endpoint)| simplify_endpoint(endpoint))
        .collect();

    // Generate based on target
    let generated_files = match input.target {
        GenerateTarget::TypescriptTypes => {
            generate_typescript_types(&schemas, &input.style)
        }
        GenerateTarget::TypescriptFetch => {
            let mut files = generate_typescript_types(&schemas, &input.style);
            files.extend(generate_typescript_fetch_client(&endpoints, &input.style));
            files.push(generate_index_ts());
            files
        }
        GenerateTarget::TypescriptAxios => {
            let mut files = generate_typescript_types(&schemas, &input.style);
            files.extend(generate_typescript_axios_client(&endpoints, &input.style));
            files.push(generate_index_ts());
            files
        }
        GenerateTarget::TypescriptReactQuery => {
            let mut files = generate_typescript_types(&schemas, &input.style);
            files.extend(generate_typescript_fetch_client(&endpoints, &input.style));
            files.extend(generate_react_query_hooks(&endpoints, &input.style));
            files.push(generate_index_ts_with_hooks());
            files
        }
        GenerateTarget::RustSerde => {
            generate_rust_types(&schemas, &input.style)
        }
        GenerateTarget::RustReqwest => {
            let mut files = generate_rust_types(&schemas, &input.style);
            files.extend(generate_rust_reqwest_client(&endpoints, &input.style));
            files.push(generate_rust_mod());
            files
        }
        GenerateTarget::PythonPydantic => {
            generate_python_types(&schemas, &input.style)
        }
        GenerateTarget::PythonHttpx => {
            let mut files = generate_python_types(&schemas, &input.style);
            files.extend(generate_python_httpx_client(&endpoints, &input.style));
            files.push(generate_python_init());
            files
        }
    };

    let summary = GenerateSummary {
        types_generated: schemas.len(),
        endpoints_generated: endpoints.len(),
        files_created: generated_files.len(),
        target: format!("{:?}", input.target),
    };

    GenerateOutput {
        success: true,
        generated_files,
        summary,
        error: None,
    }
}

// ===== Schema Simplification =====

fn simplify_schema(schema: &Schema) -> SimpleSchema {
    let properties = extract_properties(&schema.schema_type);

    SimpleSchema {
        name: schema.name.clone(),
        description: schema.description.clone(),
        properties,
    }
}

fn extract_properties(schema_type: &SchemaType) -> Vec<SimpleProperty> {
    match schema_type {
        SchemaType::Object { properties, required } => {
            properties
                .iter()
                .map(|(name, prop_type)| {
                    let (base_type, format, is_array, is_ref) = extract_type_info(prop_type);
                    SimpleProperty {
                        name: name.clone(),
                        schema_type: base_type,
                        format,
                        required: required.contains(name),
                        description: None,
                        is_array,
                        is_ref,
                    }
                })
                .collect()
        }
        SchemaType::AllOf { variants } => {
            // Merge all properties from allOf variants
            variants
                .iter()
                .flat_map(extract_properties)
                .collect()
        }
        _ => vec![],
    }
}

fn extract_type_info(schema_type: &SchemaType) -> (String, Option<String>, bool, bool) {
    match schema_type {
        SchemaType::String { format, .. } => ("string".to_string(), format.clone(), false, false),
        SchemaType::Number { format } => ("number".to_string(), format.clone(), false, false),
        SchemaType::Integer { format } => ("integer".to_string(), format.clone(), false, false),
        SchemaType::Boolean => ("boolean".to_string(), None, false, false),
        SchemaType::Array { items } => {
            let (inner, format, _, is_ref) = extract_type_info(items);
            (inner, format, true, is_ref)
        }
        SchemaType::Ref { reference } => (reference.clone(), None, false, true),
        SchemaType::Object { .. } => ("object".to_string(), None, false, false),
        _ => ("unknown".to_string(), None, false, false),
    }
}

fn simplify_endpoint(endpoint: &Endpoint) -> SimpleEndpoint {
    let path_params: Vec<String> = endpoint
        .parameters
        .iter()
        .filter(|p| p.location == ParameterLocation::Path)
        .map(|p| p.name.clone())
        .collect();

    let query_params: Vec<String> = endpoint
        .parameters
        .iter()
        .filter(|p| p.location == ParameterLocation::Query)
        .map(|p| p.name.clone())
        .collect();

    let request_body_schema = endpoint
        .request_body
        .as_ref()
        .and_then(|rb| rb.schema_ref.clone());

    let response_schema = endpoint
        .responses
        .get("200")
        .or_else(|| endpoint.responses.get("201"))
        .and_then(|r| r.schema_ref.clone());

    SimpleEndpoint {
        path: endpoint.path.clone(),
        method: endpoint.method.to_string(),
        operation_id: endpoint.effective_operation_id(),
        summary: endpoint.summary.clone(),
        path_params,
        query_params,
        request_body_schema,
        response_schema,
    }
}

// ===== TypeScript Generators =====

fn generate_typescript_types(schemas: &[SimpleSchema], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    if style.generate_docs {
        content.push_str("/**\n * Auto-generated TypeScript types from OpenAPI spec\n * @generated\n */\n\n");
    }

    for schema in schemas {
        if style.generate_docs {
            if let Some(desc) = &schema.description {
                content.push_str(&format!("/** {desc} */\n"));
            }
        }

        let type_name = convert_name(&schema.name, &style.type_naming);

        if schema.properties.is_empty() {
            content.push_str(&format!("export type {type_name} = Record<string, unknown>;\n\n"));
            continue;
        }

        content.push_str(&format!("export interface {type_name} {{\n"));

        for prop in &schema.properties {
            let prop_name = convert_name(&prop.name, &style.property_naming);
            let ts_type = to_typescript_type(prop, style);
            let optional = if prop.required { "" } else { "?" };

            if style.generate_docs {
                if let Some(desc) = &prop.description {
                    content.push_str(&format!("  /** {desc} */\n"));
                }
            }
            content.push_str(&format!("  {prop_name}{optional}: {ts_type};\n"));
        }

        content.push_str("}\n\n");
    }

    vec![GeneratedFile {
        path: "types.ts".to_string(),
        content,
        file_type: FileType::Types,
    }]
}

fn generate_typescript_fetch_client(endpoints: &[SimpleEndpoint], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();
    let base_url = style.base_url_env.as_deref().unwrap_or("API_BASE_URL");

    content.push_str(&format!(
        r#"import type * as Types from './types';

const BASE_URL = process.env.{base_url} || '';

async function request<T>(path: string, options: RequestInit = {{}}): Promise<T> {{
  const response = await fetch(`${{BASE_URL}}${{path}}`, {{
    ...options,
    headers: {{
      'Content-Type': 'application/json',
      ...options.headers,
    }},
  }});

  if (!response.ok) {{
    throw new Error(`HTTP error! status: ${{response.status}}`);
  }}

  return response.json();
}}

"#));

    for endpoint in endpoints {
        let func_name = convert_name(&endpoint.operation_id, &style.function_naming);

        let return_type = endpoint
            .response_schema
            .as_ref()
            .map(|s| format!("Types.{}", convert_name(s, &style.type_naming)))
            .unwrap_or_else(|| "void".to_string());

        // Build parameters
        let mut params: Vec<String> = endpoint
            .path_params
            .iter()
            .map(|p| format!("{}: string", convert_name(p, &style.property_naming)))
            .collect();

        if let Some(ref body_schema) = endpoint.request_body_schema {
            params.push(format!("body: Types.{}", convert_name(body_schema, &style.type_naming)));
        }

        if !endpoint.query_params.is_empty() {
            params.push("params?: Record<string, string>".to_string());
        }

        let params_str = params.join(", ");

        // Build path with interpolation
        let mut path_template = endpoint.path.clone();
        for param in &endpoint.path_params {
            path_template = path_template.replace(
                &format!("{{{param}}}"),
                &format!("${{{}}}", convert_name(param, &style.property_naming))
            );
        }

        let query_str = if !endpoint.query_params.is_empty() {
            " + (params ? '?' + new URLSearchParams(params).toString() : '')"
        } else {
            ""
        };

        let body_str = if endpoint.request_body_schema.is_some() {
            ", body: JSON.stringify(body)"
        } else {
            ""
        };

        if style.generate_docs {
            if let Some(ref summary) = endpoint.summary {
                content.push_str(&format!("/** {summary} */\n"));
            }
        }

        content.push_str(&format!(
            r#"export async function {}({}): Promise<{}> {{
  return request<{}>(`{}`{}, {{ method: '{}'{} }});
}}

"#,
            func_name, params_str, return_type, return_type,
            path_template, query_str, endpoint.method, body_str
        ));
    }

    vec![GeneratedFile {
        path: "client.ts".to_string(),
        content,
        file_type: FileType::Client,
    }]
}

fn generate_typescript_axios_client(endpoints: &[SimpleEndpoint], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();
    let base_url = style.base_url_env.as_deref().unwrap_or("API_BASE_URL");

    content.push_str(&format!(
        r#"import axios from 'axios';
import type * as Types from './types';

const api = axios.create({{
  baseURL: process.env.{base_url} || '',
  headers: {{ 'Content-Type': 'application/json' }},
}});

"#));

    for endpoint in endpoints {
        let func_name = convert_name(&endpoint.operation_id, &style.function_naming);

        let return_type = endpoint
            .response_schema
            .as_ref()
            .map(|s| format!("Types.{}", convert_name(s, &style.type_naming)))
            .unwrap_or_else(|| "void".to_string());

        let mut params: Vec<String> = endpoint
            .path_params
            .iter()
            .map(|p| format!("{}: string", convert_name(p, &style.property_naming)))
            .collect();

        if let Some(ref body_schema) = endpoint.request_body_schema {
            params.push(format!("body: Types.{}", convert_name(body_schema, &style.type_naming)));
        }

        let params_str = params.join(", ");

        let mut path_template = endpoint.path.clone();
        for param in &endpoint.path_params {
            path_template = path_template.replace(
                &format!("{{{param}}}"),
                &format!("${{{}}}", convert_name(param, &style.property_naming))
            );
        }

        let method = endpoint.method.to_lowercase();
        let data_arg = if endpoint.request_body_schema.is_some() { ", body" } else { "" };

        if style.generate_docs {
            if let Some(ref summary) = endpoint.summary {
                content.push_str(&format!("/** {summary} */\n"));
            }
        }

        content.push_str(&format!(
            r#"export async function {func_name}({params_str}): Promise<{return_type}> {{
  const {{ data }} = await api.{method}<{return_type}>(`{path_template}`{data_arg});
  return data;
}}

"#
        ));
    }

    vec![GeneratedFile {
        path: "client.ts".to_string(),
        content,
        file_type: FileType::Client,
    }]
}

fn generate_react_query_hooks(endpoints: &[SimpleEndpoint], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    content.push_str(r#"import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import * as api from './client';
import type * as Types from './types';

"#);

    for endpoint in endpoints {
        let func_name = convert_name(&endpoint.operation_id, &style.function_naming);
        let hook_name = to_pascal_case(&func_name);

        let return_type = endpoint
            .response_schema
            .as_ref()
            .map(|s| format!("Types.{}", convert_name(s, &style.type_naming)))
            .unwrap_or_else(|| "void".to_string());

        let is_mutation = matches!(endpoint.method.as_str(), "POST" | "PUT" | "PATCH" | "DELETE");

        if is_mutation {
            let input_type = endpoint
                .request_body_schema
                .as_ref()
                .map(|s| format!("Types.{}", convert_name(s, &style.type_naming)))
                .unwrap_or_else(|| "void".to_string());

            content.push_str(&format!(
                r#"export function use{hook_name}(
  options?: UseMutationOptions<{return_type}, Error, {input_type}>
) {{
  return useMutation({{
    mutationFn: (data: {input_type}) => api.{func_name}(data),
    ...options,
  }});
}}

"#
            ));
        } else {
            content.push_str(&format!(
                r#"export function use{hook_name}(
  options?: Omit<UseQueryOptions<{return_type}, Error>, 'queryKey' | 'queryFn'>
) {{
  return useQuery({{
    queryKey: ['{func_name}'],
    queryFn: () => api.{func_name}(),
    ...options,
  }});
}}

"#
            ));
        }
    }

    vec![GeneratedFile {
        path: "hooks.ts".to_string(),
        content,
        file_type: FileType::Hooks,
    }]
}

fn generate_index_ts() -> GeneratedFile {
    GeneratedFile {
        path: "index.ts".to_string(),
        content: "export * from './types';\nexport * from './client';\n".to_string(),
        file_type: FileType::Index,
    }
}

fn generate_index_ts_with_hooks() -> GeneratedFile {
    GeneratedFile {
        path: "index.ts".to_string(),
        content: "export * from './types';\nexport * from './client';\nexport * from './hooks';\n".to_string(),
        file_type: FileType::Index,
    }
}

// ===== Rust Generators =====

fn generate_rust_types(schemas: &[SimpleSchema], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    content.push_str("//! Auto-generated Rust types from OpenAPI spec\n\nuse serde::{Deserialize, Serialize};\n\n");

    for schema in schemas {
        if style.generate_docs {
            if let Some(desc) = &schema.description {
                content.push_str(&format!("/// {desc}\n"));
            }
        }

        let type_name = to_pascal_case(&schema.name);
        content.push_str("#[derive(Debug, Clone, Serialize, Deserialize)]\n");
        content.push_str(&format!("pub struct {type_name} {{\n"));

        for prop in &schema.properties {
            let prop_name = to_snake_case(&prop.name);
            let rust_type = to_rust_type(prop);

            if prop_name != prop.name {
                content.push_str(&format!("    #[serde(rename = \"{}\")]\n", prop.name));
            }

            if !prop.required {
                content.push_str("    #[serde(skip_serializing_if = \"Option::is_none\")]\n");
            }

            content.push_str(&format!("    pub {prop_name}: {rust_type},\n"));
        }

        content.push_str("}\n\n");
    }

    vec![GeneratedFile {
        path: "types.rs".to_string(),
        content,
        file_type: FileType::Types,
    }]
}

fn generate_rust_reqwest_client(endpoints: &[SimpleEndpoint], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    content.push_str(r#"//! Auto-generated API client from OpenAPI spec

use reqwest::Client;
use super::types::*;

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
        }
    }

"#);

    for endpoint in endpoints {
        let func_name = to_snake_case(&endpoint.operation_id);

        let return_type = endpoint
            .response_schema
            .as_ref()
            .map(|s| to_pascal_case(s))
            .unwrap_or_else(|| "()".to_string());

        let mut params = vec!["&self".to_string()];

        for param in &endpoint.path_params {
            params.push(format!("{}: &str", to_snake_case(param)));
        }

        if let Some(ref body_schema) = endpoint.request_body_schema {
            params.push(format!("body: &{}", to_pascal_case(body_schema)));
        }

        let params_str = params.join(", ");

        let format_args: Vec<String> = endpoint.path_params.iter().map(|p| to_snake_case(p)).collect();

        let path_expr = if format_args.is_empty() {
            format!("\"{}\"", endpoint.path)
        } else {
            format!("&format!(\"{}\", {})", endpoint.path, format_args.join(", "))
        };

        let method = endpoint.method.to_lowercase();
        let body_call = if endpoint.request_body_schema.is_some() { ".json(body)" } else { "" };

        if style.generate_docs {
            if let Some(ref summary) = endpoint.summary {
                content.push_str(&format!("    /// {summary}\n"));
            }
        }

        content.push_str(&format!(
            "    pub async fn {func_name}({params_str}) -> Result<{return_type}, reqwest::Error> {{\n"
        ));
        content.push_str(&format!(
            "        let url = format!(\"{{}}{}\", self.base_url, {});\n",
            endpoint.path, path_expr
        ));
        content.push_str(&format!(
            "        self.client.{method}(&url){body_call}.send().await?.json().await\n"
        ));
        content.push_str("    }\n\n");
    }

    content.push_str("}\n");

    vec![GeneratedFile {
        path: "client.rs".to_string(),
        content,
        file_type: FileType::Client,
    }]
}

fn generate_rust_mod() -> GeneratedFile {
    GeneratedFile {
        path: "mod.rs".to_string(),
        content: "pub mod types;\npub mod client;\n\npub use types::*;\npub use client::*;\n".to_string(),
        file_type: FileType::Index,
    }
}

// ===== Python Generators =====

fn generate_python_types(schemas: &[SimpleSchema], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    content.push_str("\"\"\"Auto-generated Python types from OpenAPI spec\"\"\"\n\n");
    content.push_str("from typing import Optional, List, Any\nfrom pydantic import BaseModel, Field\n\n");

    for schema in schemas {
        let class_name = to_pascal_case(&schema.name);

        if style.generate_docs {
            if let Some(desc) = &schema.description {
                content.push_str(&format!("\nclass {class_name}(BaseModel):\n    \"\"\"{desc}\"\"\"\n"));
            } else {
                content.push_str(&format!("\nclass {class_name}(BaseModel):\n"));
            }
        } else {
            content.push_str(&format!("\nclass {class_name}(BaseModel):\n"));
        }

        if schema.properties.is_empty() {
            content.push_str("    pass\n");
            continue;
        }

        for prop in &schema.properties {
            let prop_name = to_snake_case(&prop.name);
            let py_type = to_python_type(prop);

            let field_args = if prop_name != prop.name {
                format!(" = Field(alias=\"{}\")", prop.name)
            } else if !prop.required {
                " = None".to_string()
            } else {
                String::new()
            };

            content.push_str(&format!("    {prop_name}: {py_type}{field_args}\n"));
        }
    }

    vec![GeneratedFile {
        path: "types.py".to_string(),
        content,
        file_type: FileType::Types,
    }]
}

fn generate_python_httpx_client(endpoints: &[SimpleEndpoint], style: &CodeStyle) -> Vec<GeneratedFile> {
    let mut content = String::new();

    content.push_str(r#""""Auto-generated API client from OpenAPI spec"""

import httpx
from typing import Optional
from .types import *


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient()

    async def close(self):
        await self.client.aclose()

"#);

    for endpoint in endpoints {
        let func_name = to_snake_case(&endpoint.operation_id);

        let return_type = endpoint
            .response_schema
            .as_ref()
            .map(|s| to_pascal_case(s))
            .unwrap_or_else(|| "None".to_string());

        let mut params = vec!["self".to_string()];

        for param in &endpoint.path_params {
            params.push(format!("{}: str", to_snake_case(param)));
        }

        if let Some(ref body_schema) = endpoint.request_body_schema {
            params.push(format!("body: {}", to_pascal_case(body_schema)));
        }

        let params_str = params.join(", ");
        let path_template = &endpoint.path;
        let method = endpoint.method.to_lowercase();
        let json_arg = if endpoint.request_body_schema.is_some() { ", json=body.model_dump()" } else { "" };

        if style.generate_docs {
            if let Some(ref summary) = endpoint.summary {
                content.push_str(&format!("    async def {func_name}({params_str}) -> {return_type}:\n        \"\"\"{summary}\"\"\"\n"));
            } else {
                content.push_str(&format!("    async def {func_name}({params_str}) -> {return_type}:\n"));
            }
        } else {
            content.push_str(&format!("    async def {func_name}({params_str}) -> {return_type}:\n"));
        }

        content.push_str(&format!(
            r#"        url = f"{{self.base_url}}{path_template}"
        response = await self.client.{method}(url{json_arg})
        response.raise_for_status()
        return {return_type}.model_validate(response.json())

"#
        ));
    }

    vec![GeneratedFile {
        path: "client.py".to_string(),
        content,
        file_type: FileType::Client,
    }]
}

fn generate_python_init() -> GeneratedFile {
    GeneratedFile {
        path: "__init__.py".to_string(),
        content: "from .types import *\nfrom .client import ApiClient\n".to_string(),
        file_type: FileType::Index,
    }
}

// ===== Type Converters =====

fn to_typescript_type(prop: &SimpleProperty, style: &CodeStyle) -> String {
    if let Some(custom) = style.type_mappings.get(&prop.schema_type) {
        return if prop.is_array {
            format!("{custom}[]")
        } else {
            custom.clone()
        };
    }

    let base_type = if prop.is_ref {
        convert_name(&prop.schema_type, &style.type_naming)
    } else {
        match prop.schema_type.as_str() {
            "integer" | "number" => "number".to_string(),
            "boolean" => "boolean".to_string(),
            "string" => "string".to_string(),
            "object" => "Record<string, unknown>".to_string(),
            _ => "unknown".to_string(),
        }
    };

    if prop.is_array {
        format!("{base_type}[]")
    } else {
        base_type
    }
}

fn to_rust_type(prop: &SimpleProperty) -> String {
    let base_type = if prop.is_ref {
        to_pascal_case(&prop.schema_type)
    } else {
        match (prop.schema_type.as_str(), prop.format.as_deref()) {
            ("integer", Some("int32")) => "i32".to_string(),
            ("integer", _) => "i64".to_string(),
            ("number", Some("float")) => "f32".to_string(),
            ("number", _) => "f64".to_string(),
            ("boolean", _) => "bool".to_string(),
            ("string", _) => "String".to_string(),
            ("object", _) => "serde_json::Value".to_string(),
            _ => "serde_json::Value".to_string(),
        }
    };

    let typed = if prop.is_array {
        format!("Vec<{base_type}>")
    } else {
        base_type
    };

    if prop.required {
        typed
    } else {
        format!("Option<{typed}>")
    }
}

fn to_python_type(prop: &SimpleProperty) -> String {
    let base_type = if prop.is_ref {
        format!("'{}'", to_pascal_case(&prop.schema_type))
    } else {
        match prop.schema_type.as_str() {
            "integer" => "int".to_string(),
            "number" => "float".to_string(),
            "boolean" => "bool".to_string(),
            "string" => "str".to_string(),
            "object" => "dict".to_string(),
            _ => "Any".to_string(),
        }
    };

    let typed = if prop.is_array {
        format!("List[{base_type}]")
    } else {
        base_type
    };

    if prop.required {
        typed
    } else {
        format!("Optional[{typed}]")
    }
}

// ===== Naming Helpers =====

fn convert_name(name: &str, convention: &NamingConvention) -> String {
    match convention {
        NamingConvention::PascalCase => to_pascal_case(name),
        NamingConvention::CamelCase => to_camel_case(name),
        NamingConvention::SnakeCase => to_snake_case(name),
        NamingConvention::ScreamingSnakeCase => to_snake_case(name).to_uppercase(),
    }
}

fn to_pascal_case(s: &str) -> String {
    s.split(['_', '-', ' '])
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

fn to_camel_case(s: &str) -> String {
    let pascal = to_pascal_case(s);
    let mut chars = pascal.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_lowercase().next().unwrap());
    }
    result.replace(['-', ' '], "_")
}
