---
description: Major API version migration (v1→v2) with customization preservation and step-by-step review
---

# OpenAPI Migrate

Use for **major API version upgrades**. Carefully migrates step by step while protecting customizations.

```
Regular spec changes → /oas:sync (auto sync)
Major version upgrade → /oas:migrate (step-by-step migration)
```

---

## When to Use `/oas:migrate` vs `/oas:sync`

| Scenario | Command |
|----------|---------|
| Daily spec changes | `/oas:sync` |
| Field add/remove/type change | `/oas:sync` |
| operationId/schema name change | `/oas:sync` |
| **API version v1 → v2 upgrade** | `/oas:migrate` |
| **50%+ endpoint changes** | `/oas:migrate` |
| **Legacy migration with lots of custom code** | `/oas:migrate` |
| **10+ breaking changes** | `/oas:migrate` |

---

## Key Differences

| Feature | `/oas:sync` | `/oas:migrate` |
|---------|-------------|----------------|
| **Purpose** | General sync | Major upgrade |
| **Speed** | Fast | Slow (careful) |
| **User intervention** | Minimal | Step-by-step confirmation |
| **Custom code** | Auto preservation attempt | Explicit protection |
| **Rollback** | Full rollback | Phase-by-phase rollback |
| **Suitable for** | 1~20 changes | 20+ changes |

---

## EXECUTION INSTRUCTIONS

When `/oas:migrate` is invoked, Claude MUST perform these steps in order:

1. **Check prerequisites** - Verify `.openapi-sync.json` exists
2. **Version detection** - Compare spec versions, warn if minor upgrade
3. **Customization scan** - Find all custom code markers
4. **Use skill: cache-manager** - Fetch spec, compute diff
5. **Use skill: openapi-parser** - Parse spec structure
6. **Use skill: code-spec-mapper** - Build code-spec mapping
7. **Use skill: import-tracker** - Build import dependency graph
8. **Phase planning** - Group changes into phases
9. **Interactive migration** - Apply phase by phase with user confirmation
10. **Verification** - TypeScript compilation after each phase
11. **Report** - Final migration summary

---

## Migration Phases

Major migrations are done **phase by phase**:

### Phase 1: Types & Schemas (Safest)

```
Phase 1: Type/Schema Changes

In this phase:
  - Add new types
  - Rename types (refactoring-engine)
  - Add/remove/change fields

Impact:
  - May cause compile errors → resolved in next phase
  - No impact on existing functionality

Examples:
  + UserInfoV2 (new)
  ~ UserProfile → UserInfo (rename)
  ~ status: string → UserStatus (type change)
```

### Phase 2: API Functions

```
Phase 2: API Function Changes

In this phase:
  - Add new functions
  - Rename functions (refactoring-engine)
  - Change function signatures
  - Change paths

Impact:
  - Hook call sites need updates
  - Compile errors resolved

Examples:
  + getCredits (new)
  ~ getTaskStatus → getTask (rename, 8 usages)
  ~ createProject(data) → createProject(workspaceId, data)
```

### Phase 3: Hooks & Features

```
Phase 3: Hook and Feature Changes

In this phase:
  - Update Query/Mutation hooks
  - Update feature code
  - Change component Props

⚠️ Caution:
  - Custom logic needs protection
  - Review onSuccess/onError handlers
  - Verify business logic

Examples:
  ~ useCreateProject: add workspaceId parameter
  ! useLogout: uses deprecated endpoint → manual handling required
```

### Phase 4: Cleanup (Optional)

```
Phase 4: Cleanup

In this phase:
  - Remove deprecated code
  - Clean unused types
  - Clean imports

User choice:
  [A] Clean all
  [S] Selective cleanup
  [K] Keep (clean later)
```

---

## Customization Protection

### Auto-detected Markers

```typescript
// @preserve - protect this block
onSuccess: (data) => {
  // custom success handling
  analytics.track('project_created');
  toast.success('Project created');
}

// @custom - custom logic
const processedData = transformResponse(data);

// @migrate-skip - exclude from migration
const legacyEndpoint = '/api/legacy/export';
```

### Protected Patterns

```
Auto-protected:
  - onSuccess / onError handlers
  - Custom validation logic
  - Response transformation code
  - Marked code blocks

Protection method:
  1. Extract custom code before changes
  2. Generate new code
  3. Re-insert custom code
  4. Report conflicts to user
```

---

## Interactive Migration Flow

