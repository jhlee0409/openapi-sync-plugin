# Edge Cases Reference

Comprehensive guide for handling edge cases in the OAS plugin.

---

## 1. Spec Format Edge Cases

### 1.1 Swagger 2.0 to OpenAPI 3.0 Conversion

**Detection:**
```
If spec has `swagger: "2.0"` instead of `openapi: "3.x.x"`
```

**Conversion Rules:**

| Swagger 2.0 | OpenAPI 3.0 | Notes |
|-------------|-------------|-------|
| `definitions` | `components.schemas` | Direct mapping |
| `parameters` (body type) | `requestBody` | Extract body parameter |
| `produces` | `responses.*.content` keys | Content-Type mapping |
| `consumes` | `requestBody.content` keys | Content-Type mapping |
| `securityDefinitions` | `components.securitySchemes` | Direct mapping |
| `host` + `basePath` | `servers[0].url` | Combine into URL |
| `schemes` | `servers[0].url` protocol | http/https prefix |

**Action:**
```
1. Log: "📄 Swagger 2.0 detected, converting to OpenAPI 3.0 internally..."
2. Perform conversion
3. Continue with converted spec
4. Note: Original file is NOT modified
```

### 1.2 YAML vs JSON

**Detection:**
```
.yaml, .yml extension → Parse as YAML
.json extension → Parse as JSON
No extension → Try JSON first, then YAML
```

**YAML-Specific Issues:**

| Issue | Example | Solution |
|-------|---------|----------|
| Anchor/alias | `&user`, `*user` | Resolve before processing |
| Multi-line strings | `\|`, `>` | Preserve correctly |
| Numeric strings | `version: 3.0` | May parse as number, force string |
| Boolean strings | `on`, `yes` | May parse as boolean, quote if needed |

**Action:**
```
1. Detect format from extension or content
2. Parse with appropriate parser
3. If parse fails, try alternate format
4. If both fail, report specific parse error with line number
```

### 1.3 Encoding Issues

**BOM (Byte Order Mark):**
```
If file starts with UTF-8 BOM (EF BB BF):
  → Strip BOM before parsing
  → Log: "⚠️ Stripped UTF-8 BOM from spec file"
```

**Non-UTF-8 Encoding:**
```
If file is not valid UTF-8:
  → Try common encodings: UTF-16, ISO-8859-1
  → If detected, convert to UTF-8
  → Log: "⚠️ Converted from <encoding> to UTF-8"
  → If conversion fails: Error "❌ Unsupported file encoding"
```

---

## 2. Schema Edge Cases

### 2.1 Circular References

**Detection:**
```
Track reference chain during resolution.
If same $ref encountered twice in chain → Circular reference detected.
```

**Example:**
```yaml
components:
  schemas:
    Node:
      type: object
      properties:
        value: { type: string }
        children:
          type: array
          items:
            $ref: '#/components/schemas/Node'  # Circular!
```

**Action:**
```
1. Detect circular reference
2. Stop inline resolution at cycle point
3. Generate TypeScript with type reference:

   export interface Node {
     value: string
     children: Node[]  // Reference, not inline
   }

4. Log: "⚠️ Circular reference detected in Node schema"
```

### 2.2 Deeply Nested Schemas

**Detection:**
```
If schema nesting depth > 10 levels
```

**Action:**
```
1. Log: "⚠️ Deeply nested schema detected (depth: <N>)"
2. Continue processing (don't fail)
3. Consider flattening in generated types
4. If depth > 20: Log warning about potential stack issues
```

### 2.3 allOf / oneOf / anyOf Composition

**allOf (Intersection):**
```yaml
allOf:
  - $ref: '#/components/schemas/BaseUser'
  - type: object
    properties:
      role: { type: string }
```

**Generated TypeScript:**
```typescript
type AdminUser = BaseUser & {
  role: string
}
```

**oneOf (Union - Exclusive):**
```yaml
oneOf:
  - $ref: '#/components/schemas/Dog'
  - $ref: '#/components/schemas/Cat'
```

**Generated TypeScript:**
```typescript
type Pet = Dog | Cat
```

**anyOf (Union - Non-exclusive):**
```yaml
anyOf:
  - $ref: '#/components/schemas/TextContent'
  - $ref: '#/components/schemas/ImageContent'
```

**Generated TypeScript:**
```typescript
// Same as oneOf in TypeScript
type Content = TextContent | ImageContent

// Note: anyOf allows multiple to be true,
// but TypeScript unions handle this adequately
```

**discriminator Property:**
```yaml
oneOf:
  - $ref: '#/components/schemas/Dog'
  - $ref: '#/components/schemas/Cat'
discriminator:
  propertyName: petType
```

