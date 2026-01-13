---
name: oas:init
description: Initialize OpenAPI sync - learns your project patterns automatically
argument-hint: [openapi-spec-path-or-url]
uses-skills: [output-format]
---

# OpenAPI Sync Initialization

Initialize OpenAPI sync by learning your project's existing patterns. Works with ANY codebase.

## Flow Overview

```
┌─────────────────────────────────────────────────────┐
│                    /oas:init                            │
├─────────────────────────────────────────────────────┤
│  1. Get OpenAPI spec location                           │
│  2. Detect framework (package.json)                     │
│  3. Find existing API code (sample discovery)           │
│  4. Analyze samples OR ask user                         │
│  5. Generate .openapi-sync.json                         │
│  6. Show summary                                        │
└─────────────────────────────────────────────────────┘
```

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

**Validate:**
```
- Verify OpenAPI 3.x or Swagger 2.x structure
- Extract title, version, endpoints
```

## Step 2: Framework Detection

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

## Step 3: Sample Discovery

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

## Step 4a: Sample Analysis (if samples found)

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
Generate code using these patterns? [Y/n/modify]
```

## Step 4b: Interactive Mode (if no samples)

**Ask user for guidance:**

```
Q1: "Where should API code be generated?"
    Options:
    - src/api/{domain}/ (flat)
    - src/features/{domain}/api/ (feature-based)
    - src/entities/{domain}/api/ (FSD)
    - Custom path

Q2: "Which HTTP client are you using?"
    Options (based on package.json):
    - Axios (detected)
    - Fetch (native)
    - Other

Q3: "Are you using a data fetching library?"
    Options (based on package.json):
    - React Query (detected)
    - SWR
    - None

Q4: "Do you have sample code to reference?"
    - Yes → "Please provide the file path" OR "Paste the code"
    - No → Use framework defaults

Alternative:
"Paste sample code and I'll replicate that style:"
[User pastes code]
→ Analyze pasted code
→ Extract patterns
```

## Step 5: Generate Config

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

## Step 6: Summary

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

📝 Config saved: .openapi-sync.json

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
  → ".openapi-sync.json already exists. Overwrite? [y/N/merge]"
```

## Flags

- `--force`: Overwrite existing config
- `--interactive`: Skip auto-detection and configure manually
- `--sample=path`: Specify a particular sample file
