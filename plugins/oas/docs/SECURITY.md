# Security Guidelines

Security best practices for the OAS plugin.

---

## 1. URL Validation (SSRF Prevention)

### 1.1 Allowed Protocols

**REQUIRED:** Only allow HTTP and HTTPS protocols.

```
✅ Allowed:
  - https://api.example.com/openapi.json
  - http://localhost:3000/openapi.json (development only)

❌ Blocked:
  - file:///etc/passwd
  - ftp://server/file
  - data:text/json,...
  - javascript:...
```

**Action:**
```
1. Parse URL to extract protocol
2. If protocol not in ['http', 'https']:
   - Error: "❌ Invalid URL protocol. Only HTTP/HTTPS allowed."
   - Do NOT proceed
```

### 1.2 Internal IP Prevention

**REQUIRED:** Block requests to internal/private IP ranges in production.

```
❌ Blocked IP ranges:
  - 10.0.0.0/8      (Private Class A)
  - 172.16.0.0/12   (Private Class B)
  - 192.168.0.0/16  (Private Class C)
  - 127.0.0.0/8     (Loopback)
  - 169.254.0.0/16  (Link-local)
  - ::1             (IPv6 loopback)
  - fc00::/7        (IPv6 private)

✅ Allowed in development:
  - localhost (127.0.0.1)
  - Internal IPs with --allow-internal flag
```

**Action:**
```
1. Resolve hostname to IP
2. Check if IP is in blocked ranges
3. If blocked:
   - Error: "❌ Cannot access internal/private IP addresses"
   - Suggest: "Use --allow-internal for development"
```

### 1.3 Redirect Validation

**REQUIRED:** Validate redirect destinations.

```
On redirect:
1. Apply same URL validation to redirect target
2. Check redirect doesn't go to internal IP
3. Limit redirect chain depth (max 5)
4. Log: "🔄 Following redirect: <from> → <to>"
```

---

## 2. Code Injection Prevention

### 2.1 String Escaping in Generated Code

**REQUIRED:** Escape all strings from OpenAPI spec before inserting into generated code.

**Dangerous Characters:**
```
`   → \`  (template literal injection)
$   → \$  (template literal variable injection)
\   → \\  (escape sequence)
'   → \'  (single quote in strings)
"   → \"  (double quote in strings)
\n  → \\n (newline)
```

**Example Vulnerability:**
```yaml
# Malicious spec
paths:
  /users:
    get:
      operationId: "getUsers`; process.exit(1); `"
```

**Bad (vulnerable):**
```typescript
// DO NOT generate like this
export const ${operationId} = async () => { ... }
// Results in: export const getUsers`; process.exit(1); ` = async () => { ... }
```

**Good (safe):**
```typescript
// Escape the operationId first
const safeId = escapeIdentifier(operationId)
// Results in: export const getUsers_process_exit_1 = async () => { ... }
```

### 2.2 Identifier Sanitization

**REQUIRED:** Sanitize all identifiers before use in code.

**Rules:**
```
1. Remove all characters except: a-z, A-Z, 0-9, _
2. Ensure starts with letter or underscore
3. Avoid JavaScript reserved words
4. Maximum length: 100 characters
```

**Implementation:**
```typescript
function sanitizeIdentifier(raw: string): string {
  // Remove dangerous characters
  let safe = raw.replace(/[^a-zA-Z0-9_]/g, '_')

  // Ensure starts with letter or underscore
  if (/^[0-9]/.test(safe)) {
    safe = '_' + safe
  }

  // Handle reserved words
  if (RESERVED_WORDS.includes(safe)) {
    safe = safe + '_'
  }

  // Limit length
  return safe.slice(0, 100)
}
```

### 2.3 Template Literal Safety

**REQUIRED:** Never use template literals with unsanitized spec content.

