---
description: Initialize FSD architecture analysis and configuration
---

# /fsdarch:init

프로젝트의 FSD 구조를 분석하고 설정 파일을 생성합니다.

## Prerequisites

- 프로젝트 루트 디렉토리에서 실행
- `src/` 또는 유사한 소스 디렉토리 존재

---

## EXECUTION INSTRUCTIONS

When `/fsdarch:init` is invoked, Claude MUST perform these steps in order:

1. **Check existing config** - Verify `.fsd-architect.json` doesn't exist (unless --force)
2. **Detect source directory** - Find src/, app/, lib/, or ask user
3. **Use skill: layer-detector** - Scan for FSD layer directories
4. **Analyze patterns** - Detect naming, segments, import aliases
5. **Generate config** - Write `.fsd-architect.json`
6. **Security check** - Verify .gitignore includes cache files
7. **Report summary** - Show detected structure and next steps

---

## Flow Overview

```
┌───────────────────────────────────────────────────────────────┐
│                       /fsdarch:init                           │
├───────────────────────────────────────────────────────────────┤
│  1. Check if .fsd-architect.json exists                       │
│     ├─ Exists + no --force → Error E103                       │
│     └─ Not exists OR --force → Continue                       │
│                                                               │
│  2. Detect source directory                                   │
│     ├─ Check src/, app/, lib/ in order                        │
│     ├─ If found → Use it                                      │
│     └─ If not found → Ask user (AskUserQuestion)              │
│                                                               │
│  3. Invoke skill: layer-detector                              │
│     ├─ Scan for FSD layers in srcDir                          │
│     ├─ If layers found → Continue to step 4                   │
│     └─ If no layers → Ask "Create new FSD structure?"         │
│                                                               │
│  4. Analyze existing patterns (if code exists)                │
│     ├─ Naming convention (kebab-case/camelCase/PascalCase)    │
│     ├─ Segment usage (ui/, model/, api/, lib/)                │
│     ├─ Index file patterns                                    │
│     └─ Import aliases from tsconfig.json                      │
│                                                               │
│  5. Generate .fsd-architect.json                              │
│                                                               │
│  6. Check .gitignore for cache files                          │
│                                                               │
│  7. Display summary and next steps                            │
└───────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Step 0: Check Existing Configuration

**Action:** Check if `.fsd-architect.json` already exists

```
1. Use Glob to check for .fsd-architect.json in project root
2. If found AND --force flag NOT provided:
   → Display error E103 and stop
3. If found AND --force flag provided:
   → Continue (will overwrite)
4. If not found:
   → Continue
```

**Output if exists:**
```
[E103] Configuration already exists

.fsd-architect.json already exists.
Use --force to overwrite:
  /fsdarch:init --force
```

### Step 1: Detect Source Directory

**Action:** Find the source directory containing FSD structure

```
1. Use Glob to check directories in this order:
   - src/
   - app/
   - lib/

2. For each candidate, verify it's a directory (not file)

3. If --src flag provided:
   → Use the specified path directly
   → Verify it exists, if not → Error E101

4. If no directory found:
   → Use AskUserQuestion tool to ask user
```

**AskUserQuestion prompt (if needed):**
```
question: "소스 디렉토리를 찾을 수 없습니다. FSD 구조가 있는 디렉토리 경로를 입력해주세요."
header: "Source Dir"
options:
  - label: "src/"
    description: "Standard source directory"
  - label: "app/"
    description: "Next.js style app directory"
  - label: "Custom path"
    description: "Specify a custom path"
```

### Step 2: Detect FSD Layers

**Action:** Invoke skill: layer-detector

```
1. Use Glob to search for FSD layer directories:
   Pattern: {srcDir}/{app,pages,widgets,features,entities,shared}/

2. For each found layer:
   → Record path
   → Check if sliced (has subdirectories)
   → Count files

3. Build LayerMap structure (see layer-detector skill for details)
```

**Glob commands to execute:**
```bash
# Check for each layer
Glob: "{srcDir}/app/**/*"
Glob: "{srcDir}/pages/**/*"
Glob: "{srcDir}/widgets/**/*"
Glob: "{srcDir}/features/**/*"
Glob: "{srcDir}/entities/**/*"
Glob: "{srcDir}/shared/**/*"
```

**If NO layers found:**
```
1. Display warning:
   "No FSD layers detected in '{srcDir}/'."

