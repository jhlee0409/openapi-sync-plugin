# Testing Guide

Testing strategy and scenarios for the OAS plugin.

---

## Testing Philosophy

The OAS plugin is a **prompt-based plugin** for Claude Code. Traditional unit tests are not applicable. Instead, testing involves:

1. **Manual Verification** - Running commands and verifying expected behavior
2. **Scenario Testing** - Testing specific use cases end-to-end
3. **Edge Case Testing** - Verifying behavior in unusual conditions
4. **Regression Testing** - Ensuring changes don't break existing functionality

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Sample project with existing API code
mkdir test-project && cd test-project
npm init -y

# 2. Sample OpenAPI spec (use any public API or create one)
# Option A: Use Petstore (public)
# https://petstore3.swagger.io/api/v3/openapi.json

# Option B: Create minimal test spec
cat > openapi.json << 'EOF'
{
  "openapi": "3.0.3",
  "info": { "title": "Test API", "version": "1.0.0" },
  "paths": {
    "/users": {
      "get": {
        "operationId": "getUsers",
        "tags": ["users"],
        "responses": { "200": { "description": "Success" } }
      }
    }
  }
}
EOF
```

### Test Spec Variants

For comprehensive testing, use these spec variants:

| Variant | Purpose | File |
|---------|---------|------|
| `minimal.json` | Basic happy path | 1 endpoint, 1 schema |
| `standard.json` | Normal usage | 10-20 endpoints, multiple tags |
| `large.json` | Performance testing | 500+ endpoints |
| `swagger2.json` | Swagger 2.0 conversion | Swagger 2.0 format |
| `circular.json` | Circular reference handling | Self-referencing schemas |
| `malformed.json` | Error handling | Invalid JSON/YAML |

---

## Command Test Scenarios

### /oas:init

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | First-time init with URL | `/oas:init https://petstore.swagger.io/v3/openapi.json` | Creates .openapi-sync.json | File exists with correct source |
| 2 | First-time init with file | `/oas:init ./openapi.json` | Creates .openapi-sync.json | File exists with correct source |
| 3 | Init with existing config | `/oas:init` (config exists) | Prompts to overwrite | Shows existing config warning |
| 4 | Init with `--force` | `/oas:init --force` | Overwrites existing | New config created |
| 5 | Init with invalid URL | `/oas:init https://invalid.url/spec` | Error E101/E103 | Shows network error message |
| 6 | Init with invalid file | `/oas:init ./nonexistent.json` | Error E301 | Shows file not found message |
| 7 | Init with invalid spec | `/oas:init ./notaspec.json` | Error E203 | Shows "not a valid OpenAPI" |
| 8 | Init in non-project dir | `/oas:init` (no package.json) | Error E501 | Shows "run from project root" |

**Test Procedure:**
```
1. Run command
2. Check console output for expected messages
3. Verify .openapi-sync.json content
4. Verify .gitignore updated (security check)
```

### /oas:sync

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | First sync | `/oas:sync` | Generates all files | Files created in correct locations |
| 2 | Sync with cache hit | `/oas:sync` (no changes) | "Using cached spec" | No file changes |
| 3 | Sync with changes | `/oas:sync` (spec changed) | Shows diff, generates updates | Updated files only |
| 4 | Sync with `--force` | `/oas:sync --force` | Bypasses cache | Full fetch performed |
| 5 | Sync with `--offline` | `/oas:sync --offline` | Uses cache only | No network request |
| 6 | Sync with `--dry-run` | `/oas:sync --dry-run` | Shows what would change | No files modified |
| 7 | Sync with `--tag=X` | `/oas:sync --tag=users` | Only users tag | Only users files generated |
| 8 | Sync with `--only-types` | `/oas:sync --only-types` | Types only | No API functions/hooks |
| 9 | Sync without init | `/oas:sync` (no config) | Error E501 | Shows "run /oas:init" |
| 10 | Sync offline no cache | `/oas:sync --offline` (no cache) | Error E601 | Shows "no cache available" |

