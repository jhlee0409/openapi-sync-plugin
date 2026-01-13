# openapi-sync

A Claude Code plugin that syncs OpenAPI specs with your codebase.

**What makes it different:** Instead of hardcoded templates, it **learns from your existing code** and generates new API code in the same style.

```
"Show me one API file, I'll generate 100 more like it"
```

[한국어 문서](./README.ko.md)

## Installation

```bash
# Install plugin in Claude Code
claude plugins install openapi-sync
```

## Quick Start

```bash
# 1. Initialize project
/api:init

# 2. Generate code from spec
/api:sync

# 3. Check consistency
/api:lint
```

## Commands

| Command | Description |
|---------|-------------|
| `/api:init` | Initialize project, learn patterns, create config |
| `/api:sync` | Generate/sync code based on OpenAPI spec |
| `/api:status` | Quick status check using cache |
| `/api:diff` | Compare spec changes |
| `/api:validate` | Validate code matches spec |
| `/api:lint` | Check spec + code consistency |

## Key Features

### 1. Sample-Based Pattern Learning

Analyzes your existing API code to learn project patterns:

```bash
/api:init

? OpenAPI spec URL: https://api.example.com/openapi.json
? Existing API code sample: src/entities/user/api/user-api.ts

Learning patterns...
  ✓ HTTP client: createApi() (Axios wrapper)
  ✓ Data fetching: React Query v5 + createQuery helper
  ✓ Structure: FSD (Feature-Sliced Design)
  ✓ Naming: camelCase functions, PascalCase types
```

### 2. Consistent Code Generation

Generates new API code using learned patterns:

```bash
/api:sync --tag=publisher

Generated:
  ✓ src/entities/publisher/api/publisher-api.ts
  ✓ src/entities/publisher/api/publisher-queries.ts
  ✓ src/entities/publisher/api/publisher-mutations.ts
  ✓ src/entities/publisher/model/publisher-types.ts
  ✓ src/entities/publisher/config/publisher-api-paths.ts
```

### 3. Caching & Diff-Based Processing

Only processes changes to save tokens and time:

```bash
/api:sync

✓ No spec changes (cache hint)
✓ Direct code-spec comparison complete
✓ No changes needed

# When changes exist
/api:sync

Changes detected:
  +2 added, ~1 modified, -0 removed
  (148 unchanged - skipped)

Generating...
  ✓ POST /clips/{id}/render (new)
  ✓ GET /clips/{id}/status (new)
  ~ GET /users/{id} (updated: +preferences field)
```

### 4. Project-Standard Consistency Checks

Detects inconsistencies based on your project's majority patterns:

```bash
/api:lint

Analyzing project patterns...
  Type naming: PascalCase (97.5%)
  Export style: export * (72.9%)
  Return types: Explicit (60.3%)

Inconsistencies found:
  🟡 upload-types.ts: 8 types using camelCase
     → Differs from project standard (PascalCase)

/api:lint --fix

  ✓ Renamed 8 types to PascalCase
  ✓ Updated imports in 3 files
  ✓ TypeScript check passed
```

## Command Reference

### /api:init

Initialize project and learn patterns.

```bash
/api:init                      # Auto-detect patterns
/api:init ./openapi.json       # Use local spec file
/api:init https://api.com/spec # Use remote spec URL
/api:init --force              # Overwrite existing config
/api:init --interactive        # Skip auto-detection, configure manually
/api:init --sample=path        # Specify sample file to learn from
```

### /api:sync

Generate or update code based on OpenAPI spec.

```bash
# Basic
/api:sync                    # Default (Conservative, 100% accuracy)
/api:sync --dry-run          # Preview only, no file changes
/api:sync --force            # Ignore cache, full regeneration
/api:sync --trust-cache      # Trust cache mode (faster, 99% accuracy)

# Filter by tag
/api:sync --tag=users        # Specific tag only
/api:sync --tag=users --tag=projects  # Multiple tags
/api:sync --exclude-tag=internal      # Exclude tag

# Filter by endpoint
/api:sync --endpoint="/api/v1/users/{id}"
/api:sync --endpoint="/api/v1/clips/*"  # Wildcard

# Filter by change type
/api:sync --only-added       # New endpoints only
/api:sync --only-changed     # Modified endpoints only

# Filter by file type
/api:sync --only-types       # Types only
/api:sync --only-api         # API functions only
/api:sync --only-hooks       # Hooks only
```

### /api:diff

Compare OpenAPI spec changes.

```bash
/api:diff                    # Compare cached vs current
/api:diff --remote           # Compare with remote spec
/api:diff old.json new.json  # Compare two files
/api:diff --breaking-only    # Show breaking changes only
/api:diff --tag=users        # Specific tag only
/api:diff --json             # JSON output
```

### /api:validate

