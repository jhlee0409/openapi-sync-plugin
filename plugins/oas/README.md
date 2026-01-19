# openapi-sync (oas)

**English** | [한국어](./README.ko.md)

A Claude Code plugin that syncs OpenAPI specs with your codebase.

**What makes it different:** Instead of hardcoded templates, it **learns from your existing code** and generates new API code in the same style.

```
"Show me one API file, I'll generate 100 more like it"
```

## Installation

### 1. Install MCP Server (Required)

The OAS plugin requires the OpenAPI Sync MCP server:

```bash
npm install -g @jhlee0409/openapi-sync-mcp
```

Then add to your Claude config (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "oas": {
      "command": "openapi-sync-mcp",
      "args": []
    }
  }
}
```

### 2. Install Plugin

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

> **Note:** If MCP server is not installed, the plugin will prompt you to install it automatically when running any `/oas:*` command.

## Quick Start

```bash
# 1. Initialize with your OpenAPI spec (URL or local path)
/oas:init https://api.example.com/openapi.json
# or
/oas:init ./docs/openapi.yaml

# 2. Generate code from spec
/oas:sync

# 3. Check consistency
/oas:lint
```

## Commands

| Command | Description |
|---------|-------------|
| `/oas:init <url\|path>` | Initialize with OpenAPI spec, learn patterns |
| `/oas:sync` | **Full synchronization** - handles NEW, RENAME, MODIFY, REMOVE |
| `/oas:migrate` | Major version upgrade (v1→v2) with step-by-step review |
| `/oas:status` | Quick status check using cache |
| `/oas:diff` | Compare spec changes |
| `/oas:validate` | Validate code matches spec |
| `/oas:lint` | Check spec + code consistency |
| `/oas:analyze` | Deep analysis of detected patterns |

## Key Features

### 1. Sample-Based Pattern Learning

Analyzes your existing API code to learn project patterns:

```bash
/oas:init ./openapi.json                        # Local file
/oas:init https://api.example.com/openapi.json  # Remote URL

📄 OpenAPI: My API v2.0.0 (25 endpoints)

