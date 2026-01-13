---
name: pattern-detector
description: Universal pattern detector - learns from ANY codebase through sample analysis
---

# Universal Pattern Detector

Analyze ANY codebase to learn existing API patterns. Works with any framework, structure, or convention by analyzing actual code samples.

## Core Philosophy

```
DON'T: Match against predefined patterns
DO:    Learn from existing code samples

"Show me one API file, I'll generate 100 more like it"
```

## Detection Strategy (Priority Order)

### Phase 1: Framework Detection (package.json)

```
Read package.json dependencies + devDependencies

FRONTEND FRAMEWORKS:
  "react" → React ecosystem
  "vue" → Vue ecosystem
  "@angular/core" → Angular ecosystem
  "svelte" → Svelte ecosystem
  "solid-js" → SolidJS ecosystem
  "next" → Next.js (React SSR)
  "nuxt" → Nuxt (Vue SSR)
  "@remix-run/react" → Remix

HTTP CLIENTS:
  "axios" → Axios
  "ky" → Ky
  "got" → Got (Node)
  "node-fetch" → Fetch polyfill
  "ofetch" → oFetch (Nuxt)
  "@angular/common/http" → Angular HttpClient
  (none) → Native fetch

STATE/DATA FETCHING:
  "@tanstack/react-query" → TanStack Query (React)
  "@tanstack/vue-query" → TanStack Query (Vue)
  "@tanstack/solid-query" → TanStack Query (Solid)
  "@tanstack/svelte-query" → TanStack Query (Svelte)
  "swr" → SWR
  "@reduxjs/toolkit" → RTK Query (check for createApi)
  "pinia" → Pinia (Vue)
  "@ngrx/store" → NgRx (Angular)
  "rxjs" → RxJS (Angular)
  "apollo" / "@apollo/client" → GraphQL Apollo
  "urql" → GraphQL URQL
  (none) → No data fetching library

TYPE SYSTEM:
  "typescript" → TypeScript
  (none) → JavaScript

Output: { framework, httpClient, dataFetching, language }
```

### Phase 2: Find Existing API Code (Sample Discovery)

```
SEARCH STRATEGY (broadest first):

1. Common API locations:
   Glob: src/**/api/**/*.{ts,js,tsx,jsx}
   Glob: src/**/services/**/*.{ts,js}
   Glob: src/**/hooks/**/*{api,query,fetch}*.{ts,js}
   Glob: lib/api/**/*.{ts,js}
   Glob: api/**/*.{ts,js}

2. HTTP client usage:
   Grep: "axios\." OR "fetch(" OR "ky\." OR "http\."
   → Find files with HTTP calls

3. Data fetching hooks:
   Grep: "useQuery|useMutation|useSWR|createAsyncThunk"
   → Find files with data fetching

4. Type definitions:
   Grep: "Response|Request|Dto|Entity" in type/interface
   → Find API-related types

IF NO FILES FOUND:
   → Go to Phase 4 (Interactive)
```

### Phase 3: Sample Analysis (THE KEY)

**For each discovered sample file, extract:**

```typescript
ANALYZE FILE STRUCTURE:
{
  // File metadata
  "filePath": "src/entities/user/api/user-api.ts",
  "fileName": "user-api.ts",
  "folderStructure": ["src", "entities", "user", "api"],

  // Imports analysis
  "imports": {
    "httpClient": {
      "source": "@/shared/api",
      "named": ["createApi"],
      "pattern": "custom-wrapper"
    },
    "types": {
      "source": "../model/types",
      "named": ["User", "GetUserRequest"]
    },
    "external": ["@tanstack/react-query"]
  },

  // Export analysis
  "exports": {
    "functions": ["getUser", "createUser", "updateUser"],
    "hooks": ["useUser", "useCreateUser"],
    "constants": ["userKeys", "USER_API_PATHS"],
    "types": ["UserResponse"]
  },

  // Function patterns
  "functionPatterns": [
    {
      "name": "getUser",
      "type": "async-arrow|async-function|sync",
      "params": "({ id }: GetUserRequest)",
      "returnType": "Promise<User>",
      "httpCall": {
        "method": "get",
        "client": "createApi()",
        "pathPattern": "USER_API_PATHS.detail(id)",
        "responseAccess": ".data"
      }
    }
  ],

  // Hook patterns (if present)
  "hookPatterns": [
    {
      "name": "useUser",
      "library": "react-query",
      "type": "query|mutation",
      "keyPattern": "userKeys.detail(id)",
      "fnPattern": "userApi.getUser({ id })"
    }
  ],

  // Naming conventions (extracted)
  "naming": {
    "filePattern": "{domain}-api.ts",
    "functionPrefix": "get|create|update|delete",
    "hookPrefix": "use",
    "typePattern": "{Entity}Response"
  }
}
```

**Multi-sample correlation:**

```
IF multiple samples found:
  → Compare patterns across files
  → Find common conventions
  → Calculate consistency score
  → Use majority pattern

EXAMPLE:
  File1: getUser, createUser (camelCase, verb+Entity)
  File2: fetchProject, addProject (camelCase, verb+Entity)
  File3: get_clip, create_clip (snake_case)

  → Majority: camelCase + verb+Entity
  → Confidence: 66%
  → Note: File3 uses different convention
```

