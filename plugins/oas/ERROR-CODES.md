# Error Codes Reference

Comprehensive error code reference for the OAS plugin. All errors follow a standardized format for consistent handling and troubleshooting.

---

## Error Format

All errors follow this standard format:

```
[E<code>] <category>: <brief message>

<detailed description>

Cause: <why this happened>
Fix: <what user should do>
Recovery: <automatic recovery if available>

See: <link to relevant documentation>
```

**Severity Levels:**
- `FATAL` - Operation cannot continue, must abort
- `ERROR` - Operation failed, but may be recoverable
- `WARNING` - Operation continues with degraded functionality
- `INFO` - Informational, no action required

---

## Error Categories

| Code Range | Category | Description |
|------------|----------|-------------|
| E1xx | Network | HTTP, connection, SSL/TLS errors |
| E2xx | Parse | JSON, YAML, OpenAPI validation errors |
| E3xx | File System | Read, write, permission errors |
| E4xx | Code Generation | Pattern, template, output errors |
| E5xx | Configuration | Config file, settings errors |
| E6xx | Cache | Cache read, write, validation errors |

---

## E1xx: Network Errors

### E101 - Connection Failed

```
[E101] FATAL: Cannot connect to server

Failed to establish connection to: <url>

Cause: Server unreachable, DNS resolution failed, or network offline
Fix:
  1. Check your internet connection
  2. Verify the URL is correct
  3. Check if the server is online
  4. Try: curl -I <url>
Recovery: If cache exists, can use --offline flag

See: EDGE-CASES.md#31-timeout-handling
```

### E102 - Connection Timeout

```
[E102] ERROR: Request timeout after <N> seconds

Connection to <url> timed out

Cause: Server too slow, network congestion, or firewall blocking
Fix:
  1. Try again later
  2. Check network connectivity
  3. Use --timeout=<seconds> for longer timeout
Recovery: Uses cached spec if available (with warning)

See: EDGE-CASES.md#31-timeout-handling
```

### E103 - HTTP Error Response

```
[E103] ERROR: HTTP <status> - <status text>

Server returned error response

Cause by status:
  400: Bad request URL or parameters
  401: Authentication required (use local file instead)
  403: Access forbidden (use local file instead)
  404: Resource not found (wrong URL)
  500: Server internal error
  502/503/504: Server temporarily unavailable

Fix: Check URL and server status. For protected specs, download locally.
Recovery: Retry on 502/503/504, use cache on timeout

See: EDGE-CASES.md#32-retry-logic
```

### E104 - SSL Certificate Error

```
[E104] FATAL: SSL certificate verification failed

Cannot verify SSL certificate for: <host>

Cause: Expired, self-signed, or invalid certificate
Fix:
  1. For development: Use --insecure flag (NOT recommended for production)
  2. For production: Contact API provider about certificate issue
Recovery: None (security risk)

See: SECURITY.md#4-ssltls-security, EDGE-CASES.md#34-ssltls-issues
```

### E105 - Redirect Loop

```
[E105] ERROR: Too many redirects (limit: 5)

Redirect chain exceeded maximum depth

Cause: Server misconfiguration causing infinite redirects
Fix: Contact API provider or check URL configuration
Recovery: None

See: EDGE-CASES.md#33-redirect-handling
```

### E106 - Invalid URL

```
[E106] FATAL: Invalid URL format

URL is malformed or uses unsupported protocol

Cause: URL syntax error or blocked protocol (file://, ftp://, etc.)
Fix: Use valid HTTP or HTTPS URL
Recovery: None

See: SECURITY.md#11-allowed-protocols
```

---

## E2xx: Parse Errors

### E201 - Invalid JSON

```
[E201] FATAL: Failed to parse JSON

JSON parse error at line <N>, column <M>: <error>

Cause: Malformed JSON syntax
Fix:
  1. Validate JSON: https://jsonlint.com
  2. Check for trailing commas, missing quotes
  3. Verify encoding is UTF-8
Recovery: None

See: EDGE-CASES.md#12-yaml-vs-json
```

### E202 - Invalid YAML

```
[E202] FATAL: Failed to parse YAML

YAML parse error at line <N>: <error>

Cause: Malformed YAML syntax (indentation, anchors, etc.)
Fix:
  1. Validate YAML: https://yamlint.com
  2. Check indentation (spaces, not tabs)
  3. Verify encoding is UTF-8
Recovery: None

See: EDGE-CASES.md#12-yaml-vs-json
```

### E203 - Not a Valid OpenAPI Spec

```
[E203] FATAL: Not a valid OpenAPI/Swagger specification

Missing required fields: openapi or swagger version

Cause: File is not an OpenAPI/Swagger spec
Fix:
  1. Verify file contains OpenAPI 3.x or Swagger 2.0 spec
  2. Check for required fields: info, paths
  3. Validate at: https://editor.swagger.io
Recovery: None

See: skills/openapi-parser/SKILL.md
```

### E204 - Missing Required Field

