---
description: Apply API spec changes to codebase - including all usage locations (ripple effect)
---

# OpenAPI Apply

Apply OpenAPI spec changes throughout your entire codebase. This command handles the complete ripple effect - updating not just generated API code, but also all components, pages, and utilities that use the changed APIs.

**This is the killer feature:** When an API field is renamed or a type changes, this command finds and updates EVERY usage automatically.

---

## EXECUTION INSTRUCTIONS

When `/oas:apply` is invoked, Claude MUST perform these steps in order:

1. **Use skill: cache-manager** - Detect spec changes (diff)
2. **Load mapping** - Read usage mapping from `/oas:map`
3. **Analyze changes** - Classify each change type
4. **Calculate impact** - Find all affected files
5. **Generate change plan** - Create detailed modification plan
6. **User confirmation** - Show plan and get approval
7. **Apply changes** - Execute modifications with Edit tool
8. **Verify** - Run TypeScript check if available
9. **Report** - Show summary of all changes

---

## Usage

```bash
# Apply all pending changes
/oas:apply

# Preview only (recommended first)
/oas:apply --dry-run

# Apply specific change only
/oas:apply --change=User.status

# Skip confirmation
/oas:apply --yes

# Apply with automatic TypeScript fix
/oas:apply --fix
```

---

## Change Types & Handling

### Type 1: Field Renamed

**Spec Change:**
```yaml
# Before
User:
  properties:
    userName: { type: string }

# After
User:
  properties:
    name: { type: string }  # Renamed from userName
```

**Impact Analysis:**
```
Field renamed: User.userName → User.name

Affected locations:
  1. src/entities/users/model/types.ts:5
     - interface User { userName: string }
     + interface User { name: string }

  2. src/pages/users/[id].tsx:25
     - <h1>{user.userName}</h1>
     + <h1>{user.name}</h1>

  3. src/features/user-profile/UserCard.tsx:18
     - const displayName = user.userName
     + const displayName = user.name

  4. src/utils/formatters.ts:12
     - return `${user.userName} (${user.email})`
     + return `${user.name} (${user.email})`

Total: 4 files, 4 changes
```

### Type 2: Field Type Changed

**Spec Change:**
```yaml
# Before
User:
  properties:
    status: { type: string }

# After
User:
  properties:
    status:
      type: string
      enum: [active, inactive, pending]
```

**Impact Analysis:**
```
Field type changed: User.status (string → enum)

Affected locations:
  1. src/entities/users/model/types.ts:8
     - status: string
     + status: 'active' | 'inactive' | 'pending'

  2. src/features/user-form/EditUserForm.tsx:35
     - <input value={status} />
     + <select value={status}>
     +   <option value="active">Active</option>
     +   <option value="inactive">Inactive</option>
     +   <option value="pending">Pending</option>
     + </select>
     ⚠️ Manual review recommended (UI change)

  3. src/utils/validators.ts:22
     - if (typeof user.status !== 'string') { ... }
     + if (!['active', 'inactive', 'pending'].includes(user.status)) { ... }
     ⚠️ Manual review recommended (logic change)

Total: 3 files, 1 auto-fix, 2 manual review
```

### Type 3: Field Added (Required)

**Spec Change:**
```yaml
# Before
CreateUserRequest:
  required: [name, email]
  properties:
    name: { type: string }
    email: { type: string }

# After
CreateUserRequest:
  required: [name, email, workspaceId]  # New required field
  properties:
    name: { type: string }
    email: { type: string }
    workspaceId: { type: string }       # Added
```

**Impact Analysis:**
```
Required field added: CreateUserRequest.workspaceId

Affected locations:
  1. src/entities/users/model/types.ts:15
     + workspaceId: string  // Added to interface

  2. src/features/user-form/CreateUserForm.tsx:28
     Current: createUser({ name, email })
     Required: createUser({ name, email, workspaceId })
     ⚠️ BREAKING: Must provide workspaceId

  3. src/features/admin/BulkUserCreate.tsx:45
     Current: users.map(u => createUser(u))
     ⚠️ BREAKING: All user objects need workspaceId

Action required:
  - Add workspaceId to all createUser() calls
  - Determine where to get workspaceId value
```

### Type 4: Field Removed

**Spec Change:**
```yaml
# Before
User:
  properties:
    id: { type: string }
    legacyId: { type: string }  # Will be removed

# After
User:
  properties:
    id: { type: string }
    # legacyId removed
```

