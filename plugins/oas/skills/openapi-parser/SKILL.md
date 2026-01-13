---
name: openapi-parser
description: Parse OpenAPI 3.x / Swagger 2.x specs and extract endpoint information
---

# OpenAPI Parser

Parse OpenAPI specifications and extract structured endpoint information for code generation.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST perform these steps in order:

### Step 1: Load Specification

**Determine source type:**
- If source starts with `http://` or `https://` → Remote URL
- Otherwise → Local file

**For Remote URL:**
1. Use `WebFetch` tool to fetch the content
2. Extract JSON from response
3. If 404 → Error: `❌ Spec not found at URL`
4. If other error → Error: `❌ Failed to fetch: <error>`

**For Local File:**
1. Use `Read` tool to read the file
2. If `.yaml` or `.yml` extension → Parse as YAML
3. If `.json` extension or no extension → Parse as JSON
4. If file not found → Error: `❌ File not found: <path>`
5. If parse error → Error: `❌ Invalid format: <error>`

### Step 2: Validate Specification

Check for valid OpenAPI/Swagger structure:

1. **Version Check:**
   - If has `openapi` field (e.g., "3.0.0", "3.1.0") → OpenAPI 3.x
   - If has `swagger` field (e.g., "2.0") → Swagger 2.0
   - If neither → Error: `❌ Not a valid OpenAPI/Swagger spec`

2. **Required Fields:**
   - Must have `info` object with `title` and `version`
   - Must have `paths` object
   - If missing → Error: `❌ Missing required field: <field>`

3. **Report:**
   ```
   📄 OpenAPI: <title> v<version>
      Spec version: <openapi/swagger version>
      Endpoints: <count>
   ```

### Step 3: Convert Swagger 2.0 (if needed)

If Swagger 2.0, convert to OpenAPI 3.0 format internally:

| Swagger 2.0 | OpenAPI 3.0 |
|-------------|-------------|
| `definitions` | `components.schemas` |
| `parameters` (body) | `requestBody` |
| `produces`/`consumes` | `content` with media types |
| `securityDefinitions` | `components.securitySchemes` |

### Step 4: Extract Metadata

Extract and store:
```json
{
  "title": "<info.title>",
  "version": "<info.version>",
  "description": "<info.description or null>",
  "servers": ["<server urls>"],
  "specVersion": "<openapi or swagger version>"
}
```

### Step 5: Extract Endpoints

For each path in `paths` object:

1. Parse each method (GET, POST, PUT, PATCH, DELETE)
2. Extract:
   - `path`: The URL path
   - `method`: HTTP method
   - `operationId`: Unique identifier (generate if missing)
   - `tags`: Array of tags (use `["default"]` if none)
   - `summary`: Brief description
   - `description`: Full description
   - `parameters`: Path, query, header parameters
   - `requestBody`: Request body schema
   - `responses`: Response schemas by status code
   - `security`: Required security schemes

3. Generate hash for each endpoint (for change detection)

### Step 6: Resolve References

Resolve all `$ref` references:

1. Find all `$ref` strings in the spec
2. Look up the referenced schema in `components.schemas`
3. Replace reference with actual schema
4. Handle circular references:
   - Detect cycles
   - Use type name as reference instead of inlining
   - Add comment: `// Circular reference to <TypeName>`

### Step 7: Group by Tag

Organize endpoints by their primary tag:

```json
{
  "users": {
    "description": "<tag description>",
    "endpoints": [
      { "method": "GET", "path": "/users", "operationId": "listUsers" },
      { "method": "POST", "path": "/users", "operationId": "createUser" }
    ],
    "schemas": ["User", "CreateUserRequest"]
  }
}
```

### Step 8: Extract Schemas

For each schema in `components.schemas`:

1. Extract name and definition
2. Generate hash for change detection
3. Map OpenAPI types to TypeScript types
4. Record which endpoints use this schema

---

## ERROR HANDLING