**Bad:**
```typescript
const code = `
export const ${operationId} = async () => {
  return fetch(\`${baseUrl}${path}\`)
}
`
```

**Good:**
```typescript
const safeOperationId = sanitizeIdentifier(operationId)
const safePath = escapeTemplateString(path)

const code = `
export const ${safeOperationId} = async () => {
  return fetch(\`${safePath}\`)
}
`
```

---

## 3. Sensitive Data Handling

### 3.1 API Keys and Credentials

**REQUIRED:** Never store or log credentials.

**Detection Patterns:**
```
Fields that may contain secrets:
  - *key*, *token*, *secret*, *password*, *credential*
  - authorization, auth, bearer
  - api_key, apiKey, api-key

Example in spec:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

**Action:**
```
1. Detect security schemes in spec
2. Generate placeholder code, NOT actual values
3. Reference environment variables:

   // Generated code
   const API_KEY = process.env.API_KEY
   if (!API_KEY) throw new Error('API_KEY environment variable required')

4. Log: "ℹ️ API key security detected. Use environment variables."
```

### 3.2 Cache File Security

**REQUIRED:** Ensure cache files are not committed to version control.

**.gitignore entries:**
```
# OpenAPI Sync cache files (contain potentially sensitive data)
.openapi-sync.cache.json
.openapi-sync.state.json
```

**Action on /oas:init:**
```
1. Check if .gitignore exists
2. Check if cache files are in .gitignore
3. If not:
   - Warn: "⚠️ Add cache files to .gitignore to prevent accidental commits"
   - Suggest: "Add these lines to .gitignore:"
   - Show the lines to add
4. Consider auto-adding if user confirms
```

### 3.3 Spec Content Sensitivity

**REQUIRED:** Treat spec content as potentially sensitive.

**Sensitive spec content:**
```
- Server URLs (may reveal internal infrastructure)
- Security schemes (authentication methods)
- Examples (may contain real data)
- Descriptions (may contain internal notes)
```

**Action:**
```
1. Never log full spec content in verbose mode
2. Redact sensitive fields in logs:
   - Server URLs: show host only
   - Examples: show "[REDACTED]"
   - Security schemes: show type only
```

---

## 4. SSL/TLS Security

### 4.1 Certificate Verification

**REQUIRED:** Verify SSL certificates by default.

**Default behavior:**
```
All HTTPS requests MUST verify:
  - Certificate validity (not expired)
  - Certificate chain (trusted CA)
  - Hostname match
```

### 4.2 Insecure Mode

**OPTIONAL:** Allow insecure mode for development only.

```bash
# Flag to disable certificate verification
/oas:sync --insecure
```

**Action when --insecure used:**
```
1. Show prominent warning:
   ⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECURITY WARNING: SSL certificate verification disabled.
   This is insecure and should only be used for development.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. Do NOT persist this setting
3. Require flag on each command
```

### 4.3 Minimum TLS Version

**REQUIRED:** Enforce minimum TLS 1.2.

```
❌ Blocked: TLS 1.0, TLS 1.1, SSL
✅ Allowed: TLS 1.2, TLS 1.3
```

---

## 5. File System Security

### 5.1 Path Traversal Prevention

**REQUIRED:** Prevent path traversal attacks.

**Dangerous patterns:**
```
../  (parent directory)
..\ (Windows parent)
/etc/passwd
C:\Windows\
```

**Action:**
```
1. Normalize all paths
2. Resolve to absolute path
3. Verify path is within project directory
4. Block if outside project:
   - Error: "❌ Path escapes project directory: <path>"
```

**Implementation:**
```typescript
function validatePath(userPath: string, projectRoot: string): string {
  const absolutePath = path.resolve(projectRoot, userPath)

  // Ensure path is within project
  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error(`Path traversal detected: ${userPath}`)
  }

  return absolutePath
}
```

### 5.2 Symbolic Link Limits

**REQUIRED:** Limit symbolic link traversal.

```
Max symlink depth: 5

Action on symlink:
1. Resolve symlink
2. Validate resolved path is within project
3. Increment depth counter
4. If depth > 5:
   - Error: "❌ Too many symbolic link levels"
```

### 5.3 File Permission Validation

**REQUIRED:** Check file permissions before writing.

```
Before writing generated files:
1. Check parent directory exists
2. Check write permission
3. If file exists:
   - Check it's a regular file (not symlink to sensitive location)
   - Check write permission on file
```

---

## 6. Generated Code Security

### 6.1 No Eval or Dynamic Code Execution

**REQUIRED:** Generated code must not use dangerous patterns.

**Prohibited in generated code:**
```javascript
eval()
new Function()
setTimeout/setInterval with string argument
document.write()
innerHTML with untrusted content
```

### 6.2 Safe HTTP Client Patterns

**REQUIRED:** Generate secure HTTP client code.

**Include in generated code:**
```typescript
// Timeout to prevent hanging
const TIMEOUT_MS = 30000

// Validate response content-type
const contentType = response.headers.get('content-type')
if (!contentType?.includes('application/json')) {
  throw new Error('Unexpected content type')
}

// Size limits
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024 // 10MB
```

### 6.3 Input Validation in Generated Code

**RECOMMENDED:** Include runtime validation in generated code.

```typescript
// Example generated validation
export const getUser = async ({ id }: GetUserRequest): Promise<User> => {
  // Validate input
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid id parameter')
  }

  // ... rest of implementation
}
```

---

## 7. Security Checklist

Before using the plugin in production:

```
[ ] URL sources are from trusted origins
[ ] --insecure flag is NOT used in production
[ ] Cache files are in .gitignore
[ ] API keys use environment variables
[ ] Generated code has been reviewed
[ ] File paths are within project directory
[ ] SSL/TLS is properly configured
```

---

## 8. Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Contact the maintainers directly
3. Provide:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
