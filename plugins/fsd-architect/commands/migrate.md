---
description: Migrate existing project to FSD architecture
---

# /fsdarch:migrate

기존 프로젝트를 FSD 아키텍처로 마이그레이션하는 분석 및 가이드를 제공합니다.

## Prerequisites

- 프로젝트 루트 디렉토리에서 실행
- 기존 소스 코드 존재
- (권장) `/fsdarch:init` 실행 완료

---

## EXECUTION INSTRUCTIONS

When `/fsdarch:migrate` is invoked, Claude MUST perform these steps in order:

1. **Analyze current structure** - Scan existing project directories
2. **Classify modules** - Categorize code into FSD layers
3. **Detect dependencies** - Map imports between modules
4. **Generate migration plan** - Create phased migration guide
5. **Output report** - Display analysis and recommendations

---

## Flow Overview

```
┌───────────────────────────────────────────────────────────────┐
│                      /fsdarch:migrate                          │
├───────────────────────────────────────────────────────────────┤
│  Step 1. Analyze current structure                             │
│     ├─ Find source directory                                   │
│     ├─ Load layerAliases from config (if exists)               │
│     ├─ List all directories and files                          │
│     └─ Categorize by common patterns                           │
│                                                               │
│  Step 2. Classify modules into FSD layers                      │
│     ├─ components/* → shared/ui, widgets, features             │
│     ├─ hooks/* → features/model, entities/model                │
│     ├─ utils/* → shared/lib                                    │
│     ├─ services/* → shared/api, entities/api                   │
│     └─ pages/* → pages layer                                   │
│                                                               │
│  Step 3. Detect dependencies                                   │
│     ├─ Parse import statements                                 │
│     ├─ Build dependency graph                                  │
│     └─ Identify circular dependencies                          │
│                                                               │
│  Step 3.5. Apply layer aliases (if configured)                 │
│     └─ Resolve target paths: app→core, pages→views, etc.       │
│                                                               │
│  Step 4. Generate migration plan (with aliased paths)          │
│     ├─ Phase 1: Create FSD structure                           │
│     ├─ Phase 2: Migrate shared layer                           │
│     ├─ Phase 3: Migrate entities                               │
│     ├─ Phase 4: Migrate features                               │
│     ├─ Phase 5: Migrate widgets                                │
│     ├─ Phase 6: Migrate pages                                  │
│     └─ Phase 7: Cleanup                                        │
│                                                               │
│  Step 5. Output migration report                               │
│     ├─ Structure analysis                                      │
│     ├─ Layer distribution                                      │
│     ├─ Risk assessment                                         │
│     └─ Recommendations                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Step 1: Analyze Current Structure

**Action:** Scan existing project structure

```
1. Determine source directory and layer configuration:
   → Read from .fsd-architect.json if exists
     - Extract srcDir
     - Extract layerAliases (if configured)
     - **SECURITY: Validate layerAliases immediately**
       → Call validateLayerAliases(layerAliases) from Step 3.5
       → If invalid → Display errors and STOP migration
       → If valid → Continue
   → Otherwise check src/, app/, lib/
   → Ask user if not found

   Example config with layerAliases (Next.js):
   {
     "srcDir": "src",
     "layerAliases": {
       "app": "core",      // FSD app → src/core/
       "pages": "views"    // FSD pages → src/views/
     }
   }

2. List all directories in source:
   → Use Glob to find first-level directories
   → Count files in each directory

3. Categorize directories by common patterns:
   → components/ → UI components
   → pages/, views/, screens/ → Route components
   → hooks/ → Custom React hooks
   → utils/, helpers/, lib/ → Utility functions
   → services/, api/ → API functions
   → store/, state/, redux/ → State management
   → types/, interfaces/ → Type definitions
   → assets/, images/, icons/ → Static assets
   → styles/, css/ → Style files
```

**Glob commands:**
```bash
# List first-level directories
Glob: "{srcDir}/*/"

