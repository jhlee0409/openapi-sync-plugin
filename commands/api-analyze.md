---
name: api:analyze
description: Deep analysis of project's API code patterns
argument-hint: [--verbose] [--domain=name]
---

# API Pattern Analysis

Perform deep analysis of the project's existing API-related code patterns.

## Prerequisites

Check if `.openapi-sync.json` exists. If not, suggest running `/api:init` first.

## Analysis Scope

### 1. Folder Structure Analysis

Scan and categorize:

```
FSD (Feature-Sliced Design):
  src/
    entities/{domain}/api/
    features/{domain}/api/
    shared/api/

Feature-based:
  src/
    features/{feature}/api/
    features/{feature}/hooks/

Flat:
  src/
    api/
    hooks/
    types/

Service-based:
  src/
    services/{domain}.ts
    services/{domain}.service.ts
```

Report findings with file counts per pattern.

### 2. HTTP Client Analysis

Search for usage patterns:

```typescript
// Axios patterns
import axios from 'axios'
axios.create({ baseURL: ... })
const api = axios.create(...)
api.get(), api.post(), api.put(), api.delete()

// Fetch patterns
fetch(url, options)
const response = await fetch(...)

// Ky patterns
import ky from 'ky'
ky.get(), ky.post()

// Custom wrapper patterns
import { createApi, httpClient } from '@/shared/api'
```

### 3. State Management Analysis

```typescript
// React Query patterns
import { useQuery, useMutation } from '@tanstack/react-query'
useQuery({ queryKey: [...], queryFn: ... })

// Query Key Factory pattern
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

// SWR patterns
import useSWR from 'swr'
const { data } = useSWR(key, fetcher)

// RTK Query patterns
import { createApi } from '@reduxjs/toolkit/query/react'
```

### 4. Type Definition Patterns

```typescript
// Inline types
const getUser = async (id: string): Promise<{ name: string; email: string }> => ...

// Separate types file
// types.ts
export interface User { ... }
export type GetUserRequest = { id: string }
export type GetUserResponse = User

// Barrel exports
// index.ts
export * from './types'
export * from './api'

// Request/Response naming
type CreateUserRequest = { ... }
type CreateUserResponse = { ... }
```

### 5. Naming Convention Analysis

Extract patterns from existing code:

- File naming: `{domain}-api.ts`, `{domain}.service.ts`, `api.ts`
- Function naming: `getUser`, `fetchUser`, `createGetUser`
- Hook naming: `useGetUser`, `useUserQuery`, `useUser`
- Type naming: `User`, `UserDto`, `IUser`, `UserResponse`

## Output Format

```
=== API Pattern Analysis ===

📁 Folder Structure: FSD (Feature-Sliced Design)
   entities/: 5 domains (user, project, clip, audio, timeline)
   features/: 3 features (auth, editor, export)
   shared/api/: base client configuration

🔌 HTTP Client: Axios (custom wrapper)
   Base: src/shared/api/create-api.ts
   Instance: createApi() with interceptors
   Pattern: const res = await api.get<T>(path)

📦 State Management: React Query v5
   Pattern: Query Key Factory
   Example: src/entities/user/api/user-keys.ts
   Hooks location: src/entities/{domain}/api/queries.ts

📝 Type Definitions: Separate files
   Location: src/entities/{domain}/model/types.ts
   Naming: {Entity}Response, {Entity}Request
   Export: Barrel (index.ts)

🏷️ Naming Conventions:
   Files: {domain}-api.ts, queries.ts, types.ts
   Functions: get{Entity}, create{Entity}, update{Entity}
   Hooks: use{Entity}, use{Entity}List, useCreate{Entity}
   Types: {Entity}, {Entity}Request, {Entity}Response

📊 Coverage:
   - 23 API functions found
   - 18 React Query hooks found
   - 45 type definitions found
   - 5 domains covered

💡 Recommendations:
   - Consider adding query key factory for 'audio' domain
   - Missing error handling in 3 API functions
```

## Flags

- `--verbose`: Show all file paths and code samples
- `--domain=name`: Analyze only specific domain
