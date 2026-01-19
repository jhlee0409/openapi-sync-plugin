---
name: import-tracker
description: Track import dependencies across the entire project
---

# Import Tracker

Tracks and analyzes import dependencies across the entire project.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST:

1. Scan all TypeScript/JavaScript files
2. Parse import/export statements
3. Build dependency graph
4. Provide query interface for usage analysis

---

## Operations

### buildGraph

Build import graph for entire project.

**Steps:**

1. **File scan**
   ```
   patterns:
     - src/**/*.ts
     - src/**/*.tsx
     - src/**/*.js
     - src/**/*.jsx

   exclude:
     - node_modules/
     - dist/
     - .next/
     - *.test.ts
     - *.spec.ts
   ```

2. **Extract from each file:**

   **Import statement parsing:**
   ```typescript
   // Named imports
   import { UserProfile, getUser } from '@/entities/user'
   → imports: [
       { name: 'UserProfile', from: '@/entities/user', type: 'named' },
       { name: 'getUser', from: '@/entities/user', type: 'named' }
     ]

   // Default import
   import userApi from '@/entities/user/api'
   → imports: [
       { name: 'default', alias: 'userApi', from: '@/entities/user/api', type: 'default' }
     ]

   // Namespace import
   import * as userTypes from '@/entities/user/model/types'
   → imports: [
       { name: '*', alias: 'userTypes', from: '@/entities/user/model/types', type: 'namespace' }
     ]

   // Type-only import
   import type { User } from '@/entities/user'
   → imports: [
       { name: 'User', from: '@/entities/user', type: 'type-only' }
     ]
   ```

   **Export statement parsing:**
   ```typescript
   // Named export
   export const getUser = () => {}
   → exports: [{ name: 'getUser', type: 'function' }]

   // Type export
   export interface UserProfile {}
   → exports: [{ name: 'UserProfile', type: 'interface' }]

   // Re-export
   export { getUser } from './user-api'
   → reexports: [{ name: 'getUser', from: './user-api' }]

   // Default export
   export default userApi
   → exports: [{ name: 'default', localName: 'userApi' }]
   ```

3. **Path resolution:**
   ```
   Resolve import paths:

   '@/entities/user'
   → Check tsconfig paths
   → 'src/entities/user/index.ts' or
   → 'src/entities/user/index.tsx'

   './user-api'
   → Resolve relative path
   → Based on current directory

   'react-query'
   → node_modules (ignore)
   ```

4. **Build graph:**
   ```
   Graph structure:
   {
     nodes: Map<filePath, FileNode>,
     edges: {
       imports: Map<filePath, ImportEdge[]>,  // A imports from B
       exports: Map<filePath, ExportEdge[]>   // A is imported by B
     }
   }
   ```

---

### findUsages

Find all usages of a specific export.

**Input:**
```typescript
findUsages({
  name: "UserProfile",
  file: "src/entities/user/model/user-types.ts"
})
```

**Algorithm:**
```
1. Check export in target file
2. Traverse all files that import this file
3. Check if the name is used in import statement
4. Trace re-export chains (barrel files)
5. Search actual usage locations in code

Example:
src/entities/user/model/user-types.ts
  └── exports: UserProfile

src/entities/user/index.ts
  └── re-exports: UserProfile from './model/user-types'

src/features/profile/ui/ProfileCard.tsx
  └── imports: UserProfile from '@/entities/user'
  └── usages: line 15, 28, 42

src/pages/settings/index.tsx
  └── imports: UserProfile from '@/entities/user'
  └── usages: line 8
```

**Output:**
```typescript
{
  export: {
    name: "UserProfile",
    file: "src/entities/user/model/user-types.ts",
    line: 12,
    type: "interface"
  },
  usages: [
    {
      file: "src/entities/user/api/user-api.ts",
      importLine: 3,
      usageLines: [15, 28],
      importType: "type-only"
    },
    {
      file: "src/features/profile/ui/ProfileCard.tsx",
      importLine: 8,
      usageLines: [15, 28, 42],
      importType: "named"
    },
    {
      file: "src/pages/settings/index.tsx",
      importLine: 5,
      usageLines: [8],
      importType: "named"
    }
  ],
  reexportChain: [
    "src/entities/user/model/user-types.ts",
    "src/entities/user/model/index.ts",
    "src/entities/user/index.ts"
  ],
  totalUsages: 6,
  totalFiles: 3
}
```

---

### analyzeImpact

Analyze affected files when making changes.

**Input:**
```typescript
analyzeImpact({
  file: "src/entities/user/model/user-types.ts",
  changes: [
    { type: "rename", from: "UserProfile", to: "UserInfo" },
    { type: "add", name: "workspaceId", to: "CreateUserRequest" }
  ]
})
```

**Output:**
```typescript
{
  directImpact: [
    {
      file: "src/entities/user/api/user-api.ts",
      reason: "imports UserProfile",
      action: "UPDATE_IMPORT",
      changes: ["line 3: UserProfile → UserInfo"]
    }
  ],
  indirectImpact: [
    {
      file: "src/features/profile/ui/ProfileCard.tsx",
      reason: "imports via barrel",
      action: "UPDATE_IMPORT",
      changes: ["line 8: UserProfile → UserInfo"]
    },
    {
      file: "src/pages/settings/index.tsx",
      reason: "imports UserProfile",
      action: "UPDATE_IMPORT",
      changes: ["line 5: UserProfile → UserInfo"]
    }
  ],
  breakingChanges: [
    {
      file: "src/features/user/ui/CreateUserModal.tsx",
      reason: "uses CreateUserRequest",
      issue: "Missing required field: workspaceId",
      action: "MANUAL_FIX_REQUIRED"
    }
  ],
  summary: {
    totalFiles: 4,
    autoFixable: 3,
    manualFix: 1
  }
}
```

