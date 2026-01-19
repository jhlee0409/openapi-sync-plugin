---
description: Initialize OpenAPI sync - auto-learns patterns OR scaffolds from best practice templates
---

# OpenAPI Sync Initialization

**One command for all scenarios:**
- Have existing API code? → Auto-learns your patterns
- Starting fresh? → Scaffolds from best practice templates

Works with ANY codebase, ANY framework.

## Usage

```bash
/oas:init <spec-url-or-path>
```

**Examples:**
```bash
# From URL
/oas:init https://api.example.com/openapi.json

# From local file
/oas:init ./docs/openapi.yaml
```

---

## EXECUTION INSTRUCTIONS

When `/oas:init` is invoked, Claude MUST perform these steps in order:

1. **Get spec location** - Ask user or use provided argument
2. **Use skill: cache-manager** - Fetch spec with caching (saves redundant fetch on first sync)
3. **Use skill: openapi-parser** - Validate the fetched spec
4. **Use skill: pattern-detector** - Detect project patterns
5. **Confirm with user** - Show detected patterns, get approval
6. **Generate config** - Write `.openapi-sync.json`
7. **Security check** - Verify .gitignore includes cache files
8. **Report summary** - Show next steps

---

## First Step: Ask for Spec Location

**IMPORTANT: Always start by asking the user for the OpenAPI spec location.**

```
🚀 OpenAPI Sync Initialization

Please enter the OpenAPI spec URL or file path:

Examples:
  • https://api.example.com/openapi.json
  • ./openapi.json
  • ./docs/swagger.yaml
```

If user provided argument with command, use that directly.
If not, prompt for input before proceeding.

## Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        /oas:init                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Get OpenAPI spec location                                │
│  2. Fetch & cache spec (cache-manager)                       │
│  3. Validate spec (openapi-parser)                           │
│  4. Detect framework (package.json)                          │
│  5. Find existing API code                                   │
│          │                                                   │
│          ├─ FOUND ──────────────────────────────────────┐    │
│          │     │                                        │    │
│          │     ▼                                        │    │
│          │  6a. Analyze samples (pattern-detector)      │    │
│          │     │                                        │    │
│          │     ▼                                        │    │
│          │  Use existing code as sample                 │    │
│          │                                              │    │
│          └─ NOT FOUND ──────────────────────────────┐   │    │
│                │                                    │   │    │
│                ▼                                    │   │    │
│             6b. Select template (scaffold-templates)│   │    │
│                │                                    │   │    │
│                ▼                                    │   │    │
│             Generate scaffold → becomes sample      │   │    │
│                                                     │   │    │
│          ◄──────────────────────────────────────────┴───┘    │
│          │                                                   │
│  7. Generate .openapi-sync.json (samples point to code)      │
│  8. Security check (.gitignore)                              │
│  9. Show summary                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** Whether you have existing code or start fresh, the result is the same:
- `.openapi-sync.json` with `samples` pointing to real code
- `/oas:sync` uses these samples for future code generation

## Step 1: Get OpenAPI Spec Location

**Supported sources:**
```
File: ./openapi.json, ./docs/swagger.yaml
URL:  https://api.example.com/openapi.json
```

**If argument provided:**
```
http:// or https:// → Fetch from URL
Otherwise → Read as local file
```

**If no argument:**
```
1. Search for openapi.json, swagger.json locally
2. If found, ask to confirm usage
3. If not found, request path/URL input
```

## Step 2: Fetch & Cache Spec

**Use cache-manager skill to fetch and cache:**

```
Invoke skill: cache-manager

1. Fetch spec from source (URL or local file)
2. Validate basic structure (has openapi/swagger field)
3. Write .openapi-sync.cache.json immediately

This ensures /oas:sync doesn't need to refetch.
```

**Output:**
```
📥 Fetching spec from https://api.example.com/openapi.json...
✅ Spec cached (150 endpoints, 45 schemas)
```