Validate code matches spec (CI/CD friendly).

```bash
/api:validate                # Basic validation
/api:validate --strict       # Warnings as errors (for CI)
/api:validate --fix          # Auto-fix what's possible
/api:validate --tag=users    # Specific tag only
/api:validate --json         # JSON output
/api:validate --quiet        # Errors only
```

### /api:lint

Check spec and code for consistency.

```bash
/api:lint                    # Check spec + code
/api:lint --spec             # Spec only
/api:lint --code             # Code only
/api:lint --fix              # Show fix suggestions
/api:lint --rule=type-naming # Specific rule only
/api:lint --severity=critical # Filter by severity
/api:lint --json             # JSON output
```

### /api:status

Quick status check from cache.

```bash
/api:status                  # Instant status (~0.1s)
/api:status --check-remote   # Check remote spec hash (~1s)
/api:status --tag=users      # Status for specific tag
/api:status --list-tags      # Show all tags with coverage
/api:status --json           # JSON output
/api:status --quiet          # Summary only
```

## Tag Filtering

Filter operations by OpenAPI tags. Tags are extracted from the `tags` field in each endpoint.

### Discover Tags

```bash
# See all available tags
/api:sync --list-tags

📋 Available Tags:

Tag              Endpoints   Status
─────────────────────────────────────
workspace        18          ⚠️ Partial (14/18)
user             12          ✅ Complete
billing          8           ❌ Missing
...
```

### Filter by Tag

```bash
# Sync only specific tag
/api:sync --tag=workspace

# Multiple tags (OR logic)
/api:sync --tag=workspace --tag=billing

# Exclude tags
/api:sync --exclude-tag=internal

# Combined
/api:sync --tag=workspace --exclude-tag=deprecated
```

### Tag Commands

| Command | Example |
|---------|---------|
| `/api:sync` | `--tag=users`, `--exclude-tag=internal` |
| `/api:diff` | `--tag=users`, `--list-tags` |
| `/api:status` | `--tag=users`, `--list-tags` |
| `/api:validate` | `--tag=users` |

### Tag-Based Generation

When using `--tag`, only endpoints with matching tags are processed:

```bash
/api:sync --tag=billing

Generated:
  src/entities/billing/
  ├── api/billing-api.ts        (8 functions)
  ├── api/billing-queries.ts    (8 hooks)
  ├── config/billing-api-paths.ts
  └── model/billing-types.ts    (12 types)
```

## Sync Modes

| Mode | Command | Speed | Accuracy | Use Case |
|------|---------|-------|----------|----------|
| Conservative (default) | `/api:sync` | Medium | 100% | Always recommended |
| Trust Cache | `/api:sync --trust-cache` | Fast | 99%* | Quick check needed |
| Force | `/api:sync --force` | Slow | 100% | Ignore cache, full regen |

*Trust Cache may miss changes if server ETag/Last-Modified errors or cache corrupted

## Interactive Selection

When running `/api:sync` without flags, you can select specific changes:

```
📊 Changes Detected:

NEW (3):
  [ ] POST /api/v1/clips/{id}/render (clips)
  [ ] GET  /api/v1/clips/{id}/status (clips)
  [ ] DELETE /api/v1/cache/{key} (cache)

CHANGED (2):
  [ ] GET /api/v1/users/{id} (users)
  [ ] POST /api/v1/projects (projects)

Select: [a]ll / [n]one / [t]ag / [enter numbers]
> 1,2,4

Generating selected endpoints...
```

## Breaking Changes Detection

`/api:diff` automatically detects breaking changes:

```
🚨 BREAKING CHANGES:

1. Required field added to request
   POST /api/v1/projects
   + workspaceId (required)
   → Existing client code needs modification

2. Field removed from response
   GET /api/v1/users/{id}
   - legacyToken
   → Check code using this field

3. Type changed
   GET /api/v1/users/{id}
   status: string → enum['active','inactive']
   → Verify type compatibility

4. Endpoint removed
   GET /api/v1/legacy/export
   → Remove usage code
```

## Generated File Structures

### FSD (Feature-Sliced Design)

```
src/entities/{tag}/
├── api/
│   ├── {tag}-api.ts        # API functions
│   ├── {tag}-api-paths.ts  # Path constants
│   └── queries.ts          # React Query hooks
└── model/
    └── types.ts            # TypeScript types
```

### Feature-based

```
src/features/{tag}/
├── api.ts          # API functions + paths
├── hooks.ts        # React Query hooks
└── types.ts        # TypeScript types
```

### Flat

