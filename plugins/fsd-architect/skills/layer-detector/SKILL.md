---
name: layer-detector
description: Detect and analyze FSD layer structure in a project
---

# Layer Detector Skill

FSD 레이어 구조를 감지하고 분석합니다.

## EXECUTION INSTRUCTIONS

### Step 1: Find Source Directory

1. Read `.fsd-architect.json` if exists
2. Get `srcDir` from config, default to `src/`
3. Verify directory exists using Glob

### Step 2: Detect Layers

1. Search for FSD layer directories:
   ```
   {srcDir}/{app,pages,widgets,features,entities,shared}
   ```

2. For each found layer, record:
   - Path
   - Whether it's sliced (contains subdirectories)
   - Number of files

### Step 3: Detect Slices (for sliced layers)

For layers marked as sliced (pages, widgets, features, entities):

1. List immediate subdirectories (these are slices)
2. For each slice, detect segments:
   - `ui/` - UI components
   - `model/` - Business logic, state
   - `api/` - API functions
   - `lib/` - Utilities
   - `config/` - Configuration
3. Check for public API (`index.ts` or `index.js`)

### Step 4: Analyze Patterns

1. **Naming Convention**
   - Analyze slice directory names
   - Detect: kebab-case, camelCase, PascalCase

2. **Segment Usage**
   - Which segments are commonly used
   - Custom segments not in standard list

3. **Index Files**
   - Barrel export pattern
   - Named exports vs default exports

### Step 5: Return Layer Map

```typescript
interface LayerMap {
  layers: {
    [layerName: string]: {
      path: string;
      exists: boolean;
      sliced: boolean;
      slices?: SliceInfo[];
      fileCount: number;
    };
  };
  patterns: {
    naming: 'kebab-case' | 'camelCase' | 'PascalCase';
    segments: string[];
    indexFiles: boolean;
  };
}

interface SliceInfo {
  name: string;
  path: string;
  segments: string[];
  hasPublicApi: boolean;
  fileCount: number;
}
```

## ALGORITHM

```
function detectLayers(srcDir):
  layers = {}

  for layerName in [app, pages, widgets, features, entities, shared]:
    layerPath = srcDir + '/' + layerName

    if exists(layerPath):
      layers[layerName] = {
        path: layerPath,
        exists: true,
        sliced: layerName in [pages, widgets, features, entities],
        fileCount: countFiles(layerPath)
      }

      if layers[layerName].sliced:
        layers[layerName].slices = detectSlices(layerPath)
    else:
      layers[layerName] = { exists: false }

  return {
    layers: layers,
    patterns: analyzePatterns(layers)
  }
```

## ERROR HANDLING

### No Source Directory

If `srcDir` does not exist:
- Return error code E101
- Suggest running `/fsdarch:init --src <path>`

### Partial FSD Structure

If only some layers exist:
- Mark missing layers as `exists: false`
- Continue with available layers
- Include warning in output

### Non-Standard Structure

If directories don't match FSD pattern:
- Log as warning
- Suggest possible mappings
