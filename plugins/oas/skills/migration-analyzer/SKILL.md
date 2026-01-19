---
name: migration-analyzer
description: Analyze breaking changes and compute migration impact with code-spec mapping
---

# Migration Analyzer

Analyzes OpenAPI spec changes, builds code-spec mapping, and computes migration impact.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. Check if mapping exists (`.openapi-sync.mapping.json`)
2. If not exists → Run `initMapping` operation
3. Analyze spec diff to classify changes by severity
4. For each change, compute affected files via mapping
5. Classify migration difficulty (AUTO/SEMI/MANUAL)
6. Return structured impact analysis

---

## Operations

### initMapping

Build code-spec mapping from scratch.

**Steps:**

1. **Read project patterns** from `.openapi-sync.json`
   ```
   {
     "samples": {
       "api": "src/entities/user/api/user-api.ts",
       "types": "src/entities/user/model/user-types.ts"
     }
   }
   ```

2. **Scan all API files** matching pattern
   ```
   Use Glob: src/entities/*/api/*-api.ts
   Use Glob: src/entities/*/config/*-api-paths.ts
   Use Glob: src/entities/*/model/*-types.ts
   Use Glob: src/features/*/api/*.ts
   ```

3. **For each API file**, extract:
   ```
   - Function name (e.g., createProject)
   - HTTP method (from implementation or naming convention)
   - Path reference (from api-paths import)
   ```

4. **For each api-paths file**, extract:
   ```
   - Path constant name
   - Actual path template (e.g., /api/v1/projects)
   ```

5. **Match with OpenAPI spec**:
   ```
   For each endpoint in spec:
     1. Try exact path + method match
     2. Try operationId match
     3. Try function name similarity match
     4. Record match confidence (HIGH/MEDIUM/LOW)
   ```

6. **Detect customizations**:
   ```
   Scan hook files for:
   - onSuccess/onError handlers
   - Custom transformation code
   - @preserve/@custom comments
   ```

7. **Save mapping** to `.openapi-sync.mapping.json`

**Output:**
```json
{
  "version": "1.0.0",
  "lastMigration": null,
  "specVersion": "v1.0.0",
  "mappings": {
    "POST /api/v1/projects": {
      "operationId": "createProject",
      "matchConfidence": "HIGH",
      "files": {
        "types": "src/entities/project/model/project-types.ts",
        "api": "src/entities/project/api/project-api.ts",
        "paths": "src/entities/project/config/project-api-paths.ts",
        "hooks": "src/features/project/api/use-create-project.ts"
      },
      "functions": {
        "api": "createProject",
        "hook": "useCreateProject"
      },
      "types": {
        "request": "CreateProjectRequest",
        "response": "Project"
      },
      "customizations": []
    }
  },
  "unmapped": []
}
```

---

### analyzeChanges

Analyze spec diff and compute impact.

**Input:** Diff result from cache-manager/openapi-parser

**Steps:**

1. **Classify each change by severity**:
   ```
   CRITICAL (🔴):
   - Required field added to request
   - Endpoint removed
   - Path changed
   - Method changed

   BREAKING (🟠):
   - Field removed from response
   - Type changed (incompatible)
   - Enum value removed
   - Parameter type changed

   DEPRECATED (🟡):
   - Endpoint marked deprecated
   - Field marked deprecated

   COMPATIBLE (🟢):
   - New endpoint added
   - Optional field added
   - New enum value added
   ```

2. **For each change, lookup affected files**:
   ```
   Using mapping, find:
   - Direct files: Files that implement/use the endpoint
   - Indirect files: Files that import from direct files
   ```

3. **Classify migration difficulty**:
   ```
   AUTO:
   - Type definition changes (add field, change type)
   - API function signature updates
   - New endpoint generation
   - Path constant updates

   SEMI:
   - Hook changes that need review
   - Changes affecting multiple consumers
   - Type changes with potential runtime impact

   MANUAL:
   - Endpoint removal (need decision)
   - Breaking changes in shared types
   - Changes requiring business logic decision
   ```