```
[E204] ERROR: Missing required field: <field>

OpenAPI spec is missing required field

Cause: Incomplete or invalid spec structure
Fix: Add missing field to the specification
Recovery: May continue with defaults for some fields

See: skills/openapi-parser/SKILL.md#step-2-validate-specification
```

### E205 - Unresolved Reference

```
[E205] WARNING: Unresolved $ref: <reference path>

Cannot find referenced schema or component

Cause: Reference points to non-existent definition
Fix:
  1. Check $ref path is correct
  2. Ensure referenced component exists
  3. Check for typos in reference path
Recovery: Uses 'unknown' type, continues processing

See: EDGE-CASES.md#24-unresolved-references
```

### E206 - Circular Reference Detected

```
[E206] INFO: Circular reference detected in <schema name>

Schema references itself directly or indirectly

Cause: Self-referencing data structure (e.g., tree nodes)
Fix: No fix needed - this is often intentional
Recovery: Uses type reference instead of inline expansion

See: EDGE-CASES.md#21-circular-references
```

### E207 - Unsupported OpenAPI Feature

```
[E207] WARNING: Unsupported feature: <feature name>

Feature not supported by current parser

Supported: Basic paths, schemas, security schemes
Unsupported: callbacks, links, webhooks

Cause: Spec uses advanced OpenAPI 3.x features
Fix: No action needed - feature will be skipped
Recovery: Skips unsupported feature, continues processing

See: skills/openapi-parser/SKILL.md#error-handling
```

---

## E3xx: File System Errors

### E301 - File Not Found

```
[E301] FATAL: File not found: <path>

Cannot locate the specified file

Cause: Wrong path or file doesn't exist
Fix:
  1. Verify file path is correct
  2. Check file exists: ls -la <path>
  3. Use absolute path if relative path fails
Recovery: None

See: EDGE-CASES.md#52-path-issues
```

### E302 - Permission Denied (Read)

```
[E302] FATAL: Cannot read file: <path> (Permission denied)

No read permission for file

Cause: File permissions restrict reading
Fix: chmod +r <path> or run with appropriate privileges
Recovery: None

See: EDGE-CASES.md#51-permission-issues
```

### E303 - Permission Denied (Write)

```
[E303] FATAL: Cannot write file: <path> (Permission denied)

No write permission for file or directory

Cause: File/directory permissions restrict writing
Fix: chmod +w <path> or check directory permissions
Recovery: None

See: EDGE-CASES.md#51-permission-issues
```

### E304 - Path Traversal Blocked

```
[E304] FATAL: Path traversal detected: <path>

Attempted to access file outside project directory

Cause: Path contains ../ or escapes project root
Fix: Use paths within project directory only
Recovery: None (security measure)

See: SECURITY.md#51-path-traversal-prevention
```

### E305 - File Already Exists

```
[E305] WARNING: File already exists: <path>

Target file exists and will be overwritten

Cause: Generated file path conflicts with existing file
Fix:
  1. Use --force to overwrite
  2. Use --backup to create backup first
  3. Manually remove existing file
Recovery: Prompts user for action

See: EDGE-CASES.md#53-file-already-exists
```

### E306 - Directory Not Found

```
[E306] ERROR: Directory not found: <path>

Target directory doesn't exist

Cause: Parent directory for output file doesn't exist
Fix: Create the directory first
Recovery: Creates directory automatically if possible

See: EDGE-CASES.md#52-path-issues
```

---

## E4xx: Code Generation Errors

### E401 - Sample File Not Found

```
[E401] FATAL: Sample file not found: <path>

Cannot find sample code file for pattern cloning

Cause: Configured sample path doesn't exist
Fix:
  1. Check samples path in .openapi-sync.json
  2. Use --interactive to configure manually
  3. Run /oas:init to reconfigure
Recovery: Falls back to interactive mode

See: skills/code-generator/SKILL.md#error-handling
```

### E402 - Pattern Extraction Failed

```
[E402] WARNING: Could not extract pattern from sample

Unable to detect code patterns from sample file

Cause: Sample file too complex or uses unusual patterns
Fix:
  1. Provide a simpler sample file
  2. Use --interactive mode to specify patterns manually
  3. Paste sample code directly when prompted
Recovery: Uses default patterns

See: skills/pattern-detector/SKILL.md#error-handling
```

### E403 - Invalid Identifier

```
[E403] WARNING: Invalid identifier: <name>

Name cannot be used as code identifier

Cause: Name contains invalid characters or is reserved word
Fix: No action needed - name will be sanitized
Recovery: Sanitizes to valid identifier (logged)

See: EDGE-CASES.md#62-invalid-identifiers, SECURITY.md#22-identifier-sanitization
```

### E404 - Duplicate Identifier

```
[E404] WARNING: Duplicate identifier: <name>

Same name appears multiple times

Cause: Multiple operations with same operationId
Fix: No action needed - name will be made unique
Recovery: Appends suffix to make unique (e.g., getUsers_admin)

See: EDGE-CASES.md#63-duplicate-names
```

### E405 - Missing operationId