```
src/api/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

## Configuration

### .openapi-sync.json

> **Note:** Most values are **auto-detected** from your codebase by `/api:init`.
> You only need to provide `openapi.source` and `samples` - everything else is learned from your existing code.

#### Minimal Config (Required Only)

```json
{
  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },
  "samples": {
    "api": "src/entities/user/api/user-api.ts"
  }
}
```

#### Full Config (Auto-Generated Example)

The following shows what `/api:init` generates after scanning your codebase.
**All values below are examples** - actual values are detected from YOUR project's code.

```json
{
  "$schema": "https://openapi-sync.dev/schema/v1.json",
  "version": "1.0.0",

  "openapi": {
    "source": "./openapi.json",
    "remote": "https://api.example.com/openapi.json",
    "title": "My API",
    "version": "2.0.0"
  },

  // ⬇️ Auto-detected from package.json
  "project": {
    "framework": "react",           // detected: react, vue, angular, svelte, next, nuxt, etc.
    "language": "typescript",       // detected: typescript or javascript
    "httpClient": "axios-custom",   // detected: axios, fetch, ky, or custom wrapper
    "dataFetching": "react-query"   // detected: react-query, swr, or none
  },

  // ⬇️ User provides paths to existing code samples
  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  // ⬇️ Auto-detected from samples directory structure & code
  "patterns": {
    "structure": {
      "type": "fsd",                                              // detected from directory pattern
      "apiPath": "src/entities/{domain}/api/{domain}-api.ts",     // detected from samples
      "typesPath": "src/entities/{domain}/model/types.ts",        // detected from samples
      "hooksPath": "src/entities/{domain}/api/queries.ts"         // detected from samples
    },
    "httpClient": {
      "import": "import { createApi } from '@/shared/api'",       // detected from sample imports
      "usage": "createApi().{method}<{Type}>({path})",            // detected from sample code
      "responseAccess": ".data"                                   // detected from sample code
    }
    // naming, codeStyle: auto-inferred from samples, usually no need to configure
  },

  // ⬇️ Optional: override validation behavior
  "validation": {
    "ignorePaths": ["src/entities/legacy/*"]                      // skip legacy code
  },

  "tagMapping": {
    "user-controller": "user",
    "project-controller": "project"
  },

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ]
}
```

### How Auto-Detection Works

| Field | Detection Source |
|-------|------------------|
| `project.framework` | `package.json` dependencies |
| `project.httpClient` | Sample code imports (`axios`, `fetch`, `ky`, etc.) |
| `patterns.structure.*Path` | Sample file locations → extract `{domain}` pattern |
| `patterns.httpClient.*` | Sample code analysis |
| `patterns.naming.*` | Sample function/type names |
| `patterns.codeStyle.*` | Sample code formatting |

**Any framework, structure, or pattern works** - as long as you provide a sample file, the plugin will learn and replicate your exact style.

### Config Field Reference

#### Root Fields

| Field | Required | Description |
|-------|----------|-------------|
| `$schema` | | JSON schema URL for IDE autocompletion |
| `version` | | Config file version (e.g., "1.0.0") |

#### openapi

| Field | Required | Description |
|-------|----------|-------------|
| `openapi.source` | ✅ | OpenAPI spec path or URL |
| `openapi.remote` | | Remote URL (if local file differs from source) |
| `openapi.title` | | API title (auto-filled from spec info.title) |
| `openapi.version` | | API version (auto-filled from spec info.version) |

#### samples

| Field | Required | Description |
|-------|----------|-------------|
| `samples.api` | ✅ | API functions sample file path |
| `samples.types` | | TypeScript types sample file path |
| `samples.hooks` | | React Query/SWR hooks sample file path |
| `samples.keys` | | Query key factory sample file path |

#### project (Auto-detected)

| Field | Description |
|-------|-------------|
| `project.framework` | Framework: react, vue, angular, svelte, next, nuxt, etc. |
| `project.language` | Language: typescript or javascript |
| `project.httpClient` | HTTP client: axios, fetch, ky, or custom wrapper name |
| `project.dataFetching` | Data fetching lib: react-query, swr, or none |

#### patterns (Auto-detected)

| Field | Description |
|-------|-------------|
| `patterns.structure.type` | Structure type: fsd, feature, flat |
| `patterns.structure.apiPath` | API file path template with `{domain}` placeholder |
| `patterns.structure.typesPath` | Types file path template |
| `patterns.structure.hooksPath` | Hooks file path template |
| `patterns.httpClient.import` | HTTP client import statement |
| `patterns.httpClient.usage` | HTTP client usage pattern |
| `patterns.httpClient.responseAccess` | Response data access (e.g., ".data") |

> **Note:** `patterns.naming.*` and `patterns.codeStyle.*` are auto-inferred from samples. Manual configuration is rarely needed.

#### validation

| Field | Default | Description |
|-------|---------|-------------|
| `validation.ignorePaths` | [] | Glob patterns for paths to skip (e.g., `["src/legacy/*"]`) |

#### Other

| Field | Description |
|-------|-------------|
| `tagMapping` | Map OpenAPI tags to domain names (e.g., `{"user-controller": "user"}`) |
| `ignore` | Endpoint paths to ignore (e.g., `["/health", "/internal/*"]`) |

## Cache Files

```
.openapi-sync.cache.json  → Spec cache (hash, endpoints, schemas)
.openapi-sync.state.json  → Implementation state (coverage)
```

### Cache Invalidation

Cache is automatically invalidated when:
- `--force` flag is used
- Cache file is missing
- Cache version mismatch
- 24 hours elapsed (configurable)

## Lint Rules

### Spec Rules (10)

| Rule | Description | Severity |
|------|-------------|----------|
| `response-key-consistency` | List response key naming | warning |
| `timestamp-naming` | Timestamp field naming | warning |
| `id-type-consistency` | ID field type consistency | error |
| `boolean-prefix` | Boolean field prefixes | info |
| `operationId-format` | operationId format | warning |
| `required-fields` | Required field consistency | warning |
| `enum-casing` | Enum value casing | info |
| `nullable-vs-optional` | nullable vs optional usage | info |
| `description-coverage` | Description coverage % | info |
| `path-naming` | URL path naming patterns | warning |

### Code Rules (10)

| Rule | Description | Severity |
|------|-------------|----------|
| `export-pattern-consistency` | Barrel export patterns | warning |
| `immutability-pattern` | Object.freeze vs as const | warning |
| `type-naming-convention` | Type naming (PascalCase, etc.) | warning |
| `api-function-parameter-style` | API function params style | info |
| `query-key-format` | Query key naming format | warning |
| `config-structure` | Config file structure | info |
| `barrel-export-completeness` | Missing index.ts files | warning |
| `file-naming-convention` | File naming patterns | info |
| `mutation-vs-query-separation` | Mutation/Query file separation | warning |
| `return-type-annotation` | Explicit return types | warning |

**Note:** Code rules use project-based detection. The majority pattern in your codebase becomes the "standard" - we find inconsistencies, not enforce external rules.

## CI/CD Integration

### GitHub Actions

```yaml
name: API Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate API
        run: claude /api:validate --strict

      - name: Lint API
        run: claude /api:lint --severity=critical
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Errors found |
| 2 | Warnings found (with `--strict`) |