**Test Procedure:**
```
1. Set up initial state (run init, maybe first sync)
2. Modify spec if testing change detection
3. Run sync command with specified flags
4. Verify output messages match expected
5. Check generated files exist and have correct content
6. Verify file structure matches detected patterns
```

### /oas:diff

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | Diff with remote | `/oas:diff --remote` | Shows changes | Added/changed/removed listed |
| 2 | Diff two files | `/oas:diff old.json new.json` | Shows changes | Correct comparison |
| 3 | Diff with cache | `/oas:diff` | Compares with cache | Uses cached version |
| 4 | Diff breaking only | `/oas:diff --breaking-only` | Breaking changes only | No non-breaking shown |
| 5 | Diff with tag filter | `/oas:diff --tag=users` | Users changes only | Other tags filtered |
| 6 | Diff no changes | `/oas:diff` (identical) | "No changes" | Clean output |

### /oas:status

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | Status with cache | `/oas:status` | Shows coverage | Correct percentages |
| 2 | Status check remote | `/oas:status --check-remote` | Compares with remote | ETag comparison shown |
| 3 | Status no cache | `/oas:status` (no cache) | Warning | "Run /oas:init" |
| 4 | Status by tag | `/oas:status --tag=users` | Users status only | Correct filtering |
| 5 | Status list tags | `/oas:status --list-tags` | All tags | Complete list |

### /oas:validate

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | Valid code | `/oas:validate` | All passed | No errors |
| 2 | Missing endpoints | `/oas:validate` (code missing) | Errors listed | Correct endpoints |
| 3 | Type mismatches | `/oas:validate` (types differ) | Warnings | Correct locations |
| 4 | Strict mode | `/oas:validate --strict` | Warnings as errors | Exit with error |
| 5 | Fix mode | `/oas:validate --fix` | Fix suggestions | Actionable suggestions |

### /oas:lint

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | Lint spec only | `/oas:lint --spec` | Spec issues | Pattern inconsistencies |
| 2 | Lint code only | `/oas:lint --code` | Code issues | Pattern inconsistencies |
| 3 | Lint both | `/oas:lint` | All issues | Complete report |
| 4 | Lint specific rule | `/oas:lint --rule=naming` | Rule issues only | Filtered output |
| 5 | Lint with fix | `/oas:lint --fix` | Fix suggestions | Actionable fixes |

### /oas:analyze

| # | Scenario | Input | Expected Output | Verify |
|---|----------|-------|-----------------|--------|
| 1 | Analyze patterns | `/oas:analyze` | Pattern report | Correct detection |
| 2 | Analyze specific domain | `/oas:analyze --domain=users` | Domain only | Filtered analysis |
| 3 | Analyze verbose | `/oas:analyze --verbose` | Detailed output | File paths shown |

---

## Skill Test Scenarios

### cache-manager

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|
| 1 | Cache valid (ETag) | Remote unchanged | Uses cached spec |
| 2 | Cache valid (mtime) | Local file unchanged | Uses cached spec |
| 3 | Cache stale | ETag/mtime changed | Fetches new spec |
| 4 | Cache missing | First run | Fetches and caches |
| 5 | Cache corrupted | Invalid JSON in cache | Deletes and refetches |
| 6 | Network error + cache | Offline with cache | Uses cache with warning |
| 7 | Network error no cache | Offline without cache | Error E101 |
| 8 | Force mode | --force flag | Ignores cache, fetches |
| 9 | Offline mode + cache | --offline with cache | Uses cache only |
| 10 | Offline mode no cache | --offline without cache | Error E601 |

### openapi-parser

| # | Scenario | Input | Expected Behavior |
|---|----------|-------|-------------------|
| 1 | Valid OpenAPI 3.0 | Standard spec | Parses successfully |
| 2 | Valid OpenAPI 3.1 | 3.1 spec | Parses successfully |
| 3 | Swagger 2.0 | Swagger spec | Converts to 3.0 format |
| 4 | Invalid JSON | Malformed JSON | Error E201 |
| 5 | Invalid YAML | Malformed YAML | Error E202 |
| 6 | Not OpenAPI | Random JSON | Error E203 |
| 7 | Missing paths | No paths object | Error E204 |
| 8 | Unresolved $ref | Missing reference | Warning E205, uses unknown |
| 9 | Circular reference | Self-referencing schema | Info E206, type reference |
| 10 | Missing operationId | No operationId | Info E405, generates one |

