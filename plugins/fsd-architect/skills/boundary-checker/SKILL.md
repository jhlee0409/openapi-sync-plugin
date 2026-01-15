---
name: boundary-checker
description: Check FSD import boundary rules and detect violations
---

# Boundary Checker Skill

FSD Import 경계 규칙을 검사하고 위반 사항을 감지합니다.

## EXECUTION INSTRUCTIONS

### Step 1: Load Layer Map

1. Use layer-detector skill to get current layer map
2. Build layer hierarchy for validation

### Step 2: Collect Import Statements

For each file in the project:

1. Read file content
2. Extract import statements using regex:
   ```regex
   import\s+.*\s+from\s+['"]([^'"]+)['"]
   ```
3. Categorize imports:
   - Absolute (alias): `@entities/user`
   - Relative: `../model/types`
   - External: `react`, `lodash`

### Step 3: Resolve Import Paths

For each import:

1. If alias, resolve using config aliases
2. If relative, resolve from current file path
3. Determine target layer and slice

### Step 4: Check Layer Hierarchy

```
Layer Hierarchy (top to bottom):
  app (7)
  pages (6)
  widgets (5)
  features (4)
  entities (3)
  shared (2)
```

**Rule: Lower number cannot import from higher number**

For each import:
1. Get source layer rank
2. Get target layer rank
3. If source rank < target rank → VIOLATION

### Step 5: Check Cross-Slice Imports

For sliced layers (pages, widgets, features, entities):

**Rule: Slices in the same layer cannot import from each other**

For each import within a sliced layer:
1. Get source slice
2. Get target slice
3. If source ≠ target and same layer → VIOLATION

Exception: `@x/` cross-reference pattern is allowed.

### Step 6: Check Public API Usage

**Rule: External imports must go through public API (index.ts)**

For each import:
1. Check if it imports from `/index` or slice root
2. If it imports internal path (e.g., `/model/types`) → VIOLATION

### Step 7: Return Violations

```typescript
interface Violation {
  code: string;
  type: 'error' | 'warning';
  message: string;
  location: {
    file: string;
    line: number;
  };
  source: {
    layer: string;
    slice?: string;
  };
  target: {
    layer: string;
    slice?: string;
    path: string;
  };
  suggestion: string;
}
```

## ALGORITHM

```
function checkBoundaries(layerMap, files):
  violations = []

  for file in files:
    imports = extractImports(file)
    sourceLayer = getLayerFromPath(file.path)
    sourceSlice = getSliceFromPath(file.path)

    for imp in imports:
      targetPath = resolveImport(imp, file.path)
      targetLayer = getLayerFromPath(targetPath)
      targetSlice = getSliceFromPath(targetPath)

      // Check layer hierarchy
      if layerRank(sourceLayer) < layerRank(targetLayer):
        violations.push({
          code: 'E203',
          type: 'error',
          message: 'Forbidden higher-layer import',
          ...
        })

      // Check cross-slice
      if sourceLayer == targetLayer and sourceSlice != targetSlice:
        if not isXReference(imp):
          violations.push({
            code: 'E201',
            type: 'error',
            message: 'Forbidden cross-slice import',
            ...
          })

      // Check public API
      if isInternalPath(targetPath):
        violations.push({
          code: 'E202',
          type: 'error',
          message: 'Public API sidestep',
          ...
        })

  return violations
```

## REFERENCE: Violation Codes

| Code | Type | Description |
|------|------|-------------|
| E201 | Error | Cross-slice import (same layer) |
| E202 | Error | Public API sidestep |
| E203 | Error | Higher-layer import |
| E204 | Error | Missing public API |
| E205 | Error | Circular dependency |
| W101 | Warning | Inconsistent naming |
| W102 | Warning | Unused export |

## ERROR HANDLING

### Cannot Parse File

If file cannot be parsed:
- Log warning
- Skip file
- Continue with remaining files

### Unresolved Import

If import path cannot be resolved:
- Log as potential issue
- Mark as "external" if starts with known package
- Skip validation for this import
