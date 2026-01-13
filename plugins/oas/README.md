# openapi-sync (oas)

**English** | [한국어](./README.ko.md)

A Claude Code plugin that syncs OpenAPI specs with your codebase.

**What makes it different:** Instead of hardcoded templates, it **learns from your existing code** and generates new API code in the same style.

```
"Show me one API file, I'll generate 100 more like it"
```

## Installation

```bash
# Add plugin marketplace (run once)
/plugin marketplace add jhlee0409/claude-plugins

# Install plugin
/plugin install oas@jhlee0409-plugins
```

For development/testing:
```bash
# Load plugin from local directory
claude --plugin-dir /path/to/claude-plugins
```

## Quick Start

```bash
# 1. Initialize project
/oas:init

# 2. Generate code from spec
/oas:sync

# 3. Check consistency
/oas:lint
```

## Commands

| Command | Description |
|---------|-------------|
| `/oas:init` | Initialize project, learn patterns, create config |
| `/oas:sync` | Generate/sync code based on OpenAPI spec |
| `/oas:status` | Quick status check using cache |
| `/oas:diff` | Compare spec changes |
| `/oas:validate` | Validate code matches spec |
| `/oas:lint` | Check spec + code consistency |
| `/oas:analyze` | Deep analysis of detected patterns |

## Key Features

### 1. Sample-Based Pattern Learning

Analyzes your existing API code to learn project patterns:

```bash
/oas:init ./openapi.json                        # 로컬 파일
/oas:init https://api.example.com/openapi.json  # 원격 URL

📄 OpenAPI: My API v2.0.0 (25 endpoints)

🔍 Scanning for existing API code...
   Found 5 API files in src/entities/*/api/

📂 Detected patterns:
  ✓ HTTP client: createApi() (Axios wrapper)
  ✓ Data fetching: React Query v5 + createQuery helper
  ✓ Structure: FSD (Feature-Sliced Design)
  ✓ Naming: camelCase functions, PascalCase types

Generate code using these patterns? [Y/n]
```

### 2. Consistent Code Generation

Generates new API code using learned patterns:

```bash
/oas:sync --tag=publisher

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
/oas:sync

✓ No spec changes (cache hint)
✓ Direct code-spec comparison complete
✓ No changes needed

# When changes exist
/oas:sync

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
/oas:lint

Analyzing project patterns...
  Type naming: PascalCase (97.5%)
  Export style: export * (72.9%)
  Return types: Explicit (60.3%)

Inconsistencies found:
  🟡 upload-types.ts: 8 types using camelCase
     → Differs from project standard (PascalCase)

/oas:lint --fix

  ✓ Renamed 8 types to PascalCase
  ✓ Updated imports in 3 files
  ✓ TypeScript check passed
```

## Command Reference

### /oas:init

Initialize project and learn patterns.

```bash
/oas:init                      # Auto-detect patterns
/oas:init ./openapi.json       # Use local spec file
/oas:init https://api.com/spec # Use remote spec URL
/oas:init --force              # Overwrite existing config
/oas:init --interactive        # Skip auto-detection, configure manually
/oas:init --sample=path        # Specify sample file to learn from
```

### /oas:sync

Generate or update code based on OpenAPI spec.

```bash
# Basic
/oas:sync                    # Default (Conservative, 100% accuracy)
/oas:sync --dry-run          # Preview only, no file changes
/oas:sync --force            # Ignore cache, full regeneration
/oas:sync --trust-cache      # Trust cache mode (faster, 99% accuracy)

# Filter by tag
/oas:sync --tag=users        # Specific tag only
/oas:sync --tag=users --tag=projects  # Multiple tags
/oas:sync --exclude-tag=internal      # Exclude tag

# Filter by endpoint
/oas:sync --endpoint="/api/v1/users/{id}"
/oas:sync --endpoint="/api/v1/clips/*"  # Wildcard

# Filter by change type
/oas:sync --only-added       # New endpoints only
/oas:sync --only-changed     # Modified endpoints only

# Filter by file type
/oas:sync --only-types       # Types only
/oas:sync --only-api         # API functions only
/oas:sync --only-hooks       # Hooks only
```

### /oas:diff

Compare OpenAPI spec changes.

```bash
/oas:diff                    # Compare cached vs current
/oas:diff --remote           # Compare with remote spec
/oas:diff old.json new.json  # Compare two files
/oas:diff --breaking-only    # Show breaking changes only
/oas:diff --tag=users        # Specific tag only
/oas:diff --exclude-tag=internal  # Exclude specific tag
/oas:diff --list-tags        # Show tags with change summary
/oas:diff --json             # JSON output
```

### /oas:validate

Validate code matches spec (CI/CD friendly).

```bash
/oas:validate                # Basic validation
/oas:validate --strict       # Warnings as errors (for CI)
/oas:validate --fix          # Auto-fix what's possible
/oas:validate --tag=users    # Specific tag only
/oas:validate --json         # JSON output
/oas:validate --quiet        # Errors only
```

### /oas:lint

