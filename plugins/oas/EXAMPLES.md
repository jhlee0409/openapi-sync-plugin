# Code Examples

Complete, realistic examples for the OAS plugin.

---

## Table of Contents

1. [Quick Start Example](#quick-start-example)
2. [Sample OpenAPI Spec](#sample-openapi-spec)
3. [Pattern Detection Examples](#pattern-detection-examples)
4. [Generated Code Examples](#generated-code-examples)
5. [Structure Examples](#structure-examples) (any structure supported)
6. [Hook Examples](#hook-examples) (any hook library supported)

---

## Quick Start Example

### Complete Workflow: Init → Analyze → Sync

**Step 1: Initialize**

```bash
/oas:init https://api.example.com/openapi.json
```

**Output:**
```
📋 OpenAPI Sync Initialization

✅ Fetched spec: Example API v2.0.0
   Endpoints: 45
   Tags: users, projects, tasks, notifications

🔍 Analyzing your codebase...

📁 Detected Structure: FSD (Feature-Sliced Design)
   src/entities/user/api/user-api.ts (sample detected)

🔌 Detected HTTP Client: Axios (custom wrapper)
   src/shared/api/create-api.ts

📦 Detected State Manager: React Query v5
   Query key factory pattern detected

✅ Configuration saved to .openapi-sync.json
✅ Added cache files to .gitignore

Next: Run /oas:sync to generate API code
```

**Step 2: Review What Will Be Generated**

```bash
/oas:sync --dry-run
```

**Output:**
```
📊 Sync Preview (dry-run)

Will generate for tag: projects (12 endpoints)

Files to create:
  + src/entities/project/model/project-types.ts (8 types)
  + src/entities/project/api/project-api.ts (12 functions)
  + src/entities/project/api/project-api-paths.ts (12 paths)
  + src/entities/project/api/project-queries.ts (12 hooks)

Files to update:
  ~ src/entities/project/model/types.ts (+2 fields on Project)

No files will be deleted.

Run /oas:sync to apply these changes.
```

**Step 3: Generate Code**

```bash
/oas:sync --tag=projects
```

**Output:**
```
═══════════════════════════════════════════════════
  Code Generation Complete
═══════════════════════════════════════════════════

Generated 4 files for tag: projects

  ✓ src/entities/project/model/project-types.ts
    - Project, CreateProjectRequest, UpdateProjectRequest
    - GetProjectsParams, ProjectListResponse
    - 8 types total

  ✓ src/entities/project/api/project-api-paths.ts
    - PROJECT_PATHS constant
    - 12 path functions

  ✓ src/entities/project/api/project-api.ts
    - getProject, getProjects, createProject
    - updateProject, deleteProject, archiveProject
    - 12 functions total

  ✓ src/entities/project/api/project-queries.ts
    - useProject, useProjects
    - useCreateProject, useUpdateProject
    - 12 hooks total

Style: Cloned from src/entities/user/
Confidence: 98%

Next: Run your TypeScript compiler to verify types
```

---

## Sample OpenAPI Spec

### Minimal Spec (for testing)

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Example API",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "https://api.example.com/v1" }
  ],
  "paths": {
    "/users": {
      "get": {
        "operationId": "getUsers",
        "tags": ["users"],
        "summary": "List all users",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": { "type": "integer", "default": 1 }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "default": 20 }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserListResponse"
                }
              }
            }
          }
        }
      },
      "post": {
        "operationId": "createUser",
        "tags": ["users"],
        "summary": "Create a new user",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateUserRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "operationId": "getUser",
        "tags": ["users"],
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      },
      "put": {
        "operationId": "updateUser",
        "tags": ["users"],
        "summary": "Update user",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      },
      "delete": {
        "operationId": "deleteUser",
        "tags": ["users"],
        "summary": "Delete user",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "204": {
            "description": "Deleted"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string" },
          "status": {
            "type": "string",
            "enum": ["active", "inactive", "pending"]
          },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" }
        },
        "required": ["id", "email", "name", "status"]
      },
      "CreateUserRequest": {
        "type": "object",
        "properties": {
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string" },
          "password": { "type": "string", "minLength": 8 }
        },
        "required": ["email", "name", "password"]
      },
      "UpdateUserRequest": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "status": {
            "type": "string",
            "enum": ["active", "inactive", "pending"]
          }
        }
      },
      "UserListResponse": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/User" }
          },
          "total": { "type": "integer" },
          "page": { "type": "integer" },
          "limit": { "type": "integer" }
        },
        "required": ["items", "total", "page", "limit"]
      }
    }
  }
}
```

---

## Pattern Detection Examples

### Example 1: FSD Structure Detection

**Your existing code:**

```
src/
├── entities/
│   └── user/
│       ├── api/
│       │   ├── user-api.ts
│       │   ├── user-api-paths.ts
│       │   └── user-queries.ts
│       └── model/
│           └── types.ts
├── features/
│   └── auth/
│       └── api/
└── shared/
    └── api/
        └── create-api.ts
