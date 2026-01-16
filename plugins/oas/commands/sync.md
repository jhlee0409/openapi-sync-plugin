---
description: Sync codebase with OpenAPI spec - full synchronization (create, update, rename, delete)
---

# OpenAPI Sync

**Fully synchronizes** spec and code. Handles new code generation, existing code modification, renaming, and deletion.

```
/oas:sync = Just run this when spec changes
```

---

## EXECUTION INSTRUCTIONS

When `/oas:sync` is invoked, Claude MUST perform these steps in order:

1. **Check prerequisites** - Verify `.openapi-sync.json` exists (run `/oas:init` if not)
2. **Use skill: cache-manager** - Fetch spec, compute diff with previous version
3. **Use skill: openapi-parser** - Parse spec structure
4. **Use skill: code-spec-mapper** - Build/update code-spec mapping
5. **Use skill: import-tracker** - Build import dependency graph
6. **Analyze changes** - Classify all changes by type (NEW/RENAME/MAYBE_RENAME/MODIFY/REMOVE)
   - Use weighted scoring algorithm for RENAME detection
   - Score ≥ 0.8 → RENAME, 0.5~0.8 → MAYBE_RENAME, < 0.5 → DELETE+ADD
7. **Show sync plan** - Display all changes with affected files
8. **Get user confirmation** - Proceed or select specific items
9. **Handle MAYBE_RENAME** - Ask user to confirm each MAYBE_RENAME item:
   - [R] Confirm as RENAME + MODIFY
   - [S] Split into DELETE + ADD
10. **Apply changes by type:**
    - NEW → Use `code-generator` to create files
    - RENAME → Use `refactoring-engine` to rename + update all usages
    - MAYBE_RENAME (confirmed) → `refactoring-engine` + `migration-applier`
    - MODIFY → Use `migration-applier` to update type definitions
    - REMOVE → Mark as deprecated or delete (user choice)
11. **Update mapping & cache** - Save updated state
12. **Verify** - Run TypeScript compilation
13. **Report results** - Show all changes made

---

## Change Types

| Type | Icon | Description | Handler |
|------|------|-------------|---------|
| NEW | 🟢 | New endpoint/schema | code-generator |
| RENAME | 🔵 | Name change (operationId, schema name) | refactoring-engine |
| MAYBE_RENAME | 🟡 | Possible RENAME (confirmation needed) | user decision → refactoring-engine |
| MODIFY | 🟠 | Field add/remove/type change | migration-applier |
| REMOVE | 🔴 | Deleted from spec | user decision |

---

## Sync Process

### Step 1: Fetch & Diff

```
Use skill: cache-manager

1. Fetch latest spec
2. Compare with cached version
3. Identify all changes
```

### Step 2: Build Mapping & Import Graph

```
Use skill: code-spec-mapper
Use skill: import-tracker

1. Map existing code to spec (operationId ↔ function, schema ↔ type)
2. Build project-wide import dependency graph
3. This enables finding ALL usages of any export
```

### Step 3: Classify Changes

```
For each diff item:

1. NEW: Exists only in spec, not in code
   → Need to create new files

2. RENAME / MAYBE_RENAME: Analyze removed + added pairs
   → Use weighted scoring algorithm (see below)

3. MODIFY: Same item, content changed
   - Field add/remove
   - Type change
   - Required change

4. REMOVE: Exists only in code, not in spec
   → User decision needed
```

#### RENAME Detection Algorithm (Weighted Scoring)

Compare removed and added item pairs to determine RENAME:

```typescript
detectRenameType(removed, added) {
  // Calculate individual similarities
  const pathScore = pathSimilarity(removed.path, added.path);
  const opIdScore = operationIdSimilarity(removed.operationId, added.operationId);
  const schemaScore = schemaSimilarity(removed.schema, added.schema);
  const fieldScore = fieldOverlap(removed.fields, added.fields);

  // Weighted total score
  const totalScore =
    pathScore * 0.15 +      // Path (15%)
    opIdScore * 0.25 +      // operationId (25%)
    schemaScore * 0.30 +    // Schema structure (30%)
    fieldScore * 0.30;      // Field overlap (30%)

  // Determination
  if (totalScore >= 0.8) return 'RENAME';           // Definite RENAME
  if (totalScore >= 0.5) return 'MAYBE_RENAME';     // Confirmation needed
  return 'DELETE_ADD';                               // Separate items
}
```

**Similarity Calculation Details:**

