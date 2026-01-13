---
description: Sync codebase with OpenAPI spec - generate types and API code (100% accuracy by default)
---

# OpenAPI Sync

Generate or update API code based on OpenAPI spec and detected project patterns.

---

## EXECUTION INSTRUCTIONS

When `/oas:sync` is invoked, Claude MUST perform these steps in order:

1. **Check prerequisites** - Verify `.openapi-sync.json` exists (run `/oas:init` if not)
2. **Use skill: cache-manager** - Check cache, fetch spec if needed
3. **Use skill: openapi-parser** - Parse spec, compute diff with cache
4. **Show diff summary** - Display changes to user
5. **Get user confirmation** - Proceed or select specific items
6. **Use skill: code-generator** - Generate code matching project patterns
7. **Update cache** - Save new state to cache files
8. **Report results** - Show generated/updated files

---

## Prerequisites

1. Check `.openapi-sync.json` exists - if not, run `/oas:init`
2. Load config and detected patterns

## Sync Process (Smart Caching - Default)

### Step 0: Smart Cache Check

```
Use skill: cache-manager

Smart caching: Fast when unchanged, accurate when changed.

1. Check cache exists
   - .openapi-sync.cache.json (spec cache)
   - .openapi-sync.state.json (implementation state)

2. Smart validation (not full fetch!)
   - Remote URL → HEAD request (check ETag/Last-Modified)
   - Local file → Check file mtime

3. Decision
   - Unchanged → Use cached spec (fast ⚡)
   - Changed → Full fetch, update cache
   - --force → Always full fetch
   - --offline → Use cache only
```

**Output (cache hit):**
```
/oas:sync

✅ Using cached spec (ETag unchanged)
   Last sync: 2 hours ago

   Checking 150 endpoints against codebase...
   ✅ All endpoints up to date

No changes needed.
```

**Output (cache miss):**
```
/oas:sync

🔄 Spec changed, fetching updates...
   ETag: "abc123" → "def456"

   Fetching spec...
   📥 Downloaded 150 endpoints

   Checking against codebase...
```

**--force mode (bypass cache):**
```
/oas:sync --force

🔄 Force mode: refetching spec...
   Ignoring cache

   Fetching spec...
   📥 Downloaded 150 endpoints
```

**--offline mode (cache only):**
```
/oas:sync --offline

📦 Offline mode: using cached spec
   Cache from: 2024-01-13 12:00:00

   Checking 150 endpoints against codebase...
```

### Step 1: Fetch & Diff (only when changes detected)

```
1. Fetch new spec
2. Compute diff with cached spec

   Invoke skill: cache-manager (computeDiff)

3. Diff result:
   - added: Newly added endpoints
   - modified: Changed endpoints
   - removed: Deleted endpoints
   - unchanged: No changes (skip)
```

**Output:**
```
📊 Spec Changes Detected:
   +3 added, ~2 modified, -1 removed
   (145 unchanged - skipping)
```

### Step 2: Compare with Existing Code (changes only)

```
Compare only changed endpoints with code:

For each endpoint in (added + modified):
  1. Check if corresponding code exists
  2. Compare types/schemas
  3. Mark as: NEW | CHANGED | NEEDS_UPDATE
```

### Step 3: Show Diff Summary

```
=== OpenAPI Sync Preview ===

📥 OpenAPI: My API v2.1.0
   Source: https://api.example.com/openapi.json
   Last synced: 2024-01-15

📊 Changes Detected:

NEW (3 endpoints):
  + POST /api/v1/clips/{id}/render
  + GET  /api/v1/clips/{id}/status
  + DELETE /api/v1/clips/{id}/cache

CHANGED (2 endpoints):
  ~ GET /api/v1/users/{id}
    - Added field: preferences (object)
    - Changed type: status (string → enum)
  ~ POST /api/v1/projects
    - New required field: workspaceId

UNCHANGED (15 endpoints)

REMOVED from spec (1 endpoint):
  - GET /api/v1/legacy/export
    ⚠️ Code exists at: src/entities/export/api/legacy-api.ts

Proceed with generation?
(You can select specific items or proceed with all)
```