```

**Detected pattern:**

```
📁 Structure: FSD (Feature-Sliced Design)
   Pattern: src/entities/{domain}/api/{domain}-api.ts

   Detection evidence:
   - entities/ directory found
   - Consistent {domain}-api.ts naming
   - model/ subdirectory for types
```

### Example 2: HTTP Client Detection

**Your existing code (src/shared/api/create-api.ts):**

```typescript
import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const createApi = () => instance
```

**Your existing API code (src/entities/user/api/user-api.ts):**

```typescript
import { createApi } from '@/shared/api'
import { USER_PATHS } from './user-api-paths'
import type { User, CreateUserRequest, UpdateUserRequest } from '../model/types'

export const userApi = {
  getUser: async ({ id }: { id: string }): Promise<User> => {
    const response = await createApi().get<User>(USER_PATHS.detail(id))
    return response.data
  },

  getUsers: async ({ page = 1, limit = 20 } = {}): Promise<UserListResponse> => {
    const response = await createApi().get<UserListResponse>(USER_PATHS.list(), {
      params: { page, limit },
    })
    return response.data
  },

  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await createApi().post<User>(USER_PATHS.list(), data)
    return response.data
  },

  updateUser: async ({ id, ...data }: { id: string } & UpdateUserRequest): Promise<User> => {
    const response = await createApi().put<User>(USER_PATHS.detail(id), data)
    return response.data
  },

  deleteUser: async ({ id }: { id: string }): Promise<void> => {
    await createApi().delete(USER_PATHS.detail(id))
  },
}
```

**Detected pattern:**

```
🔌 HTTP Client: Axios (custom wrapper)

   Detected patterns:
   - Import: createApi from '@/shared/api'
   - Call: createApi().get<T>(path)
   - Response: response.data
   - Style: Object with methods (userApi.getUser)

   Function signature:
   - Async arrow function
   - Destructured parameters: { id }: { id: string }
   - Explicit return type: Promise<T>
```

### Example 3: React Query Pattern Detection

**Your existing code (src/entities/user/api/user-queries.ts):**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { userApi } from './user-api'
import type { User } from '../model/types'

// Query key factory pattern
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Query hooks
export const useUser = (
  id: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser({ id }),
    ...options,
  })
}

export const useUsers = (
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<UserListResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.list(params ?? {}),
    queryFn: () => userApi.getUsers(params),
    ...options,
  })
}

// Mutation hooks
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateUser,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(userKeys.detail(variables.id), data)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
```

**Detected pattern:**

```
📦 State Manager: React Query v5

   Detected patterns:
   - Query key factory: userKeys object
   - Query hooks: useUser, useUsers
   - Mutation hooks: useCreateUser, useUpdateUser, useDeleteUser
   - Cache invalidation on mutations
   - Optional options parameter with type safety
```

---

## Generated Code Examples

Based on the patterns detected above, here's what gets generated for a new "project" domain:

### Generated Types (project-types.ts)

