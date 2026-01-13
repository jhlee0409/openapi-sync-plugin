---
name: openapi-parser
description: Parse OpenAPI 3.x / Swagger 2.x specs and extract endpoint information
---

# OpenAPI Parser

Parse OpenAPI specifications and extract structured endpoint information for code generation.

## Supported Formats

- OpenAPI 3.0.x, 3.1.x (JSON/YAML)
- Swagger 2.0 (JSON/YAML)

## Parsing Process

### Step 1: Load Specification

**Determine source type:**
```typescript
function detectSourceType(source: string): 'url' | 'file' {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return 'url'
  }
  return 'file'
}
```

**URL Loading:**
```
1. FETCH:
   WebFetch: GET {url}

2. HANDLE COMMON URL PATTERNS:
   /swagger-ui/ → Try /openapi.json, /swagger.json
   /api-docs → Try /api-docs/json

3. ERROR HANDLING:
   404 → "스펙을 찾을 수 없습니다. URL을 확인해주세요"
   기타 → "URL 접근 실패: {error}"
```

**File Loading:**
```
1. READ FILE:
   Read: {filepath}

2. DETECT FORMAT:
   .json → JSON.parse()
   .yaml, .yml → YAML.parse()
   (no extension) → Try JSON first, then YAML

3. ERROR HANDLING:
   ENOENT → "파일을 찾을 수 없습니다: {path}"
   Parse error → "파일 형식 오류: {error}"
```

**Parse and Validate:**
```
Parse JSON or YAML
Validate basic structure:
  - Has 'openapi' (3.x) or 'swagger' (2.0) field
  - Has 'info' object with 'title' and 'version'
  - Has 'paths' object
```

### Step 2: Extract Metadata

```json
{
  "info": {
    "title": "API Title",
    "version": "1.0.0",
    "description": "API Description"
  },
  "servers": [
    { "url": "https://api.example.com/v1" }
  ],
  "specVersion": "3.0.0|2.0"
}
```

### Step 3: Extract Endpoints

For each path in spec, extract:

```json
{
  "path": "/api/v1/users/{id}",
  "method": "GET",
  "operationId": "getUser",
  "tags": ["users"],
  "summary": "Get user by ID",
  "description": "Returns a single user",

  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "schema": { "type": "string", "format": "uuid" }
    },
    {
      "name": "include",
      "in": "query",
      "required": false,
      "schema": { "type": "array", "items": { "type": "string" } }
    }
  ],

  "requestBody": null,

  "responses": {
    "200": {
      "description": "Successful response",
      "schema": { "$ref": "#/components/schemas/User" }
    },
    "404": {
      "description": "User not found"
    }
  },

  "security": [
    { "bearerAuth": [] }
  ]
}
```

### Step 4: Resolve References

Resolve all `$ref` references:

```
$ref: "#/components/schemas/User"
→ Inline the actual schema

$ref: "#/components/parameters/PaginationParams"
→ Inline parameter definitions

Handle circular references with type aliases
```

### Step 5: Extract Schemas

For each schema in components/definitions:

```json
{
  "name": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 100 },
    "email": { "type": "string", "format": "email" },
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"]
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true
    },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "name", "email"]
}
```

### Step 6: Group by Tag

Organize endpoints by tag for domain-based generation:

```json
{
  "users": {
    "tag": "users",
    "description": "User operations",
    "endpoints": [
      { "method": "GET", "path": "/users", "operationId": "listUsers" },
      { "method": "POST", "path": "/users", "operationId": "createUser" },
      { "method": "GET", "path": "/users/{id}", "operationId": "getUser" },
      { "method": "PUT", "path": "/users/{id}", "operationId": "updateUser" },
      { "method": "DELETE", "path": "/users/{id}", "operationId": "deleteUser" }
    ],
    "schemas": ["User", "CreateUserRequest", "UpdateUserRequest"]
  }
}
```

## Type Mapping

Map OpenAPI types to TypeScript:

```
OpenAPI Type          →  TypeScript
─────────────────────────────────────
string                →  string
string (date)         →  string
string (date-time)    →  string
string (uuid)         →  string
string (email)        →  string
string (uri)          →  string
string (binary)       →  Blob | File
string (enum)         →  'value1' | 'value2'
integer               →  number
integer (int32)       →  number
integer (int64)       →  number
number                →  number
number (float)        →  number
number (double)       →  number
boolean               →  boolean
array                 →  T[]
object                →  { [key: string]: unknown }
object (properties)   →  { prop1: T1; prop2: T2 }
null                  →  null
oneOf                 →  T1 | T2
anyOf                 →  T1 | T2
allOf                 →  T1 & T2
$ref                  →  ReferencedType
```

## Output Structure

```json
{
  "meta": {
    "title": "My API",
    "version": "2.0.0",
    "specVersion": "3.0.3",
    "servers": ["https://api.example.com"]
  },

  "tags": {
    "users": {
      "description": "User management",
      "endpoints": [...],
      "schemas": [...]
    },
    "projects": {
      "description": "Project operations",
      "endpoints": [...],
      "schemas": [...]
    }
  },

  "schemas": {
    "User": { ... },
    "CreateUserRequest": { ... },
    "Project": { ... }
  },

  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer"
    }
  },

  "stats": {
    "endpointCount": 25,
    "tagCount": 5,
    "schemaCount": 18
  }
}
```