4. **Generate specific actions**:
   ```
   For each affected file:
   - Identify exact line numbers
   - Generate before/after code snippets
   - Mark as ADD/MODIFY/REMOVE
   ```

**Output Structure:**
```json
{
  "summary": {
    "total": 4,
    "bySeverity": { "CRITICAL": 1, "BREAKING": 2, "COMPATIBLE": 1 },
    "byDifficulty": { "AUTO": 3, "SEMI": 1, "MANUAL": 1 },
    "filesAffected": 9
  },
  "changes": [
    {
      "id": "chg-001",
      "type": "REQUIRED_FIELD_ADDED",
      "severity": "CRITICAL",
      "difficulty": "AUTO",
      "endpoint": "POST /api/v1/projects",
      "description": "Required field 'workspaceId' added to request",
      "spec": {
        "before": { "required": ["name"] },
        "after": { "required": ["name", "workspaceId"] }
      },
      "impact": {
        "direct": [
          {
            "file": "src/entities/project/model/project-types.ts",
            "line": 23,
            "type": "MODIFY",
            "action": "Add workspaceId: string to CreateProjectRequest"
          }
        ],
        "indirect": [
          {
            "file": "src/features/project/ui/CreateProjectModal.tsx",
            "line": 78,
            "type": "REVIEW",
            "action": "Need to provide workspaceId value"
          }
        ]
      },
      "actions": [
        {
          "file": "src/entities/project/model/project-types.ts",
          "difficulty": "AUTO",
          "before": "export interface CreateProjectRequest {\n  name: string;\n}",
          "after": "export interface CreateProjectRequest {\n  name: string;\n  workspaceId: string;\n}"
        }
      ]
    }
  ]
}
```

---

### detectCustomizations

Scan files for customization markers.

**Patterns to detect:**

1. **Hook customizations**:
   ```typescript
   // Look for these patterns in hooks:
   onSuccess: (data) => {
     // Custom logic here - should be preserved
   },
   onError: (error) => {
     // Custom error handling
   },
   select: (data) => {
     // Custom data transformation
   }
   ```

2. **Comment markers**:
   ```typescript
   // @preserve - Do not overwrite
   // @custom - Custom implementation
   // @oas-ignore - Skip during migration
   ```

3. **Custom middleware/interceptors**:
   ```typescript
   // Custom request interceptor
   const customAxios = axios.create({...})
   ```

**Output:**
```json
{
  "customizations": [
    {
      "file": "src/features/project/api/use-create-project.ts",
      "type": "onSuccess-handler",
      "startLine": 15,
      "endLine": 25,
      "content": "onSuccess: () => { ... }",
      "preserveReason": "Custom cache invalidation logic"
    }
  ]
}
```

---

## ALGORITHMS

### Path Matching Algorithm

```
matchEndpointToCode(endpoint, codeFiles):
  // Step 1: Exact path match
  for each pathFile in codeFiles.paths:
    paths = extractPaths(pathFile)
    if endpoint.path in paths:
      return { match: paths[endpoint.path], confidence: HIGH }

  // Step 2: operationId match
  for each apiFile in codeFiles.api:
    functions = extractFunctions(apiFile)
    if endpoint.operationId in functions:
      return { match: functions[endpoint.operationId], confidence: HIGH }

  // Step 3: Fuzzy name match
  normalizedEndpoint = normalize(endpoint.path)  // /users/{id} -> getUser
  for each apiFile in codeFiles.api:
    functions = extractFunctions(apiFile)
    for each fn in functions:
      if similarity(fn.name, normalizedEndpoint) > 0.8:
        return { match: fn, confidence: MEDIUM }

  return { match: null, confidence: NONE }
```

### Impact Propagation Algorithm