🔍 Scanning for existing API code...
   Found 5 API files in src/entities/*/api/

📂 Detected patterns:
  ✓ HTTP client: createApi() (Axios wrapper)
  ✓ Data fetching: React Query v5 + createQuery helper
  ✓ Structure: FSD (Feature-Sliced Design)
  ✓ Naming: camelCase functions, PascalCase types

Generate code using these patterns?
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

### 3. Full Synchronization

`/oas:sync` handles **all change types** automatically:

```bash
/oas:sync

═══════════════════════════════════════════════════════════════
  OpenAPI Sync Plan
  My API v1.0.0 → v1.1.0
═══════════════════════════════════════════════════════════════

📊 Summary: 6 changes detected

┌─────────────────────────────────────────────────────────────┐
│ Type     │ Count │ Files Affected │ Auto │                 │
├─────────────────────────────────────────────────────────────┤
│ 🟢 NEW    │ 2     │ 8 (new)        │ ✅   │                 │
│ 🔵 RENAME │ 1     │ 12             │ ✅   │ All usages!     │
│ 🟠 MODIFY │ 2     │ 5              │ ✅   │                 │
│ 🔴 REMOVE │ 1     │ 3              │ ❌   │ User decision   │
└─────────────────────────────────────────────────────────────┘

# Applies all changes including:
# - Creates new endpoints/types
# - Renames with automatic usage updates across entire project
# - Modifies existing types
# - Handles removed endpoints (user choice)
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

**Full synchronization** - handles all change types (NEW, RENAME, MODIFY, REMOVE).

```bash
# Basic
/oas:sync                    # Full sync (default)
/oas:sync --dry-run          # Preview only, no file changes
/oas:sync --force            # Ignore cache, force fetch
/oas:sync --offline          # Use cached spec only (no network)

# Scope control
/oas:sync --only-new         # Create new endpoints only
/oas:sync --only-changes     # RENAME + MODIFY only
/oas:sync --only-renames     # Renames only
/oas:sync --skip-remove      # Skip REMOVE handling

# Filter by tag
/oas:sync --tag=users        # Specific tag only
/oas:sync --tag=users --tag=projects  # Multiple tags

# Filter by endpoint
/oas:sync --endpoint="/api/v1/users/{id}"
/oas:sync --endpoint="/api/v1/clips/*"  # Wildcard

# Safety
/oas:sync --keep-backup      # Keep backup after completion
/oas:sync --no-verify        # Skip TypeScript verification
```

**Change Types Handled:**
| Type | Icon | Description |
|------|------|-------------|
| NEW | 🟢 | New endpoint/schema → auto-generated |
| RENAME | 🔵 | Name change → all usages updated |
| MAYBE_RENAME | 🟡 | Possible rename (score 0.5~0.8) → user confirmation |
| MODIFY | 🟠 | Field change → type definitions updated |
| REMOVE | 🔴 | Deleted from spec → user decision |

### /oas:diff

Compare OpenAPI spec changes.

```bash
/oas:diff                    # Compare cached vs current
/oas:diff --remote           # Compare with remote spec
/oas:diff old.json new.json  # Compare two files
/oas:diff --breaking-only    # Show breaking changes only
/oas:diff --force            # Ignore cache, fetch fresh spec
/oas:diff --offline          # Use cached spec only (no network)
/oas:diff --tag=users        # Specific tag only
/oas:diff --exclude-tag=internal  # Exclude specific tag
/oas:diff --list-tags        # Show tags with change summary
```

### /oas:validate

Validate code matches spec.

```bash
/oas:validate                # Basic validation
/oas:validate --strict       # Warnings treated as errors
/oas:validate --fix          # Auto-fix what's possible
/oas:validate --force        # Ignore cache, fetch fresh spec
/oas:validate --offline      # Use cached spec only (no network)
/oas:validate --tag=users    # Specific tag only
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
/oas:lint --force            # Ignore cache, fetch fresh spec
/oas:lint --offline          # Use cached spec only (no network)
```

### /oas:status

Quick status check from cache.

```bash
/oas:status                  # Instant status (~0.1s)
/oas:status --check-remote   # Check remote spec hash (~1s)
/oas:status --tag=users      # Status for specific tag
/oas:status --list-tags      # Show all tags with coverage
/oas:status --quiet          # Summary only
/oas:status --verbose        # Show detailed coverage breakdown
```

### /oas:analyze

Deep analysis of detected patterns.

```bash
/oas:analyze                 # Full pattern analysis
/oas:analyze --verbose       # Show all file paths and code samples
/oas:analyze --domain=users  # Analyze specific domain only
```

### /oas:migrate

**Major version upgrade** (v1→v2) with phase-by-phase review and customization protection.

```bash
# Phase-by-phase migration (recommended for major upgrades)
/oas:migrate                    # Interactive phase-based migration

# Preview all changes
/oas:migrate --dry-run          # See all phases without applying

# All at once (when confident)
/oas:migrate --all-at-once      # Skip phase confirmation

# Specific phases
/oas:migrate --types-only       # Phase 1: Types only
/oas:migrate --api-only         # Phase 2: API functions only
/oas:migrate --phase=1          # Specific phase number

# Rollback support
/oas:migrate --rollback         # Rollback last phase
/oas:migrate --rollback-to=2    # Rollback to checkpoint 2
/oas:migrate --rollback-all     # Undo entire migration
```

**Migration Phases:**
| Phase | Content | Safety |
|-------|---------|--------|
| 1 | Types & Schemas | Safest |
| 2 | API Functions | Medium |
| 3 | Hooks & Features | Needs review |
| 4 | Cleanup | Optional |

**When to use `/oas:sync` vs `/oas:migrate`:**
| Scenario | Command |
|----------|---------|
| Daily spec changes | `/oas:sync` |
| Field added/removed | `/oas:sync` |
| Name changes | `/oas:sync` |
| **v1 → v2 upgrade** | `/oas:migrate` |
| **50%+ endpoints changed** | `/oas:migrate` |
| **10+ breaking changes** | `/oas:migrate` |

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

## Sync Change Types

| Type | Icon | Auto | Description |
|------|------|------|-------------|
| NEW | 🟢 | ✅ | New endpoint/schema detected → generates new files |
| RENAME | 🔵 | ✅ | operationId/schema renamed → updates all usages across project |
| MAYBE_RENAME | 🟡 | ❓ | Possible rename (needs confirmation) → user decides: rename or split |
| MODIFY | 🟠 | ✅ | Field added/removed/changed → updates type definitions |
| REMOVE | 🔴 | ❌ | Endpoint removed from spec → user chooses: delete/keep/deprecate |

**Rename Detection Algorithm (Weighted Scoring):**

Compares removed + added items using weighted scoring:
```
totalScore =
  pathScore * 0.15 +      // Path similarity (15%)
  opIdScore * 0.25 +      // operationId similarity (25%)
  schemaScore * 0.30 +    // Schema structure (30%)
  fieldScore * 0.30;      // Field overlap (30%)

if (totalScore >= 0.8) → RENAME (auto)
if (totalScore >= 0.5) → MAYBE_RENAME (user confirmation)
if (totalScore < 0.5)  → DELETE + ADD (separate items)
```

## Interactive Selection

When running `/oas:sync`, Claude shows a sync plan and asks for confirmation:

```
═══════════════════════════════════════════════════════════════════
  OpenAPI Sync Plan
  My API v1.0.0 → v1.1.0
═══════════════════════════════════════════════════════════════════

📊 Summary: 8 changes detected

🟢 NEW: 2 endpoints
  + POST /api/v1/clips/{id}/render
  + GET /api/v1/clips/{id}/status

🔵 RENAME: 1 item (12 usages)
  ↻ getTaskStatus → getTask

🟠 MODIFY: 4 type changes
  ~ CreateProjectRequest: +workspaceId (required)
  ~ UserResponse: status → enum type

🔴 REMOVE: 1 endpoint (user decision needed)
  - DELETE /api/v1/sessions/{id}

Proceed with sync?
  [A] Apply all (auto changes only, ask for REMOVE)
  [S] Select specific changes
  [P] Preview changes (dry-run)
  [C] Cancel
```

**Response Options:**
- `[A]` - Apply all auto changes, prompt for REMOVE items
- `[S]` - Select specific changes to apply
- `[P]` - Preview without applying
- `[C]` - Cancel

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

For major version upgrades (v1→v2), use `/oas:migrate` for phase-by-phase migration with rollback support.

## Internal Skills

These skills power the sync/migrate functionality:

| Skill | Purpose |
|-------|---------|
| `cache-manager` | Fetch spec, compute diff with cached version |
| `openapi-parser` | Parse OpenAPI/Swagger spec structure |
| `pattern-detector` | Learn patterns from existing code samples |
| `code-generator` | Generate new code matching project patterns |
| `code-spec-mapper` | Build bidirectional code ↔ spec mapping |
| `import-tracker` | Track import dependencies across project |
| `refactoring-engine` | Rename with automatic usage updates |
| `migration-applier` | Apply field/type changes atomically |

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
.openapi-sync.json          → Main config (openapi source, samples, etc.)
.openapi-sync.cache.json    → Spec cache (hash, endpoints, schemas)
.openapi-sync.state.json    → Implementation state (coverage, timestamps)
.openapi-sync.mapping.json  → Code-spec bidirectional mapping
.oas-refactor-backup/       → Backup during sync refactoring
.openapi-migrate-backup/    → Phase checkpoints during major migration
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

## Security Flags

For development environments, additional flags are available:

| Flag | Description | Use Case |
|------|-------------|----------|
| `--insecure` | Skip SSL certificate verification | Self-signed certs in development |
| `--allow-internal` | Allow internal/private IP addresses | Local API servers |

**Examples:**

```bash
# Access spec with self-signed certificate (development only)
/oas:init https://dev-api.local/openapi.json --insecure

# Access spec on internal network
/oas:init https://192.168.1.100/openapi.json --allow-internal

# Combine flags for local development
/oas:sync --allow-internal --insecure
```

> **Warning:** These flags bypass security protections. Never use in production or with untrusted URLs. See [SECURITY.md](./docs/SECURITY.md) for detailed guidelines.

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
