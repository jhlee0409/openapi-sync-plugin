---
name: refactoring-engine
description: Rename and refactor code with automatic usage updates across the project
---

# Refactoring Engine

Performs code renaming and refactoring, automatically updating all usages across the entire project.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. Analyze the refactoring request
2. Use import-tracker to find all usages
3. Plan all necessary changes
4. Apply changes atomically (all or nothing)
5. Verify TypeScript compilation
6. Report results

---

## Operations

### renameType

Rename type/interface.

**Input:**
```typescript
renameType({
  file: "src/entities/user/model/user-types.ts",
  from: "UserProfile",
  to: "UserInfo"
})
```

**Steps:**

1. **Verify target**
   ```
   - Check file exists
   - Check export exists
   - Check for name collision (if 'to' already exists)
   ```

2. **Find usages (import-tracker)**
   ```
   findUsages("UserProfile", file)
   → All import statements
   → All type annotations
   → All variable declarations
   → Generic parameters
   ```

3. **Generate change plan**
   ```typescript
   changes: [
     // 1. Change definition
     {
       file: "src/entities/user/model/user-types.ts",
       line: 12,
       from: "export interface UserProfile {",
       to: "export interface UserInfo {"
     },
     // 2. Change imports
     {
       file: "src/features/profile/ui/ProfileCard.tsx",
       line: 3,
       from: "import { UserProfile } from '@/entities/user'",
       to: "import { UserInfo } from '@/entities/user'"
     },
     // 3. Change usages
     {
       file: "src/features/profile/ui/ProfileCard.tsx",
       line: 15,
       from: "const user: UserProfile = ",
       to: "const user: UserInfo = "
     },
     // 4. Change re-exports
     {
       file: "src/entities/user/index.ts",
       line: 5,
       from: "export type { UserProfile }",
       to: "export type { UserInfo }"
     }
   ]
   ```

4. **Atomic application**
   ```
   - Create backup
   - Apply all changes
   - Verify TypeScript compilation
   - Rollback on failure
   ```

**Output:**
```
Renaming UserProfile → UserInfo

📊 Analysis:
   Definition: src/entities/user/model/user-types.ts:12
   Direct usages: 23
   Files affected: 8

🔧 Changes to apply:
   [1/32] src/entities/user/model/user-types.ts:12
          interface UserProfile → interface UserInfo
   [2/32] src/entities/user/index.ts:5
          export type { UserProfile } → export type { UserInfo }
   [3/32] src/features/profile/ui/ProfileCard.tsx:3
          import { UserProfile } → import { UserInfo }
   ...

✅ All 32 changes applied successfully
✅ TypeScript compilation passed
```

---

### renameFunction

Rename function.

**Input:**
```typescript
renameFunction({
  file: "src/entities/generation/api/generation-api.ts",
  from: "getTaskStatus",
  to: "getTask"
})
```

**Steps:**

1. **Verify target**
   ```
   - Function definition location
   - Export status
   - Check for overloads
   ```

2. **Find usages**
   ```
   - Used in import statements
   - Direct calls (functionName())
   - Callback passing (map(functionName))
   - Object property assignment ({ fn: functionName })
   ```

3. **Change plan**
   ```typescript
   changes: [
     // Definition
     {
       file: "src/entities/generation/api/generation-api.ts",
       line: 45,
       from: "export const getTaskStatus = async",
       to: "export const getTask = async"
     },
     // Import
     {
       file: "src/features/create/hooks/useTaskPolling.ts",
       line: 5,
       from: "import { getTaskStatus }",
       to: "import { getTask }"
     },
     // Call
     {
       file: "src/features/create/hooks/useTaskPolling.ts",
       line: 28,
       from: "generationApi.getTaskStatus({",
       to: "generationApi.getTask({"
     }
   ]
   ```

4. **Special case handling**
   ```typescript
   // Object method form
   const api = {
     getTaskStatus: () => {}  // needs change
   }

   // Destructuring assignment
   const { getTaskStatus } = generationApi  // needs change

   // Dynamic access (warning only)
   api[methodName]()  // runtime, cannot change, output warning
   ```

---

### renameFile

Rename/move file or folder.

**Input:**
```typescript
renameFile({
  from: "src/entities/generation/api/generation-api.ts",
  to: "src/entities/clip-generation/api/clip-generation-api.ts"
})
```