```
computeImpact(change, mapping):
  directFiles = mapping[change.endpoint].files
  indirectFiles = []

  for each file in directFiles:
    importers = findFilesImporting(file)
    for each importer in importers:
      if importer uses affectedExports(file, change):
        indirectFiles.add(importer)

  return { direct: directFiles, indirect: indirectFiles }
```

### Difficulty Classification Algorithm

```
classifyDifficulty(change):
  if change.type in [NEW_ENDPOINT, NEW_FIELD, TYPE_CHANGE]:
    if change.affectsOnlyTypes:
      return AUTO
    if change.affectsHooks:
      return SEMI

  if change.type in [ENDPOINT_REMOVED, FIELD_REMOVED]:
    return MANUAL

  if change.requiresBusinessDecision:
    return MANUAL

  return AUTO
```

---

## DATA STRUCTURES

### MappingFile

```typescript
interface MappingFile {
  version: string;
  lastMigration: string | null;
  specVersion: string;
  mappings: Record<string, EndpointMapping>;
  unmapped: UnmappedItem[];
}

interface EndpointMapping {
  operationId: string;
  matchConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  files: {
    types?: string;
    api?: string;
    paths?: string;
    hooks?: string;
    mutations?: string;
  };
  functions: {
    api?: string;
    hook?: string;
    mutation?: string;
  };
  types: {
    request?: string;
    response?: string;
  };
  customizations: Customization[];
}

interface Customization {
  file: string;
  type: string;
  startLine: number;
  endLine: number;
  content: string;
  preserveReason?: string;
}

interface UnmappedItem {
  file: string;
  function: string;
  reason: string;
}
```

### ChangeAnalysis

```typescript
interface ChangeAnalysis {
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byDifficulty: Record<Difficulty, number>;
    filesAffected: number;
  };
  changes: Change[];
}

interface Change {
  id: string;
  type: ChangeType;
  severity: 'CRITICAL' | 'BREAKING' | 'DEPRECATED' | 'COMPATIBLE';
  difficulty: 'AUTO' | 'SEMI' | 'MANUAL';
  endpoint: string;
  description: string;
  spec: {
    before: any;
    after: any;
  };
  impact: {
    direct: FileImpact[];
    indirect: FileImpact[];
  };
  actions: MigrationAction[];
}

interface FileImpact {
  file: string;
  line: number;
  type: 'ADD' | 'MODIFY' | 'REMOVE' | 'REVIEW';
  action: string;
}

interface MigrationAction {
  file: string;
  difficulty: 'AUTO' | 'SEMI' | 'MANUAL';
  before?: string;
  after?: string;
  instruction?: string;
}
```

---

## ERROR HANDLING

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Pattern not detected | E401 | Cannot detect project patterns | Run /oas:init first |
| No API files found | E402 | No files matching patterns | Check sample paths in config |
| Spec mismatch | E403 | Mapping outdated vs spec | Run /oas:migrate --init |
| Circular import | E404 | Circular dependency detected | Report and continue |

---

## EXAMPLES

### Example: Building Mapping

```
/oas:migrate --init

🔍 Scanning codebase for API patterns...

   Pattern: FSD (Feature-Sliced Design)
   HTTP Client: Axios wrapper (createApi)
   State Manager: React Query v5

   Scanning directories:
   ✓ src/entities/*/api/
   ✓ src/entities/*/config/
   ✓ src/entities/*/model/
   ✓ src/features/*/api/

📊 Scan Results:

   API Files: 28
   Path Files: 14
   Type Files: 14
   Hook Files: 58

🔗 Building code-spec mapping...

   Matching endpoints to code...
   ✅ 145/150 endpoints matched (96.7%)
   ⚠️ 5 endpoints unmatched (new in spec)

   Detecting customizations...
   ✅ Found 12 customization blocks

💾 Mapping saved to .openapi-sync.mapping.json

   Mapping size: 145 endpoints
   Customizations tracked: 12
   Unmapped code: 3 functions
```