### Step 4: Generate Code

Use `code-generator` skill:

```
Invoke skill: code-generator
```

Based on detected patterns, generate:

#### For FSD Structure:

```
src/entities/{tag}/
├── api/
│   ├── {tag}-api.ts        # API functions
│   ├── {tag}-api-paths.ts  # Path constants
│   └── queries.ts          # React Query hooks
└── model/
    └── types.ts            # TypeScript types
```

#### For Feature-based Structure:

```
src/features/{tag}/
├── api.ts          # API functions + paths
├── hooks.ts        # React Query hooks
└── types.ts        # TypeScript types
```

#### For Flat Structure:

```
src/api/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

### Step 5: Type Generation

Generate types from schemas:

```typescript
// From OpenAPI schema
{
  "User": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "status": { "type": "string", "enum": ["active", "inactive"] }
    },
    "required": ["id", "name", "email"]
  }
}

// Generated TypeScript
export interface User {
  id: string
  name: string
  email: string
  status?: 'active' | 'inactive'
}

export interface GetUserRequest {
  id: string
}

export type GetUserResponse = User
```

### Step 6: API Function Generation

Based on HTTP client pattern:

```typescript
// Axios pattern
export const getUser = async (params: GetUserRequest): Promise<GetUserResponse> => {
  const { id } = params
  const response = await createApi().get<GetUserResponse>(
    USER_API_PATHS.detail(id)
  )
  return response.data
}

// Fetch pattern
export const getUser = async (params: GetUserRequest): Promise<GetUserResponse> => {
  const { id } = params
  const response = await fetch(USER_API_PATHS.detail(id))
  if (!response.ok) throw new Error('Failed to fetch user')
  return response.json()
}
```

### Step 7: Query Hook Generation

Based on state manager pattern:

```typescript
// React Query with factory pattern
export const useUser = (id: string, options?: UseQueryOptions<GetUserResponse>) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser({ id }),
    ...options,
  })
}

// React Query simple pattern
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser({ id }),
  })
}

// SWR pattern
export const useUser = (id: string) => {
  return useSWR(['users', id], () => getUser({ id }))
}
```

### Step 8: Report Results

```
=== Sync Complete ===

Generated:
  ✓ src/entities/clip/model/types.ts (3 types)
  ✓ src/entities/clip/api/clip-api.ts (3 functions)
  ✓ src/entities/clip/api/clip-api-paths.ts (3 paths)
  ✓ src/entities/clip/api/queries.ts (3 hooks)

Updated:
  ✓ src/entities/user/model/types.ts (+2 fields)
  ✓ src/entities/project/model/types.ts (+1 required field)

Skipped:
  - src/entities/export/api/legacy-api.ts (endpoint removed from spec)

Next: Review generated code and run your type checker
```

## Flags

```bash
# Preview only (no file generation)
/oas:sync --dry-run

# Types only
/oas:sync --only-types

# Force fetch (ignore cache, always fetch)
/oas:sync --force

# Offline mode (use cache only, no network)
/oas:sync --offline
```

## Sync Modes

| Mode | Command | Speed | Accuracy | When to use |
|------|---------|-------|----------|-------------|
| Smart (default) | `/oas:sync` | Fast* | 100% | Always recommended |
| Force | `/oas:sync --force` | Slow | 100% | Cache seems stale, debugging |
| Offline | `/oas:sync --offline` | Instant | Cache-based | Airplane mode, no network access |

*Smart mode: HEAD request to check changes, full fetch only when needed

## Tag Filtering

Filter endpoints by OpenAPI tags. Tags are extracted from the `tags` field in each endpoint definition.

### How Tags Work

OpenAPI spec defines tags per endpoint:
```yaml
paths:
  /workspaces/{id}/credit-usage:
    get:
      tags:
        - workspace    # ← Primary tag (used for filtering)
        - billing      # ← Secondary tags also searchable
      operationId: getWorkspaceCreditUsage
```

### Tag Filter Options

```bash
# Single tag - sync only endpoints with this tag
/oas:sync --tag=workspace