### pattern-detector

| # | Scenario | Input | Expected Behavior |
|---|----------|-------|-------------------|
| 1 | FSD structure | entities/user/api/ | Detects FSD pattern |
| 2 | Feature-based | features/auth/api.ts | Detects feature pattern |
| 3 | Flat structure | src/api/users.ts | Detects flat pattern |
| 4 | No API files | Empty project | Falls back to interactive |
| 5 | Mixed patterns | Inconsistent structure | Reports majority pattern |
| 6 | React Query | @tanstack/react-query | Detects React Query |
| 7 | SWR | useSWR imports | Detects SWR |
| 8 | Custom HTTP client | createApi wrapper | Detects custom pattern |

### code-generator

| # | Scenario | Input | Expected Behavior |
|---|----------|-------|-------------------|
| 1 | Generate types | Schema definitions | Valid TypeScript interfaces |
| 2 | Generate API functions | Endpoints | Functions matching sample |
| 3 | Generate hooks | React Query detected | Query/mutation hooks |
| 4 | Reserved keyword | `class` as property | Renamed to `class_` |
| 5 | Invalid identifier | `user-name` | Sanitized to `userName` |
| 6 | Duplicate name | Same operationId twice | Suffix added |
| 7 | File exists | Target file exists | Prompts for action |
| 8 | Sample not found | Invalid sample path | Error E401 |

---

## Edge Case Test Scenarios

Reference: [EDGE-CASES.md](./EDGE-CASES.md)

### Spec Format

| # | Edge Case | Test Input | Expected |
|---|-----------|------------|----------|
| 1 | UTF-8 BOM | File with BOM | Strips BOM, parses |
| 2 | UTF-16 encoding | UTF-16 file | Converts to UTF-8 |
| 3 | YAML anchors | Anchors/aliases | Resolves correctly |
| 4 | Multiline strings | YAML `\|` and `>` | Preserves content |

### Schema

| # | Edge Case | Test Input | Expected |
|---|-----------|------------|----------|
| 1 | Deeply nested (>10) | 15-level nesting | Warning, continues |
| 2 | allOf composition | Multiple allOf | Intersection type |
| 3 | oneOf composition | oneOf schemas | Union type |
| 4 | anyOf composition | anyOf schemas | Union type |
| 5 | discriminator | oneOf + discriminator | Discriminated union |
| 6 | Empty schema | `{}` | Record<string, unknown> |
| 7 | No type specified | Object without type | Infers from properties |

### Network

| # | Edge Case | Test Input | Expected |
|---|-----------|------------|----------|
| 1 | Connection timeout | Slow server | Error E102, uses cache |
| 2 | 404 response | Invalid URL | Error E103 |
| 3 | 500 response | Server error | Error E103, retry |
| 4 | 503 response | Temp unavailable | Retry then error |
| 5 | Redirect chain | Multiple redirects | Follows up to 5 |
| 6 | Redirect loop | Infinite redirect | Error E105 |
| 7 | Self-signed cert | Invalid SSL | Error E104 |
| 8 | Expired cert | Expired SSL | Error E104 |

### File System

| # | Edge Case | Test Input | Expected |
|---|-----------|------------|----------|
| 1 | Read permission denied | chmod 000 file | Error E302 |
| 2 | Write permission denied | chmod 444 dir | Error E303 |
| 3 | Path traversal | ../../../etc | Error E304 |
| 4 | Long path (Windows) | 300+ char path | Warning |
| 5 | Symlink | Symlink to file | Resolves correctly |
| 6 | Symlink loop | Circular symlinks | Error after 5 levels |

---

## Error Scenario Tests

Reference: [ERROR-CODES.md](./ERROR-CODES.md)

### Network Errors (E1xx)

```
Test E101: Disconnect network → Run /oas:sync
Expected: "[E101] Cannot connect to server"

Test E102: Use slow network simulation → Run /oas:sync
Expected: "[E102] Request timeout" after delay

Test E104: Point to self-signed cert URL → Run /oas:sync
Expected: "[E104] SSL certificate verification failed"
```

