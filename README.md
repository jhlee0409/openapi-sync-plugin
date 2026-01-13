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

## Flags

### /api:sync

```bash
/api:sync                    # Default (Conservative, 100% accuracy)
/api:sync --dry-run          # Preview only
/api:sync --tag=users        # Specific tag only
/api:sync --only-types       # Types only
/api:sync --only-added       # New endpoints only
/api:sync --force            # Ignore cache, full regeneration
/api:sync --trust-cache      # Trust cache mode (faster, 99% accuracy)
```

### /api:lint

```bash
/api:lint                    # Check spec + code
/api:lint --spec             # Spec only
/api:lint --code             # Code only
/api:lint --fix              # Auto-fix
/api:lint --rule=type-naming # Specific rule only
```

### /api:status

```bash
/api:status                  # Instant status from cache (~0.1s)
/api:status --check-remote   # Check remote spec hash (~1s)
```

## Configuration

### .openapi-sync.json

```json
{
  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },
  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts"
  },
  "patterns": {
    "structure": { "type": "auto" },
    "httpClient": { "import": "auto" },
    "dataFetching": { "queryKeyPattern": "auto" }
  },
  "lint": {
    "code": {
      "rules": {
        "type-naming-convention": "warning",
        "export-pattern-consistency": "info"
      },
      "thresholds": {
        "majorityThreshold": 60
      }
    }
  }
}
```

## Performance

| Operation | Time | Tokens |
|-----------|------|--------|
| `/api:status` | ~0.1s | 0.5K |
| `/api:sync` (no changes) | ~5s | 7K |
| `/api:sync` (with changes) | ~8s | 12K |
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

## Supported Environments

- **OpenAPI:** 3.0.x, 3.1.x, Swagger 2.0
- **Language:** TypeScript
- **HTTP Clients:** Axios, Fetch, ky, others (auto-detected)
- **Data Fetching:** React Query, SWR, others (auto-detected)
- **Structure:** FSD, Feature-based, Flat, others (auto-detected)

## License

MIT
