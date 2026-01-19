---
description: Map generated API code to actual usage locations in your codebase
---

# OpenAPI Map

Discover and track where your generated API code is used throughout your codebase. Essential for understanding impact of API changes.

---

## EXECUTION INSTRUCTIONS

When `/oas:map` is invoked, Claude MUST perform these steps in order:

### Step 0: MCP Dependency Check
**Invoke skill: mcp-dependency**
- Verify OpenAPI Sync MCP server is installed
- If not available, offer to install via `npm install -g @jhlee0409/openapi-sync-mcp`
- Only proceed after MCP is confirmed available

1. **Load config** - Read `.openapi-sync.json` for generated file locations
2. **Identify API exports** - Find all exported functions, hooks, types
3. **Search codebase** - Find all files that import these exports
4. **Build usage graph** - Map API → Components/Pages/Hooks
5. **Store mapping** - Save to `.openapi-sync.state.json`
6. **Report results** - Show usage summary

---

## Usage

```bash
# Full codebase mapping
/oas:map

# Map specific domain only
/oas:map --tag=users

# Map specific export
/oas:map --export=useUser

# Show detailed usage
/oas:map --verbose
```

---

## Step 1: Load Configuration

```
1. Read .openapi-sync.json
2. Identify generated domains from entities/ or api/ directory
3. For each domain, find:
   - API functions (e.g., userApi.getUser)
   - Query hooks (e.g., useUser, useCreateUser)
   - Types (e.g., User, CreateUserRequest)
```

---

## Step 2: Identify API Exports

Scan generated API files and extract exports:

```typescript
// From src/entities/users/api/users-queries.ts
export const useUsers = ...     // Hook export
export const useUser = ...      // Hook export
export const useCreateUser = ...// Hook export

// From src/entities/users/api/users-api.ts
export const userApi = {        // API object export
  list: ...,
  get: ...,
  create: ...,
}

// From src/entities/users/model/types.ts
export interface User { ... }           // Type export
export interface CreateUserRequest { }  // Type export
```

Build export registry:
```json
{
  "users": {
    "hooks": ["useUsers", "useUser", "useCreateUser", "useUpdateUser", "useDeleteUser"],
    "api": ["userApi"],
    "types": ["User", "CreateUserRequest", "UpdateUserRequest", "UserFilters"]
  }
}
```

---

## Step 3: Search Codebase for Usage

Use Grep/Glob to find imports:

```
Search patterns:

1. Direct hook imports:
   import { useUser } from '@/entities/users'
   import { useUser } from '../entities/users'

2. API object imports:
   import { userApi } from '@/entities/users'

3. Type imports:
   import type { User } from '@/entities/users'
   import { type User } from '@/entities/users'

4. Barrel imports:
   import { useUser, User } from '@/entities/users'
```

For each import found, record:
- File path
- Line number
- Import type (hook, api, type)
- Specific exports used

---

## Step 4: Build Usage Graph

Create a dependency graph:

```
API Export → Used In

useUser (hook)
├── src/pages/users/[id].tsx:15
│   └── const { data: user } = useUser(id)
├── src/features/user-profile/UserCard.tsx:8
│   └── const { data } = useUser(userId)
└── src/widgets/UserAvatar.tsx:12
    └── const { data: user } = useUser(props.id)

User (type)
├── src/pages/users/[id].tsx:3
│   └── import type { User } from '@/entities/users'
├── src/features/user-profile/UserCard.tsx:2
├── src/shared/ui/UserSelect.tsx:5
└── src/utils/formatters.ts:1
    └── function formatUserName(user: User) { ... }
```

---

## Step 5: Store Mapping

Save to `.openapi-sync.state.json`:

```json
{
  "lastMapped": "2024-01-15T12:00:00Z",
  "version": "1.0.0",
  "mapping": {
    "users": {
      "hooks": {
        "useUser": {
          "exportedFrom": "src/entities/users/api/users-queries.ts",
          "usedIn": [
            {
              "file": "src/pages/users/[id].tsx",
              "line": 15,
              "usage": "const { data: user } = useUser(id)"
            },
            {
              "file": "src/features/user-profile/UserCard.tsx",
              "line": 8,
              "usage": "const { data } = useUser(userId)"
            }
          ]
        },
        "useUsers": {
          "exportedFrom": "src/entities/users/api/users-queries.ts",
          "usedIn": [
            {
              "file": "src/pages/users/index.tsx",
              "line": 10,
              "usage": "const { data: users } = useUsers()"
            }
          ]
        },
        "useCreateUser": {
          "exportedFrom": "src/entities/users/api/users-queries.ts",
          "usedIn": [
            {
              "file": "src/features/user-form/CreateUserForm.tsx",
              "line": 12,
              "usage": "const { mutate: createUser } = useCreateUser()"
            }
          ]
        }
      },
      "types": {
        "User": {
          "exportedFrom": "src/entities/users/model/types.ts",
          "usedIn": [
            {
              "file": "src/pages/users/[id].tsx",
              "line": 3,
              "usage": "import type { User }"
            },
            {
              "file": "src/shared/ui/UserSelect.tsx",
              "line": 5,
              "usage": "import type { User }"
            }
          ]
        }
      }
    }
  },
  "summary": {
    "totalDomains": 4,
    "totalExports": 45,
    "totalUsages": 128,
    "unmappedExports": 3
  }
}
```

---

## Step 6: Report Results

```
📍 API Usage Mapping Complete

═══════════════════════════════════════════════════
  Domain: users
═══════════════════════════════════════════════════

Hooks:
  useUser          → 3 usages
    • src/pages/users/[id].tsx:15
    • src/features/user-profile/UserCard.tsx:8
    • src/widgets/UserAvatar.tsx:12

  useUsers         → 2 usages
    • src/pages/users/index.tsx:10
    • src/features/admin/UserList.tsx:15

  useCreateUser    → 1 usage
    • src/features/user-form/CreateUserForm.tsx:12

  useUpdateUser    → 1 usage
    • src/features/user-form/EditUserForm.tsx:14

  useDeleteUser    → 0 usages ⚠️
    (no usages found)

Types:
  User             → 8 usages
  CreateUserRequest→ 2 usages
  UpdateUserRequest→ 1 usage

═══════════════════════════════════════════════════
  Summary
═══════════════════════════════════════════════════

Total Domains:    4
Total Exports:    45
Total Usages:     128
Unused Exports:   3 ⚠️

Unused:
  • useDeleteUser (users)
  • useDeleteProject (projects)
  • ClipMetadata (clips)

💡 Tip: Unused exports may indicate dead code or future features.
```

---

## Flags

| Flag | Description |
|------|-------------|
| `--tag=<name>` | Map specific domain only |
| `--export=<name>` | Map specific export only |
| `--verbose` | Show all usage details |
| `--unused` | Show only unused exports |
| `--json` | Output as JSON |
| `--refresh` | Force refresh (ignore cached mapping) |

---

## Use Cases

### 1. Before API Changes

Before modifying an API, see what will be affected:

```bash
/oas:map --export=useUser --verbose

useUser is used in 3 files:
  1. src/pages/users/[id].tsx:15
     const { data: user } = useUser(id)

  2. src/features/user-profile/UserCard.tsx:8
     const { data } = useUser(userId)

  3. src/widgets/UserAvatar.tsx:12
     const { data: user } = useUser(props.id)

⚠️ Changes to useUser will affect these 3 files.
```

### 2. Find Dead Code

```bash
/oas:map --unused

Unused API exports:

users:
  • useDeleteUser - 0 usages

projects:
  • useDeleteProject - 0 usages
  • projectApi.archive - 0 usages

Consider removing these or adding tests.
```

### 3. Impact Analysis

```bash
/oas:map --tag=users

If User type changes, these files need updates:
  • 8 files import User type
  • 5 files use useUser hook
  • 3 files use userApi directly

Total potential impact: 12 unique files
```

---

## Integration with /oas:apply

The mapping data from `/oas:map` is used by `/oas:apply` to:

1. Know which files to update when API changes
2. Find and replace renamed exports
3. Update type annotations when schemas change
4. Add/remove imports when endpoints are added/removed

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Config not found | Run /oas:init first |
| No generated code found | Run /oas:sync first |
| Search timeout | Use --tag to limit scope |
| Ambiguous import paths | Report all matches |

---

## Performance Notes

For large codebases:
- Use `--tag` to limit scope
- Mapping is cached in `.openapi-sync.state.json`
- Incremental updates on subsequent runs
- Use `--refresh` to force full rescan