**Generated TypeScript:**
```typescript
type Pet =
  | (Dog & { petType: 'dog' })
  | (Cat & { petType: 'cat' })
```

### 2.4 Unresolved References

**Detection:**
```
$ref points to non-existent path in spec
```

**Action:**
```
1. Log: "⚠️ Unresolved reference: #/components/schemas/NonExistent"
2. Generate as `unknown` type
3. Add TODO comment in generated code:

   // TODO: Unresolved reference - #/components/schemas/NonExistent
   type NonExistent = unknown

4. Continue processing other schemas
```

### 2.5 Empty or Invalid Schemas

**Empty Schema:**
```yaml
EmptySchema: {}
```

**Action:**
```
Generate as: type EmptySchema = Record<string, unknown>
Log: "⚠️ Empty schema 'EmptySchema' - using Record<string, unknown>"
```

**Schema Without Type:**
```yaml
AmbiguousSchema:
  description: "No type specified"
```

**Action:**
```
1. Infer type from properties if present
2. If properties present → object
3. If items present → array
4. Otherwise → unknown
5. Log: "⚠️ Schema 'AmbiguousSchema' has no type, inferred as <type>"
```

---

## 3. Network Edge Cases

### 3.1 Timeout Handling

**Default Timeouts:**
```
Connection timeout: 10 seconds
Read timeout: 30 seconds
Total timeout: 60 seconds
```

**Action on Timeout:**
```
1. Log: "⚠️ Request timeout after <N> seconds"
2. If cache exists:
   - Log: "Using cached spec (network timeout)"
   - Use cached spec with warning
3. If no cache:
   - Error: "❌ Failed to fetch spec: timeout after <N> seconds"
   - Suggest: "Try again or use a local file"
```

### 3.2 Retry Logic

**Retry Conditions:**
```
Retry on:
  - Connection refused
  - Connection reset
  - 502, 503, 504 status codes
  - Timeout (first attempt only)

Do NOT retry on:
  - 400, 401, 403, 404 (client errors)
  - 500 (server error, likely persistent)
  - SSL certificate errors
```

**Retry Strategy:**
```
Max retries: 2
Delay: 1s, then 3s (exponential backoff)
Total max time: 10s + 30s + 30s = 70s
```

**Action:**
```
1. On retriable error: Log "⚠️ Fetch failed, retrying in <N>s..."
2. After all retries exhausted:
   - If cache exists: Use cache with warning
   - If no cache: Error with suggestion
```

### 3.3 Redirect Handling

**Supported Redirects:**
```
301 (Moved Permanently) → Follow, update cached URL
302 (Found) → Follow, keep original URL
307 (Temporary Redirect) → Follow, keep original URL
308 (Permanent Redirect) → Follow, update cached URL
```

**Redirect Limits:**
```
Max redirects: 5
```

**Action on Redirect Loop:**
```
Error: "❌ Too many redirects (limit: 5)"
Suggest: "Check the URL for redirect loops"
```

### 3.4 SSL/TLS Issues

**Self-Signed Certificate:**
```
Action:
1. Error: "❌ SSL certificate verification failed"
2. Suggest: "For development, consider using --insecure flag"
3. If --insecure flag: Proceed with warning
```

**Expired Certificate:**
```
Action:
1. Error: "❌ SSL certificate expired"
2. Do not proceed (security risk)
3. Suggest: "Contact API provider about certificate"
```

**Certificate Chain Issues:**
```
Action:
1. Log: "⚠️ Incomplete SSL certificate chain"
2. Attempt to proceed if possible
3. If fails: Error with details
```

---

## 4. Performance Edge Cases

### 4.1 Large Specs (1000+ Endpoints)

**Detection:**
```
If endpoint count > 1000
```

**Action:**
```
1. Log: "📊 Large spec detected (<N> endpoints)"
2. Enable batch processing mode:
   - Process in batches of 100 endpoints
   - Generate files incrementally
   - Show progress: "Processing 100-200 of 1500..."
3. Suggest tag filtering: "Consider using --tag to process specific domains"
```

### 4.2 Large Response Schemas

**Detection:**
```
If schema JSON string > 100KB
```

**Action:**
```
1. Log: "⚠️ Large schema detected: <name> (size: <N>KB)"
2. Generate in separate file if pattern supports it
3. Consider splitting into sub-types
```

### 4.3 Memory Management

**For Large Specs:**
```
1. Stream-parse JSON/YAML when possible
2. Don't store entire spec in memory if not needed
3. Generate files immediately, don't batch all in memory
4. Clear intermediate data after each endpoint
```

