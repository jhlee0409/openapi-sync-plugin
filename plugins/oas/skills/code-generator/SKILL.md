---
name: code-generator
description: Universal code generator - clones your existing code style exactly
---

# Code Generator

Generate API code that perfectly matches your project's existing patterns.

**Core Principle:** Your code style is the template.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST perform these steps in order:

### Step 1: Receive Inputs

This skill requires:
1. **Detected patterns** from `pattern-detector` skill
2. **Parsed endpoints** from `openapi-parser` skill
3. **Target tag** or list of endpoints to generate

Verify all inputs are present before proceeding.

### Step 2: Load Sample Code

1. Read the sample files from detected patterns:
   - `samples.api` → API function patterns
   - `samples.types` → Type definition patterns
   - `samples.hooks` → Hook patterns (if applicable)

2. For each sample, extract:
   - Import statements
   - Export patterns
   - Function/type structure
   - Naming conventions
   - Code style (quotes, semicolons, indentation)

### Step 3: Generate File Paths

Based on detected structure pattern, generate target file paths:

**FSD Pattern:**
```
src/entities/{tag}/
├── api/
│   ├── {tag}-api.ts
│   ├── {tag}-api-paths.ts
│   └── {tag}-queries.ts
└── model/
    └── {tag}-types.ts
```

**Feature-based Pattern:**
```
src/features/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

**Flat Pattern:**
```
src/api/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

### Step 4: Generate Types

For each schema used by target endpoints:

1. **Determine type style** from sample (interface vs type)
2. **Generate TypeScript definition:**

```typescript
// If sample uses interface:
export interface User {
  id: string
  name: string
  email?: string  // optional if not in required array
}

// If sample uses type:
export type User = {
  id: string
  name: string
  email?: string
}
```

3. **Generate Request/Response types:**
   - Follow naming convention from sample
   - Examples: `GetUserRequest`, `CreateUserRequest`, `UserResponse`

### Step 5: Generate Path Constants

Clone the path constant pattern from sample:

```typescript
// Sample pattern: function-based
export const USER_PATHS = {
  list: () => '/api/v1/users',
  detail: (id: string) => `/api/v1/users/${id}`,
  create: () => '/api/v1/users',
} as const

// Generated: same pattern for new tag
export const PROJECT_PATHS = {
  list: () => '/api/v1/projects',
  detail: (id: string) => `/api/v1/projects/${id}`,
  create: () => '/api/v1/projects',
} as const
```

### Step 6: Generate API Functions

For each endpoint, generate function matching sample style:

1. **Parse sample function structure:**
   - Async arrow vs function declaration
   - Parameter style (destructured, typed object)
   - Return type annotation
   - HTTP client call pattern
   - Response access pattern (.data, direct)

2. **Apply to each endpoint:**

```typescript
// Sample:
export const getUser = async ({ id }: GetUserRequest): Promise<User> => {
  const response = await createApi().get<User>(USER_PATHS.detail(id))
  return response.data
}

// Generated (same pattern):
export const getProject = async ({ id }: GetProjectRequest): Promise<Project> => {
  const response = await createApi().get<Project>(PROJECT_PATHS.detail(id))
  return response.data
}
```

### Step 7: Generate Hooks (if applicable)

If project uses React Query/SWR, generate hooks:

1. **Clone hook pattern from sample:**

```typescript
// Sample:
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser({ id }),
  })
}

// Generated:
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getProject({ id }),
  })
}
```

2. **Generate mutations for POST/PUT/DELETE:**

```typescript
export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: projectApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
```

### Step 8: Write Files

1. Check if file already exists
   - If exists and `--force` flag → Overwrite
   - If exists and no flag → Ask user: "File exists. Overwrite? [y/n]"
   - If not exists → Create new

2. Use `Write` tool to create each file

3. Report generated files:
   ```
   Generated:
     ✓ src/entities/project/model/project-types.ts (5 types)
     ✓ src/entities/project/api/project-api-paths.ts (8 paths)
     ✓ src/entities/project/api/project-api.ts (8 functions)
     ✓ src/entities/project/api/project-queries.ts (8 hooks)
   ```

