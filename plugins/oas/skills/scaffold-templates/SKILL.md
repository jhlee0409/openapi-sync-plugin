---
name: scaffold-templates
description: Best practice templates for API layer scaffolding
---

# Scaffold Templates

Defines production-ready templates for different tech stacks and architectural patterns.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. **Receive stack info** from calling command (framework, httpClient, dataFetching)
2. **Match to template** based on stack
3. **Return template definition** with file structures and code patterns

---

## Template Registry

### Template: react-query-fsd

**Best for:** React + TypeScript + React Query v5 + Medium-Large apps

**Stack Match:**
- framework: `react`
- dataFetching: `@tanstack/react-query` or `react-query`
- language: `typescript`

**Structure:**
```
src/
├── shared/
│   └── api/
│       ├── create-api.ts
│       ├── api-error.ts
│       └── index.ts
│
└── entities/
    └── {domain}/
        ├── api/
        │   ├── {domain}-api.ts
        │   ├── {domain}-paths.ts
        │   ├── {domain}-keys.ts
        │   └── {domain}-queries.ts
        ├── model/
        │   └── types.ts
        └── index.ts
```

**File Templates:**

#### create-api.ts
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? '';

export interface ApiRequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...this.defaultHeaders, ...config?.headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: config?.signal,
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async parseError(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return {
        status: response.status,
        message: data.message ?? response.statusText,
        code: data.code,
        details: data.details,
      };
    } catch {
      return { status: response.status, message: response.statusText };
    }
  }

  get<T>(path: string, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>('GET', path, undefined, config);
  }

  post<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>('POST', path, body, config);
  }

  put<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>('PUT', path, body, config);
  }

  patch<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>('PATCH', path, body, config);
  }

  delete<T>(path: string, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>('DELETE', path, undefined, config);
  }
}

export const createApi = () => new ApiClient();
export const api = new ApiClient();
```

#### api-error.ts
```typescript
import type { ApiError } from './create-api';

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
```

#### {domain}-paths.ts
```typescript
// Template: Replace {Domain} with actual domain name
export const {DOMAIN}_PATHS = {
  list: () => '/api/v1/{domains}' as const,
  detail: (id: string) => `/api/v1/{domains}/${id}` as const,
  create: () => '/api/v1/{domains}' as const,
  update: (id: string) => `/api/v1/{domains}/${id}` as const,
  delete: (id: string) => `/api/v1/{domains}/${id}` as const,
} as const;
```

#### {domain}-keys.ts
```typescript
// Template: Query key factory pattern
export const {domain}Keys = {
  all: ['{domains}'] as const,
  lists: () => [...{domain}Keys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...{domain}Keys.lists(), filters] as const,
  details: () => [...{domain}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{domain}Keys.details(), id] as const,
};
```

#### {domain}-api.ts
```typescript
import { api } from '@/shared/api';
import { {DOMAIN}_PATHS } from './{domain}-paths';
import type { {Domain}, Create{Domain}Request, Update{Domain}Request } from '../model/types';

export const {domain}Api = {
  list: async (): Promise<{Domain}[]> => {
    return api.get<{Domain}[]>({DOMAIN}_PATHS.list());
  },

  get: async (id: string): Promise<{Domain}> => {
    return api.get<{Domain}>({DOMAIN}_PATHS.detail(id));
  },

  create: async (data: Create{Domain}Request): Promise<{Domain}> => {
    return api.post<{Domain}>({DOMAIN}_PATHS.create(), data);
  },

  update: async (id: string, data: Update{Domain}Request): Promise<{Domain}> => {
    return api.patch<{Domain}>({DOMAIN}_PATHS.update(id), data);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete({DOMAIN}_PATHS.delete(id));
  },
};
```

#### {domain}-queries.ts
```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { {domain}Api } from './{domain}-api';
import { {domain}Keys } from './{domain}-keys';
import type { {Domain}, Create{Domain}Request, Update{Domain}Request } from '../model/types';
import type { ApiError } from '@/shared/api';

// Queries
export const use{Domain}s = (
  options?: Omit<UseQueryOptions<{Domain}[], ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: {domain}Keys.lists(),
    queryFn: {domain}Api.list,
    ...options,
  });
};

export const use{Domain} = (
  id: string,
  options?: Omit<UseQueryOptions<{Domain}, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: {domain}Keys.detail(id),
    queryFn: () => {domain}Api.get(id),
    enabled: !!id,
    ...options,
  });
};

// Mutations
export const useCreate{Domain} = (
  options?: UseMutationOptions<{Domain}, ApiError, Create{Domain}Request>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: {domain}Api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.lists() });
    },
    ...options,
  });
};

export const useUpdate{Domain} = (
  options?: UseMutationOptions<{Domain}, ApiError, { id: string; data: Update{Domain}Request }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => {domain}Api.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {domain}Keys.lists() });
    },
    ...options,
  });
};

