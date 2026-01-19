---
name: migration-applier
description: Apply migration changes atomically with backup and rollback support
---

# Migration Applier

Applies migration changes to codebase atomically, with backup and rollback capabilities.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. Create backup of all affected files
2. Apply changes in transaction mode
3. Verify changes (TypeScript compilation)
4. On success: Remove backup, update mapping
5. On failure: Rollback all changes, restore backup
6. Report detailed results

---

## Operations

### applyMigration

Apply a set of migration actions atomically.

**Input:**
```json
{
  "actions": [...],  // From migration-analyzer
  "options": {
    "dryRun": false,
    "autoOnly": false,
    "keepBackup": false,
    "verify": true
  }
}
```

**Steps:**

1. **Filter actions by options**:
   ```
   if autoOnly:
     actions = actions.filter(a => a.difficulty === 'AUTO')
   ```

2. **Create backup**:
   ```
   backupDir = .openapi-sync.backup/
   for each unique file in actions:
     copy file to backupDir with relative path
   ```

3. **Apply changes in order**:
   ```
   Order priority:
   1. Type definitions (dependencies first)
   2. Path constants
   3. API functions
   4. Hooks/Mutations
   ```

4. **For each change**:
   ```
   - Read current file content
   - Apply modification (add/modify/remove)
   - Write updated content
   - Log change details
   ```

5. **Verify changes**:
   ```
   if options.verify:
     - Run TypeScript type check on affected files
     - Check imports resolve correctly
   ```

6. **Finalize**:
   ```
   if all successful:
     if not options.keepBackup:
       remove backupDir
     update mapping.lastMigration
   else:
     rollback all changes
     restore from backup
   ```

---

### createBackup

Create backup of files before modification.

**Steps:**

1. **Create backup directory**:
   ```
   backupDir = .openapi-sync.backup/
   backupManifest = .openapi-sync.backup/manifest.json
   ```

2. **Copy each affected file**:
   ```
   for each file in affectedFiles:
     relativePath = file.replace(projectRoot, '')
     backupPath = backupDir + relativePath
     mkdir -p dirname(backupPath)
     copy file to backupPath
   ```

3. **Save manifest**:
   ```json
   {
     "timestamp": "2024-01-15T10:30:00Z",
     "files": [
       {
         "original": "src/entities/project/model/project-types.ts",
         "backup": ".openapi-sync.backup/src/entities/project/model/project-types.ts",
         "hash": "abc123..."
       }
     ],
     "specVersion": "v2.0.0"
   }
   ```

**Output:**
```
Creating backup...
  ✅ src/entities/project/model/project-types.ts
  ✅ src/entities/project/api/project-api.ts
  ✅ src/entities/user/model/user-types.ts
  ...

Backed up 9 files to .openapi-sync.backup/
```

---

### applyChange

Apply a single change to a file.

**Change Types:**

#### ADD_FIELD

Add a field to an interface/type.

```typescript
// Before
interface CreateProjectRequest {
  name: string;
}

// After
interface CreateProjectRequest {
  name: string;
  workspaceId: string;
}
```

**Algorithm:**
```
1. Find interface/type definition in file
2. Locate closing brace
3. Insert new field before closing brace
4. Maintain consistent formatting (indentation, semicolons)
```

#### MODIFY_TYPE

Change a field's type.

```typescript
// Before
status: string;

// After
status: UserStatus;
```

**Algorithm:**
```
1. Find field definition
2. Replace type annotation
3. If new type needs import, add import statement
```

#### ADD_ENUM

Add a new enum/type alias.

```typescript
// Add at appropriate location
export type UserStatus = 'active' | 'inactive' | 'pending';
```

**Algorithm:**
```
1. Find appropriate insertion point (after imports, before interfaces)
2. Insert type definition
3. Add export if needed
```

#### ADD_FUNCTION

Add a new API function.

```typescript
export const getCreditUsage = async (params: GetCreditUsageRequest): Promise<CreditUsageResponse> => {
  const { workspaceId } = params;
  const response = await createApi().get<CreditUsageResponse>(
    WORKSPACE_API_PATHS.creditUsage(workspaceId)
  );
  return response.data;
};
```

**Algorithm:**
```
1. Use code-generator skill to generate function
2. Find appropriate insertion point (end of file or grouped with similar functions)
3. Insert generated code
4. Add necessary imports
```

#### ADD_PATH

Add a new path constant.

```typescript
// Before
export const WORKSPACE_API_PATHS = {
  list: () => `/workspaces`,
  detail: (id: string) => `/workspaces/${id}`,
};

// After
export const WORKSPACE_API_PATHS = {
  list: () => `/workspaces`,
  detail: (id: string) => `/workspaces/${id}`,
  creditUsage: (id: string) => `/workspaces/${id}/credit-usage`,
};
```

