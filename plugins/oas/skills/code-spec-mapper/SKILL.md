---
name: code-spec-mapper
description: Build and maintain bidirectional mapping between code and OpenAPI spec
---

# Code-Spec Mapper

Builds and maintains bidirectional mapping between code and OpenAPI spec.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. Load existing mapping (`.openapi-sync.mapping.json`)
2. Scan codebase for API-related files
3. Parse OpenAPI spec for endpoints and schemas
4. Match code to spec using multiple strategies
5. Calculate confidence scores
6. Save updated mapping

---

## Operations

### initMapping

Build mapping from scratch.

**Steps:**

1. **Scan codebase**
   ```
   patterns:
     - src/entities/*/api/*-api.ts
     - src/entities/*/model/*-types.ts
     - src/features/*/api/*.ts
   ```

2. **Extract from each API file:**
   - Function names
   - HTTP methods (detected from implementation)
   - Paths (from api-paths import)
   - Request/response types

3. **Extract from each type file:**
   - interface/type names
   - Field structure
   - Export status

4. **Match with OpenAPI spec:**
   ```
   Strategy 1: Direct operationId matching
     - spec.operationId === code.functionName
     - confidence: HIGH

   Strategy 2: Path + method matching
     - spec.path === code.pathConstant
     - spec.method === code.httpMethod
     - confidence: HIGH

   Strategy 3: Name similarity matching
     - normalize(spec.operationId) ~ normalize(code.functionName)
     - threshold: 0.7
     - confidence: MEDIUM

   Strategy 4: Schema structure matching
     - spec.schema.properties ~ code.interface.fields
     - confidence: MEDIUM/LOW
   ```

5. **Tag mapping (with localization support):**
   ```
   Generate tagMapping:
     "User - Auth" → "user" (inferred from existing folders)
     "Video - Generation" → "generation"

   Algorithm:
     1. Extract endpoint list from each tag in spec
     2. Analyze folder paths of matched code files
     3. Most frequent folder name = tag mapping value
   ```

**Output:**
```
Building code-spec mapping...

📊 Scan Results:
   API Files: 28
   Type Files: 14
   OpenAPI Endpoints: 150
   OpenAPI Schemas: 85

🔗 Matching Results:
   ✅ HIGH confidence: 120 (80%)
   ⚠️ MEDIUM confidence: 20 (13%)
   ❌ Unmatched: 10 (7%)

📁 Tag Mapping:
   "User - Auth" → user
   "Video - Generation" → generation
   "Billing" → billing

💾 Saved to .openapi-sync.mapping.json
```

---

### updateMapping

Update mapping after spec changes.

**Steps:**

1. **Load existing mapping**
2. **Analyze spec diff:**
   - added: new endpoints/schemas
   - modified: changed items
   - removed: deleted items
   - renamed: name changes (heuristic)

3. **Detect renames:**
   ```
   Algorithm:
   1. Compare removed and added
   2. Same path pattern but different name → rename candidate
   3. Schema structure 90%+ same → confirmed rename

   Example:
   - removed: GET /users/status (getTaskStatus)
   - added: GET /users/task (getTask)
   - Similar path, same schema → determined as renamed
   ```

4. **Update mapping:**
   - added → add to unmapped
   - removed → mark as deprecated
   - renamed → keep previous mapping, record new name
   - modified → keep mapping

---

### queryMapping

Query mapping information.

**Queries:**

```
# Find code by endpoint
findCode("GET /users/{id}")
→ { function: "getUser", file: "src/entities/user/api/user-api.ts", line: 45 }

# Find endpoint by code
findSpec("getUser", "src/entities/user/api/user-api.ts")
→ { method: "GET", path: "/users/{id}", operationId: "getUserById" }

# Find type by schema
findType("UserProfile")
→ { type: "UserProfile", file: "src/entities/user/model/user-types.ts" }

# Find folder by tag
findFolder("User - Auth")
→ "user"
```

---

## DATA STRUCTURES

### MappingFile

