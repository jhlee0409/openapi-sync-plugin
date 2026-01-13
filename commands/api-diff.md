---
name: api:diff
description: Compare OpenAPI spec changes between versions
argument-hint: [old-spec] [new-spec] | [--remote]
---

# API Diff

Compare OpenAPI spec changes to see what's new, changed, or removed.

## Usage

```bash
# Current spec vs latest remote spec
/api:diff --remote

# Compare two files
/api:diff ./old-openapi.json ./new-openapi.json

# Current spec vs specific file
/api:diff ./previous-version.json

# Compare with cached previous version
/api:diff
```

## Diff Process

### Step 1: Load Specs

```
OLD SPEC:
  - Cached previous version (.openapi-sync.cache.json)
  - Or specified file/URL

NEW SPEC:
  - Source from .openapi-sync.json
  - Fetch remote if --remote specified
```

### Step 2: Compare

**Endpoint comparison:**
```
For each endpoint:
  Match by path + method combination

Status classification:
  ADDED:    Exists only in new
  REMOVED:  Exists only in old
  CHANGED:  Exists in both, content differs
  UNCHANGED: Exists in both, identical
```

**Schema comparison:**
```
For each schema:
  - Field additions/deletions
  - Type changes
  - Required field changes
  - Enum value changes
```

### Step 3: Output

```
═══════════════════════════════════════════════════
  API Diff: My API v1.0.0 → v2.0.0
═══════════════════════════════════════════════════

📊 Summary:
   +3 added, ~2 changed, -1 removed, 15 unchanged

───────────────────────────────────────────────────
✅ ADDED (3)
───────────────────────────────────────────────────

+ POST /api/v1/clips/{id}/render
  Tag: clips
  Request: RenderClipRequest
  Response: RenderJob

+ GET /api/v1/clips/{id}/render/status
  Tag: clips
  Response: RenderStatus

+ DELETE /api/v1/cache/{key}
  Tag: cache
  Response: void

───────────────────────────────────────────────────
⚠️ CHANGED (2)
───────────────────────────────────────────────────

~ GET /api/v1/users/{id}
  Response: User
    + preferences: object (added)
    ~ status: string → enum['active','inactive'] (type changed)

~ POST /api/v1/projects
  Request: CreateProjectRequest
    + workspaceId: string (added, required)

───────────────────────────────────────────────────
❌ REMOVED (1)
───────────────────────────────────────────────────

- GET /api/v1/legacy/export
  ⚠️  Warning: Code exists at
      src/entities/export/api/legacy-api.ts:15

═══════════════════════════════════════════════════

🔄 Next steps:
   /api:sync              - Apply changes
   /api:sync --only=clips - Update clips only
```

## Change Detection Details

### Endpoint Changes

```typescript
interface EndpointChange {
  type: 'added' | 'removed' | 'changed'
  method: string
  path: string
  tag: string
  changes?: {
    parameters?: ParameterChange[]
    requestBody?: SchemaChange
    response?: SchemaChange
    deprecated?: boolean
  }
}
```

### Schema Changes

```typescript
interface SchemaChange {
  type: 'added' | 'removed' | 'type_changed' | 'required_changed'
  field: string
  old?: any
  new?: any
}

// Examples:
{ type: 'added', field: 'preferences', new: { type: 'object' } }
{ type: 'removed', field: 'legacyId' }
{ type: 'type_changed', field: 'status', old: 'string', new: "enum['active','inactive']" }
{ type: 'required_changed', field: 'workspaceId', old: false, new: true }
```

## Breaking Changes Detection

Automatically detect breaking changes:

```
🚨 BREAKING CHANGES:

1. Required field added to request
   POST /api/v1/projects
   + workspaceId (required)
   → Existing client code needs modification

2. Field removed from response
   GET /api/v1/users/{id}
   - legacyToken
   → Check code using this field

3. Type changed
   GET /api/v1/users/{id}
   status: string → enum
   → Verify type compatibility

4. Endpoint removed
   GET /api/v1/legacy/export
   → Remove usage code
```

## Flags

```bash
--remote          Compare with remote spec
--json            Output in JSON format
--breaking-only   Show breaking changes only
--tag=name        Filter by specific tag(s)
--exclude-tag=n   Exclude specific tag(s)
--list-tags       Show available tags with change summary
```

## Tag Filtering

Filter diff results by OpenAPI tags:

### Filter by Tag

```bash
# Diff only workspace-related endpoints
/api:diff --tag=workspace

# Diff multiple tags
/api:diff --tag=workspace --tag=billing --remote

# Exclude internal endpoints from diff
/api:diff --exclude-tag=internal --remote
```

### Tag Change Summary

See which tags have changes:

```bash
/api:diff --list-tags --remote

📋 Tag Change Summary:

Tag              Added   Changed   Removed   Total
──────────────────────────────────────────────────
workspace        +4      ~2        -0        18
billing          +2      ~0        -0        8
user             +0      ~1        -0        12
internal         +0      ~0        -3        5 ⚠️
clips            +0      ~0        -0        15 ✓

Changes by tag:
  workspace: Most changes (+4 new endpoints)
  internal: ⚠️ 3 endpoints removed (breaking)

/api:diff --tag=workspace --remote   # See workspace details
```

### Tag-Filtered Output

```
/api:diff --tag=workspace --remote

═══════════════════════════════════════════════════
  API Diff: workspace tag only
═══════════════════════════════════════════════════

📊 Summary (workspace):
   +4 added, ~2 changed, 12 unchanged

✅ ADDED (4)
───────────────────────────────────────────────────
+ GET /workspaces/{id}/credit-usage
+ GET /workspaces/{id}/transactions
+ GET /workspaces/{id}/usage-report
+ GET /workspaces/{id}/icon/default

⚠️ CHANGED (2)
───────────────────────────────────────────────────
~ GET /workspaces/{id}
  Response: WorkspaceDetail
    + credit_balance: number (added)

~ POST /workspaces
  Request: CreateWorkspaceRequest
    + template_id: string (added, optional)

═══════════════════════════════════════════════════
```

## Cache Management

```
On diff execution:
1. Save current spec to .openapi-sync.cache.json
2. Use as previous version for next diff

Cache location: .openapi-sync.cache.json
Cache contents: { timestamp, spec, version }
```