## Step 3: Validate Spec

**Use openapi-parser skill:**

```
Invoke skill: openapi-parser

- Verify OpenAPI 3.x or Swagger 2.x structure
- Extract title, version, endpoints
- Parse schemas and validate references
```

## Step 4: Framework Detection

**Read package.json:**

```typescript
// Detect ecosystem
const framework = detectFramework(packageJson)

// Output example:
{
  framework: "react",         // react, vue, angular, svelte, etc.
  language: "typescript",     // typescript or javascript
  httpClient: "axios",        // from dependencies
  dataFetching: "react-query" // from dependencies
}
```

**Report:**
```
📦 package.json analysis:
  Framework: React + TypeScript
  HTTP Client: axios
  Data Fetching: @tanstack/react-query v5
```

## Step 5: Sample Discovery

**Use pattern-detector skill:**

```
Invoke skill: pattern-detector
```

**Search for existing API code:**
1. Common API locations
2. Files with HTTP calls
3. Files with query hooks
4. Type definition files

**Possible outcomes:**

```
OUTCOME A: Samples found
  → "Found 5 API files in src/entities/*/api/"
  → Proceed to sample analysis

OUTCOME B: No samples found
  → "No existing API code found"
  → Go to interactive mode
```

## Step 6a: Sample Analysis (if samples found)

**Analyze discovered files:**

```
Analyzing samples...

📂 Structure detected:
  Pattern: src/entities/{domain}/api/
  Samples: user, project, clip (3 domains)

🔌 HTTP Client:
  Type: Custom wrapper (createApi)
  Location: src/shared/api/create-api.ts
  Pattern: createApi().{method}<T>(path)

📦 Data Fetching:
  Library: React Query v5
  Pattern: Query Key Factory
  Hooks: Separate file (queries.ts)

📝 Types:
  Location: src/entities/{domain}/model/types.ts
  Style: interface
  Naming: {Entity}, {Operation}Request, {Operation}Response

🏷️ Naming:
  Functions: get{Entity}, create{Entity}
  Hooks: use{Entity}, useCreate{Entity}
  Files: {domain}-api.ts, queries.ts, types.ts
```

**Ask confirmation:**
```
Generate code using these patterns?
(Let me know if you'd like any changes)
```

## Step 6b: Template Scaffold Mode (if no samples found)

**When no existing API code is found, offer best practice templates:**

```
🎨 No existing API code found. Let's set up a best practice structure!

Based on your stack (React + TypeScript + React Query), I recommend:

┌─────────────────────────────────────────────────────────────┐
│  1. react-query-fsd (Recommended)                           │
│     Feature-Sliced Design with React Query v5               │
│     ├── Separate types, api, hooks per domain               │
│     ├── Query key factory pattern                           │
│     └── Best for: Medium-large apps, team projects          │
├─────────────────────────────────────────────────────────────┤
│  2. react-query-flat                                        │
│     Flat structure - all API code in src/api/               │
│     └── Best for: Small apps, prototypes                    │
├─────────────────────────────────────────────────────────────┤
│  3. react-query-feature                                     │
│     Feature-based - API co-located with features            │
│     └── Best for: Feature-focused teams                     │
├─────────────────────────────────────────────────────────────┤
│  4. Custom - Paste sample code to replicate                 │
└─────────────────────────────────────────────────────────────┘

Select template (1-4):
```

**After template selection:**

```
Invoke skill: scaffold-templates

1. Load template definition
2. Generate shared API layer (create-api.ts, etc.)
3. For each tag in OpenAPI spec:
   - Generate types from schemas
   - Generate API functions
   - Generate path constants
   - Generate query hooks (if applicable)
   - Generate query key factory (if applicable)
4. Create barrel exports (index.ts)
```

