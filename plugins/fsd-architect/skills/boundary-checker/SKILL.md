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
  app (6)
  pages (5)
  widgets (4)
  features (3)
  entities (2)
  shared (1)
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

**Exception: `@x/` cross-reference pattern is allowed.**

The @x/ pattern enables controlled cross-slice imports within the same layer.
See "REFERENCE: @x/ Cross-Reference Pattern" section for details.

### Step 5.5: Validate @x/ References (if used)

When an @x/ import is detected:

```
1. Check @x/ structure exists in source slice
2. Verify the re-export is properly set up
3. If structure invalid → Warning (not error)
```

**Valid @x/ usage:**
```typescript
// In: entities/user/@x/order.ts
export { Order, type OrderStatus } from '@entities/order';

// In: entities/user/model/index.ts
import { Order } from '../@x/order';  // ✅ Valid
```

**Invalid @x/ usage (direct import disguised):**
```typescript
// In: entities/user/model/index.ts
import { Order } from '@entities/order';  // ❌ E201: Cross-slice import
```

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
    sourceSlicePath = getSlicePath(file.path)  // Full path: e.g., "src/entities/user"

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
        else:
          // Validate @x/ structure (Step 5.5)
          xRefFile = extractXRefFile(imp)  // Extract file name from @x/ import
          xRefResult = validateXReference(sourceSlicePath, xRefFile)
          if not xRefResult.valid:
            violations.push({
              code: 'W105',
              type: 'warning',
              message: 'Invalid @x/ structure',
              detail: xRefResult.warning,
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
| W103 | Warning | Missing segment |
| W105 | Warning | Invalid @x/ structure |

---

## REFERENCE: @x/ Cross-Reference Pattern

### What is @x/?

The @x/ (cross-reference) pattern is an **advanced FSD pattern** that enables controlled imports between slices within the same layer. This is an exception to the normal "no cross-slice imports" rule.

### When to Use @x/

Use @x/ when:
- Entities have relationships (User → Order, Product → Review)
- Features need to reference each other's types (not logic)
- Widgets compose other widgets

### Pattern Structure

```
entities/
├── user/
│   ├── @x/                    # Cross-reference folder
│   │   └── order.ts           # Re-exports from order entity
│   ├── model/
│   │   ├── index.ts
│   │   └── useUserOrders.ts   # Can import from ../@x/order
│   ├── ui/
│   └── index.ts
├── order/
│   ├── model/
│   │   └── types.ts           # Order, OrderStatus types
│   └── index.ts               # Exports Order, OrderStatus
```

### @x/ File Content

The @x/ files are **re-exports only**. They don't contain logic.

```typescript
// entities/user/@x/order.ts
// Re-export only what user entity needs from order entity

export { Order } from '@entities/order';
export type { OrderStatus, OrderItem } from '@entities/order';
```

### How to Import via @x/

Within the same slice, use relative imports to @x/:

```typescript
// entities/user/model/useUserOrders.ts

// ✅ CORRECT: Import via local @x/ re-export
import { Order, OrderStatus } from '../@x/order';

// ❌ WRONG: Direct cross-slice import
import { Order } from '@entities/order';
```

### Detection Logic

```typescript
/**
 * Check if an import uses the @x/ cross-reference pattern.
 * @param importPath - The import path to check
 * @returns true if this is an @x/ reference
 */
function isXReference(importPath: string): boolean {
  // Check for @x/ in relative path
  // Patterns: '/@x/', '../@x/', './@x/'
  if (importPath.includes('/@x/') || importPath.includes('../@x/') || importPath.includes('./@x/')) {
    return true;
  }
  return false;
}

/**
 * Validate that @x/ structure is properly set up.
 * @param sourceSlicePath - Path to the slice using @x/
 * @param xRefFile - The @x/ file being imported
 * @returns Validation result
 */
function validateXReference(
  sourceSlicePath: string,
  xRefFile: string
): { valid: boolean; warning?: string } {
  // Check @x/ folder exists in source slice
  const xRefPath = `${sourceSlicePath}/@x`;
  if (!exists(xRefPath)) {
    return {
      valid: false,
      warning: `Missing @x/ folder in ${sourceSlicePath}`
    };
  }

  // Check the specific @x/ file exists
  const xRefFilePath = `${xRefPath}/${xRefFile}.ts`;
  if (!exists(xRefFilePath)) {
    return {
      valid: false,
      warning: `Missing @x/ file: ${xRefFilePath}`
    };
  }

  // Check file contains only re-exports (no logic)
  const content = read(xRefFilePath);
  if (!isReExportOnly(content)) {
    return {
      valid: false,
      warning: `@x/ file should only contain re-exports: ${xRefFilePath}`
    };
  }

  return { valid: true };
}

/**
 * Check if file content is re-export only (no logic).
 */
function isReExportOnly(content: string): boolean {
  // Should only have export statements, no function/class definitions
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('//'));

  for (const line of lines) {
    // Valid: export { X } from 'Y'
    // Valid: export type { X } from 'Y'
    // Invalid: function, const, class, etc.
    if (!line.match(/^export\s+(type\s+)?{.*}\s+from\s+/)) {
      return false;
    }
  }

  return true;
}
```

### Benefits of @x/

1. **Explicit Dependencies**: Makes cross-slice dependencies visible
2. **Controlled Coupling**: Only expose what's needed
3. **Easy to Track**: Find all cross-references in @x/ folders
4. **Refactoring Friendly**: Change target slice, update @x/ re-exports

### Example: User-Order Relationship

```typescript
// entities/order/model/types.ts
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// entities/order/index.ts
export { Order, OrderStatus } from './model/types';

// entities/user/@x/order.ts
export { Order } from '@entities/order';
export type { OrderStatus } from '@entities/order';

// entities/user/model/useUserOrders.ts
import { Order, OrderStatus } from '../@x/order';  // ✅

export function useUserOrders(userId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  // ...
}
```

---

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