```
pathSimilarity("/api/v1/tasks/status", "/api/v2/jobs/state")
  → Segment comparison: ["api","v1","tasks","status"] vs ["api","v2","jobs","state"]
  → Common: "api" (1/4)
  → Result: 0.25

operationIdSimilarity("getTaskStatus", "getJobState")
  → Token split: ["get","Task","Status"] vs ["get","Job","State"]
  → Common: "get" (1/3)
  → Semantic similarity: "Status" ≈ "State" (+0.3)
  → Result: 0.63

schemaSimilarity(schemaA, schemaB)
  → Field name overlap + type match rate
  → { status, progress } vs { status, progress, eta }
  → Result: 0.67 (2/3 fields match)

fieldOverlap(fieldsA, fieldsB)
  → Core field preservation rate
  → Ratio of original fields retained
  → Result: 1.0 (status, progress both retained)
```

**Anchor Matching (Secondary Determination):**

Promote to MAYBE_RENAME regardless of score when specific conditions are met:

```
Anchor conditions (if any satisfied):
1. Same response type name: TaskStatusResponse === TaskStatusResponse
2. 100% core field preservation: All existing fields exist in new schema
3. Same tag + HTTP method: GET tasks/* → GET jobs/*
```

**Determination Criteria Summary:**

| Total Score | Determination | Processing |
|-------------|---------------|------------|
| ≥ 0.8 | 🔵 RENAME | Auto process |
| 0.5 ~ 0.8 | 🟡 MAYBE_RENAME | Process after user confirmation |
| < 0.5 | DELETE + ADD | Process separately |

### Step 4: Show Sync Plan

```
═══════════════════════════════════════════════════════════════════
  OpenAPI Sync Plan
  My API v1.0.0 → v2.0.0
═══════════════════════════════════════════════════════════════════

📊 Summary: 16 changes detected

┌─────────────────────────────────────────────────────────────────┐
│ Type          │ Count │ Files Affected │ Auto │                 │
├─────────────────────────────────────────────────────────────────┤
│ 🟢 NEW         │ 3     │ 12 (new)       │ ✅   │                 │
│ 🔵 RENAME      │ 2     │ 20             │ ✅   │                 │
│ 🟡 MAYBE_RENAME│ 1     │ 8              │ ❓   │ Confirm needed  │
│ 🟠 MODIFY      │ 8     │ 15             │ ✅   │                 │
│ 🔴 REMOVE      │ 2     │ 6              │ ❌   │ User decision   │
└─────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────
🟢 NEW: 3 endpoints to create
───────────────────────────────────────────────────────────────────

  + POST /api/v1/clips/{id}/render
    → Will create: src/entities/clip/api/clip-api.ts (renderClip)
    → Will create: src/entities/clip/model/clip-types.ts (RenderClipRequest)

  + GET /api/v1/clips/{id}/status
    → Will create: src/entities/clip/api/clip-api.ts (getClipStatus)

  + GET /api/v1/workspaces/{id}/credits
    → Will create: src/entities/workspace/api/workspace-api.ts (getCredits)

───────────────────────────────────────────────────────────────────
🔵 RENAME: 2 items to rename (all usages will be updated)
───────────────────────────────────────────────────────────────────

  ↻ getTaskStatus → getTask
    Definition: src/entities/generation/api/generation-api.ts:45
    Usages: 8 locations across 5 files
    ├── src/features/create/hooks/useTaskPolling.ts (3 usages)
    ├── src/features/history/api/history-queries.ts (2 usages)
    ├── src/entities/generation/api/generation-queries.ts (1 usage)
    └── ... 2 more files

  ↻ UserProfile → UserInfo
    Definition: src/entities/user/model/user-types.ts:12
    Usages: 15 locations across 8 files
    ├── src/entities/user/api/user-api.ts (2 usages)
    ├── src/features/profile/ui/ProfileCard.tsx (4 usages)
    └── ... 6 more files

───────────────────────────────────────────────────────────────────
🟡 MAYBE_RENAME: 1 item needs confirmation
───────────────────────────────────────────────────────────────────

  ❓ GET /api/v1/tasks/status → GET /api/v2/jobs/state
     getTaskProgress → getJobProgress

     Similarity Analysis:
     ┌────────────────────────────────────────────────────┐
     │ Item          │ Score │ Visualization              │
     ├────────────────────────────────────────────────────┤
     │ Path          │ 25%   │ ██░░░░░░░░                 │
     │ operationId   │ 70%   │ ███████░░░                 │
     │ Schema struct │ 67%   │ ██████▌░░░                 │
     │ Field overlap │ 100%  │ ██████████                 │
     └────────────────────────────────────────────────────┘
     Total Score: 68% (MAYBE_RENAME range: 50-80%)

     Before schema:
       { status: string, progress: number }

     After schema:
       { status: string, progress: number, eta: string, message?: string }

     Changes:
       + eta: string (added)
       + message?: string (added)

     Existing code:
       Definition: src/entities/task/api/task-api.ts:23
       Usages: 5 locations across 3 files

     Is this an evolution of the same endpoint?
     [R] Process as RENAME + MODIFY (update usages + add fields)
     [S] Process separately (DELETE existing + ADD new)
     [?] Show detailed diff

───────────────────────────────────────────────────────────────────
🟠 MODIFY: 8 type changes
───────────────────────────────────────────────────────────────────

  ~ CreateProjectRequest
    + workspaceId: string (required)
    Affected: 4 files (API + 3 usages need workspaceId value)

  ~ UserResponse
    ~ status: string → 'active' | 'inactive' | 'pending'
    Affected: 2 files

  ~ ClipGenerationRequest
    + aspectRatio?: string (optional)
    - legacyMode: boolean (removed)
    Affected: 5 files

  ... 5 more modifications

───────────────────────────────────────────────────────────────────
🔴 REMOVE: 2 endpoints removed from spec
───────────────────────────────────────────────────────────────────

  - DELETE /api/v1/sessions/{id}
    Code exists: src/entities/session/api/session-api.ts:34
    Used by: 3 files

    Options:
    [D] Delete code (functionality removed)
    [K] Keep code (backend still supports)
    [M] Mark deprecated

  - GET /api/v1/legacy/export
    Code exists: src/entities/export/api/legacy-api.ts
    Used by: 1 file

═══════════════════════════════════════════════════════════════════

Proceed with sync?
  [A] Apply all (auto changes only, ask for MAYBE_RENAME/REMOVE)
  [S] Select specific changes
  [P] Preview changes (dry-run)
  [C] Cancel
```