```
═══════════════════════════════════════════════════════════════════
  OpenAPI Migration: v1.0.0 → v2.0.0
═══════════════════════════════════════════════════════════════════

⚠️ Major version upgrade detected!

📊 Change Summary:
   Types:     23 changes (8 new, 5 renamed, 10 modified)
   Functions: 18 changes (4 new, 3 renamed, 11 modified)
   Removed:   5 endpoints

📦 Customizations detected: 12 locations
   These will be preserved during migration.

This migration will be done in 4 phases:
  Phase 1: Types & Schemas (23 changes)
  Phase 2: API Functions (18 changes)
  Phase 3: Hooks & Features (15 changes)
  Phase 4: Cleanup (5 items)

How would you like to proceed?
  [P] Phase by phase (recommended for major upgrades)
  [A] All at once (faster, less control)
  [D] Dry-run first (preview all changes)
  [C] Cancel

> P

───────────────────────────────────────────────────────────────────
  Phase 1 of 4: Types & Schemas
───────────────────────────────────────────────────────────────────

Changes in this phase:

🟢 NEW (8):
  + CreditsResponse
  + RenderClipRequest
  + RenderClipResponse
  + TaskStatusV2
  ... 4 more

🔵 RENAME (5):
  ↻ UserProfile → UserInfo (15 usages)
  ↻ TaskStatus → TaskStatusLegacy (deprecated)
  ↻ ClipResponse → ClipGenerationResponse
  ... 2 more

🟠 MODIFY (10):
  ~ CreateProjectRequest: +workspaceId (required)
  ~ UserResponse: status → enum type
  ~ ClipGenerationRequest: +aspectRatio, -legacyMode
  ... 7 more

Apply Phase 1?
  [Y] Yes, apply
  [P] Preview detailed changes
  [S] Skip this phase
  [C] Cancel migration

> Y

Applying Phase 1...

📦 Creating checkpoint...
   ✅ Checkpoint created (rollback point)

🔵 Applying renames...
   [1/5] UserProfile → UserInfo
         ✅ 15 usages across 8 files updated
   [2/5] TaskStatus → TaskStatusLegacy
         ✅ 3 usages across 2 files updated
   ...

🟢 Creating new types...
   [1/8] ✅ CreditsResponse added to workspace-types.ts
   [2/8] ✅ RenderClipRequest added to clip-types.ts
   ...

🟠 Applying modifications...
   [1/10] ✅ CreateProjectRequest: +workspaceId
   [2/10] ✅ UserResponse: status type changed
   ...

✅ Phase 1 complete
   TypeScript compilation: PASS

Proceed to Phase 2?
  [Y] Yes
  [R] Rollback Phase 1
  [C] Cancel (keep Phase 1 changes)

> Y

───────────────────────────────────────────────────────────────────
  Phase 2 of 4: API Functions
───────────────────────────────────────────────────────────────────

...continues...
```

---

## Rollback Support

### Checkpoint System

```
Checkpoint created at each Phase start:

.openapi-migrate-backup/
├── checkpoint-1/          # Before Phase 1
│   ├── manifest.json
│   └── files/
├── checkpoint-2/          # Before Phase 2
│   ├── manifest.json
│   └── files/
└── checkpoint-3/          # Before Phase 3
    ├── manifest.json
    └── files/
```

### Rollback Options

```bash
# Rollback last Phase
/oas:migrate --rollback

# Rollback to specific checkpoint
/oas:migrate --rollback-to=1

# Cancel entire migration
/oas:migrate --rollback-all
```

---

## Flags

### Mode Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview all changes |
| `--phase=<n>` | Run specific Phase only |
| `--all-at-once` | Run without Phase separation |
| `--force` | Proceed without confirmation (dangerous) |

### Safety Flags

| Flag | Description |
|------|-------------|
| `--keep-checkpoints` | Keep checkpoints after completion |
| `--rollback` | Rollback last Phase |
| `--rollback-to=<n>` | Rollback to specific checkpoint |
| `--rollback-all` | Cancel entire migration |

### Scope Flags

| Flag | Description |
|------|-------------|
| `--types-only` | Migrate types only |
| `--api-only` | Migrate API functions only |
| `--tag=<name>` | Migrate specific tag only |

---

## Examples

```bash
# Regular version upgrade (phase by phase)
/oas:migrate

# Preview
/oas:migrate --dry-run

# All at once (when confident)
/oas:migrate --all-at-once

# Types first
/oas:migrate --types-only
/oas:migrate --api-only  # Then API

# Rollback
/oas:migrate --rollback           # Last Phase
/oas:migrate --rollback-all       # Cancel all
```

---

## Error Handling

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Config not found | E501 | .openapi-sync.json missing | Run /oas:init |
| Minor version | W801 | Minor version change detected | Recommend /oas:sync |
| TypeScript error | E1003 | Compilation failed after Phase | Auto rollback suggested |
| Checkpoint failed | E901 | Failed to create checkpoint | Check disk space |
| Customization conflict | W802 | Custom code conflict | Manual resolution required |

---

## Migration Report

```
═══════════════════════════════════════════════════════════════════
  Migration Complete: v1.0.0 → v2.0.0
═══════════════════════════════════════════════════════════════════

📊 Summary:
   Duration: 4 phases, 12 minutes
   Files modified: 45
   Lines changed: +892 / -234

✅ Phase 1: Types & Schemas
   23 changes applied

✅ Phase 2: API Functions
   18 changes applied

✅ Phase 3: Hooks & Features
   15 changes applied
   ⚠️ 2 manual reviews pending

✅ Phase 4: Cleanup
   5 deprecated items removed

📦 Customizations preserved: 12/12 (100%)

⚠️ Manual Action Required (2):
   1. src/features/project/ui/CreateProjectModal.tsx:78
      → Add workspaceId selection UI

   2. src/features/auth/hooks/useLogout.ts:15
      → DELETE /sessions/{id} removed, update logout flow

───────────────────────────────────────────────────────────────────

Next steps:
  1. Review manual action items above
  2. Run: npm run typecheck
  3. Run: npm test
  4. Run: /oas:validate --strict

Checkpoints saved (will auto-delete in 24h):
  /oas:migrate --rollback-all  # to undo everything

═══════════════════════════════════════════════════════════════════
```