## Error Handling

```
INVALID_SPEC:
  - Missing required fields (info, paths)
  - Invalid OpenAPI version
  → Show specific validation errors

UNRESOLVED_REF:
  - $ref points to non-existent schema
  → Warn and use 'unknown' type

UNSUPPORTED_FEATURE:
  - Features not supported (callbacks, links)
  → Warn and skip

CIRCULAR_REF:
  - Self-referencing schemas
  → Generate type alias with comment
```

## Swagger 2.0 Conversion

If Swagger 2.0 detected, convert to OpenAPI 3.0 internally:

```
definitions → components/schemas
parameters (body) → requestBody
produces/consumes → content types
securityDefinitions → securitySchemes
```

## Hash Generation (for Caching)

캐싱 시스템을 위한 hash 생성. 변경 감지에 사용.

### Spec Hash (전체 스펙)

```typescript
function generateSpecHash(spec: OpenAPISpec): string {
  // 1. 스펙을 정규화 (키 정렬, 공백 제거)
  const normalized = normalizeSpec(spec)

  // 2. SHA256 hash 생성
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')

  return `sha256:${hash.slice(0, 16)}`
}

function normalizeSpec(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSpec)
  }
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeSpec(obj[key])
        return result
      }, {} as Record<string, any>)
  }
  return obj
}
```

### Schema Hash (개별 스키마)

```typescript
function generateSchemaHash(schema: Schema): string {
  const normalized = normalizeSpec(schema)
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')

  return hash.slice(0, 12)  // 짧은 hash (스키마별)
}
```

### Endpoint Hash (개별 엔드포인트)

```typescript
function generateEndpointHash(endpoint: Endpoint): string {
  // 엔드포인트 시그니처만 hash (path, method, parameters, requestBody, responses)
  const signature = {
    path: endpoint.path,
    method: endpoint.method,
    parameters: endpoint.parameters,
    requestBody: endpoint.requestBody,
    responses: endpoint.responses,
  }

  const normalized = normalizeSpec(signature)
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')

  return hash.slice(0, 12)
}
```

### Quick Hash Check (ETag/Last-Modified)

```typescript
async function getQuickHash(url: string): Promise<{
  hash: string
  method: 'etag' | 'last-modified' | 'content'
}> {
  // 1. HEAD 요청으로 ETag 확인 (가장 빠름)
  const headResponse = await fetch(url, { method: 'HEAD' })

  const etag = headResponse.headers.get('ETag')
  if (etag) {
    return { hash: etag, method: 'etag' }
  }

  const lastModified = headResponse.headers.get('Last-Modified')
  if (lastModified) {
    return { hash: lastModified, method: 'last-modified' }
  }

  // 2. ETag 없으면 전체 다운로드 후 hash
  const content = await fetch(url).then(r => r.text())
  const hash = crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')

  return { hash: `sha256:${hash.slice(0, 16)}`, method: 'content' }
}
```

### Hash Output in Parsed Result

파싱 결과에 hash 정보 포함:

```json
{
  "meta": {
    "title": "My API",
    "version": "2.0.0",
    "specVersion": "3.0.3",
    "servers": ["https://api.example.com"]
  },

  "hash": {
    "spec": "sha256:abc123def456...",
    "fetchedAt": "2024-01-13T12:00:00Z",
    "source": "https://api.example.com/openapi.json"
  },

  "tags": {
    "users": {
      "endpoints": [
        {
          "method": "GET",
          "path": "/users/{id}",
          "operationId": "getUser",
          "hash": "a1b2c3d4e5f6"
        }
      ]
    }
  },

  "schemas": {
    "User": {
      "hash": "x1y2z3w4v5u6",
      "definition": { ... }
    }
  }
}
```

### Compare Hashes (Diff 용)

```typescript
interface HashComparison {
  specChanged: boolean
  oldHash: string
  newHash: string

  // 세부 변경 (specChanged가 true일 때만)
  endpoints?: {
    added: string[]      // 새 operationId
    removed: string[]    // 삭제된 operationId
    modified: string[]   // 변경된 operationId
    unchanged: string[]  // 동일한 operationId
  }

  schemas?: {
    added: string[]
    removed: string[]
    modified: string[]
    unchanged: string[]
  }
}

function compareHashes(
  oldParsed: ParsedSpec,
  newParsed: ParsedSpec
): HashComparison {
  // 1. 전체 스펙 hash 비교
  if (oldParsed.hash.spec === newParsed.hash.spec) {
    return {
      specChanged: false,
      oldHash: oldParsed.hash.spec,
      newHash: newParsed.hash.spec,
    }
  }

  // 2. 세부 비교
  const endpoints = compareEndpointHashes(oldParsed, newParsed)
  const schemas = compareSchemaHashes(oldParsed, newParsed)

  return {
    specChanged: true,
    oldHash: oldParsed.hash.spec,
    newHash: newParsed.hash.spec,
    endpoints,
    schemas,
  }
}
```