export const useDelete{Domain} = (
  options?: UseMutationOptions<void, ApiError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: {domain}Api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.lists() });
    },
    ...options,
  });
};
```

#### types.ts
```typescript
// Auto-generated from OpenAPI schemas
// Types will be generated from OpenAPI spec schemas
```

#### index.ts (domain barrel)
```typescript
export * from './api/{domain}-api';
export * from './api/{domain}-paths';
export * from './api/{domain}-keys';
export * from './api/{domain}-queries';
export * from './model/types';
```

---

### Template: react-query-flat

**Best for:** React + TypeScript + React Query + Small apps/Prototypes

**Stack Match:**
- framework: `react`
- dataFetching: `@tanstack/react-query`
- projectSize: small (< 20 endpoints)

**Structure:**
```
src/
└── api/
    ├── client.ts
    ├── types/
    │   ├── index.ts
    │   └── {domain}.ts
    ├── {domain}/
    │   ├── api.ts
    │   └── hooks.ts
    └── index.ts
```

---

### Template: axios-service

**Best for:** React/Vue + Axios + OOP style

**Stack Match:**
- httpClient: `axios`
- style: service-class

**Structure:**
```
src/
└── services/
    ├── base.service.ts
    ├── {domain}.service.ts
    └── types/
        └── {domain}.ts
```

**File Templates:**

#### base.service.ts
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class BaseService {
  protected api: AxiosInstance;

  constructor(baseURL: string = process.env.REACT_APP_API_URL ?? '') {
    this.api = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use((config) => {
      // Add auth token if available
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
        }
        return Promise.reject(error);
      }
    );
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.api.get<T>(url, config);
    return data;
  }

  protected async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.api.post<T>(url, body, config);
    return data;
  }

  protected async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.api.put<T>(url, body, config);
    return data;
  }

  protected async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.api.patch<T>(url, body, config);
    return data;
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.api.delete<T>(url, config);
    return data;
  }
}
```

#### {domain}.service.ts
```typescript
import { BaseService } from './base.service';
import type { {Domain}, Create{Domain}Dto, Update{Domain}Dto } from './types/{domain}';

class {Domain}Service extends BaseService {
  private readonly basePath = '/api/v1/{domains}';

  async getAll(): Promise<{Domain}[]> {
    return this.get<{Domain}[]>(this.basePath);
  }

  async getById(id: string): Promise<{Domain}> {
    return this.get<{Domain}>(`${this.basePath}/${id}`);
  }

  async create(dto: Create{Domain}Dto): Promise<{Domain}> {
    return this.post<{Domain}>(this.basePath, dto);
  }

  async update(id: string, dto: Update{Domain}Dto): Promise<{Domain}> {
    return this.patch<{Domain}>(`${this.basePath}/${id}`, dto);
  }

  async remove(id: string): Promise<void> {
    return this.delete(`${this.basePath}/${id}`);
  }
}

export const {domain}Service = new {Domain}Service();
```

---

### Template: fetch-minimal

**Best for:** Simple projects, vanilla JS/TS, learning

**Stack Match:**
- Any framework
- No specific httpClient
- projectSize: minimal

**Structure:**
```
src/
└── api/
    ├── fetcher.ts
    ├── types.ts
    └── endpoints.ts
```

---

### Template: swr-nextjs

**Best for:** Next.js + SWR

**Stack Match:**
- framework: `next`
- dataFetching: `swr`

**Structure:**
```
src/
└── lib/
    └── api/
        ├── fetcher.ts
        └── {domain}/
            ├── api.ts
            └── hooks.ts
```

---

## Template Selection Algorithm

```
INPUT: { framework, httpClient, dataFetching, language, projectSize }

1. If dataFetching === 'react-query' AND framework === 'react':
   - If projectSize > 20 endpoints → 'react-query-fsd'
   - Else → 'react-query-flat'

2. If dataFetching === 'swr' AND framework === 'next':
   → 'swr-nextjs'

3. If httpClient === 'axios':
   → 'axios-service'

4. Fallback:
   → 'fetch-minimal'
```

---

## Naming Conventions

| Placeholder | Transformation | Example |
|-------------|----------------|---------|
| `{domain}` | camelCase | `user`, `projectClip` |
| `{Domain}` | PascalCase | `User`, `ProjectClip` |
| `{DOMAIN}` | SCREAMING_SNAKE | `USER`, `PROJECT_CLIP` |
| `{domains}` | kebab-case plural | `users`, `project-clips` |

---

## OUTPUT

Return to calling command:

```json
{
  "templateName": "react-query-fsd",
  "structure": {
    "shared": ["create-api.ts", "api-error.ts", "index.ts"],
    "perDomain": ["api.ts", "paths.ts", "keys.ts", "queries.ts", "types.ts", "index.ts"]
  },
  "files": {
    "shared/api/create-api.ts": "...(content)...",
    "shared/api/api-error.ts": "...(content)...",
    "entities/{domain}/api/{domain}-api.ts": "...(template)...",
    // ...
  },
  "placeholders": ["domain", "Domain", "DOMAIN", "domains"]
}
```