**Progress Reporting:**
```
For operations > 5 seconds:
  - Show progress indicator
  - Report: "Processing <N>/<Total> endpoints..."
  - Allow cancellation
```

---

## 5. File System Edge Cases

### 5.1 Permission Issues

**Read Permission:**
```
If cannot read source file:
  Error: "❌ Cannot read file: <path> (Permission denied)"
  Suggest: "Check file permissions: chmod +r <path>"
```

**Write Permission:**
```
If cannot write generated file:
  Error: "❌ Cannot write file: <path> (Permission denied)"
  Suggest: "Check directory permissions or run with appropriate privileges"
```

### 5.2 Path Issues

**Windows vs Unix Paths:**
```
Always normalize paths:
  - Use forward slashes internally
  - Convert to OS-specific on file operations

Handle:
  - C:\Users\... (Windows absolute)
  - /home/user/... (Unix absolute)
  - ./relative/path (Both)
  - ~/path (Unix home expansion)
```

**Path Too Long (Windows):**
```
If path > 260 characters on Windows:
  Log: "⚠️ Path may be too long for Windows: <path>"
  Suggest: "Consider shorter directory names or enable long paths in Windows"
```

### 5.3 File Already Exists

**Action:**
```
If target file exists:
  1. Check --force flag
  2. If --force: Overwrite with backup
     - Create backup: <file>.backup
     - Log: "📁 Backed up existing file to <file>.backup"
  3. If no --force:
     - Prompt: "File exists. Overwrite? [y/n/diff]"
     - If 'diff': Show diff between existing and new
```

### 5.4 Symbolic Links

**Action:**
```
If path is symbolic link:
  1. Resolve to actual path
  2. Log: "📎 Following symbolic link: <link> → <target>"
  3. Continue with resolved path
```

---

## 6. Code Generation Edge Cases

### 6.1 Reserved Keywords

**TypeScript Reserved Words:**
```
break, case, catch, class, const, continue, debugger,
default, delete, do, else, enum, export, extends, false,
finally, for, function, if, import, in, instanceof, new,
null, return, super, switch, this, throw, true, try,
typeof, var, void, while, with, yield
```

**Action:**
```
If property name is reserved word:
  1. Rename with underscore suffix: `class` → `class_`
  2. Add original name in comment: `class_: string // originally "class"`
  3. Log: "⚠️ Renamed reserved word property: class → class_"
```

### 6.2 Invalid Identifiers

**Invalid Characters:**
```
Property names with: spaces, hyphens, special chars
Example: "user-name", "first name", "item[0]"
```

**Action:**
```
1. Sanitize name: "user-name" → "userName"
2. Keep original in interface:

   interface User {
     "user-name": string  // Keep with quotes
   }

3. For function names: Convert to camelCase
```

### 6.3 Duplicate Names

**Same Name, Different Context:**
```
paths:
  /users:
    get:
      operationId: getUsers  # → getUsers
  /admin/users:
    get:
      operationId: getUsers  # Duplicate!
```

**Action:**
```
1. Detect duplicate
2. Append context: getUsers_admin
3. Log: "⚠️ Duplicate operationId 'getUsers', renamed to 'getUsers_admin'"
```

### 6.4 Missing Required Fields

**Missing operationId:**
```
Generate from method + path:
  GET /users/{id} → get_users_id
  POST /users → post_users

Log: "⚠️ Missing operationId for GET /users/{id}, generated: get_users_id"
```

**Missing Response Schema:**
```
Generate as void or unknown:
  - 204 No Content → void
  - Other → unknown

Log: "⚠️ No response schema for GET /users, using unknown"
```

---

## 7. Error Recovery Matrix

Quick reference for error recovery:

| Error Type | Recoverable | Action | Fallback |
|------------|-------------|--------|----------|
| Network timeout | Yes | Retry → Cache | Error if no cache |
| Invalid JSON | No | - | Report parse error |
| Missing $ref | Yes | Use `unknown` | Continue |
| Circular ref | Yes | Use type name | Continue |
| Permission denied | No | - | Report with fix |
| File not found | No | - | Report path |
| Large spec | Yes | Batch process | Continue slower |
| Reserved keyword | Yes | Rename | Continue |
| SSL error | Depends | --insecure option | Error |
| Duplicate name | Yes | Add suffix | Continue |

---

## 8. Troubleshooting Commands

```bash
# Debug mode - verbose logging
/oas:sync --verbose

# Check cache status
/oas:status --check-remote

# Validate spec only (no generation)
/oas:validate --spec-only

# Force fresh fetch
/oas:sync --force

# Offline mode (cache only)
/oas:sync --offline

# Dry run (preview changes)
/oas:sync --dry-run
```