2. Use AskUserQuestion:
   question: "Create a new FSD structure?"
   header: "New Project"
   options:
     - label: "Yes, create basic structure"
       description: "Creates app/, pages/, features/, entities/, shared/"
     - label: "No, specify different directory"
       description: "I'll provide the correct source directory"

3. If user chooses "Yes":
   → Create directories:
     - {srcDir}/app/
     - {srcDir}/pages/
     - {srcDir}/widgets/
     - {srcDir}/features/
     - {srcDir}/entities/
     - {srcDir}/shared/
   → Add .gitkeep to each empty directory
```

**Progress output:**
```
> Scanning {srcDir}/...
> Found 6 FSD layers
```

### Step 3: Analyze Existing Patterns

**Action:** Detect coding patterns from existing slices

**SKIP this step if:** No slices found (new/empty project) → Use defaults

```
1. Naming Convention Detection:
   → List all slice directory names (from sliced layers)
   → Analyze naming pattern:
     - kebab-case: "user-profile", "shopping-cart"
     - camelCase: "userProfile", "shoppingCart"
     - PascalCase: "UserProfile", "ShoppingCart"
   → Use majority pattern

2. Segment Usage Detection:
   → For each slice, list immediate subdirectories
   → Common segments: ui/, model/, api/, lib/, config/
   → Record which segments are used most frequently
   → Note any custom segments

3. Index File Pattern:
   → Check for index.ts or index.js in each slice
   → Calculate percentage of slices with public API
   → Read a few index files to detect export style

4. Import Alias Detection:
   → Read tsconfig.json (if exists)
   → Extract "paths" configuration
   → Or read vite.config.ts / jsconfig.json
```

**Tools to use:**
```bash
# Naming convention - list slice directories
Glob: "{srcDir}/features/*"
Glob: "{srcDir}/entities/*"

# Segment detection - list subdirs of a slice
Glob: "{srcDir}/features/*/ui"
Glob: "{srcDir}/features/*/model"
Glob: "{srcDir}/features/*/api"

# Index files
Glob: "{srcDir}/features/*/index.ts"
Glob: "{srcDir}/entities/*/index.ts"

# Alias detection
Read: tsconfig.json (look for "compilerOptions.paths")
```

**Default patterns (if no existing code):**
```typescript
const DEFAULT_PATTERNS = {
  naming: 'kebab-case',
  segments: ['ui', 'model', 'api', 'lib'],
  indexFiles: true
};
```

**Progress output:**
```
> Analyzing patterns from existing slices...
> Detected: kebab-case naming, 4 segment types
```

### Step 4: Generate Configuration

**Action:** Create `.fsd-architect.json` with detected settings

```
1. Build configuration object from detected values
2. Use Write tool to create .fsd-architect.json
3. Check .gitignore for cache file entry
```

**Configuration template:**
```json
{
  "version": "1.0.0",
  "srcDir": "src",
  "layers": {
    "app": { "path": "app", "sliced": false, "exists": true },
    "pages": { "path": "pages", "sliced": true, "exists": true },
    "widgets": { "path": "widgets", "sliced": true, "exists": true },
    "features": { "path": "features", "sliced": true, "exists": true },
    "entities": { "path": "entities", "sliced": true, "exists": true },
    "shared": { "path": "shared", "sliced": false, "exists": true }
  },
  "patterns": {
    "naming": "<detected-or-default>",
    "indexFiles": true,
    "segments": ["ui", "model", "api", "lib"]
  },
  "aliases": {
    "@app": "src/app",
    "@pages": "src/pages",
    "@widgets": "src/widgets",
    "@features": "src/features",
    "@entities": "src/entities",
    "@shared": "src/shared"
  },
  "ignore": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.stories.tsx",
    "**/node_modules/**"
  ]
}
```

**Write tool command:**
```
Write: .fsd-architect.json
Content: <generated JSON above>
```

### Step 5: Security Check (.gitignore)

**Action:** Ensure cache files are in .gitignore

```
1. Read .gitignore (if exists)
2. Check if ".fsd-architect.cache.json" is listed
3. If NOT listed:
   → Ask user to add it
   → Or append automatically with confirmation