**Impact Analysis:**
```
Field removed: User.legacyId

Affected locations:
  1. src/entities/users/model/types.ts:6
     - legacyId: string  // Remove from interface

  2. src/pages/users/[id].tsx:30
     - const legacy = user.legacyId
     ⚠️ BREAKING: Remove usage or find alternative

  3. src/utils/migration.ts:15
     - if (user.legacyId) { migrateUser(user) }
     ⚠️ BREAKING: Logic depends on removed field

Total: 3 files, 1 auto-fix, 2 manual review
```

### Type 5: Endpoint Renamed/Moved

**Spec Change:**
```yaml
# Before
/api/v1/users/{id}/avatar:
  get:
    operationId: getUserAvatar

# After
/api/v2/users/{id}/profile-image:   # Path changed
  get:
    operationId: getUserProfileImage  # Operation renamed
```

**Impact Analysis:**
```
Endpoint changed:
  Path: /api/v1/users/{id}/avatar → /api/v2/users/{id}/profile-image
  Operation: getUserAvatar → getUserProfileImage

Affected locations:
  1. src/entities/users/api/users-paths.ts:8
     - avatar: (id) => `/api/v1/users/${id}/avatar`
     + profileImage: (id) => `/api/v2/users/${id}/profile-image`

  2. src/entities/users/api/users-api.ts:25
     - getUserAvatar: async (id) => ...
     + getUserProfileImage: async (id) => ...

  3. src/entities/users/api/users-queries.ts:40
     - export const useUserAvatar = (id) => ...
     + export const useUserProfileImage = (id) => ...

  4. src/features/user-profile/Avatar.tsx:12
     - const { data } = useUserAvatar(userId)
     + const { data } = useUserProfileImage(userId)

  5. src/widgets/UserCard.tsx:8
     - import { useUserAvatar } from '@/entities/users'
     + import { useUserProfileImage } from '@/entities/users'
     - const { data: avatar } = useUserAvatar(id)
     + const { data: avatar } = useUserProfileImage(id)

Total: 5 files, 8 changes (all auto-fixable)
```

### Type 6: Endpoint Removed

**Spec Change:**
```yaml
# Before
/api/v1/users/export:
  get:
    operationId: exportUsers

# After
# Endpoint removed entirely
```

**Impact Analysis:**
```
Endpoint removed: GET /api/v1/users/export (exportUsers)

Affected locations:
  1. src/entities/users/api/users-api.ts:50
     - exportUsers: async () => ...
     ⚠️ Remove function

  2. src/entities/users/api/users-queries.ts:80
     - export const useExportUsers = () => ...
     ⚠️ Remove hook

  3. src/pages/admin/export.tsx:15
     - const { mutate: exportUsers } = useExportUsers()
     ⚠️ BREAKING: Feature uses removed endpoint

  4. src/features/admin/ExportButton.tsx:8
     - import { useExportUsers } from '@/entities/users'
     ⚠️ BREAKING: Component uses removed hook

Action required:
  - Remove generated code (auto)
  - Remove or replace usage in pages/features (manual)
  - Consider migration path for users of this feature
```

---

## Change Plan Format

```
═══════════════════════════════════════════════════════════════
  OpenAPI Apply - Change Plan
═══════════════════════════════════════════════════════════════

Spec changes detected: 5
Total files affected: 12
Total modifications: 23

───────────────────────────────────────────────────────────────
  Change 1/5: Field Renamed
───────────────────────────────────────────────────────────────
  User.userName → User.name

  Auto-fix (4 files):
    ✓ src/entities/users/model/types.ts:5
    ✓ src/pages/users/[id].tsx:25
    ✓ src/features/user-profile/UserCard.tsx:18
    ✓ src/utils/formatters.ts:12

───────────────────────────────────────────────────────────────
  Change 2/5: Required Field Added
───────────────────────────────────────────────────────────────
  CreateUserRequest + workspaceId (required)

  Auto-fix (1 file):
    ✓ src/entities/users/model/types.ts:15

  Manual review required (2 files):
    ⚠️ src/features/user-form/CreateUserForm.tsx:28
       Need to add workspaceId to form
    ⚠️ src/features/admin/BulkUserCreate.tsx:45
       Need to add workspaceId to bulk create

───────────────────────────────────────────────────────────────
  Summary
───────────────────────────────────────────────────────────────

  ✓ Auto-fixable:     18 changes in 8 files
  ⚠️ Manual review:    5 changes in 4 files
  ❌ Breaking:         2 changes need migration

Proceed with auto-fixes? [y/n/select]
```

---

## Step-by-Step Execution

