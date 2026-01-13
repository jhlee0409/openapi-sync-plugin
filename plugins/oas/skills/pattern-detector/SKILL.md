---
name: pattern-detector
description: Universal pattern detector - learns from ANY codebase through sample analysis
---

# Pattern Detector

Analyze ANY codebase to learn existing API patterns. Works with any framework, structure, or convention.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST perform these steps in order:

### Step 1: Read package.json

1. Use `Read` tool to read `package.json` in project root
2. Extract dependency information:
   - `dependencies`
   - `devDependencies`
3. If package.json not found → Report error and abort

### Step 2: Detect Framework Stack

From package.json, identify:

| Category | Check for | Result |
|----------|-----------|--------|
| Framework | `react`, `vue`, `@angular/core`, `svelte` | Set `framework` |
| HTTP Client | `axios`, `ky`, `got` | Set `httpClient` |
| Data Fetching | `@tanstack/react-query`, `swr`, `@reduxjs/toolkit` | Set `dataFetching` |
| Language | `typescript` in devDeps | Set `language` to `typescript` or `javascript` |

Report findings:
```
📦 package.json analysis:
  Framework: <framework> + <language>
  HTTP Client: <httpClient or "fetch (native)">
  Data Fetching: <dataFetching or "none detected">
```

### Step 3: Search for Existing API Code

Use `Glob` tool with these patterns in order:

```
1. src/**/api/**/*.{ts,js,tsx,jsx}
2. src/**/services/**/*.{ts,js}
3. src/**/hooks/**/*{api,query,fetch}*.{ts,js}
4. lib/api/**/*.{ts,js}
5. api/**/*.{ts,js}
```

If NO files found:
- Report: `🔍 No existing API code found`
- Skip to Step 6 (Interactive Fallback)

If files found:
- Report: `🔍 Found <count> potential API files`
- Continue to Step 4

### Step 4: Analyze Sample Files

For each discovered file (max 5 files):

1. Use `Read` tool to read file content
2. Extract patterns:
   - **Import patterns**: What modules are imported, how (named, default, namespace)
   - **Export patterns**: Named exports, default exports, barrel exports
   - **Function patterns**: Arrow vs declaration, async, parameter style
   - **HTTP call patterns**: How HTTP requests are made
   - **Type patterns**: Interface vs type, naming conventions
   - **Hook patterns**: If React Query/SWR hooks present

3. Record findings in structured format:
   ```
   File: <path>
   - Imports: <pattern>
   - Exports: <pattern>
   - Functions: <pattern>
   - HTTP: <pattern>
   - Types: <pattern>
   ```

### Step 5: Synthesize Patterns

1. Compare patterns across all analyzed files
2. Calculate majority pattern for each category
3. Calculate confidence score (percentage of files matching majority)
4. Report findings:

```
📂 Detected patterns:
  Structure: <pattern> (confidence: <X>%)
  HTTP Client: <pattern>
  Data Fetching: <pattern>
  Types: <pattern>
  Naming: <pattern>

📁 Sample files:
  API: <best sample path>
  Types: <best sample path>
  Hooks: <best sample path>
```

### Step 6: Interactive Fallback (if no patterns detected)

If Step 3 found no files OR Step 5 confidence < 50%:

1. Ask user: "No clear patterns detected. Please provide a sample API file path:"
2. Wait for user response
3. Read the provided file
4. Analyze that single file as the pattern source

If user provides no sample:
1. Ask for framework preference
2. Use sensible defaults based on detected framework

---

## ERROR HANDLING

For full error code reference, see [../../ERROR-CODES.md](../../ERROR-CODES.md).

### package.json Not Found [E501]

```
Error: "[E501] ❌ Cannot find package.json"
Cause: Not in project root or no package.json exists
Fix: Run from project root directory
Action: Abort operation
```

### Config File Not Found [E501]

```
Error: "[E501] ❌ Configuration file not found: .openapi-sync.json"
Cause: Project not initialized
Fix: Run /oas:init to initialize
Action: Abort operation
```