# Multiple tags - sync endpoints matching ANY tag (OR)
/oas:sync --tag=workspace --tag=billing

# Exclude tag - sync all EXCEPT this tag
/oas:sync --exclude-tag=internal

# Combined - specific tags, excluding some
/oas:sync --tag=workspace --exclude-tag=deprecated

# List available tags first
/oas:sync --list-tags
```

### Tag Discovery

Before filtering, see what tags are available:

```
/oas:sync --list-tags

📋 Available Tags (from OpenAPI spec):

Tag              Endpoints   Status
─────────────────────────────────────
workspace        18          ⚠️ Partial (14/18)
user             12          ✅ Complete
project          28          ✅ Complete
billing          8           ❌ Missing
auth             10          ✅ Complete
clips            15          ✅ Complete
internal         5           ⚠️ Partial (2/5)
deprecated       3           ⚠️ Has code

Total: 7 tags, 99 endpoints
```

### Tag-Based Generation

When using `--tag`, the generator:

1. Filters endpoints by matching tag(s)
2. Creates domain directory named after primary tag
3. Generates only types used by filtered endpoints

```bash
/oas:sync --tag=billing

Generated:
  src/entities/billing/
  ├── api/
  │   ├── billing-api.ts        (8 functions)
  │   ├── billing-api-paths.ts  (8 paths)
  │   └── billing-queries.ts    (8 hooks)
  └── model/
      └── billing-types.ts      (12 types)
```

### By Endpoint

```bash
# Specific endpoint only
/oas:sync --endpoint=/api/v1/users
/oas:sync --endpoint="/api/v1/users/{id}"

# Pattern matching
/oas:sync --endpoint="/api/v1/clips/*"
```

### By Change Type

```bash
# New additions only
/oas:sync --only-added

# Changes only
/oas:sync --only-changed

# New + changed
/oas:sync --only-added --only-changed
```

### By File Type

```bash
# Types only
/oas:sync --only-types

# API functions only (no types)
/oas:sync --only-api

# Hooks only
/oas:sync --only-hooks

# Combined
/oas:sync --only-types --only-api
```

## Partial Sync Examples

```bash
# Generate types only for new endpoints in clips tag
/oas:sync --tag=clips --only-added --only-types

# Preview changes for users only
/oas:sync --tag=users --only-changed --dry-run

# Full generation for specific endpoint
/oas:sync --endpoint="/api/v1/clips/{id}/render"
```

## Interactive Selection

When changes are detected, you can select which ones to process:

```
/oas:sync

📊 Changes Detected:

NEW (3):
  1. POST /api/v1/clips/{id}/render (clips)
  2. GET  /api/v1/clips/{id}/status (clips)
  3. DELETE /api/v1/cache/{key} (cache)

CHANGED (2):
  4. GET /api/v1/users/{id} (users)
  5. POST /api/v1/projects (projects)

어떤 항목을 처리할까요?
(전체, 특정 번호, 또는 태그로 선택 가능)
```

---

## Error Handling

For full error code reference, see [../ERROR-CODES.md](../ERROR-CODES.md).

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Config not found | E501 | .openapi-sync.json missing | Run /oas:init |
| Network error | E101/E102 | Cannot fetch spec | Use --offline with cache |
| Parse error | E201/E202 | Invalid spec format | Fix spec syntax |
| Cache not found | E601 | No cache (with --offline) | Run /oas:sync first without --offline |
| Write error | E303 | Cannot write generated files | Check directory permissions |
| Pattern not found | E402 | No sample code to learn from | Provide sample file path |

**Recovery Actions:**
```
E501 → "Run /oas:init to initialize the project"
E101 + cache exists → "Use --offline to sync with cached version"
E601 → "Run /oas:sync without --offline first to create cache"
E402 → "Provide sample: /oas:init with sample path"
```

---

## Migration Guide

For handling breaking changes after sync, see [../MIGRATION.md](../MIGRATION.md).

When `/oas:sync` shows breaking changes:
1. Review removed endpoints and changed types
2. Follow migration workflow in MIGRATION.md
3. Use `--dry-run` first to preview changes
4. Run `/oas:validate` after sync to check coverage
