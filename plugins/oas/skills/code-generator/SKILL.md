---
name: code-generator
description: Universal code generator - clones your existing code style exactly
---

# Universal Code Generator

Generate API code that perfectly matches your project's existing patterns. Works by cloning sample code structure, not predefined templates.

## Core Principle

```
INPUT:  Sample code + OpenAPI endpoint
OUTPUT: New code that looks like your team wrote it

"Your code style is the template"
```

## Generation Modes

### Mode 1: Sample-Based Generation (Preferred)

When pattern-detector provides sample code:

```
SAMPLE (from your codebase):
────────────────────────────
export const getUser = async ({ id }: GetUserRequest): Promise<User> => {
  const response = await createApi().get<User>(USER_PATHS.detail(id))
  return response.data
}

OPENAPI ENDPOINT:
────────────────────────────
POST /api/v1/projects
Body: { name: string, workspaceId: string }
Response: Project

GENERATED (cloning your style):
────────────────────────────
export const createProject = async ({ name, workspaceId }: CreateProjectRequest): Promise<Project> => {
  const response = await createApi().post<Project>(PROJECT_PATHS.create(), { name, workspaceId })
  return response.data
}
```

### Mode 2: Framework-Based Generation

When no samples but framework detected:

```
React + Axios + React Query → React template
Vue + Fetch + Pinia → Vue template
Angular + HttpClient + RxJS → Angular template
Svelte + Ky + Svelte Query → Svelte template
```

### Mode 3: Interactive Generation

When nothing detected:

```
Ask: "What style should I generate?"
Options:
  - Paste sample code (recommended)
  - Use default templates
  - Choose framework
```

## Sample Cloning Algorithm

### Step 1: Parse Sample Structure

```typescript
// INPUT SAMPLE
export const getUser = async ({ id }: GetUserRequest): Promise<User> => {
  const response = await createApi().get<User>(USER_PATHS.detail(id))
  return response.data
}

// PARSED STRUCTURE
{
  "export": "named",                    // export const vs export default
  "functionStyle": "arrow",             // arrow vs function declaration
  "async": true,
  "paramStyle": "destructured-typed",   // { id }: Type vs (id: string)
  "returnType": "explicit",             // Promise<T> vs inferred
  "httpClient": {
    "call": "createApi().get",
    "generic": true,                    // <Type> position
    "pathArg": "first",
    "dataArg": "second"
  },
  "responseHandling": ".data",          // return response.data vs return response
  "naming": {
    "pattern": "verb + Entity",         // getUser, createUser
    "requestType": "VerbEntityRequest", // GetUserRequest
    "responseType": "Entity"            // User (not GetUserResponse)
  }
}
```

### Step 2: Create Transformation Rules

```typescript
// TRANSFORMATION RULES FROM SAMPLE
{
  "functionTemplate": `export const {verb}{Entity} = async ({ {params} }: {Verb}{Entity}Request): Promise<{ReturnType}> => {
  const response = await createApi().{method}<{ReturnType}>({pathCall}{bodyArg})
  return response.data
}`,

  "verbMapping": {
    "GET (single)": "get",
    "GET (list)": "get{Entity}List",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete"
  },

  "pathPattern": "{ENTITY}_PATHS.{operation}({pathParams})"
}
```

### Step 3: Apply to OpenAPI Endpoints

```typescript
// FOR EACH ENDPOINT
{
  method: "POST",
  path: "/api/v1/projects",
  operationId: "createProject",
  requestBody: { name: string, workspaceId: string },
  response: Project
}

// APPLY TRANSFORMATION
{
  verb: "create",
  Entity: "Project",
  params: "name, workspaceId",
  ReturnType: "Project",
  method: "post",
  pathCall: "PROJECT_PATHS.create()",
  bodyArg: ", { name, workspaceId }"
}

// OUTPUT
export const createProject = async ({ name, workspaceId }: CreateProjectRequest): Promise<Project> => {
  const response = await createApi().post<Project>(PROJECT_PATHS.create(), { name, workspaceId })
  return response.data
}
```

## Multi-File Generation

### Determine File Structure from Samples

```
DETECTED STRUCTURE:
  src/entities/user/
  ├── api/
  │   ├── user-api.ts      ← API functions sample
  │   ├── user-paths.ts    ← Path constants sample
  │   └── queries.ts       ← React Query hooks sample
  └── model/
      └── types.ts         ← Types sample

FOR NEW DOMAIN "project":
  src/entities/project/
  ├── api/
  │   ├── project-api.ts   ← Clone user-api.ts structure
  │   ├── project-paths.ts ← Clone user-paths.ts structure
  │   └── queries.ts       ← Clone queries.ts structure
  └── model/
      └── types.ts         ← Clone types.ts structure
```

### File Content Cloning

For each file type, clone the exact structure:

```typescript
// SAMPLE: user-paths.ts
export const USER_PATHS = {
  list: () => '/api/v1/users',
  detail: (id: string) => `/api/v1/users/${id}`,
  create: () => '/api/v1/users',
} as const

// GENERATED: project-paths.ts (same structure)
export const PROJECT_PATHS = {
  list: () => '/api/v1/projects',
  detail: (id: string) => `/api/v1/projects/${id}`,
  create: () => '/api/v1/projects',
} as const
```

## Type Generation

### From Sample Type Patterns

```typescript
// SAMPLE TYPES
export interface User {
  id: string
  name: string
  email: string
}

export interface GetUserRequest {
  id: string
}

export type GetUserResponse = User

// DETECTED PATTERN
{
  entityStyle: "interface",
  requestStyle: "interface",
  responseStyle: "type-alias",
  propertyStyle: "required-by-default",
  optionalMarker: "?"
}

// GENERATED TYPES (same pattern)
export interface Project {
  id: string
  name: string
  workspaceId: string
}

export interface CreateProjectRequest {
  name: string
  workspaceId: string
}

export type CreateProjectResponse = Project
```

### OpenAPI to TypeScript Mapping

```typescript
// Preserve nullability as in sample
SAMPLE: email?: string    → optional with ?
OPENAPI: nullable: true   → Generate as optional?

SAMPLE: status: Status    → Uses type alias
OPENAPI: enum: [...]      → Generate type alias

// Match sample's handling of:
- Arrays: items[] vs Array<Item>
- Objects: Record<string, T> vs { [key: string]: T }
- Unions: A | B vs union type
- Dates: string vs Date
```

## Hook Generation

### Clone Hook Patterns

```typescript
// SAMPLE HOOK
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser({ id }),
  })
}

// GENERATED HOOK (same pattern)
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getProject({ id }),
  })
}

// SAMPLE MUTATION
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

// GENERATED MUTATION (same pattern)
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

## Import Statement Cloning

```typescript
// SAMPLE IMPORTS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import * as userApi from './user-api'
import { userKeys } from './user-keys'
import type { User, GetUserRequest } from '../model/types'

// GENERATED IMPORTS (same structure)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import * as projectApi from './project-api'
import { projectKeys } from './project-keys'
import type { Project, CreateProjectRequest } from '../model/types'
```

## Code Style Preservation

Detect and preserve from samples:

```typescript
{
  // Formatting
  "indentation": "2-spaces",      // from sample indentation
  "quotes": "single",             // from sample strings
  "semicolons": true,             // from sample line endings
  "trailingComma": "all",         // from sample objects/arrays

  // Conventions
  "blankLines": {
    "beforeExport": 1,
    "betweenFunctions": 1,
    "afterImports": 1
  },

  // Comments (preserve if sample has them)
  "jsdoc": true,                  // /** */ style
  "inlineComments": false
}
```

## Handling Variations

### When Multiple Samples Disagree

```
Sample 1: getUser()     (verb + Entity)
Sample 2: fetchProject() (different verb)
Sample 3: getUserById()  (verb + Entity + "ById")

STRATEGY:
1. Group by pattern
2. Use majority pattern
3. Report inconsistencies to user

"Found mixed naming: getUser (2 files) vs fetchProject (1 file)
Using 'get' pattern. Override in config if needed."
```

### When Sample Doesn't Cover a Case

```
SAMPLE: Only has GET endpoints
NEEDED: POST endpoint

STRATEGY:
1. Infer from GET pattern
2. Apply common conventions for POST
3. Or ask user for POST sample

"Your samples only have GET. For POST:
- Use 'create' prefix? (recommended based on GET 'get' pattern)
- Provide a sample POST function?"
```

## Output Format

```
=== Code Generation Complete ===

Created:
  ✓ src/entities/project/model/types.ts
    - Project (interface)
    - CreateProjectRequest (interface)
    - CreateProjectResponse (type)

  ✓ src/entities/project/api/project-paths.ts
    - PROJECT_PATHS (const)

  ✓ src/entities/project/api/project-api.ts
    - createProject (function)
    - getProject (function)
    - getProjectList (function)

  ✓ src/entities/project/api/project-keys.ts
    - projectKeys (const)

  ✓ src/entities/project/api/queries.ts
    - useProject (hook)
    - useProjectList (hook)
    - useCreateProject (hook)

Style: Cloned from src/entities/user/
Confidence: 95% (all patterns matched)
```

## Fallback: No Samples Available

When working with empty/new project:

```typescript
// Ask user preference
"This appears to be a new project. What style should I generate?"

Options:
1. "React + Axios + React Query (modern)"
2. "React + Fetch + SWR"
3. "Vue + Axios + Pinia"
4. "Provide sample directly"
5. "Generate types only (minimal)"

// Then use framework-specific sensible defaults
```