```typescript
// src/entities/project/model/project-types.ts
// Generated by /oas:sync - DO NOT EDIT MANUALLY

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'archived' | 'draft'
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  templateId?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: 'active' | 'archived' | 'draft'
}

export interface GetProjectsParams {
  page?: number
  limit?: number
  status?: 'active' | 'archived' | 'draft'
  ownerId?: string
}

export interface ProjectListResponse {
  items: Project[]
  total: number
  page: number
  limit: number
}
```

### Generated Path Constants (project-api-paths.ts)

```typescript
// src/entities/project/api/project-api-paths.ts
// Generated by /oas:sync - DO NOT EDIT MANUALLY

const BASE_PATH = '/api/v1/projects'

export const PROJECT_PATHS = {
  list: () => BASE_PATH,
  detail: (id: string) => `${BASE_PATH}/${id}`,
  archive: (id: string) => `${BASE_PATH}/${id}/archive`,
  restore: (id: string) => `${BASE_PATH}/${id}/restore`,
  members: (id: string) => `${BASE_PATH}/${id}/members`,
  member: (id: string, userId: string) => `${BASE_PATH}/${id}/members/${userId}`,
} as const
```

### Generated API Functions (project-api.ts)

```typescript
// src/entities/project/api/project-api.ts
// Generated by /oas:sync - DO NOT EDIT MANUALLY

import { createApi } from '@/shared/api'
import { PROJECT_PATHS } from './project-api-paths'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  GetProjectsParams,
  ProjectListResponse,
} from '../model/project-types'

export const projectApi = {
  getProject: async ({ id }: { id: string }): Promise<Project> => {
    const response = await createApi().get<Project>(PROJECT_PATHS.detail(id))
    return response.data
  },

  getProjects: async (params?: GetProjectsParams): Promise<ProjectListResponse> => {
    const response = await createApi().get<ProjectListResponse>(PROJECT_PATHS.list(), {
      params,
    })
    return response.data
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await createApi().post<Project>(PROJECT_PATHS.list(), data)
    return response.data
  },

  updateProject: async ({
    id,
    ...data
  }: { id: string } & UpdateProjectRequest): Promise<Project> => {
    const response = await createApi().put<Project>(PROJECT_PATHS.detail(id), data)
    return response.data
  },

  deleteProject: async ({ id }: { id: string }): Promise<void> => {
    await createApi().delete(PROJECT_PATHS.detail(id))
  },

  archiveProject: async ({ id }: { id: string }): Promise<Project> => {
    const response = await createApi().post<Project>(PROJECT_PATHS.archive(id))
    return response.data
  },

  restoreProject: async ({ id }: { id: string }): Promise<Project> => {
    const response = await createApi().post<Project>(PROJECT_PATHS.restore(id))
    return response.data
  },
}
```

### Generated Query Hooks (project-queries.ts)

```typescript
// src/entities/project/api/project-queries.ts
// Generated by /oas:sync - DO NOT EDIT MANUALLY

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { projectApi } from './project-api'
import type { Project, GetProjectsParams, ProjectListResponse } from '../model/project-types'

// Query key factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: GetProjectsParams) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Query hooks
export const useProject = (
  id: string,
  options?: Omit<UseQueryOptions<Project>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getProject({ id }),
    ...options,
  })
}

export const useProjects = (
  params?: GetProjectsParams,
  options?: Omit<UseQueryOptions<ProjectListResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: projectKeys.list(params ?? {}),
    queryFn: () => projectApi.getProjects(params),
    ...options,
  })
}

// Mutation hooks
export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectApi.updateProject,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(projectKeys.detail(variables.id), data)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectApi.deleteProject,
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export const useArchiveProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectApi.archiveProject,
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export const useRestoreProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectApi.restoreProject,
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
```

---

## Structure Examples

> **Note:** These are common examples. The plugin learns from YOUR existing code samples, so any folder structure is supported.

### FSD (Feature-Sliced Design)

```
src/
├── entities/
│   ├── user/
│   │   ├── api/
│   │   │   ├── user-api.ts
│   │   │   ├── user-api-paths.ts
│   │   │   ├── user-queries.ts
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── project/
│       ├── api/
│       │   ├── project-api.ts          ← Generated
│       │   ├── project-api-paths.ts    ← Generated
│       │   ├── project-queries.ts      ← Generated
│       │   └── index.ts                ← Generated
│       ├── model/
│       │   ├── project-types.ts        ← Generated
│       │   └── index.ts                ← Generated
│       └── index.ts                    ← Generated
└── shared/
    └── api/
        └── create-api.ts
```