**Algorithm:**
```
1. Find path constant object
2. Locate last entry before closing brace
3. Add comma if needed
4. Insert new path entry
```

#### ADD_HOOK

Add a new query/mutation hook.

```typescript
export const useWorkspaceCreditUsage = (workspaceId: string, options?: UseQueryOptions<CreditUsageResponse>) => {
  return useQuery({
    queryKey: workspaceKeys.creditUsage(workspaceId),
    queryFn: () => workspaceApi.getCreditUsage({ workspaceId }),
    ...options,
  });
};
```

**Algorithm:**
```
1. Use code-generator skill with hook pattern
2. Find appropriate insertion point
3. Insert generated hook
4. Preserve any existing customizations in the file
```

#### REMOVE_FIELD

Remove a field from an interface.

```typescript
// Before
interface User {
  id: string;
  legacyToken: string;  // ← Remove this
  name: string;
}

// After
interface User {
  id: string;
  name: string;
}
```

**Algorithm:**
```
1. Find field definition
2. Remove entire line including trailing comma/semicolon
3. Adjust formatting if needed
```

---

### rollback

Restore files from backup.

**Steps:**

1. **Read manifest**:
   ```
   manifest = read .openapi-sync.backup/manifest.json
   ```

2. **Verify backup integrity**:
   ```
   for each file in manifest.files:
     verify hash matches backup file
   ```

3. **Restore each file**:
   ```
   for each file in manifest.files:
     copy backup to original location
   ```

4. **Clean up**:
   ```
   remove .openapi-sync.backup/ directory
   ```

**Output:**
```
🚨 Migration failed! Rolling back...

  Restoring files...
  ✅ src/entities/project/model/project-types.ts
  ✅ src/entities/project/api/project-api.ts
  ✅ src/entities/user/model/user-types.ts

  Cleanup...
  ✅ Backup removed

All changes have been reverted. Your code is unchanged.
```

---

### verifyChanges

Verify applied changes are valid.

**Steps:**

1. **TypeScript type check**:
   ```
   Run: npx tsc --noEmit --skipLibCheck on affected files
   Check for type errors
   ```

2. **Import resolution**:
   ```
   For each modified file:
     Check all imports resolve correctly
     Check no circular dependencies introduced
   ```

3. **Syntax validation**:
   ```
   Parse each file to verify valid syntax
   ```

**Output on success:**
```
Verifying changes...
  ✅ TypeScript compilation: OK
  ✅ All imports resolved
  ✅ No syntax errors
```

**Output on failure:**
```
Verifying changes...
  ❌ TypeScript compilation failed

  Error in src/entities/user/model/user-types.ts:15
    Type 'string' is not assignable to type 'UserStatus'

  Rolling back changes...
```

---

## ALGORITHMS

### Change Ordering Algorithm

Changes must be applied in dependency order:

```
orderChanges(changes):
  // Build dependency graph
  graph = {}
  for each change in changes:
    deps = findDependencies(change)
    graph[change.id] = deps

  // Topological sort
  ordered = []
  visited = {}

  function visit(change):
    if visited[change.id] == 'processing':
      throw CircularDependencyError
    if visited[change.id] == 'done':
      return

    visited[change.id] = 'processing'
    for each dep in graph[change.id]:
      visit(dep)
    visited[change.id] = 'done'
    ordered.push(change)

  for each change in changes:
    visit(change)

  return ordered
```

### Safe Edit Algorithm

Apply edits without corrupting file:

```
safeEdit(file, edits):
  // Sort edits by position (reverse order for safe application)
  sortedEdits = edits.sort((a, b) => b.position - a.position)

  content = read(file)

  for each edit in sortedEdits:
    if edit.type == 'INSERT':
      content = content.slice(0, edit.position) +
                edit.content +
                content.slice(edit.position)
    elif edit.type == 'REPLACE':
      content = content.slice(0, edit.start) +
                edit.content +
                content.slice(edit.end)
    elif edit.type == 'DELETE':
      content = content.slice(0, edit.start) +
                content.slice(edit.end)

  write(file, content)
```

### Customization Preservation Algorithm

Preserve custom code blocks during migration:

```
preserveCustomizations(file, customizations, newContent):
  for each custom in customizations:
    if custom.file == file:
      // Find corresponding location in new content
      oldMarker = extractMarker(custom)
      newLocation = findLocation(newContent, oldMarker)

      if newLocation:
        // Insert preserved customization
        newContent = insertAt(newContent, newLocation, custom.content)
      else:
        // Cannot find location, add as comment
        newContent += "\n// @preserved - Could not auto-place:\n"
        newContent += "// " + custom.content

  return newContent
```

