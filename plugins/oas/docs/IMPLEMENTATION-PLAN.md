# OAS Plugin Implementation Plan

## Problem Summary

| Problem | Current State | Solution |
|---------|---------------|----------|
| Schema analysis failure | Complex schemas not supported | Improve schema-analyzer |
| No rename support | Rename feature missing | New refactoring-engine |
| Usage not reflected | No import tracking | New import-tracker |
| Mapping failure | No code-spec connection | New code-spec-mapper |
| Following old spec | No diff-based updates | Implement migrate command |

---

## Implementation Priority

### Phase 1: Foundation System (Required)

#### 1.1 code-spec-mapper Skill
**Purpose:** Bidirectional mapping between code and OpenAPI spec

```
Priority: ⭐⭐⭐ (Highest)
Difficulty: Medium
Dependencies: None
```

**Features:**
- operationId ↔ function name mapping
- Schema name ↔ type name mapping
- Tag ↔ folder name mapping (supports localized tags)
- Mapping confidence score (HIGH/MEDIUM/LOW)

**Output File:** `.openapi-sync.mapping.json`

```json
{
  "version": "1.0.0",
  "mappings": {
    "endpoints": {
      "GET /users/{id}": {
        "operationId": "get_user_by_id",
        "code": {
          "function": "getUser",
          "file": "src/entities/user/api/user-api.ts",
          "line": 45
        },
        "confidence": "HIGH"
      }
    },
    "schemas": {
      "UserProfile": {
        "type": "UserProfile",
        "file": "src/entities/user/model/user-types.ts",
        "line": 12
      }
    },
    "tags": {
      "User - Auth": "user",
      "Video - Generation": "generation"
    }
  }
}
```

---

#### 1.2 import-tracker Skill
**Purpose:** Analyze import dependencies across the entire project

```
Priority: ⭐⭐⭐ (Highest)
Difficulty: Medium
Dependencies: None
```

**Features:**
- Build import graph between files
- Find usages of specific exports
- Impact analysis (list of files affected by changes)

**Algorithm:**
```
1. Scan all TS/TSX files in the project
2. Parse import statements in each file
3. Build reverse graph from export → import
4. Query: "All files using the UserProfile type"
```

**Usage Example:**
```
Input: findUsages("UserProfile", "src/entities/user/model/user-types.ts")
Output: [
  "src/entities/user/api/user-api.ts:3",
  "src/features/profile/ui/ProfileCard.tsx:8",
  "src/pages/settings/index.tsx:15"
]
```

---

### Phase 2: Core Features

#### 2.1 refactoring-engine Skill
**Purpose:** Code renaming with automatic usage updates

```
Priority: ⭐⭐⭐ (Core)
Difficulty: High
Dependencies: import-tracker
```

**Features:**
1. **File Renaming**
   - Rename file
   - Move folder
   - Auto-update all import paths

2. **Type Renaming**
   - Rename interface/type names
   - Auto-update all usages
   - Handle generic parameters

3. **Function Renaming**
   - Rename function names
   - Auto-update call sites
   - Update export/import statements

4. **Variable Renaming**
   - Rename variable names
   - Scope-aware (distinguish same name in different scopes)

**Usage Example:**
```
Input: rename({
  type: "function",
  from: "getTaskStatus",
  to: "getTask",
  file: "src/entities/generation/api/generation-api.ts"
})

Output: {
  changed: [
    "src/entities/generation/api/generation-api.ts",
    "src/features/create/hooks/useTaskPolling.ts",
    "src/features/history/api/history-queries.ts"
  ],
  totalChanges: 8
}
```

---

#### 2.2 schema-analyzer Improvements
**Purpose:** Complete analysis of complex OpenAPI schemas

```
Priority: ⭐⭐ (Important)
Difficulty: Medium
Dependencies: None
```

**Improvements:**

1. **Full allOf Support**
```typescript
// OpenAPI
allOf:
  - $ref: '#/components/schemas/BaseEntity'
  - type: object
    properties:
      name: { type: string }

// Generated
type Entity = BaseEntity & { name: string }
```