# Count files per directory
Glob: "{srcDir}/components/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/hooks/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/utils/**/*.{ts,tsx,js,jsx}"
# ... etc
```

**Directory classification logic:**
```typescript
interface DirectoryInfo {
  name: string;
  path: string;
  fileCount: number;
  category: 'components' | 'pages' | 'hooks' | 'utils' | 'services' | 'store' | 'types' | 'assets' | 'styles' | 'other';
  suggestedFsdLayer: FsdLayer;
}

const DIRECTORY_PATTERNS: Record<string, { category: string; suggestedLayers: FsdLayer[] }> = {
  'components': { category: 'components', suggestedLayers: ['shared', 'features', 'widgets'] },
  'ui': { category: 'components', suggestedLayers: ['shared'] },
  'common': { category: 'components', suggestedLayers: ['shared'] },
  'pages': { category: 'pages', suggestedLayers: ['pages'] },
  'views': { category: 'pages', suggestedLayers: ['pages'] },
  'screens': { category: 'pages', suggestedLayers: ['pages'] },
  'hooks': { category: 'hooks', suggestedLayers: ['features', 'entities'] },
  'utils': { category: 'utils', suggestedLayers: ['shared'] },
  'helpers': { category: 'utils', suggestedLayers: ['shared'] },
  'lib': { category: 'utils', suggestedLayers: ['shared'] },
  'services': { category: 'services', suggestedLayers: ['shared', 'entities'] },
  'api': { category: 'services', suggestedLayers: ['shared', 'entities'] },
  'store': { category: 'store', suggestedLayers: ['features', 'entities'] },
  'redux': { category: 'store', suggestedLayers: ['features', 'entities'] },
  'state': { category: 'store', suggestedLayers: ['features', 'entities'] },
  'types': { category: 'types', suggestedLayers: ['shared'] },
  'interfaces': { category: 'types', suggestedLayers: ['shared'] },
  'models': { category: 'types', suggestedLayers: ['entities'] },
};
```

### Step 2: Classify Modules

**Action:** Analyze each file/module and suggest FSD layer placement

```
1. For each directory found in Step 1:
   → Analyze file contents
   → Detect if it's a domain entity or feature
   → Suggest appropriate FSD layer

2. Classification rules:
   → UI components with no business logic → shared/ui
   → Domain-specific UI → features/{domain}/ui or widgets
   → Data fetching hooks → entities/{domain}/api or features/{domain}/api
   → Business logic hooks → features/{domain}/model
   → Generic utilities → shared/lib
   → Type definitions → shared/types or entities/{domain}/model
```

**Classification heuristics:**
```typescript
interface ModuleClassification {
  currentPath: string;
  suggestedLayer: 'shared' | 'entities' | 'features' | 'widgets' | 'pages' | 'app';
  suggestedSlice?: string;  // For sliced layers
  suggestedSegment?: 'ui' | 'model' | 'api' | 'lib';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  dependencies: string[];
}