For full error code reference, see [../../docs/ERROR-CODES.md](../../docs/ERROR-CODES.md).

### Invalid JSON/YAML [E201, E202]

```
Error: "[E201/E202] ❌ Failed to parse spec: <parse error message>"
Cause: Malformed JSON/YAML syntax
Fix: Validate at jsonlint.com or yamlint.com
Action: Abort and show line number if available
```

### Not a Valid OpenAPI Spec [E203]

```
Error: "[E203] ❌ Not a valid OpenAPI/Swagger specification"
Cause: Missing 'openapi' or 'swagger' field
Fix: Verify file is OpenAPI 3.x or Swagger 2.0 format
Action: Abort operation
```

### Unresolved Reference [E205]

```
Warning: "[E205] ⚠️ Unresolved reference: <$ref path>"
Cause: Reference points to non-existent definition
Fix: Check $ref path is correct
Recovery: Use `unknown` type, continue processing
```

### Circular Reference [E206]

```
Info: "[E206] ℹ️ Circular reference detected in <schema name>"
Cause: Self-referencing data structure
Recovery: Use type reference instead of inline expansion
```

### Unsupported Feature [E207]

```
Warning: "[E207] ⚠️ Unsupported feature: <feature name> (skipping)"
Features: callbacks, links, webhooks
Recovery: Skip feature, continue processing
```

### Missing operationId [E405]

```
Info: "[E405] ℹ️ Missing operationId for <method> <path>"
Recovery: Generate from method + path (e.g., `get_users_id`)
```

---

## REFERENCE: Type Mapping

| OpenAPI Type | TypeScript Type |
|--------------|-----------------|
| `string` | `string` |
| `string` (format: date, date-time) | `string` |
| `string` (format: uuid) | `string` |
| `string` (format: email) | `string` |
| `string` (format: binary) | `Blob \| File` |
| `string` (enum) | `'value1' \| 'value2'` |
| `integer` | `number` |
| `integer` (format: int64) | `number` |
| `number` | `number` |
| `boolean` | `boolean` |
| `array` | `T[]` |
| `object` | `{ [key: string]: unknown }` |
| `object` (with properties) | `{ prop1: T1; prop2?: T2 }` |
| `null` | `null` |
| `oneOf` | `T1 \| T2` |
| `anyOf` | `T1 \| T2` |
| `allOf` | `T1 & T2` |
| `$ref` | `ReferencedTypeName` |

## REFERENCE: Required vs Optional

- Property in `required` array → `propName: Type`
- Property NOT in `required` → `propName?: Type`
- Property with `nullable: true` → `propName: Type \| null`

## REFERENCE: Edge Cases

For comprehensive edge case handling (circular references, Swagger 2.0 conversion, large specs, etc.), see [../../docs/EDGE-CASES.md](../../docs/EDGE-CASES.md).

---

## OUTPUT: Parsed Spec Structure

Return this structure to the calling command:

```json
{
  "meta": {
    "title": "My API",
    "version": "2.0.0",
    "specVersion": "3.0.3",
    "servers": ["https://api.example.com"]
  },
  "hash": {
    "spec": "sha256:abc123...",
    "fetchedAt": "2024-01-13T12:00:00Z",
    "source": "https://api.example.com/openapi.json"
  },
  "tags": {
    "users": {
      "description": "User management",
      "endpoints": [
        {
          "method": "GET",
          "path": "/users/{id}",
          "operationId": "getUser",
          "hash": "a1b2c3d4",
          "parameters": [...],
          "responses": {...}
        }
      ],
      "schemas": ["User", "GetUserRequest"]
    }
  },
  "schemas": {
    "User": {
      "hash": "x1y2z3",
      "definition": {
        "type": "object",
        "properties": {...},
        "required": [...]
      }
    }
  },
  "stats": {
    "endpointCount": 25,
    "tagCount": 5,
    "schemaCount": 18
  }
}
```