## Performance

| Operation | Time | Tokens |
|-----------|------|--------|
| `/api:status` | ~0.1s | 0.5K |
| `/api:status --check-remote` | ~1s | 0.5K |
| `/api:sync` (no changes) | ~5s | 7K |
| `/api:sync` (with changes) | ~8s | 12K |
| `/api:sync --trust-cache` | ~1s | 0.5K |
| `/api:sync --force` | ~20s | 55K |
| `/api:lint` | ~3s | 5K |
| `/api:lint --fix` | ~10s | 10K |

Without caching: ~20s, 55K tokens → **87% savings**

## Philosophy

### 1. Sample-Based Learning

```
❌ "I'll generate FSD structure with Axios pattern"
✅ "I see how user-api.ts works, I'll make more like it"
```

### 2. Project-Standard Consistency

```
❌ "PascalCase is TypeScript standard, so you're wrong"
✅ "This project uses PascalCase 97%, so camelCase is inconsistent"
```

### 3. Accuracy > Speed

```
❌ Skip if cache hash matches (edge case risk)
✅ Cache is a hint, always verify with actual spec-code comparison (100% accuracy)
```

### 4. Incremental Changes

```
❌ Full regeneration every time
✅ Detect and process only changes (diff-based)
```

## Error Handling

| Error | Solution |
|-------|----------|
| Invalid OpenAPI spec | Check spec path, validate format |
| Pattern detection failed | Use `--interactive` mode |
| package.json not found | Run from project root |
| Config already exists | Use `--force` or choose merge |
| Cache corrupted | Auto-regenerated on next run |

## Supported Environments

- **OpenAPI:** 3.0.x, 3.1.x, Swagger 2.0
- **Language:** TypeScript
- **HTTP Clients:** Axios, Fetch, ky, others (auto-detected)
- **Data Fetching:** React Query, SWR, others (auto-detected)
- **Frameworks:** React, Vue, Angular, Svelte (auto-detected)
- **Structure:** FSD, Feature-based, Flat, others (auto-detected)

## Troubleshooting

### "No patterns detected"

```bash
# Provide sample manually
/api:init --sample=src/api/user-api.ts

# Or use interactive mode
/api:init --interactive
```

### "Cache seems outdated"

```bash
# Force full sync
/api:sync --force

# Or just check remote
/api:status --check-remote
```

### "Generated code doesn't match my style"

1. Check if sample file is correct in `.openapi-sync.json`
2. Run `/api:analyze` to see detected patterns
3. Adjust patterns manually in config if needed

## License

MIT