// Classification rules
const classifyModule = (filePath: string, content: string): ModuleClassification => {
  // Rule 1: Generic UI components → shared/ui
  if (filePath.includes('/components/ui/') ||
      filePath.includes('/components/common/') ||
      isGenericComponent(content)) {
    return {
      suggestedLayer: 'shared',
      suggestedSegment: 'ui',
      confidence: 'high',
      reason: 'Generic UI component without business logic'
    };
  }

  // Rule 2: Domain-specific components → feature or entity
  const domain = detectDomain(filePath, content);
  if (domain && hasBusinessLogic(content)) {
    return {
      suggestedLayer: 'features',
      suggestedSlice: domain,
      suggestedSegment: 'ui',
      confidence: 'medium',
      reason: `Domain-specific component for ${domain}`
    };
  }

  // Rule 3: API/service files → shared/api or entity/api
  if (filePath.includes('/api/') || filePath.includes('/services/')) {
    const domain = detectDomainFromApi(content);
    if (domain) {
      return {
        suggestedLayer: 'entities',
        suggestedSlice: domain,
        suggestedSegment: 'api',
        confidence: 'medium',
        reason: `Domain-specific API for ${domain}`
      };
    }
    return {
      suggestedLayer: 'shared',
      suggestedSegment: 'api',
      confidence: 'high',
      reason: 'Generic API utilities'
    };
  }

  // Rule 4: Hooks with state → features or entities model
  if (filePath.includes('/hooks/')) {
    const domain = detectDomainFromHook(content);
    return {
      suggestedLayer: domain ? 'features' : 'shared',
      suggestedSlice: domain,
      suggestedSegment: 'model',
      confidence: domain ? 'medium' : 'low',
      reason: domain ? `Domain hook for ${domain}` : 'Generic hook'
    };
  }

  // Rule 5: Utils → shared/lib
  if (filePath.includes('/utils/') || filePath.includes('/helpers/')) {
    return {
      suggestedLayer: 'shared',
      suggestedSegment: 'lib',
      confidence: 'high',
      reason: 'Utility functions'
    };
  }

  // Default
  return {
    suggestedLayer: 'shared',
    confidence: 'low',
    reason: 'Could not determine specific layer'
  };
};
```

**Domain detection patterns:**
```typescript
// Detect domain from file path and content
function detectDomain(filePath: string, content: string): string | null {
  // Common domain patterns in file paths
  const domainPatterns = [
    /components\/(\w+)\//,      // components/auth/
    /features\/(\w+)\//,        // features/cart/
    /modules\/(\w+)\//,         // modules/user/
    /domains\/(\w+)\//,         // domains/order/
  ];

  for (const pattern of domainPatterns) {
    const match = filePath.match(pattern);
    if (match) return match[1].toLowerCase();
  }

  // Detect from content (hook names, component names)
  const hookMatch = content.match(/use(\w+)/);
  if (hookMatch) {
    const hookName = hookMatch[1].toLowerCase();
    if (['auth', 'user', 'cart', 'order', 'product', 'payment'].includes(hookName)) {
      return hookName;
    }
  }

  return null;
}
```

### Step 3: Detect Dependencies

**Action:** Analyze import statements to build dependency graph

```
1. For each file:
   → Extract all import statements
   → Resolve relative and alias imports
   → Build dependency map

2. Identify potential issues:
   → Circular dependencies
   → Cross-cutting concerns
   → Tightly coupled modules
```

**Grep commands for import analysis:**
```bash
# Find all imports in TypeScript/JavaScript files
Grep: "^import .* from" in {srcDir}/**/*.{ts,tsx,js,jsx}
Grep: "require\\(" in {srcDir}/**/*.{ts,tsx,js,jsx}
```

**Dependency analysis:**
```typescript
interface DependencyGraph {
  nodes: Map<string, ModuleNode>;
  edges: DependencyEdge[];
  cycles: string[][];
}

interface ModuleNode {
  path: string;
  imports: string[];
  importedBy: string[];
}

interface DependencyEdge {
  from: string;
  to: string;
  importType: 'named' | 'default' | 'namespace';
}