### No Files Match Glob Patterns [E402]

```
Warning: "[E402] ⚠️ No API files found in standard locations"
Cause: Project uses non-standard structure
Fix: Specify sample file manually
Recovery: Proceed to Interactive Fallback
```

### File Read Error [E302]

```
Warning: "[E302] ⚠️ Could not read <filepath>, skipping..."
Cause: Permission denied or file corrupted
Recovery: Continue with other files
```

### Invalid Sample File [E402]

```
Warning: "[E402] ⚠️ Sample file doesn't contain extractable patterns"
Cause: File is empty, too simple, or uses unusual syntax
Fix: Provide a more representative sample
Recovery: Uses default patterns
```

### Conflicting Patterns

```
Warning: "⚠️ Inconsistent patterns detected across files"
Detail: "Found: camelCase (60%), snake_case (40%)"
Recovery: Use majority pattern, report inconsistency
```

---

## REFERENCE: Common API Locations

```
FSD (Feature-Sliced Design):
  src/entities/{domain}/api/{domain}-api.ts
  src/entities/{domain}/model/types.ts
  src/features/{feature}/api/

Feature-based:
  src/features/{feature}/api.ts
  src/features/{feature}/hooks.ts

Flat:
  src/api/{domain}.ts
  src/hooks/use{Domain}.ts

Service-based:
  src/services/{domain}.service.ts
  src/services/{domain}Service.ts
```

## REFERENCE: Detection Patterns

### HTTP Client Detection

| Package | Import Pattern | Usage Pattern |
|---------|---------------|---------------|
| axios | `import axios` or `import { } from 'axios'` | `axios.get()`, `axios.create()` |
| ky | `import ky from 'ky'` | `ky.get()`, `ky.post()` |
| fetch | (native) | `fetch(url)` |
| custom | `import { api } from '@/shared/api'` | `api.get()`, `createApi()` |

### Data Fetching Detection

| Package | Import Pattern | Usage Pattern |
|---------|---------------|---------------|
| React Query | `from '@tanstack/react-query'` | `useQuery()`, `useMutation()` |
| SWR | `import useSWR` | `useSWR(key, fetcher)` |
| RTK Query | `createApi` from toolkit | `api.endpoints.getX.useQuery()` |

### Type Pattern Detection

| Pattern | Example | Identification |
|---------|---------|----------------|
| Interface | `interface User { }` | Uses `interface` keyword |
| Type alias | `type User = { }` | Uses `type` keyword |
| Request suffix | `GetUserRequest` | Type name ends with `Request` |
| Response suffix | `GetUserResponse` | Type name ends with `Response` |
| DTO suffix | `UserDTO`, `UserDto` | Type name ends with `DTO`/`Dto` |

---

## OUTPUT: Pattern Result Structure

Return this structure to the calling command:

```json
{
  "meta": {
    "detectionMethod": "sample-analysis",
    "confidence": 0.85,
    "samplesAnalyzed": 5,
    "framework": "react"
  },
  "structure": {
    "type": "fsd",
    "pattern": "src/entities/{domain}/api/{domain}-api.ts",
    "discovered": ["src/entities/user/api/user-api.ts"]
  },
  "httpClient": {
    "type": "custom-wrapper",
    "import": "import { createApi } from '@/shared/api'",
    "usage": "createApi().{method}<{Type}>(path)"
  },
  "dataFetching": {
    "library": "react-query",
    "version": "5",
    "keyPattern": "factory"
  },
  "types": {
    "location": "src/entities/{domain}/model/types.ts",
    "style": "interface",
    "naming": {
      "request": "{Operation}Request",
      "response": "{Entity}",
      "entity": "{Entity}"
    }
  },
  "samples": {
    "api": { "path": "...", "content": "..." },
    "types": { "path": "...", "content": "..." },
    "hooks": { "path": "...", "content": "..." }
  }
}
```