**Steps:**

1. **Impact analysis**
   ```
   - All files that import this file
   - Check barrel exports (index.ts)
   - Relative path changes for folder moves
   ```

2. **Change plan**
   ```typescript
   changes: [
     // Move file
     {
       type: "MOVE_FILE",
       from: "src/entities/generation/api/generation-api.ts",
       to: "src/entities/clip-generation/api/clip-generation-api.ts"
     },
     // Change import paths
     {
       file: "src/features/create/hooks/useTaskPolling.ts",
       line: 5,
       from: "from '@/entities/generation/api'",
       to: "from '@/entities/clip-generation/api'"
     },
     // Change relative paths (within same folder)
     {
       file: "src/entities/generation/api/index.ts",
       line: 1,
       from: "export * from './generation-api'",
       to: "DELETE_LINE"  // or modify path
     }
   ]
   ```

3. **Create directories**
   ```
   - Create target directory if doesn't exist
   - Create index.ts if needed
   ```

---

### renameVariable

Rename variable/constant (scope-aware).

**Input:**
```typescript
renameVariable({
  file: "src/entities/user/api/user-api.ts",
  from: "userApiPaths",
  to: "USER_API_PATHS",
  scope: "module"  // module | function | block
})
```

**Steps:**

1. **Scope analysis**
   ```
   // module scope
   const userApiPaths = { ... }  // used throughout file

   // function scope
   function getUser() {
     const userApiPaths = ...  // only within this function
   }

   // block scope
   if (condition) {
     const userApiPaths = ...  // only within this block
   }
   ```

2. **Distinguish same name in different scopes**
   ```typescript
   // Multiple userApiPaths in file possible
   const userApiPaths = { ... }  // module scope - change this

   function example() {
     const userApiPaths = localValue  // function scope - don't change
   }
   ```

3. **Shadow warning**
   ```
   Warning: Variable 'userApiPaths' is shadowed in function 'example' at line 45
   Only module-level variable will be renamed.
   ```

---

### batchRename

Process multiple renames at once.

**Input:**
```typescript
batchRename({
  operations: [
    { type: "type", file: "...", from: "UserProfile", to: "UserInfo" },
    { type: "function", file: "...", from: "getTaskStatus", to: "getTask" },
    { type: "file", from: "...", to: "..." }
  ],
  atomic: true  // rollback all if any fails
})
```

**Execution Order:**
```
1. Analyze all usages (parallel)
2. Check for change conflicts
3. Sort by dependency order:
   - File moves first
   - Type changes
   - Function changes
   - Variable changes
4. Apply sequentially
5. Verify
```

---

## ALGORITHMS

### Safe String Replacement