**Report scaffold progress:**
```
🏗️ Scaffolding API layer...

  ✓ src/shared/api/create-api.ts
  ✓ src/shared/api/api-error.ts
  ✓ src/shared/api/index.ts

  ✓ src/entities/users/
    ├── api/users-api.ts (5 functions)
    ├── api/users-paths.ts
    ├── api/users-keys.ts
    ├── api/users-queries.ts (5 hooks)
    └── model/types.ts (3 types)

  ✓ src/entities/projects/
    └── ... (12 endpoints)

  ✓ src/entities/billing/
    └── ... (8 endpoints)
```

**The generated code becomes the sample for future syncs.**

This means `.openapi-sync.json` will point to the scaffolded code:
```json
{
  "samples": {
    "api": "src/entities/users/api/users-api.ts",
    "types": "src/entities/users/model/types.ts",
    "hooks": "src/entities/users/api/users-queries.ts"
  }
}
```

Now `/oas:sync` will use these generated files as the pattern source.

## Step 7: Generate Config

**Create .openapi-sync.json:**

> **Note:** `project.*` and `patterns.*` are auto-detected from samples and stored internally.
> Only essential fields are saved to the config file.

```json
{
  "version": "1.0.0",

  "openapi": {
    "source": "./openapi.json"
  },

  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  "tagMapping": {},

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ],

  "validation": {
    "ignorePaths": []
  }
}
```

## Step 8: Security Check

**Check .gitignore for cache files:**

```
1. Check if .gitignore exists
2. Check if cache files are in .gitignore:
   - .openapi-sync.cache.json
   - .openapi-sync.state.json

3. If not in .gitignore:
   ⚠️ Warning: Cache files should be in .gitignore

   Add these lines to .gitignore:
   # OpenAPI Sync cache files (contain potentially sensitive data)
   .openapi-sync.cache.json
   .openapi-sync.state.json

4. Ask user: "Add these entries to .gitignore? [y/n]"
   - If yes → Append to .gitignore
   - If no → Show warning and continue
```

For more security guidelines, see [../docs/SECURITY.md](../docs/SECURITY.md).

## Step 9: Summary

```
✅ OpenAPI Sync initialization complete

📄 OpenAPI Spec:
   My API v2.0.0
   25 endpoints, 8 tags
   Source: ./openapi.json

🔍 Detected patterns:
   Structure: FSD (Feature-Sliced Design)
   HTTP: createApi() (custom Axios wrapper)
   State: React Query v5 (factory pattern)
   Types: interface, separate files

📁 Sample code:
   API: src/entities/user/api/user-api.ts
   Types: src/entities/user/model/types.ts
   Hooks: src/entities/user/api/queries.ts

📝 Files created:
   .openapi-sync.json (config)
   .openapi-sync.cache.json (spec cache)

🚀 Next steps:
   /oas:analyze  - Detailed pattern analysis
   /oas:sync     - Start code generation
   /oas:sync --dry-run  - Preview files to generate
```

## Error Handling

```
OpenAPI spec error:
  → "Invalid OpenAPI spec: {error}"
  → "Please check the spec path"

Pattern detection failed:
  → Switch to interactive mode
  → "Could not detect patterns automatically. Let me ask a few questions."

package.json not found:
  → "Cannot find package.json. Please run from project root."

Existing config file:
  → ".openapi-sync.json already exists."
  → Ask user: Overwrite or merge with existing config?
```

## Flags

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing config |
| `--scaffold` | Skip sample detection, go directly to template selection |
| `--template=<name>` | Use specific template (e.g., `react-query-fsd`) |
| `--sample=<path>` | Specify a particular sample file to learn from |
| `--auto` | Auto-select template based on stack (no prompts) |

**Examples:**
```bash
# Standard init (auto-detects or prompts)
/oas:init https://api.example.com/openapi.json

# Force scaffold mode (skip sample detection)
/oas:init --scaffold

# Use specific template without prompts
/oas:init --template=react-query-fsd

# Full auto mode (best for CI/CD or scripts)
/oas:init --auto
```