```
[E405] INFO: Missing operationId for <method> <path>

Endpoint doesn't have operationId defined

Cause: OpenAPI spec doesn't specify operationId
Fix: Add operationId to spec for better naming
Recovery: Generates from method + path (e.g., get_users_id)

See: EDGE-CASES.md#64-missing-required-fields
```

---

## E5xx: Configuration Errors

### E501 - Config File Not Found

```
[E501] FATAL: Configuration file not found: .openapi-sync.json

Project not initialized for OpenAPI sync

Cause: /oas:init not run or config file deleted
Fix: Run /oas:init to initialize
Recovery: None

See: commands/init.md
```

### E502 - Invalid Config Format

```
[E502] FATAL: Invalid configuration file format

Config file is not valid JSON

Cause: Malformed .openapi-sync.json
Fix:
  1. Validate JSON syntax
  2. Run /oas:init --force to regenerate
  3. Restore from backup
Recovery: None

See: commands/init.md
```

### E503 - Missing Required Config

```
[E503] ERROR: Missing required config: <field>

Configuration is incomplete

Cause: Required field missing from .openapi-sync.json
Fix: Add missing field or run /oas:init to regenerate
Recovery: Prompts user for missing values

See: commands/init.md
```

### E504 - Invalid Config Value

```
[E504] ERROR: Invalid config value: <field> = <value>

Configuration value is invalid

Cause: Wrong type or out-of-range value
Fix: Correct the value in .openapi-sync.json
Recovery: Uses default value with warning

See: commands/init.md
```

---

## E6xx: Cache Errors

### E601 - Cache Not Found

```
[E601] INFO: No cache file found

First sync or cache was cleared

Cause: Cache doesn't exist yet or was deleted
Fix: No action needed - fresh fetch will be performed
Recovery: Fetches spec from source

See: skills/cache-manager/SKILL.md
```

### E602 - Cache Corrupted

```
[E602] WARNING: Cache file corrupted

Cannot parse cache file

Cause: File was modified or write was interrupted
Fix: No action needed - cache will be rebuilt
Recovery: Deletes corrupted cache and refetches

See: skills/cache-manager/SKILL.md#error-handling
```

### E603 - Cache Outdated

```
[E603] INFO: Cache outdated (ETag/mtime changed)

Spec has been updated since last cache

Cause: Source spec was modified
Fix: No action needed - normal operation
Recovery: Fetches updated spec

See: skills/cache-manager/SKILL.md
```

### E604 - Cache Write Failed

```
[E604] WARNING: Failed to write cache file

Cannot save cache to disk

Cause: Permission denied or disk full
Fix:
  1. Check write permissions
  2. Check available disk space
Recovery: Continues without caching

See: EDGE-CASES.md#51-permission-issues
```

---

## Quick Reference Table

| Code | Severity | Message | Recovery |
|------|----------|---------|----------|
| E101 | FATAL | Connection failed | --offline if cache |
| E102 | ERROR | Request timeout | Uses cache |
| E103 | ERROR | HTTP error | Retry on 5xx |
| E104 | FATAL | SSL error | --insecure (dev) |
| E105 | ERROR | Redirect loop | None |
| E106 | FATAL | Invalid URL | None |
| E201 | FATAL | Invalid JSON | None |
| E202 | FATAL | Invalid YAML | None |
| E203 | FATAL | Not OpenAPI spec | None |
| E204 | ERROR | Missing field | Defaults |
| E205 | WARNING | Unresolved ref | unknown type |
| E206 | INFO | Circular ref | Type reference |
| E207 | WARNING | Unsupported feature | Skips |
| E301 | FATAL | File not found | None |
| E302 | FATAL | Read permission | None |
| E303 | FATAL | Write permission | None |
| E304 | FATAL | Path traversal | None |
| E305 | WARNING | File exists | Prompt |
| E306 | ERROR | Dir not found | Creates |
| E401 | FATAL | No sample file | Interactive |
| E402 | WARNING | Pattern fail | Defaults |
| E403 | WARNING | Invalid identifier | Sanitizes |
| E404 | WARNING | Duplicate name | Renames |
| E405 | INFO | No operationId | Generates |
| E501 | FATAL | No config | /oas:init |
| E502 | FATAL | Invalid config | Regenerate |
| E503 | ERROR | Missing config | Prompt |
| E504 | ERROR | Invalid value | Default |
| E601 | INFO | No cache | Fresh fetch |
| E602 | WARNING | Cache corrupt | Rebuild |
| E603 | INFO | Cache outdated | Refetch |
| E604 | WARNING | Cache write fail | Continues |

---

## Troubleshooting Flowchart

```
Error occurred
     │
     ▼
Check error code (E###)
     │
     ├─ E1xx (Network) ──► Check connection, URL, SSL
     │
     ├─ E2xx (Parse) ────► Validate spec format
     │
     ├─ E3xx (File) ─────► Check permissions, paths
     │
     ├─ E4xx (Generate) ─► Check samples, patterns
     │
     ├─ E5xx (Config) ───► Run /oas:init
     │
     └─ E6xx (Cache) ────► Usually auto-recovers
```

For detailed troubleshooting, see [EDGE-CASES.md](./EDGE-CASES.md).