```typescript
// Simple string replacement is dangerous
// When "User" → "Account", "UserProfile" shouldn't become "AccountProfile"

safeReplace(code: string, from: string, to: string, context: Context): string {
  // 1. Check word boundaries
  const wordBoundary = /[^a-zA-Z0-9_]/;

  // 2. Context-specific patterns
  const patterns = {
    'type-definition': new RegExp(`(interface|type)\\s+${from}\\s*[{<]`),
    'type-annotation': new RegExp(`:\\s*${from}([\\s,;\\[\\]<>)])`),
    'import': new RegExp(`{[^}]*\\b${from}\\b[^}]*}`),
    'function-call': new RegExp(`\\b${from}\\s*\\(`),
    'variable': new RegExp(`(const|let|var)\\s+${from}\\b`)
  };

  // 3. Replace only matching context pattern
  return code.replace(patterns[context], (match) =>
    match.replace(from, to)
  );
}
```

### Conflict Detection

```typescript
detectConflicts(operations: RenameOperation[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1. Name collision
  for (const op of operations) {
    const existingNames = getExportsInFile(op.file);
    if (existingNames.includes(op.to)) {
      conflicts.push({
        type: 'NAME_COLLISION',
        message: `${op.to} already exists in ${op.file}`
      });
    }
  }

  // 2. Circular dependency creation
  // Check if file move creates circular reference

  // 3. Simultaneous change conflict
  // Multiple operations trying to change same line

  return conflicts;
}
```

### Import Statement Update

```typescript
updateImport(
  importLine: string,
  changes: { from: string, to: string }[]
): string {
  // Parse named imports
  const match = importLine.match(/import\s*{([^}]+)}\s*from/);
  if (!match) return importLine;

  let names = match[1];

  for (const { from, to } of changes) {
    // "OldName" → "NewName"
    // "OldName as alias" → "NewName as alias"
    names = names.replace(
      new RegExp(`\\b${from}\\b(?!\\s+as)`),
      to
    );
  }

  return importLine.replace(match[1], names);
}
```

---

## ERROR HANDLING

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Name collision | E1001 | Target name already exists | Suggest different name |
| Parse error | E1002 | File parsing failed | Skip file |
| TypeScript error | E1003 | Compilation failed after changes | Full rollback |
| File locked | E1004 | Cannot write to file | Retry or skip |
| Circular rename | E1005 | A→B, B→A simultaneous request | Suggest intermediate name |

---

## SAFETY MEASURES

### Backup System

```
1. Backup all files before changes
   .oas-refactor-backup/
   ├── manifest.json
   └── files/
       ├── src_entities_user_model_user-types.ts
       └── src_features_profile_ui_ProfileCard.tsx

2. manifest.json:
   {
     "timestamp": "2024-01-15T10:30:00Z",
     "operations": [...],
     "files": [...]
   }

3. Rollback command:
   /oas:migrate --rollback
```

### Verification Steps

```
1. Pre-flight checks:
   - Verify TypeScript can compile
   - All target files accessible
   - No name collisions

2. Post-change verification:
   - TypeScript compilation
   - Import resolution check
   - Run tests if needed

3. Rollback triggers:
   - Compilation failure
   - Errors in 10+ files
   - User cancellation
```

---

## OUTPUT EXAMPLES

### Successful Rename

```
═══════════════════════════════════════════════════════════════════
  Refactoring: UserProfile → UserInfo
═══════════════════════════════════════════════════════════════════

📊 Analysis Complete:
   Definition: src/entities/user/model/user-types.ts:12
   Usages found: 23 across 8 files

📦 Creating backup...
   ✅ Backed up 8 files

🔧 Applying changes...
   [1/32] ✅ user-types.ts:12 - interface definition
   [2/32] ✅ user-types.ts:45 - export statement
   [3/32] ✅ user/index.ts:5 - re-export
   [4/32] ✅ user-api.ts:3 - import statement
   [5/32] ✅ user-api.ts:15 - type annotation
   ...
   [32/32] ✅ SettingsPage.tsx:8 - type annotation

✔️ Verifying changes...
   ✅ TypeScript compilation passed
   ✅ All imports resolved

🧹 Cleanup...
   ✅ Backup removed

═══════════════════════════════════════════════════════════════════
  Refactoring Complete: 32 changes across 8 files
═══════════════════════════════════════════════════════════════════
```

### Rollback Scenario

```
═══════════════════════════════════════════════════════════════════
  Refactoring: getTaskStatus → getTask
═══════════════════════════════════════════════════════════════════

📊 Analysis Complete:
   Definition: src/entities/generation/api/generation-api.ts:45
   Usages found: 12 across 5 files

📦 Creating backup...
   ✅ Backed up 5 files

🔧 Applying changes...
   [1/15] ✅ generation-api.ts:45 - function definition
   [2/15] ✅ generation-api.ts:89 - export
   [3/15] ✅ useTaskPolling.ts:5 - import
   [4/15] ✅ useTaskPolling.ts:28 - function call
   ...

✔️ Verifying changes...
   ❌ TypeScript compilation failed

   Error in src/features/history/api/history-queries.ts:34
   Property 'getTaskStatus' does not exist on type 'GenerationApi'

🚨 Verification failed! Rolling back...
   ✅ Restored generation-api.ts
   ✅ Restored useTaskPolling.ts
   ✅ Restored generation/index.ts
   ...

═══════════════════════════════════════════════════════════════════
  Refactoring Failed: All changes reverted
═══════════════════════════════════════════════════════════════════

Error Details:
  The function 'getTaskStatus' is accessed dynamically in history-queries.ts
  This usage was not detected during static analysis.

Suggestions:
  1. Manually update history-queries.ts:34 first
  2. Re-run the refactoring
```