---

## DATA STRUCTURES

### BackupManifest

```typescript
interface BackupManifest {
  timestamp: string;
  specVersion: string;
  migrationId: string;
  files: BackupFile[];
}

interface BackupFile {
  original: string;
  backup: string;
  hash: string;
  size: number;
}
```

### ApplyResult

```typescript
interface ApplyResult {
  success: boolean;
  applied: AppliedChange[];
  failed: FailedChange[];
  skipped: SkippedChange[];
  verification: VerificationResult;
  rollbackPerformed: boolean;
}

interface AppliedChange {
  changeId: string;
  file: string;
  action: string;
  linesModified: number;
}

interface FailedChange {
  changeId: string;
  file: string;
  error: string;
  recoverable: boolean;
}

interface SkippedChange {
  changeId: string;
  reason: 'MANUAL' | 'USER_SKIP' | 'DEPENDENCY_FAILED';
}

interface VerificationResult {
  typescript: { passed: boolean; errors: string[] };
  imports: { passed: boolean; unresolved: string[] };
  syntax: { passed: boolean; errors: string[] };
}
```

---

## ERROR HANDLING

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Backup failed | E702 | Cannot create backup | Check disk space/permissions |
| Apply failed | E703 | Change application error | Auto-rollback triggered |
| Rollback failed | E704 | Cannot restore backup | Manual restoration needed |
| Verification failed | E706 | TypeScript/syntax error | Auto-rollback triggered |
| File locked | E707 | File being edited | Wait and retry |
| Parse error | E708 | Cannot parse file for edit | Skip file, report error |

### Error Recovery

```
On E702 (Backup failed):
  - Report error
  - Do not proceed with migration
  - Suggest checking disk space/permissions

On E703/E706 (Apply/Verify failed):
  - Trigger automatic rollback
  - Restore all files from backup
  - Report which change caused failure
  - Keep backup for debugging if --keep-backup

On E704 (Rollback failed):
  - CRITICAL: Report immediately
  - Provide manual restoration instructions:
    "Backup files are in .openapi-sync.backup/"
    "Manually copy files to restore"
  - Do not delete backup directory
```

---

## EXAMPLES

### Successful Migration

```
/oas:migrate

═══════════════════════════════════════════════════════════════════
  Applying Migration
═══════════════════════════════════════════════════════════════════

📦 Creating backup...
   ✅ Backed up 9 files

🔄 Applying changes...
   [1/8] ✅ project-types.ts
         + Added field: workspaceId: string
   [2/8] ✅ project-api.ts
         ~ Updated createProject signature
   [3/8] ✅ user-types.ts
         + Added type: UserStatus
   [4/8] ✅ user-types.ts
         ~ Changed status: string → UserStatus
   [5/8] ✅ workspace-api.ts
         + Added function: getCreditUsage
   [6/8] ✅ workspace-types.ts
         + Added type: CreditUsageResponse
   [7/8] ✅ workspace-queries.ts
         + Added hook: useWorkspaceCreditUsage
   [8/8] ✅ workspace-api-paths.ts
         + Added path: creditUsage

✔️ Verifying changes...
   ✅ TypeScript: OK
   ✅ Imports: OK
   ✅ Syntax: OK

🧹 Cleanup...
   ✅ Backup removed

═══════════════════════════════════════════════════════════════════
  Migration Complete: 8 changes applied
═══════════════════════════════════════════════════════════════════
```

### Failed Migration with Rollback

```
/oas:migrate

═══════════════════════════════════════════════════════════════════
  Applying Migration
═══════════════════════════════════════════════════════════════════

📦 Creating backup...
   ✅ Backed up 9 files

🔄 Applying changes...
   [1/8] ✅ project-types.ts
   [2/8] ✅ project-api.ts
   [3/8] ❌ user-types.ts

   Error: Cannot parse file at line 45
   Unexpected token 'export' after incomplete type definition

🚨 Migration failed! Initiating rollback...

🔙 Rolling back...
   ✅ Restored project-types.ts
   ✅ Restored project-api.ts
   ✅ user-types.ts (unchanged)

🧹 Cleanup...
   ⚠️ Backup kept for debugging: .openapi-sync.backup/

═══════════════════════════════════════════════════════════════════
  Migration Failed: Rolled back 2 changes
═══════════════════════════════════════════════════════════════════

Error Details:
  File: src/entities/user/model/user-types.ts
  Line: 45
  Issue: Syntax error in source file

Suggestions:
  1. Fix syntax error in user-types.ts manually
  2. Re-run /oas:migrate
  3. Or use /oas:migrate --skip-file=user-types.ts
```