### Parse Errors (E2xx)

```
Test E201: Create invalid JSON → Run /oas:init
Expected: "[E201] Failed to parse JSON" with line number

Test E203: Create JSON without openapi field → Run /oas:init
Expected: "[E203] Not a valid OpenAPI/Swagger specification"
```

### File Errors (E3xx)

```
Test E301: Reference non-existent file → Run /oas:init ./missing.json
Expected: "[E301] File not found: ./missing.json"

Test E303: Set directory read-only → Run /oas:sync
Expected: "[E303] Cannot write file: ... (Permission denied)"
```

### Config Errors (E5xx)

```
Test E501: Delete .openapi-sync.json → Run /oas:sync
Expected: "[E501] Configuration file not found"

Test E502: Corrupt .openapi-sync.json → Run /oas:sync
Expected: "[E502] Invalid configuration file format"
```

---

## Integration Test Scenarios

### Full Workflow Test

```
Scenario: Complete Init → Sync → Validate workflow

1. Create new project directory
2. Add package.json with React Query dependency
3. Create sample API file (user-api.ts)
4. Run /oas:init with test spec
5. Verify config created
6. Run /oas:sync
7. Verify files generated matching sample pattern
8. Modify spec (add endpoint)
9. Run /oas:sync again
10. Verify only new endpoint added
11. Run /oas:validate
12. Verify no errors
```

### Cache Workflow Test

```
Scenario: Cache behavior across commands

1. /oas:init with remote URL
2. /oas:sync (first sync, creates cache)
3. /oas:status (uses cache)
4. /oas:sync (cache hit, no fetch)
5. Modify remote spec
6. /oas:sync (cache miss, fetches)
7. /oas:sync --offline (uses cache)
8. Delete cache file
9. /oas:sync --offline (error E601)
```

### Multi-Tag Test

```
Scenario: Tag filtering across commands

1. Init with spec containing users, projects, billing tags
2. /oas:sync --tag=users (only users generated)
3. /oas:sync --tag=projects (only projects generated)
4. /oas:status --list-tags (shows all tags)
5. /oas:diff --tag=billing --remote (only billing diff)
6. /oas:validate --tag=users (only users validated)
```

---

## Regression Test Checklist

Run before any release:

### Commands

- [ ] `/oas:init` with URL works
- [ ] `/oas:init` with local file works
- [ ] `/oas:sync` generates correct files
- [ ] `/oas:sync --force` bypasses cache
- [ ] `/oas:sync --offline` works with cache
- [ ] `/oas:diff` shows correct changes
- [ ] `/oas:status` shows correct coverage
- [ ] `/oas:validate` detects issues
- [ ] `/oas:lint` finds inconsistencies
- [ ] `/oas:analyze` detects patterns

### Caching

- [ ] Cache hit works (ETag unchanged)
- [ ] Cache miss works (ETag changed)
- [ ] Local file mtime check works
- [ ] Cache corruption recovery works
- [ ] Offline mode works

### Error Handling

- [ ] Network errors show correct codes
- [ ] Parse errors show line numbers
- [ ] File errors show paths
- [ ] Config errors suggest /oas:init

### Edge Cases

- [ ] Swagger 2.0 conversion works
- [ ] Circular references handled
- [ ] Large specs (500+ endpoints) work
- [ ] Reserved keywords sanitized
- [ ] Invalid identifiers handled

---

## Reporting Test Results

When reporting issues:

```markdown
## Test Failure Report

**Command:** /oas:sync --tag=users
**Environment:** macOS 14.2, Node 20.10
**Spec:** Petstore 3.0.3

**Expected:**
- Only users tag endpoints generated
- Files in src/entities/users/

**Actual:**
- All tags generated
- Files scattered across directories

**Steps to Reproduce:**
1. Create new project
2. Run /oas:init https://petstore.swagger.io/v3/openapi.json
3. Run /oas:sync --tag=users
4. Observe all files generated

**Error Codes:** None (no error, just wrong behavior)
```