```typescript
interface MappingFile {
  version: string;
  generatedAt: string;
  specVersion: string;
  specSource: string;

  endpoints: Record<string, EndpointMapping>;
  schemas: Record<string, SchemaMapping>;
  tags: Record<string, string>;  // tag → folder

  unmapped: {
    endpoints: string[];  // spec endpoints without code
    schemas: string[];    // spec schemas without code
    code: CodeItem[];     // code without spec
  };

  deprecated: {
    endpoints: DeprecatedItem[];
    schemas: DeprecatedItem[];
  };
}

interface EndpointMapping {
  operationId: string;
  method: string;
  path: string;
  tag: string;

  code: {
    function: string;
    file: string;
    line: number;
  };

  types: {
    request?: string;
    response?: string;
  };

  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  lastVerified: string;
}

interface SchemaMapping {
  schemaName: string;

  code: {
    type: string;
    file: string;
    line: number;
  };

  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DeprecatedItem {
  id: string;
  removedAt: string;
  reason: 'REMOVED_FROM_SPEC' | 'RENAMED';
  renamedTo?: string;
}
```

---

## Matching Algorithms

### OperationId Normalization

```
// Handle various operationId formats

Input formats:
  - get_user_by_id (snake_case)
  - getUserById (camelCase)
  - GetUserById (PascalCase)
  - get-user-by-id (kebab-case)

normalize(operationId):
  1. Remove separators (_, -, uppercase boundaries)
  2. Convert to lowercase
  3. Remove common prefixes/suffixes (api, handler, controller)

normalize("get_user_by_id") → "getuserbyid"
normalize("getUserById") → "getuserbyid"
normalize("GetUserById") → "getuserbyid"

Matching:
  normalize(spec.operationId) === normalize(code.functionName)
```

### Schema Structure Matching

```
structureSimilarity(specSchema, codeType):
  1. Extract field name lists
  2. Calculate common fields / total fields ratio
  3. Add bonus for matching field types

  similarity = (commonFields / totalFields) * 0.7 +
               (matchingTypes / commonFields) * 0.3

  if similarity > 0.9: return HIGH
  if similarity > 0.7: return MEDIUM
  return LOW
```

---

## ERROR HANDLING

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| No API files found | E801 | No API files in codebase | Re-run pattern-detector |
| Spec parse failed | E201 | OpenAPI parsing failed | Spec validation needed |
| Low match rate | W801 | Match rate below 50% | Request manual mapping |
| Mapping corrupted | E802 | Mapping file corrupted | Regenerate |

---

## OUTPUT EXAMPLES

### Initial Mapping Generation

```
/oas:migrate --init

📍 Building code-spec mapping...

   Scanning codebase...
   Found 28 API files, 14 type files

   Matching with OpenAPI spec (150 endpoints)...

   Results:
   ┌────────────────────────────────────────────────────────┐
   │ Confidence │ Count │ Percentage                       │
   ├────────────────────────────────────────────────────────┤
   │ HIGH       │ 120   │ ████████████████████░░░░ 80%     │
   │ MEDIUM     │ 20    │ █████░░░░░░░░░░░░░░░░░░░ 13%     │
   │ UNMATCHED  │ 10    │ ██░░░░░░░░░░░░░░░░░░░░░░ 7%      │
   └────────────────────────────────────────────────────────┘

   Tag mappings detected:
   • "User - Auth" → user
   • "Video - Generation" → generation
   • "Billing" → billing

💾 Mapping saved to .openapi-sync.mapping.json
```

### Rename Detection

```
/oas:migrate

🔍 Analyzing spec changes...

   Detected renames (high confidence):
   ┌─────────────────────────────────────────────────────────┐
   │ Old                    → New                            │
   ├─────────────────────────────────────────────────────────┤
   │ getTaskStatus          → getTask                        │
   │ UserStatusResponse     → TaskResponse                   │
   └─────────────────────────────────────────────────────────┘

   These will be treated as RENAME operations, not DELETE+ADD.
```