---

### findCircularDeps

Detect circular dependencies.

**Algorithm:**
```
DFS with cycle detection:

visited = {}
stack = []

function detectCycle(file):
  if file in stack:
    return stack.slice(stack.indexOf(file))  // cycle found
  if file in visited:
    return null

  visited[file] = true
  stack.push(file)

  for each import in file.imports:
    cycle = detectCycle(import.resolvedPath)
    if cycle:
      return cycle

  stack.pop()
  return null
```

**Output:**
```
Circular dependencies detected:

1. src/entities/user/api/user-api.ts
   → src/entities/user/model/user-types.ts
   → src/entities/user/api/user-api.ts

2. src/features/auth/api/auth-api.ts
   → src/entities/user/api/user-api.ts
   → src/features/auth/api/auth-api.ts
```

---

## DATA STRUCTURES

### ImportGraph

```typescript
interface ImportGraph {
  files: Map<string, FileNode>;
  version: string;
  buildTime: string;
}

interface FileNode {
  path: string;
  imports: ImportStatement[];
  exports: ExportStatement[];
  reexports: ReexportStatement[];
}

interface ImportStatement {
  names: ImportedName[];
  from: string;
  resolvedPath: string;
  line: number;
  isTypeOnly: boolean;
}

interface ImportedName {
  name: string;        // original name
  alias?: string;      // renamed via as
  type: 'named' | 'default' | 'namespace';
}

interface ExportStatement {
  name: string;
  localName?: string;  // x in export { x as y }
  type: 'function' | 'const' | 'class' | 'interface' | 'type' | 'enum';
  line: number;
  isDefault: boolean;
  isTypeOnly: boolean;
}

interface ReexportStatement {
  names: string[];     // export { a, b } from './x'
  from: string;
  resolvedPath: string;
  line: number;
  isAll: boolean;      // export * from './x'
}
```

### UsageResult

```typescript
interface UsageResult {
  export: {
    name: string;
    file: string;
    line: number;
    type: string;
  };
  usages: Usage[];
  reexportChain: string[];
  totalUsages: number;
  totalFiles: number;
}

interface Usage {
  file: string;
  importLine: number;
  usageLines: number[];
  importType: 'named' | 'default' | 'namespace' | 'type-only';
  context: 'type-annotation' | 'value' | 'both';
}
```

---

## ALGORITHMS

### Path Resolution

```typescript
resolvePath(importPath: string, fromFile: string): string {
  // 1. Check absolute path alias
  if (importPath.startsWith('@/')) {
    const tsconfig = loadTsConfig();
    const alias = tsconfig.compilerOptions.paths['@/*'];
    return importPath.replace('@/', alias[0].replace('*', ''));
  }

  // 2. Relative path
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const dir = dirname(fromFile);
    return resolve(dir, importPath);
  }

  // 3. node_modules
  return null; // ignore external packages
}

// Extension inference
resolveFile(basePath: string): string {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    if (exists(basePath + ext)) {
      return basePath + ext;
    }
  }
  return null;
}
```

### Usage Detection in Code

```typescript
findUsagesInCode(code: string, name: string): number[] {
  const lines: number[] = [];
  const regex = new RegExp(`\\b${name}\\b`, 'g');

  code.split('\n').forEach((line, index) => {
    // exclude import statements
    if (line.trim().startsWith('import')) return;

    if (regex.test(line)) {
      lines.push(index + 1);
    }
  });

  return lines;
}
```

---

## ERROR HANDLING

| Error | Code | Description | Recovery |
|-------|------|-------------|----------|
| Path resolution failed | E901 | Failed to resolve import path | Warn and skip |
| Circular dependency | W901 | Circular reference detected | Output warning, continue |
| Parse error | E902 | Failed to parse file | Skip file |
| tsconfig not found | E903 | tsconfig.json missing | Use default paths |

---

## OUTPUT EXAMPLES

### Usage Search

```
Finding usages of UserProfile...

📍 Export location:
   src/entities/user/model/user-types.ts:12

📦 Re-export chain:
   → src/entities/user/model/index.ts
   → src/entities/user/index.ts

📊 Usage summary:
   Total files: 8
   Total usages: 23

┌─────────────────────────────────────────────────────────────┐
│ File                                      │ Lines           │
├─────────────────────────────────────────────────────────────┤
│ src/entities/user/api/user-api.ts         │ 15, 28         │
│ src/features/profile/ui/ProfileCard.tsx   │ 15, 28, 42     │
│ src/features/settings/ui/SettingsForm.tsx │ 8, 19, 31      │
│ src/pages/profile/index.tsx               │ 12             │
│ src/pages/settings/index.tsx              │ 8              │
│ ...                                       │                │
└─────────────────────────────────────────────────────────────┘
```

### Impact Analysis

```
Analyzing impact of renaming UserProfile → UserInfo...

📊 Impact Summary:
   Direct impact: 2 files
   Indirect impact: 6 files
   Manual fix needed: 1 file

🔧 Auto-fixable changes (8 files):
   • Update import statements
   • Update type annotations
   • Update variable declarations

⚠️ Manual fix required (1 file):
   src/features/user/ui/CreateUserModal.tsx:45
   Reason: Spread operator usage needs review
```
