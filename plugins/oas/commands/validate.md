---
description: Validate that code matches OpenAPI spec
---

# API Validate

Validate that your code matches the OpenAPI spec.

## Usage

```bash
# Basic validation (smart caching)
/oas:validate

# Strict mode (warnings treated as errors)
/oas:validate --strict

# Auto-fix suggestions
/oas:validate --fix

# Force fetch spec (bypass cache)
/oas:validate --force

# Use cached spec only (offline)
/oas:validate --offline
```

## Smart Caching

```
Use skill: cache-manager

Validation fetches spec for comparison:
  1. Check if spec changed (HEAD request / mtime)
  2. If unchanged → Use cached spec (fast)
  3. If changed → Fetch new spec, update cache
```

## Validation Checks

### 1. Missing Endpoints

Endpoints in spec but not in code:

```
❌ MISSING: In spec but no code

  POST /api/v1/clips/{id}/render
    → Expected: src/entities/clips/api/clips-api.ts
    → Status: File exists, function missing

  GET /api/v1/notifications
    → Expected: src/entities/notifications/api/
    → Status: Directory not found
```

### 2. Type Mismatches

Type definitions differ from spec:

```
⚠️ TYPE MISMATCH: Type differs from spec

  User (src/entities/user/model/types.ts:5)
    - status: string
    + status: 'active' | 'inactive'  (spec: enum)

  CreateProjectRequest (src/entities/project/model/types.ts:12)
    - workspaceId?: string
    + workspaceId: string  (spec: required)
```

### 3. Extra Code

In code but not in spec:

```
⚠️ EXTRA: In code but not in spec

  src/entities/export/api/legacy-api.ts
    - GET /api/v1/legacy/export (removed from spec)

  src/entities/user/model/types.ts
    - legacyToken: string (not in spec)
```

### 4. Naming Inconsistencies

Naming convention mismatches:

```
⚠️ NAMING: Naming convention mismatch

  src/entities/user/api/user-api.ts:15
    - fetchUser() → should be getUser()

  src/entities/project/api/queries.ts:8
    - useProjectData() → should be useProject()
```

### 5. Import/Path Issues

Incorrect imports or paths:

```
❌ PATH: Path mismatch

  src/entities/user/api/user-api.ts:20
    - path: '/users/{id}'
    + path: '/api/v1/users/{id}' (spec)
```

## Output Format

```
═══════════════════════════════════════════════════
  API Validation Report
═══════════════════════════════════════════════════

📊 Summary:
   ❌ 2 errors
   ⚠️  5 warnings
   ✅ 18 passed

───────────────────────────────────────────────────
❌ ERRORS (must fix)
───────────────────────────────────────────────────

1. Missing endpoint implementation
   POST /api/v1/clips/{id}/render
   Fix: /oas:sync --endpoint="/api/v1/clips/{id}/render"

2. Required field missing
   CreateProjectRequest.workspaceId
   Location: src/entities/project/model/types.ts:12
   Fix: Add 'workspaceId: string' to interface

───────────────────────────────────────────────────
⚠️ WARNINGS (should fix)
───────────────────────────────────────────────────

1. Type mismatch (non-breaking)
   User.status: string → enum
   Location: src/entities/user/model/types.ts:8

2. Extra code (not in spec)
   GET /api/v1/legacy/export
   Location: src/entities/export/api/legacy-api.ts:15
   Consider: Remove or keep for backwards compatibility

3. Naming inconsistency
   fetchUser → getUser
   Location: src/entities/user/api/user-api.ts:15

───────────────────────────────────────────────────
✅ PASSED (18)
───────────────────────────────────────────────────

  users: 5/5 endpoints ✓
  projects: 4/4 endpoints ✓
  clips: 3/5 endpoints (2 missing)
  cache: 2/2 endpoints ✓
  ...

═══════════════════════════════════════════════════

```

## Auto-Fix Mode

```bash
/oas:validate --fix
```

```
🔧 Auto-fix available for 3 issues:

1. [auto] Type mismatch: User.status
   Will update: src/entities/user/model/types.ts

2. [auto] Missing endpoint: POST /clips/{id}/render
   Will generate: src/entities/clips/api/clips-api.ts

3. [manual] Extra code: legacy-api.ts
   Cannot auto-fix: requires manual decision

Apply auto-fix?
```

## Flags

```bash
--strict      # Treat warnings as errors
--fix         # Auto-fix what's possible
--force       # Force fetch spec (bypass cache)
--offline     # Use cached spec only (no network)
--quiet       # Output errors only
--verbose     # Show detailed validation results
--tag=name    # Validate specific tag only
```

## Validation Config

Configure validation in `.openapi-sync.json`:

```json
{
  "validation": {
    "ignorePaths": [
      "src/entities/legacy/*"
    ]
  }
}
```

> **Note:** Most validation behavior is auto-detected from your project's patterns. Only `ignorePaths` needs manual configuration.

---

## Error Handling

For full error code reference, see [../docs/ERROR-CODES.md](../docs/ERROR-CODES.md).

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Config not found | E501 | .openapi-sync.json missing | Run /oas:init |
| Network error | E101/E102 | Cannot fetch spec | Use --offline with cache |
| Parse error | E201/E202 | Invalid spec format | Fix spec syntax |
| Cache not found | E601 | No cache (with --offline) | Run /oas:sync first |
| File read error | E302 | Cannot read source files | Check file permissions |

**Validation Failure Levels:**

```
FATAL (validation cannot proceed):
  - E501: Config not found → Run /oas:init
  - E201/E202: Cannot parse spec → Fix spec format
  - E101 + no cache: Cannot access spec → Check network

ERROR (validation found issues):
  - Missing endpoints
  - Required fields missing
  - Type mismatches (breaking)

WARNING (should review):
  - Extra code not in spec
  - Non-breaking type differences
  - Naming inconsistencies
```