**Generated barrel exports (index.ts files):**

```typescript
// src/entities/project/api/index.ts
export * from './project-api'
export * from './project-api-paths'
export * from './project-queries'

// src/entities/project/model/index.ts
export type * from './project-types'

// src/entities/project/index.ts
export * from './api'
export type * from './model'
```

### Feature-Based Structure

```
src/
├── features/
│   ├── user/
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── project/
│       ├── api.ts       ← Generated
│       ├── hooks.ts     ← Generated
│       ├── types.ts     ← Generated
│       └── index.ts     ← Generated
└── lib/
    └── api-client.ts
```

**Generated code style differs:**

```typescript
// src/features/project/api.ts
import { apiClient } from '@/lib/api-client'
import type { Project, CreateProjectRequest } from './types'

export async function getProject(id: string): Promise<Project> {
  return apiClient.get(`/projects/${id}`)
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return apiClient.post('/projects', data)
}
```

### Flat Structure

```
src/
├── api/
│   ├── user.ts
│   └── project.ts     ← Generated
├── hooks/
│   ├── useUser.ts
│   └── useProject.ts  ← Generated
├── types/
│   ├── user.ts
│   └── project.ts     ← Generated
└── lib/
    └── fetch.ts
```

---

## Hook Examples

> **Note:** These are common examples. The plugin learns from YOUR existing code samples, so any data fetching library (React Query, SWR, RTK Query, custom hooks, etc.) is supported.

### SWR Pattern

If SWR is detected instead of React Query:

```typescript
// src/hooks/useProject.ts
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { projectApi } from '@/api/project'
import type { Project, GetProjectsParams } from '@/types/project'

export const useProject = (id: string) => {
  return useSWR<Project>(
    id ? ['project', id] : null,
    () => projectApi.getProject({ id })
  )
}

export const useProjects = (params?: GetProjectsParams) => {
  return useSWR<ProjectListResponse>(
    ['projects', params],
    () => projectApi.getProjects(params)
  )
}

export const useCreateProject = () => {
  return useSWRMutation(
    'projects',
    (_, { arg }: { arg: CreateProjectRequest }) => projectApi.createProject(arg)
  )
}
```

### RTK Query Pattern

If RTK Query is detected:

```typescript
// src/features/project/projectApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Project, CreateProjectRequest, GetProjectsParams } from './types'

export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_, __, id) => [{ type: 'Project', id }],
    }),
    getProjects: builder.query<ProjectListResponse, GetProjectsParams | void>({
      query: (params) => ({
        url: '/projects',
        params,
      }),
      providesTags: ['Project'],
    }),
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, { id: string } & UpdateProjectRequest>({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Project', id }],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [{ type: 'Project', id }],
    }),
  }),
})

export const {
  useGetProjectQuery,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectApi
```

### No Hooks (API Functions Only)

If no state manager is detected:

```typescript
// src/api/project.ts
import { httpClient } from '@/lib/http'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types/project'

export const projectApi = {
  getProject: (id: string) =>
    httpClient.get<Project>(`/projects/${id}`),

  getProjects: (params?: { page?: number; limit?: number }) =>
    httpClient.get<ProjectListResponse>('/projects', { params }),

  createProject: (data: CreateProjectRequest) =>
    httpClient.post<Project>('/projects', data),

  updateProject: (id: string, data: UpdateProjectRequest) =>
    httpClient.put<Project>(`/projects/${id}`, data),

  deleteProject: (id: string) =>
    httpClient.delete(`/projects/${id}`),
}
```

---

## Reference

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Plugin structure
- [skills/code-generator/SKILL.md](./skills/code-generator/SKILL.md) - Generation logic
- [skills/pattern-detector/SKILL.md](./skills/pattern-detector/SKILL.md) - Pattern detection