### Step 7: Apply Changes

For each approved change:

1. **Read file** using Read tool
2. **Apply modification** using Edit tool
3. **Verify syntax** (basic check)
4. **Log change** for report

```
Applying changes...

  [1/18] src/entities/users/model/types.ts
         userName → name
         ✓ Applied

  [2/18] src/pages/users/[id].tsx
         user.userName → user.name (2 occurrences)
         ✓ Applied

  [3/18] src/features/user-profile/UserCard.tsx
         user.userName → user.name
         ✓ Applied

  ...

  [18/18] src/utils/formatters.ts
          user.userName → user.name
          ✓ Applied

All auto-fixes applied.
```

### Step 8: Verify

If TypeScript is available:

```
Running TypeScript check...

npx tsc --noEmit

✓ No type errors found

All changes verified.
```

If errors found:

```
Running TypeScript check...

npx tsc --noEmit

Found 2 type errors:

  src/features/user-form/CreateUserForm.tsx:28
  error TS2345: Argument of type '{ name: string; email: string; }'
  is not assignable to parameter of type 'CreateUserRequest'.
    Property 'workspaceId' is missing.

  src/features/admin/BulkUserCreate.tsx:45
  error TS2345: Property 'workspaceId' is missing.

These are expected - manual review items.
See "Manual Review Required" section above.
```

---

## Step 9: Final Report

```
═══════════════════════════════════════════════════════════════
  OpenAPI Apply - Complete
═══════════════════════════════════════════════════════════════

Applied Changes:
  ✓ 18 modifications in 8 files

  Types updated:
    • User (1 field renamed)
    • CreateUserRequest (1 field added)

  Files modified:
    • src/entities/users/model/types.ts
    • src/entities/users/api/users-api.ts
    • src/entities/users/api/users-queries.ts
    • src/pages/users/[id].tsx
    • src/features/user-profile/UserCard.tsx
    • src/features/user-form/CreateUserForm.tsx (partial)
    • src/utils/formatters.ts
    • src/widgets/UserCard.tsx

Manual Review Required:
  ⚠️ src/features/user-form/CreateUserForm.tsx:28
     Add workspaceId field to form

  ⚠️ src/features/admin/BulkUserCreate.tsx:45
     Add workspaceId to bulk create logic

Next Steps:
  1. Review manual items above
  2. Run: npm run type-check
  3. Run: npm test
  4. Commit changes: git add -A && git commit -m "chore: sync API with spec v2.1.0"
```

---

## Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without applying |
| `--yes` | Skip confirmation prompt |
| `--fix` | Auto-fix TypeScript errors where possible |
| `--change=<path>` | Apply specific change only (e.g., `User.status`) |
| `--tag=<name>` | Apply changes for specific domain only |
| `--skip-verify` | Skip TypeScript verification |
| `--backup` | Create backup files before modifying |

---

## Safety Features

### 1. Dry Run by Default (Recommended)

First run should always be:
```bash
/oas:apply --dry-run
```

### 2. Backup Option

```bash
/oas:apply --backup

# Creates .bak files:
# src/pages/users/[id].tsx → src/pages/users/[id].tsx.bak
```

### 3. Git Integration

If in git repo:
```
⚠️ You have uncommitted changes.
   Recommend: commit or stash before applying.

   Continue anyway? [y/n]
```

### 4. Incremental Application

```bash
# Apply one change at a time
/oas:apply --change=User.userName

# Then next
/oas:apply --change=CreateUserRequest.workspaceId
```

---

## Error Recovery

If something goes wrong:

```
Error during apply:

  File: src/features/user-form/CreateUserForm.tsx
  Error: Could not parse file (syntax error at line 45)

Recovery options:
  1. Skip this file and continue
  2. Abort and rollback all changes
  3. Open file for manual edit

Select [1/2/3]:
```

With `--backup`:
```bash
# Restore from backups
find . -name "*.bak" -exec sh -c 'mv "$1" "${1%.bak}"' _ {} \;
```

---

## Integration with MCP

This command uses MCP tools:

1. `mcp__oas__oas_diff` - Detect spec changes
2. `mcp__oas__oas_deps` - Find schema dependencies
3. Read/Edit tools - Apply code changes

The MCP `oas_deps` tool provides the dependency graph:
```
Schema: User
  → Used by: GET /users/{id} response
  → Used by: POST /users request body
  → Used by: Project.owner (nested reference)
```

This ensures changes propagate through:
- Direct usages (User type in components)
- Nested references (Project.owner is User)
- API responses (getUser returns User)