function detectCircularDependencies(graph: DependencyGraph): string[][] {
  // Tarjan's algorithm for strongly connected components
  // Returns array of cycles (each cycle is array of file paths)
}
```

### Step 3.5: Apply Layer Aliases (if configured)

**Action:** Validate and resolve actual directory paths using layerAliases

**SECURITY: Validate layerAliases values (CRITICAL)**

Before using layerAliases from config, validate each alias value:

```typescript
function validateLayerAlias(aliasValue: string): { valid: boolean; error?: string } {
  // 1. Path traversal prevention
  if (aliasValue.includes('..')) {
    return { valid: false, error: 'E108: Alias contains ".." (directory traversal blocked)' };
  }

  // 2. Path separator prevention (must be single directory name)
  if (aliasValue.includes('/') || aliasValue.includes('\\')) {
    return { valid: false, error: 'E110: Alias contains path separators' };
  }

  // 3. Hidden directory prevention
  if (aliasValue.startsWith('.')) {
    return { valid: false, error: 'E111: Hidden directory alias not allowed' };
  }

  // 4. Forbidden characters
  if (/[<>:"|?*]/.test(aliasValue)) {
    return { valid: false, error: 'E110: Alias contains forbidden characters' };
  }

  return { valid: true };
}

// Validate all aliases before use
function validateLayerAliases(aliases: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [layer, alias] of Object.entries(aliases)) {
    const result = validateLayerAlias(alias);
    if (!result.valid) {
      errors.push(`${layer}: ${result.error}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
```

**Validation Flow:**
```
1. Load layerAliases from .fsd-architect.json
2. Run validateLayerAliases()
3. If invalid → Display errors and stop migration
4. If valid → Continue with path resolution
```

**Utility Functions:**

```typescript
/**
 * Get the actual directory name for an FSD layer.
 * Applies layerAliases from config if present.
 *
 * @example
 * // Standard project (no aliases)
 * getLayerDir('app', {}) // → 'app'
 *
 * // Next.js project (with aliases)
 * getLayerDir('app', { app: 'core', pages: 'views' }) // → 'core'
 * getLayerDir('pages', { app: 'core', pages: 'views' }) // → 'views'
 */
function getLayerDir(layer: string, layerAliases: Record<string, string>): string {
  return layerAliases[layer] ?? layer;
}

/**
 * Generate migration target path with layer aliases applied.
 */
function getMigrationTargetPath(
  srcDir: string,
  layer: string,
  segment: string,
  layerAliases: Record<string, string>
): string {
  const layerDir = getLayerDir(layer, layerAliases);
  return `${srcDir}/${layerDir}/${segment}`;
}
```

**Example path resolution:**

| Layer | No Aliases | With Aliases (app→core, pages→views) |
|-------|------------|--------------------------------------|
| app | src/app/ | src/core/ |
| pages | src/pages/ | src/views/ |
| features | src/features/ | src/features/ |
| shared | src/shared/ | src/shared/ |

### Step 4: Generate Migration Plan

**Action:** Create phased migration plan based on analysis

**IMPORTANT:** All target paths must use resolved layer directories (with aliases applied).

**Required:** Call `getMigrationTargetPath()` for all target paths:

```typescript
// Example: Generate target paths for Phase 2
const layerAliases = config.layerAliases ?? {};
const srcDir = config.srcDir;

// Use utility functions (from Step 3.5)
const sharedLibPath = getMigrationTargetPath(srcDir, 'shared', 'lib', layerAliases);
const sharedTypesPath = getMigrationTargetPath(srcDir, 'shared', 'types', layerAliases);
const sharedUiPath = getMigrationTargetPath(srcDir, 'shared', 'ui', layerAliases);

// Example output with aliases { pages: 'views' }:
// sharedLibPath = 'src/shared/lib'
// getMigrationTargetPath('src', 'pages', 'home', { pages: 'views' }) = 'src/views/home'
```

**Migration Phases:**

**REQUIRED:** All target paths MUST be computed using `getMigrationTargetPath()` - never hardcode paths.

```
Phase 1: Create FSD Structure (Non-breaking)
  For each layer in [shared, entities, features, widgets, pages, app]:
    targetDir = getLayerDir(layer, layerAliases)
    mkdir(srcDir + '/' + targetDir)
  - Set up path aliases in tsconfig.json
  - No file moves yet

Phase 2: Migrate shared Layer (Safest)
  - Move utils/ → getMigrationTargetPath(srcDir, 'shared', 'lib', layerAliases)
  - Move types/ → getMigrationTargetPath(srcDir, 'shared', 'types', layerAliases)
  - Move generic UI → getMigrationTargetPath(srcDir, 'shared', 'ui', layerAliases)
  - Update imports to use new paths

Phase 3: Migrate entities Layer
  For each entity (user, product, order, etc.):
    slicePath = getMigrationTargetPath(srcDir, 'entities', entityName, layerAliases)
    mkdir(slicePath)
    - Move related types → slicePath + '/model/types.ts'
    - Move API calls → slicePath + '/api/'
    - Move models → slicePath + '/model/'
  - Update imports

Phase 4: Migrate features Layer
  For each feature (auth, cart, checkout, etc.):
    slicePath = getMigrationTargetPath(srcDir, 'features', featureName, layerAliases)
    mkdir(slicePath)
    - Move hooks → slicePath + '/model/'
    - Move components → slicePath + '/ui/'
    - Move API calls → slicePath + '/api/'
  - Update imports

Phase 5: Migrate widgets Layer
  For each widget (header, sidebar, footer, etc.):
    slicePath = getMigrationTargetPath(srcDir, 'widgets', widgetName, layerAliases)
    mkdir(slicePath)
    - Move composite components → slicePath + '/ui/'
  - Update imports

Phase 6: Migrate pages Layer
  For each page (home, profile, settings, etc.):
    slicePath = getMigrationTargetPath(srcDir, 'pages', pageName, layerAliases)
    mkdir(slicePath)
    - Move route components → slicePath + '/ui/'
  - Ensure pages only compose from lower layers
  - Update imports

Phase 7: Cleanup
  - Remove empty old directories
  - Final import verification
  - Run linter/tests
```

**Migration file mapping:**
```typescript
interface MigrationPlan {
  phases: MigrationPhase[];
  totalFiles: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  risks: Risk[];
}

interface MigrationPhase {
  number: number;
  name: string;
  description: string;
  files: FileMigration[];
  breaking: boolean;
}

interface FileMigration {
  currentPath: string;
  targetPath: string;
  importUpdates: ImportUpdate[];
}

interface ImportUpdate {
  file: string;
  oldImport: string;
  newImport: string;
}
```

### Step 5: Output Migration Report

**Template:**
```
═══════════════════════════════════════════════════════════════
                    FSD MIGRATION ANALYSIS
═══════════════════════════════════════════════════════════════

📊 Current Structure Analysis:
   • Source directory: {srcDir}
   • Total files: {fileCount}
   • Directories analyzed: {dirCount}
   • Components: {componentCount}
   • Hooks: {hookCount}
   • Utils: {utilCount}
   • Services: {serviceCount}

📦 Suggested Layer Distribution:
   (Layer names shown with aliases applied, if configured)

   ┌─────────────┬───────────┬────────────────────────────────┐
   │ Target Dir  │ Files     │ From                           │
   ├─────────────┼───────────┼────────────────────────────────┤
   │ {shared}/   │ {count}   │ utils/, types/, common/        │
   │ {entities}/ │ {count}   │ models/, services/{domain}     │
   │ {features}/ │ {count}   │ hooks/, components/{domain}    │
   │ {widgets}/  │ {count}   │ components/layouts, composite  │
   │ {pages}/    │ {count}   │ pages/, views/                 │
   │ {app}/      │ {count}   │ App.tsx, providers/            │
   └─────────────┴───────────┴────────────────────────────────┘

   ℹ️  Layer Aliases: {layerAliases ? 'app→'+layerAliases.app+', pages→'+layerAliases.pages : 'None (standard FSD names)'}

🔄 Migration Phases:
   Phase 1: Create structure     │ 0 file moves     │ Safe
   Phase 2: shared layer         │ {count} files    │ Safe
   Phase 3: entities layer       │ {count} files    │ Low risk
   Phase 4: features layer       │ {count} files    │ Medium risk
   Phase 5: widgets layer        │ {count} files    │ Low risk
   Phase 6: pages layer          │ {count} files    │ Low risk
   Phase 7: Cleanup              │ 0 file moves     │ Safe

⚠️  Potential Issues Detected:
   {for each issue}
   • {issueType}: {description}
     Location: {files}
     Recommendation: {action}

🎯 Identified Domains:
   {for each domain}
   • {domainName}
     Files: {fileCount}
     Suggested slices: {slices}

💡 Recommendations:
   1. Run /fsdarch:init first to create configuration
   2. Start with Phase 1-2 (non-breaking changes)
   3. Migrate one feature at a time in Phase 4
   4. Run tests after each phase
   5. Consider creating /fsdarch:validate to check violations

📋 Estimated Effort: {effort}
   • Low: < 2 hours (small project, clear structure)
   • Medium: 2-8 hours (medium project, some refactoring)
   • High: > 8 hours (large project, significant restructuring)

═══════════════════════════════════════════════════════════════
```

### Step 6: Interactive Options (Optional)

**AskUserQuestion:**
```
question: "What would you like to do next?"
header: "Next Steps"
options:
  - label: "Start Phase 1: Create FSD structure"
    description: "Create layer directories without moving files"
  - label: "View detailed file mapping"
    description: "Show exactly which files go where"
  - label: "Export plan to migration-plan.md"
    description: "Save detailed migration plan to file"
  - label: "Run /fsdarch:init first"
    description: "Initialize FSD configuration before migration"
```

**If "Start Phase 1" selected:**
```
Creating FSD structure...

Created directories:
  ✓ src/shared/
  ✓ src/shared/ui/
  ✓ src/shared/lib/
  ✓ src/shared/api/
  ✓ src/shared/types/
  ✓ src/entities/
  ✓ src/features/
  ✓ src/widgets/
  ✓ src/pages/
  ✓ src/app/

Added .gitkeep files to empty directories.

Ready for Phase 2. Run: /fsdarch:migrate --phase 2
```

**If "View detailed file mapping" selected:**
```
Detailed File Mapping:

shared/lib/ (from utils/)
  • utils/formatDate.ts → shared/lib/format-date.ts
  • utils/validators.ts → shared/lib/validators.ts
  • helpers/storage.ts → shared/lib/storage.ts

shared/ui/ (from components/common/)
  • components/common/Button.tsx → shared/ui/Button/Button.tsx
  • components/common/Input.tsx → shared/ui/Input/Input.tsx
  • components/common/Modal.tsx → shared/ui/Modal/Modal.tsx

entities/user/ (new slice)
  • services/userService.ts → entities/user/api/userApi.ts
  • types/User.ts → entities/user/model/types.ts
  • hooks/useUser.ts → entities/user/model/useUser.ts

features/auth/ (new slice)
  • components/auth/LoginForm.tsx → features/auth/ui/LoginForm.tsx
  • hooks/useAuth.ts → features/auth/model/useAuth.ts
  • services/authService.ts → features/auth/api/authApi.ts

... (continues for all files)
```

---

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--dry-run` | 변경 없이 분석만 수행 | `/fsdarch:migrate --dry-run` |
| `--phase <n>` | 특정 단계만 실행 | `/fsdarch:migrate --phase 2` |
| `--export` | 마이그레이션 계획을 파일로 저장 | `/fsdarch:migrate --export` |
| `--detailed` | 상세 파일 매핑 출력 | `/fsdarch:migrate --detailed` |

---

## Error Handling

### No Source Directory

```
[E101] Source directory not found

Cannot find source directory for migration analysis.

Solutions:
  1. Run /fsdarch:init first
  2. Specify source: /fsdarch:migrate --src <path>
```

### No Files Found

```
[W001] No files to migrate

The source directory appears empty or contains no TypeScript/JavaScript files.

This could mean:
  • Wrong source directory specified
  • Project uses different file extensions
  • FSD structure already in place
```

### Config Missing

```
[E104] Configuration not found

.fsd-architect.json is required for accurate migration.

Solution: Run /fsdarch:init first, then /fsdarch:migrate
```

---

## Examples

### Example 1: Analysis Only (Default)

```
/fsdarch:migrate

> Analyzing src/...
> Found 156 files in 23 directories
> Detected 5 potential domains: auth, user, product, cart, order
> Classification complete

[Migration Report displayed]
```

### Example 2: Dry Run with Details

```
/fsdarch:migrate --dry-run --detailed

> Analyzing src/...
> [Detailed file mapping displayed]
> No changes made (dry-run mode)
```

### Example 3: Execute Phase 1

```
/fsdarch:migrate --phase 1

> Creating FSD structure...
> Created 10 directories
> Ready for Phase 2
```

### Example 4: Export Plan

```
/fsdarch:migrate --export

> Analyzing src/...
> Migration plan exported to: migration-plan.md
```
