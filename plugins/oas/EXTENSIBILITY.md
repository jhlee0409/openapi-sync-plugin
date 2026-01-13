# Extensibility Guide

Customize the OAS plugin to fit your project's specific needs.

---

## Table of Contents

1. [Configuration Reference](#configuration-reference)
2. [Sample Files](#sample-files)
3. [Tag Mapping](#tag-mapping)
4. [Ignore Patterns](#ignore-patterns)
5. [Output Customization](#output-customization)
6. [Advanced Scenarios](#advanced-scenarios)

---

## Configuration Reference

All configuration is stored in `.openapi-sync.json`.

### Complete Configuration Schema

```json
{
  "version": "1.0.0",

  "openapi": {
    "source": "https://api.example.com/openapi.json",
    "auth": {
      "type": "bearer",
      "token": "${OPENAPI_TOKEN}"
    }
  },

  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/user-queries.ts",
    "keys": "src/entities/user/api/user-keys.ts",
    "paths": "src/entities/user/api/user-api-paths.ts"
  },

  "output": {
    "basePath": "src/entities",
    "structure": "fsd",
    "fileNaming": "{tag}-{type}.ts",
    "typeNaming": "PascalCase",
    "functionNaming": "camelCase"
  },

  "tagMapping": {
    "user-management": "user",
    "project-management": "project",
    "authentication": "auth"
  },

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*",
    "/admin/*"
  ],

  "validation": {
    "ignorePaths": [
      "src/legacy/*"
    ],
    "strict": false
  },

  "migration": {
    "ignoreDeprecations": false,
    "breakingChangeLevel": "error"
  }
}
```

### Configuration Options

#### openapi

| Option | Type | Description |
|--------|------|-------------|
| `source` | string | URL or local path to OpenAPI spec |
| `auth.type` | string | Authentication type: `bearer`, `basic`, `apikey` |
| `auth.token` | string | Token value (supports env vars with `${VAR}`) |
| `auth.header` | string | Custom header name for apikey auth |

**Examples:**

```json
// Remote with bearer token
{
  "openapi": {
    "source": "https://api.example.com/openapi.json",
    "auth": {
      "type": "bearer",
      "token": "${API_TOKEN}"
    }
  }
}

// Local file
{
  "openapi": {
    "source": "./specs/openapi.yaml"
  }
}

// API key in header
{
  "openapi": {
    "source": "https://api.example.com/openapi.json",
    "auth": {
      "type": "apikey",
      "header": "X-API-Key",
      "token": "${API_KEY}"
    }
  }
}
```

#### samples

| Option | Type | Description |
|--------|------|-------------|
| `api` | string | Path to sample API file |
| `types` | string | Path to sample types file |
| `hooks` | string | Path to sample hooks file |
| `keys` | string | Path to sample query keys file |
| `paths` | string | Path to sample path constants file |

**Notes:**
- Set to `null` for auto-detection
- Relative paths from project root
- Must be existing files with actual implementations

#### output

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | string | Auto | Base directory for generated files |
| `structure` | string | Auto | `fsd`, `feature`, `flat` |
| `fileNaming` | string | Auto | Template: `{tag}`, `{type}` |
| `typeNaming` | string | Auto | `PascalCase`, `camelCase` |
| `functionNaming` | string | Auto | `PascalCase`, `camelCase` |

---

## Sample Files

The plugin learns your code style from sample files.

### How Samples Work

```
┌──────────────────────────────────────────────────────────────┐
│                    SAMPLE-BASED LEARNING                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Your Sample                    Generated Code               │
│   ───────────                    ──────────────               │
│                                                               │
│   export const userApi = {  →    export const projectApi = {  │
│     getUser: async ({id})   →      getProject: async ({id})   │
│       => createApi().get    →        => createApi().get       │
│   }                         →    }                            │
│                                                               │
│   Pattern extracted:                                          │
│   ✓ Object literal style                                      │
│   ✓ Destructured parameters                                   │
│   ✓ createApi() call pattern                                  │
│   ✓ Async arrow functions                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Providing Custom Samples

**Option 1: Auto-detection (default)**

The plugin automatically finds sample files:

```bash
/oas:init https://api.example.com/openapi.json

# Plugin searches for:
# - *-api.ts files
# - *-queries.ts files
# - types.ts files
# Uses most common patterns found
```

**Option 2: Explicit samples**

Specify exact sample files:

```json
{
  "samples": {
    "api": "src/shared/examples/sample-api.ts",
    "types": "src/shared/examples/sample-types.ts",
    "hooks": "src/shared/examples/sample-queries.ts"
  }
}
```

**Option 3: Interactive mode**

When no samples are found:

```bash
/oas:init

# No API patterns detected.
# Please provide a sample file path:
> src/entities/user/api/user-api.ts
```

### Sample File Requirements

**Minimum API sample:**

```typescript
// Must include at least one function with:
// - HTTP method call (get/post/put/delete)
// - Type annotations
// - Return statement

export const exampleApi = {
  getExample: async ({ id }: { id: string }): Promise<Example> => {
    const response = await createApi().get<Example>(`/examples/${id}`)
    return response.data
  },
}
```

**Minimum types sample:**

```typescript
// Must include at least one interface or type

export interface Example {
  id: string
  name: string
}

export interface CreateExampleRequest {
  name: string
}
```

**Minimum hooks sample:**

```typescript
// Must include at least one query hook

export const useExample = (id: string) => {
  return useQuery({
    queryKey: ['example', id],
    queryFn: () => exampleApi.getExample({ id }),
  })
}
```

### Overriding Detected Patterns

After running `/oas:init`, you can override specific patterns:

```bash
# Override just the API sample
/oas:init --sample-api=src/custom/my-api.ts

# Override multiple samples
/oas:init --sample-api=... --sample-types=... --sample-hooks=...
```

---

## Tag Mapping

Customize how OpenAPI tags map to your code structure.

### Default Behavior

OpenAPI tags are used directly as domain names:

```yaml
# OpenAPI spec
paths:
  /users:
    get:
      tags: ["users"]  # → src/entities/users/

  /projects:
    get:
      tags: ["project-management"]  # → src/entities/project-management/
```

### Custom Tag Mapping

Rename tags to match your domain structure:

```json
{
  "tagMapping": {
    "user-management": "user",
    "project-management": "project",
    "authentication": "auth",
    "billing-service": "billing"
  }
}
```

**Result:**
```
project-management tag → src/entities/project/
authentication tag → src/entities/auth/
```

### Tag Merging

Combine multiple tags into one domain:

```json
{
  "tagMapping": {
    "user-profile": "user",
    "user-settings": "user",
    "user-preferences": "user"
  }
}
```

**Result:**
```
All user-* tags → single src/entities/user/ directory
```

### Tag Splitting

Use `/oas:sync --tag=X` to generate specific tags only:

```bash
# Generate only user-related endpoints
/oas:sync --tag=user

# Generate multiple tags
/oas:sync --tag=user --tag=project

# Exclude specific tags
/oas:sync --exclude-tag=internal
```

---

## Ignore Patterns

Exclude specific endpoints from generation.

### Configuration

```json
{
  "ignore": [
    "/health",
    "/metrics",
    "/internal/*",
    "/admin/*",
    "/v1/legacy/*"
  ]
}
```

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `/health` | Exact match only |
| `/internal/*` | Any path starting with `/internal/` |
| `*/admin/*` | Any path containing `/admin/` |
| `**/debug` | Any path ending with `/debug` |

### Ignore by Tag

```json
{
  "ignore": [
    "tag:internal",
    "tag:deprecated"
  ]
}
```

### Ignore by Method

```json
{
  "ignore": [
    "OPTIONS *",
    "HEAD *"
  ]
}
```

### Runtime Ignore

Skip endpoints during sync:

```bash
# Ignore pattern for this sync only
/oas:sync --ignore="/admin/*"
```

---

## Output Customization

Control the generated file structure and naming.

### Structure Options

**FSD (Feature-Sliced Design):**

```json
{
  "output": {
    "structure": "fsd"
  }
}
```

```
src/entities/{domain}/
├── api/
│   ├── {domain}-api.ts
│   ├── {domain}-api-paths.ts
│   └── {domain}-queries.ts
└── model/
    └── types.ts
```

**Feature-based:**

```json
{
  "output": {
    "structure": "feature"
  }
}
```

```
src/features/{domain}/
├── api.ts
├── hooks.ts
└── types.ts
```

**Flat:**

```json
{
  "output": {
    "structure": "flat"
  }
}
```

```
src/api/{domain}/
├── api.ts
├── hooks.ts
└── types.ts
```

### File Naming Templates

```json
{
  "output": {
    "fileNaming": "{tag}-{type}.ts"
  }
}
```

**Available placeholders:**
- `{tag}` - Domain/tag name
- `{type}` - File type (api, types, hooks, paths)
- `{Tag}` - PascalCase tag name
- `{TAG}` - UPPERCASE tag name

**Examples:**

| Template | Result |
|----------|--------|
| `{tag}-{type}.ts` | `user-api.ts` |
| `{tag}.{type}.ts` | `user.api.ts` |
| `{Tag}{Type}.ts` | `UserApi.ts` |
| `{type}.ts` | `api.ts` |

### Type Naming

```json
{
  "output": {
    "typeNaming": "PascalCase"
  }
}
```

| Option | Example |
|--------|---------|
| `PascalCase` | `CreateUserRequest` |
| `camelCase` | `createUserRequest` |
| `preserve` | Keeps original OpenAPI name |

### Adding Custom Headers

Generated files include headers by default:

```typescript
// src/entities/project/api/project-api.ts
// Generated by /oas:sync - DO NOT EDIT MANUALLY
// Source: https://api.example.com/openapi.json
// Generated at: 2024-01-13T12:00:00Z
```

To customize:

```json
{
  "output": {
    "header": "// Auto-generated from OpenAPI spec\n// Last updated: {date}"
  }
}
```

---

## Advanced Scenarios

### Monorepo Setup

For monorepo projects with multiple packages:

```json
{
  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },
  "output": {
    "basePath": "packages/api-client/src"
  }
}
```

### Multiple Specs

For projects with multiple OpenAPI specs:

**Option 1: Multiple config files**

```bash
# packages/user-service/.openapi-sync.json
# packages/billing-service/.openapi-sync.json

cd packages/user-service && /oas:sync
cd packages/billing-service && /oas:sync
```

**Option 2: Tag filtering**

If all specs are combined:

```bash
/oas:sync --tag=user      # User service endpoints
/oas:sync --tag=billing   # Billing service endpoints
```

### Backend + Frontend Split

Generate types only for frontend:

```bash
# Frontend project - types and hooks only
/oas:sync --only-types --only-hooks

# Backend project - types only
/oas:sync --only-types
```

### Incremental Adoption

Start with one domain and expand:

```bash
# Week 1: Start with user domain
/oas:sync --tag=user

# Week 2: Add project domain
/oas:sync --tag=project

# Week 3: Add remaining domains
/oas:sync
```

### CI/CD Integration

Pre-cache spec for faster CI builds:

```bash
# Build step: Fetch and cache
/oas:sync --force

# Test step: Use cache
/oas:sync --offline
```

Validate in CI:

```bash
# Ensure code matches spec
/oas:validate --strict

# Check for breaking changes
/oas:diff --breaking-only
```

### Legacy Code Migration

Ignore legacy code during validation:

```json
{
  "validation": {
    "ignorePaths": [
      "src/legacy/*",
      "src/old-api/*"
    ]
  }
}
```

Generate alongside legacy:

```bash
# Generate new code without affecting legacy
/oas:sync --output-path=src/api-v2/
```

### Custom HTTP Clients

If using an unusual HTTP client:

1. Create a sample that uses your client:

```typescript
// src/examples/custom-api-sample.ts
import { myHttpClient } from '@/lib/http'

export const sampleApi = {
  getSample: async (id: string) => {
    return myHttpClient.request({
      method: 'GET',
      url: `/samples/${id}`,
    })
  },
}
```

2. Point to it in config:

```json
{
  "samples": {
    "api": "src/examples/custom-api-sample.ts"
  }
}
```

### GraphQL-like Patterns

For projects using GraphQL-like query patterns:

```typescript
// Sample with query pattern
export const sampleApi = {
  getSample: (id: string) =>
    gqlClient.query({
      query: GET_SAMPLE,
      variables: { id },
    }),
}
```

The plugin will learn and replicate this pattern.

---

## Extending the Plugin

### Adding New Skills

The plugin can be extended by adding new skill files:

```
skills/
├── cache-manager/
├── code-generator/
├── openapi-parser/
├── pattern-detector/
└── my-custom-skill/      ← Add new skill
    └── SKILL.md
```

**Skill structure:**

```markdown
---
name: my-custom-skill
description: What this skill does
---

# My Custom Skill

## EXECUTION INSTRUCTIONS

When this skill is invoked:
1. Step one
2. Step two

## ERROR HANDLING

Handle these error cases...
```

### Adding New Commands

Add new command files:

```
commands/
├── init.md
├── sync.md
├── diff.md
└── my-command.md         ← Add new command
```

**Command structure:**

```markdown
---
description: Brief description for help
---

# My Command

## Prerequisites
...

## Execution Flow
1. Use skill: cache-manager
2. Do something
3. Report results

## Flags
--my-flag  Description
```

---

## Reference

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Plugin architecture
- [EXAMPLES.md](./EXAMPLES.md) - Code examples
- [skills/pattern-detector/SKILL.md](./skills/pattern-detector/SKILL.md) - Pattern detection