### Phase 4: Interactive Fallback

**When detection fails or confidence < 50%:**

```
ASK USER:

Q1: "Please provide the folder or file path where API code is located"
    → User provides: "src/api/userService.ts"
    → Analyze that specific file

Q2: "Which HTTP client are you using?"
    Options: [Axios, Fetch, Ky, Custom, Other]

Q3: "Are you using a data fetching library?"
    Options: [React Query, SWR, RTK Query, None, Other]

Q4: "Would you like to provide sample code for reference?"
    → User pastes code
    → Analyze pasted code directly
```

### Phase 5: Pattern Synthesis

**Combine all gathered information:**

```json
{
  "meta": {
    "detectionMethod": "sample-analysis|package-json|interactive",
    "confidence": 0.85,
    "samplesAnalyzed": 5,
    "framework": "react"
  },

  "structure": {
    "type": "custom",
    "pattern": "src/entities/{domain}/api/{domain}-api.ts",
    "discovered": [
      "src/entities/user/api/user-api.ts",
      "src/entities/project/api/project-api.ts"
    ]
  },

  "httpClient": {
    "type": "custom-wrapper",
    "import": "import { createApi } from '@/shared/api'",
    "usage": "createApi().{method}<{Type}>(path)",
    "responseAccess": ".data"
  },

  "dataFetching": {
    "library": "react-query",
    "version": "5",
    "patterns": {
      "queryKey": "factory",
      "queryKeyImport": "import { {domain}Keys } from './{domain}-keys'",
      "hookLocation": "same-file|separate-file"
    }
  },

  "types": {
    "location": "src/entities/{domain}/model/types.ts",
    "style": "interface",
    "naming": {
      "request": "{Operation}Request",
      "response": "{Operation}Response",
      "entity": "{Entity}"
    }
  },

  "codeStyle": {
    "quotes": "single|double",
    "semicolons": true,
    "trailingComma": "es5|all|none",
    "indentation": "2-spaces|4-spaces|tabs",
    "functionStyle": "arrow|declaration"
  },

  "samples": {
    "api": {
      "path": "src/entities/user/api/user-api.ts",
      "content": "// actual sample code for reference"
    },
    "types": {
      "path": "src/entities/user/model/types.ts",
      "content": "// actual sample code"
    },
    "hooks": {
      "path": "src/entities/user/api/queries.ts",
      "content": "// actual sample code"
    }
  }
}
```

## Universal Template Extraction

**From any sample, extract a reusable template:**

```typescript
// ORIGINAL SAMPLE
export const getUser = async ({ id }: GetUserRequest): Promise<User> => {
  const response = await createApi().get<User>(`/api/v1/users/${id}`)
  return response.data
}

// EXTRACTED TEMPLATE
export const {functionName} = async ({ {params} }: {RequestType}): Promise<{ResponseType}> => {
  const response = await {httpClient}.{method}<{ResponseType}>({pathExpression})
  return response.data
}

// TEMPLATE VARIABLES
{
  "functionName": "get{Entity}",
  "params": "id",
  "RequestType": "Get{Entity}Request",
  "ResponseType": "{Entity}",
  "httpClient": "createApi()",
  "method": "get",
  "pathExpression": "`/api/v1/{entities}/${id}`"
}
```

## Handling Unknown Patterns

```
UNKNOWN HTTP CLIENT:
  → Extract the import statement
  → Extract the call pattern
  → Store as "custom" with raw pattern

UNKNOWN STRUCTURE:
  → Record the actual paths found
  → Use those paths as template

UNKNOWN CONVENTION:
  → Ask user for one sample
  → Clone that exact style

NO EXISTING CODE:
  → Ask user preference
  → Or use sensible defaults based on framework
```

## Output for Code Generator

Provide everything code-generator needs:

```json
{
  "templates": {
    "apiFunction": "// extracted template with placeholders",
    "queryHook": "// extracted template",
    "mutationHook": "// extracted template",
    "types": "// extracted template",
    "pathConstants": "// extracted template"
  },

  "paths": {
    "api": "src/entities/{domain}/api/{domain}-api.ts",
    "types": "src/entities/{domain}/model/types.ts",
    "hooks": "src/entities/{domain}/api/queries.ts",
    "keys": "src/entities/{domain}/api/{domain}-keys.ts"
  },

  "imports": {
    "httpClient": "import { createApi } from '@/shared/api'",
    "queryLibrary": "import { useQuery, useMutation } from '@tanstack/react-query'",
    "types": "import type { {Types} } from '../model/types'"
  },

  "samples": {
    // Raw samples for reference/fallback
  }
}
```

## Special Cases

### Monorepo Detection
```
Check for:
  - pnpm-workspace.yaml
  - lerna.json
  - nx.json
  - turbo.json
  - packages/ or apps/ directory

If monorepo:
  → Ask which package to analyze
  → Or detect from current working directory
```

### GraphQL Projects
```
If Apollo/URQL detected:
  → Look for .graphql files
  → Look for gql`` template literals
  → Adjust generation for GraphQL patterns
```

### Backend/Full-stack
```
If Express/Fastify/NestJS detected:
  → This is a backend project
  → Adjust to generate route handlers instead of client code
  → Or ask if generating client SDK
```