Check spec and code for consistency.

```bash
/oas:lint                    # Check spec + code
/oas:lint --spec             # Spec only
/oas:lint --code             # Code only
/oas:lint --fix              # Show fix suggestions
/oas:lint --rule=type-naming # Specific rule only
/oas:lint --severity=critical # Filter by severity
/oas:lint --ignore=pattern   # Ignore specific path/schema
/oas:lint --output=file      # Save results to file
/oas:lint --json             # JSON output
```

### /oas:status

Quick status check from cache.

```bash
/oas:status                  # Instant status (~0.1s)
/oas:status --check-remote   # Check remote spec hash (~1s)
/oas:status --tag=users      # Status for specific tag
/oas:status --list-tags      # Show all tags with coverage
/oas:status --json           # JSON output
/oas:status --quiet          # Summary only
```

### /oas:analyze

Deep analysis of detected patterns.

```bash
/oas:analyze                 # Full pattern analysis
/oas:analyze --verbose       # Show all file paths and code samples
/oas:analyze --domain=users  # Analyze specific domain only
```

## Tag Filtering

Filter operations by OpenAPI tags. Tags are extracted from the `tags` field in each endpoint.

### Discover Tags

```bash
# See all available tags
/oas:sync --list-tags

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
/oas:sync --tag=workspace

# Multiple tags (OR logic)
/oas:sync --tag=workspace --tag=billing

# Exclude tags
/oas:sync --exclude-tag=internal

# Combined
/oas:sync --tag=workspace --exclude-tag=deprecated
```

### Tag Commands

| Command | Example |
|---------|---------|
| `/oas:sync` | `--tag=users`, `--exclude-tag=internal` |
| `/oas:diff` | `--tag=users`, `--list-tags` |
| `/oas:status` | `--tag=users`, `--list-tags` |
| `/oas:validate` | `--tag=users` |

### Tag-Based Generation

When using `--tag`, only endpoints with matching tags are processed:

```bash
/oas:sync --tag=billing

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
| Conservative (default) | `/oas:sync` | Medium | 100% | Always recommended |
| Trust Cache | `/oas:sync --trust-cache` | Fast | 99%* | Quick check needed |
| Force | `/oas:sync --force` | Slow | 100% | Ignore cache, full regen |

*Trust Cache may miss changes if server ETag/Last-Modified errors or cache corrupted

## Interactive Selection

When running `/oas:sync` without flags, you can select specific changes:

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

`/oas:diff` automatically detects breaking changes:

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

> **Note:** Most values are **auto-detected** from your codebase by `/oas:init`.
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

The following shows what `/oas:init` generates after scanning your codebase.
**All values below are examples** - actual values are detected from YOUR project's code.

```json
{
  "version": "1.0.0",

  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },

  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  "tagMapping": {
    "user-controller": "user",
    "project-controller": "project"
  },

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ],

  "validation": {
    "ignorePaths": ["src/entities/legacy/*"]
  }
}
```

> **Note:** `project.*` and `patterns.*` are auto-detected from samples and stored internally.
> You don't need to configure them manually.

### Config Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `version` | | Config file version (e.g., "1.0.0") |
| `openapi.source` | ✅ | OpenAPI spec path or URL |
| `samples.api` | ✅ | API functions sample file path |
| `samples.types` | | TypeScript types sample file path |
| `samples.hooks` | | React Query/SWR hooks sample file path |
| `samples.keys` | | Query key factory sample file path |
| `tagMapping` | | Map OpenAPI tags to domain names (e.g., `{"user-controller": "user"}`) |
| `ignore` | | Endpoint paths to ignore (e.g., `["/health", "/internal/*"]`) |
| `validation.ignorePaths` | | Glob patterns for paths to skip validation |

> **Note:** `project.*` and `patterns.*` are auto-detected from your samples and stored internally by `/oas:init`. Manual configuration is not needed.

## Cache Files

```
.openapi-sync.cache.json  → Spec cache (hash, endpoints, schemas)
.openapi-sync.state.json  → Implementation state (coverage, timestamps)
```

### Time Tracking Fields

| File | Field | Description |
|------|-------|-------------|
| cache.json | `lastFetch` | When the OpenAPI spec was last fetched from server |
| state.json | `lastScan` | When the codebase was last scanned for implementations |
| state.json | `lastSync` | When code was last generated by `/oas:sync` |

Use `/oas:status` to view these timestamps.

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
        run: claude /oas:validate --strict

      - name: Lint API
        run: claude /oas:lint --severity=critical
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Errors found |
| 2 | Warnings found (with `--strict`) |

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
/oas:init --sample=src/api/user-api.ts

# Or use interactive mode
/oas:init --interactive
```

### "Cache seems outdated"

```bash
# Force full sync
/oas:sync --force

# Or just check remote
/oas:status --check-remote
```

### "Generated code doesn't match my style"

1. Check if sample file is correct in `.openapi-sync.json`
2. Run `/oas:analyze` to see detected patterns
3. Adjust patterns manually in config if needed

## License

MIT