### Step 5: Apply Changes

#### 5a. Apply NEW (code-generator)

```
Creating new code...

🟢 Creating: POST /api/v1/clips/{id}/render
   ✅ src/entities/clip/model/clip-types.ts
      + RenderClipRequest (interface)
      + RenderClipResponse (interface)
   ✅ src/entities/clip/api/clip-api.ts
      + renderClip (function)
   ✅ src/entities/clip/config/clip-api-paths.ts
      + render (path)
   ✅ src/entities/clip/api/clip-mutations.ts
      + useRenderClip (hook)

🟢 Creating: GET /api/v1/clips/{id}/status
   ✅ src/entities/clip/api/clip-api.ts
      + getClipStatus (function)
   ✅ src/entities/clip/api/clip-queries.ts
      + useClipStatus (hook)

... more creations
```

#### 5b. Apply RENAME (refactoring-engine)

```
Applying renames...

🔵 Renaming: getTaskStatus → getTask
   Creating backup...

   [1/8] ✅ generation-api.ts:45
         export const getTaskStatus → export const getTask
   [2/8] ✅ generation/index.ts:3
         export { getTaskStatus } → export { getTask }
   [3/8] ✅ useTaskPolling.ts:5
         import { getTaskStatus } → import { getTask }
   [4/8] ✅ useTaskPolling.ts:28
         generationApi.getTaskStatus() → generationApi.getTask()
   [5/8] ✅ useTaskPolling.ts:35
         generationApi.getTaskStatus() → generationApi.getTask()
   [6/8] ✅ history-queries.ts:12
         import { getTaskStatus } → import { getTask }
   [7/8] ✅ history-queries.ts:45
         getTaskStatus({ → getTask({
   [8/8] ✅ generation-queries.ts:18
         queryFn: () => getTaskStatus → queryFn: () => getTask

   ✅ TypeScript verification passed

🔵 Renaming: UserProfile → UserInfo
   [1/15] ✅ user-types.ts:12
          interface UserProfile → interface UserInfo
   ... (15 changes across 8 files)

   ✅ TypeScript verification passed
```

#### 5b-2. Handle MAYBE_RENAME (user confirmation)

```
🟡 Processing MAYBE_RENAME items...

───────────────────────────────────────────────────────────────────
❓ GET /api/v1/tasks/status → GET /api/v2/jobs/state
   getTaskProgress → getJobProgress
   Score: 68%

Is this an evolution of the same endpoint?
  [R] Process as RENAME + MODIFY
  [S] Process separately (DELETE + ADD)

User selected: [R] RENAME + MODIFY

🔵 Applying as RENAME + MODIFY...

   Phase 1: RENAME (refactoring-engine)
   ├── [1/5] ✅ task-api.ts:23
   │         export const getTaskProgress → export const getJobProgress
   ├── [2/5] ✅ task/index.ts:5
   │         export { getTaskProgress } → export { getJobProgress }
   ├── [3/5] ✅ useTaskProgress.ts:8
   │         import { getTaskProgress } → import { getJobProgress }
   ├── [4/5] ✅ useTaskProgress.ts:15
   │         getTaskProgress() → getJobProgress()
   └── [5/5] ✅ dashboard-queries.ts:28
             queryFn: () => getTaskProgress → queryFn: () => getJobProgress

   Phase 2: MODIFY (migration-applier)
   ├── ✅ task-types.ts:12
   │     + eta: string
   │     + message?: string
   └── ✅ Updated TaskProgressResponse interface

   Phase 3: Path update (if changed)
   └── ✅ task-api-paths.ts:8
         status: '/api/v1/tasks/status' → progress: '/api/v2/jobs/state'

   ✅ TypeScript verification passed
   ✅ All 5 usages updated successfully

───────────────────────────────────────────────────────────────────
```