```

**Entries to add:**
```
# FSD Architect cache (regenerated on each run)
.fsd-architect.cache.json
```

**AskUserQuestion (if not in .gitignore):**
```
question: "Cache file not in .gitignore. Add it?"
header: "Security"
options:
  - label: "Yes, add to .gitignore"
    description: "Recommended - cache may contain file paths"
  - label: "No, skip"
    description: "I'll handle it manually"
```

### Step 6: Display Summary

**Action:** Output the initialization summary

**Template:**
```
═══════════════════════════════════════════════════════════════
                    FSD ARCHITECT INITIALIZED
═══════════════════════════════════════════════════════════════

📁 Source Directory: {srcDir}/

📊 Detected Layers:
   {for each layer}
   ✓ {layerName}/     ({status}, {sliceCount} slices)
   {or}
   ✗ {layerName}/     (not found)

🔍 Detected Patterns:
   • Naming: {naming}
   • Index files: {indexFiles ? 'Yes (barrel exports)' : 'No'}
   • Segments: {segments.join(', ')}

📝 Created: .fsd-architect.json

💡 Next Steps:
   1. Run /fsdarch:analyze for detailed structure analysis
   2. Run /fsdarch:scaffold <layer> <name> to create new slices
   3. Run /fsdarch:validate to check for FSD violations

═══════════════════════════════════════════════════════════════
```

**Example output:**
```
═══════════════════════════════════════════════════════════════
                    FSD ARCHITECT INITIALIZED
═══════════════════════════════════════════════════════════════

📁 Source Directory: src/

📊 Detected Layers:
   ✓ app/       (found)
   ✓ pages/     (found, 5 slices)
   ✓ widgets/   (found, 3 slices)
   ✓ features/  (found, 8 slices)
   ✓ entities/  (found, 4 slices)
   ✓ shared/    (found)

🔍 Detected Patterns:
   • Naming: kebab-case
   • Index files: Yes (barrel exports)
   • Segments: ui, model, api, lib

📝 Created: .fsd-architect.json

💡 Next Steps:
   1. Run /fsdarch:analyze for detailed structure analysis
   2. Run /fsdarch:scaffold <layer> <name> to create new slices
   3. Run /fsdarch:validate to check for FSD violations

═══════════════════════════════════════════════════════════════
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--force` | 기존 설정 덮어쓰기 | `/fsdarch:init --force` |
| `--src <path>` | 소스 디렉토리 지정 | `/fsdarch:init --src app/` |
| `--minimal` | 최소 설정만 생성 | `/fsdarch:init --minimal` |

## Error Handling

### E101: No Source Directory

```
[E101] Source directory not found

No valid source directory detected. Searched:
  - src/
  - app/
  - lib/

Please specify the source directory:
  /fsdarch:init --src <path>
```

### E102: Not an FSD Project

```
[E102] No FSD layers detected

The project does not appear to use Feature-Sliced Design.
No standard FSD layers found in 'src/'.

Would you like to:
  1. Create a new FSD structure? [y/N]
  2. Specify a different source directory?
```

### E103: Config Already Exists

```
[E103] Configuration already exists

.fsd-architect.json already exists.
Use --force to overwrite:
  /fsdarch:init --force
```

## Examples

### Example 1: Standard React Project

```
/fsdarch:init

> Scanning src/...
> Found 6 FSD layers
> Analyzing patterns from existing slices...
> Created .fsd-architect.json
```

### Example 2: Custom Source Directory

```
/fsdarch:init --src packages/web/src

> Scanning packages/web/src/...
> Found 5 FSD layers (missing: app)
> Created .fsd-architect.json
```

### Example 3: New Project

```
/fsdarch:init

> No FSD structure detected
> Create new FSD structure? [y/N]: y
> Created: src/app/, src/pages/, src/widgets/, src/features/, src/entities/, src/shared/
> Created .fsd-architect.json
```