---

## ERROR HANDLING

For full error code reference, see [../../ERROR-CODES.md](../../ERROR-CODES.md).

### Sample File Not Found [E401]

```
Error: "[E401] ❌ Sample file not found: <path>"
Cause: Configured sample path doesn't exist
Fix: Check samples path in .openapi-sync.json
Recovery: Falls back to --interactive mode
```

### Pattern Extraction Failed [E402]

```
Warning: "[E402] ⚠️ Could not extract pattern from sample"
Cause: Sample file too complex or uses unusual patterns
Fix: Provide a simpler sample file
Recovery: Uses default patterns
```

### File Write Failed [E303]

```
Error: "[E303] ❌ Failed to write file: <path>"
Cause: Permission denied or directory doesn't exist
Fix: Check permissions: chmod +w <directory>
Action: Abort file generation for this file
```

### File Already Exists [E305]

```
Warning: "[E305] ⚠️ File already exists: <path>"
Fix: Use --force to overwrite or --backup to create backup
Recovery: Prompts user for action
```

### Invalid Identifier [E403]

```
Warning: "[E403] ⚠️ Invalid identifier: <name>"
Cause: Name contains invalid characters or is reserved word
Recovery: Sanitizes to valid identifier (logs original name)
```

### Duplicate Identifier [E404]

```
Warning: "[E404] ⚠️ Duplicate identifier: <name>"
Cause: Multiple operations with same operationId
Recovery: Appends suffix to make unique (e.g., getUsers_admin)
```

---

## REFERENCE: Verb Mapping

| HTTP Method | Default Verb | Alternative |
|-------------|--------------|-------------|
| GET (single) | `get` | `fetch`, `retrieve` |
| GET (list) | `getList`, `list` | `fetchAll`, `getAll` |
| POST | `create` | `add`, `post` |
| PUT | `update` | `modify`, `put` |
| PATCH | `patch` | `update`, `modify` |
| DELETE | `delete` | `remove`, `destroy` |

## REFERENCE: Naming Conventions

Detect from sample and apply consistently:

| Pattern | Example | Detection |
|---------|---------|-----------|
| camelCase | `getUser` | Lowercase first letter |
| PascalCase | `GetUser` | Uppercase first letter |
| snake_case | `get_user` | Underscore separator |
| kebab-case | `get-user` | Hyphen separator |

## REFERENCE: Import Cloning

Clone import structure from sample:

```typescript
// Sample imports:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { createApi } from '@/shared/api'
import { userKeys } from './user-keys'
import type { User, GetUserRequest } from '../model/types'

// Generated imports (same structure):
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { createApi } from '@/shared/api'
import { projectKeys } from './project-keys'
import type { Project, GetProjectRequest } from '../model/types'
```

---

## REFERENCE: Security

When generating code, follow security guidelines in [../../SECURITY.md](../../SECURITY.md):

- **Sanitize all identifiers** from OpenAPI spec before use in code
- **Escape strings** in template literals (backticks, dollar signs)
- **Never use** `eval()`, `new Function()`, or dynamic code execution
- **Use environment variables** for API keys/credentials
- **Include safe defaults** in generated HTTP client code (timeouts, size limits)

---

## OUTPUT: Generation Report

Report to user upon completion:

```
═══════════════════════════════════════════════════
  Code Generation Complete
═══════════════════════════════════════════════════

Generated files:
  ✓ src/entities/project/model/project-types.ts
    - Project (interface)
    - CreateProjectRequest (interface)
    - UpdateProjectRequest (interface)

  ✓ src/entities/project/api/project-api-paths.ts
    - PROJECT_PATHS (const)

  ✓ src/entities/project/api/project-api.ts
    - createProject (function)
    - getProject (function)
    - updateProject (function)
    - deleteProject (function)

  ✓ src/entities/project/api/project-queries.ts
    - useProject (hook)
    - useCreateProject (hook)
    - useUpdateProject (hook)
    - useDeleteProject (hook)

Style: Cloned from src/entities/user/
Confidence: 95% (all patterns matched)

Next: Run TypeScript compiler to verify types
```