**When MAYBE_RENAME → separate processing is selected:**

```
User selected: [S] Process separately

📝 Splitting into DELETE + ADD...

🔴 DELETE: getTaskProgress
   → Added to existing REMOVE list
   → Will be processed in REMOVE step

🟢 ADD: getJobProgress
   → Added to existing NEW list
   → Will be processed in NEW step
```

#### 5c. Apply MODIFY (migration-applier)

```
Applying modifications...

🟠 Modifying: CreateProjectRequest
   ✅ src/entities/project/model/project-types.ts:23
      + workspaceId: string

   ⚠️ Usage review needed:
      src/features/project/ui/CreateProjectModal.tsx:78
      → Need to provide workspaceId value

🟠 Modifying: UserResponse
   ✅ src/entities/user/model/user-types.ts:8
      + type UserStatus = 'active' | 'inactive' | 'pending'
   ✅ src/entities/user/model/user-types.ts:15
      status: string → status: UserStatus

... more modifications
```

#### 5d. Handle REMOVE (user decision)

```
🔴 Handling removed endpoints...

DELETE /api/v1/sessions/{id} - What would you like to do?
  [D] Delete code
  [K] Keep code (mark as non-spec)
  [M] Mark deprecated

User selected: [D] Delete

   ✅ Deleted: src/entities/session/api/session-api.ts (deleteSession)
   ✅ Deleted: src/entities/session/config/session-api-paths.ts (delete)
   ✅ Updated: src/features/auth/api/use-logout.ts (removed import)
```

### Step 6: Verification & Report

```
═══════════════════════════════════════════════════════════════════
  Sync Complete
═══════════════════════════════════════════════════════════════════

✅ TypeScript compilation passed

📊 Summary:
   🟢 Created: 12 files (3 endpoints)
   🔵 Renamed: 20 usages across 13 files (2 renames)
   🟡 MAYBE_RENAME: 1 confirmed as RENAME + MODIFY
      └── getTaskProgress → getJobProgress (5 usages updated + 2 fields added)
   🟠 Modified: 15 files (8 type changes)
   🔴 Removed: 6 files (2 endpoints)

⚠️ Manual review needed (1 item):
   src/features/project/ui/CreateProjectModal.tsx:78
   → Need to provide workspaceId value for CreateProjectRequest

📁 Mapping updated: .openapi-sync.mapping.json
📁 Cache updated: .openapi-sync.cache.json

═══════════════════════════════════════════════════════════════════
```

---

## Flags

### Scope Control

| Flag | Description |
|------|-------------|
| `--only-new` | Process only new endpoints (CREATE only) |
| `--only-changes` | Process only changes (RENAME + MODIFY) |
| `--only-renames` | Process only renames |
| `--skip-remove` | Skip removal processing |

### Safety

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview only, no actual changes |
| `--force` | Auto-apply without confirmation (except REMOVE) |
| `--keep-backup` | Keep backup files |
| `--no-verify` | Skip TypeScript verification |

### Filtering

| Flag | Description |
|------|-------------|
| `--tag=<name>` | Sync only specific tag |
| `--endpoint=<path>` | Sync only specific endpoint |

### Network

| Flag | Description |
|------|-------------|
| `--offline` | Use cached spec only |
| `--force-fetch` | Ignore cache, fetch fresh |

---

## Examples

```bash
# Full sync (default)
/oas:sync

# Preview only
/oas:sync --dry-run

# New endpoints only
/oas:sync --only-new

# Specific tag only
/oas:sync --tag=workspace

# Renames only
/oas:sync --only-renames

# Sync without handling removals
/oas:sync --skip-remove
```

---

## Error Handling

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Config not found | E501 | .openapi-sync.json missing | Run /oas:init |
| Spec fetch failed | E101 | Failed to fetch spec | Use --offline with cache |
| TypeScript error | E1003 | Compilation failed after changes | Auto rollback |
| Rename conflict | E1001 | Target name already exists | Suggest different name |
| Mapping not found | E701 | Mapping file missing | Auto generate |

---

## vs /oas:migrate

| Scenario | Recommended Command |
|----------|---------------------|
| Regular spec changes | `/oas:sync` |
| Major API version upgrade (v1→v2) | `/oas:migrate` |
| Updates with many breaking changes | `/oas:migrate` |
| Need step-by-step careful migration | `/oas:migrate` |

**Generally, just use `/oas:sync`.**