2. **oneOf/anyOf + discriminator**
```typescript
// OpenAPI
oneOf:
  - $ref: '#/components/schemas/Dog'
  - $ref: '#/components/schemas/Cat'
discriminator:
  propertyName: petType

// Generated
type Pet = Dog | Cat
// with type guard helpers
```

3. **Localized Tag Mapping**
```
"User - Auth" → user-auth or user (configurable)
"Video - Generation" → generation or video-generation
```

4. **Circular Reference Improvements**
```typescript
// Proper handling of circular refs
interface TreeNode {
  value: string
  children: TreeNode[]  // Not unknown anymore
}
```

---

### Phase 3: Command Implementation

#### 3.1 /oas:sync Improvements

```
Changes:
1. Update mapping file before generation
2. Only process new endpoints (no existing file modifications)
3. Add new items to mapping after generation
```

**Flow:**
```
1. Fetch spec
2. Load mapping (create if doesn't exist)
3. Detect new endpoints (not in mapping)
4. Generate only new files
5. Update mapping
```

---

#### 3.2 /oas:migrate Implementation

```
Core Features:
1. Change analysis (using code-spec-mapper)
2. Impact analysis (using import-tracker)
3. Refactoring execution (using refactoring-engine)
4. Atomic application + rollback
```

**Flow:**
```
1. Fetch spec
2. Load mapping
3. Analyze changes:
   - RENAMED: operationId/schema name changes
   - MODIFIED: field add/remove/type change
   - REMOVED: deleted from spec
4. Impact analysis:
   - Direct impact: API files, type files
   - Indirect impact: all files that import them
5. Generate migration plan
6. User confirmation
7. Create backup
8. Apply changes (refactoring-engine)
9. Verify (TypeScript compilation)
10. On success: delete backup, on failure: rollback
```

---

## File Structure

```
plugins/oas/
├── commands/
│   ├── sync.md         # Improved
│   └── migrate.md      # Already written
├── skills/
│   ├── code-spec-mapper/
│   │   └── SKILL.md    # New
│   ├── import-tracker/
│   │   └── SKILL.md    # New
│   ├── refactoring-engine/
│   │   └── SKILL.md    # New
│   ├── schema-analyzer/
│   │   └── SKILL.md    # New (separated from openapi-parser)
│   ├── migration-analyzer/
│   │   └── SKILL.md    # Already written
│   └── migration-applier/
│       └── SKILL.md    # Already written
└── docs/
    └── IMPLEMENTATION-PLAN.md  # This file
```

---

## Implementation Order

### Week 1: Foundation System
1. [ ] Implement code-spec-mapper skill
2. [ ] Implement import-tracker skill
3. [ ] Define .openapi-sync.mapping.json schema

### Week 2: Core Features
4. [ ] Implement refactoring-engine skill
5. [ ] Implement schema-analyzer skill (separate from openapi-parser)

### Week 3: Commands
6. [ ] Improve /oas:sync
7. [ ] Complete /oas:migrate (based on existing design)

### Week 4: Integration and Testing
8. [ ] Test complete flow
9. [ ] Handle edge cases
10. [ ] Documentation

---

## Expected Usage Scenarios

### Scenario 1: New Endpoint Added
```bash
/oas:sync --only-added

# Result: Only new files generated
# New item added to mapping
```

### Scenario 2: operationId Changed
```bash
/oas:migrate

# Analysis:
# - get_user_status → get_user_task (renamed)
# - Impact: 3 files
#
# Execution:
# 1. Rename getTaskStatus → getTask
# 2. Auto-update 3 call sites
# 3. TypeScript verification passed
```

### Scenario 3: Field Added + Usage Update
```bash
/oas:migrate

# Analysis:
# - workspaceId added to CreateProjectRequest (required)
# - Impact: API 1 file + 4 usage files
#
# Execution:
# 1. Add workspaceId to type
# 2. Warn about missing workspaceId in 4 usages
# 3. User provides values manually (SEMI-AUTO)
```

---

## Success Criteria

1. **Accuracy**: 100% detection of spec changes
2. **Completeness**: Auto-update all usages
3. **Safety**: Full rollback on failure
4. **Usability**: Preview with dry-run
