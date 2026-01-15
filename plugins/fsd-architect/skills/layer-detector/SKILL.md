---
name: layer-detector
description: Detect and analyze FSD layer structure in a project
---

# Layer Detector Skill

FSD 레이어 구조를 감지하고 분석합니다.

## WHEN TO USE

This skill is invoked by:
- `/fsdarch:init` - Initial project setup
- `/fsdarch:analyze` - Project analysis

## EXECUTION INSTRUCTIONS

### Step 1: Find Source Directory

**Action:** Determine the source directory path

```
1. Check if srcDir is passed as parameter
   → If yes, use it directly

2. If no parameter, read .fsd-architect.json
   → Use Read tool to get srcDir field
   → Default to "src/" if not specified

3. Verify directory exists:
   → Use Glob: "{srcDir}/"
   → If no match, return error E101
```

**Glob command:**
```bash
Glob: "src/"
# Or if config specifies different path:
Glob: "{config.srcDir}/"
```

### Step 2: Detect Layers

**Action:** Scan for FSD layer directories

**Standard FSD layers (in hierarchy order):**
```
1. shared   (lowest - utilities, ui kit, api clients)
2. entities (domain models and business entities)
3. features (user interactions and business logic)
4. widgets  (composite UI blocks)
5. pages    (route-level compositions) → "views" in Next.js
6. app      (highest - app initialization) → "core" in Next.js
```

**Glob commands to execute (in parallel):**

For standard projects:
```bash
Glob: "{srcDir}/app/"
Glob: "{srcDir}/pages/"
Glob: "{srcDir}/widgets/"
Glob: "{srcDir}/features/"
Glob: "{srcDir}/entities/"
Glob: "{srcDir}/shared/"
```

For Next.js projects (layer aliases):
```bash
Glob: "{srcDir}/core/"       # app → core
Glob: "{srcDir}/views/"      # pages → views
Glob: "{srcDir}/widgets/"
Glob: "{srcDir}/features/"
Glob: "{srcDir}/entities/"
Glob: "{srcDir}/shared/"
```

**Layer alias mapping (user-configurable):**
```typescript
// Layer aliases are stored in .fsd-architect.json
// Users can customize these during /fsdarch:init

interface LayerAliases {
  app: string;    // 'app', 'core', '_app', 'application', etc.
  pages: string;  // 'pages', 'views', '_pages', 'screens', etc.
}

// Common presets:
const LAYER_ALIAS_PRESETS = {
  standard: { app: 'app', pages: 'pages' },
  nextjs_recommended: { app: 'core', pages: 'views' },
  nextjs_underscore: { app: '_app', pages: '_pages' },
  nextjs_verbose: { app: 'application', pages: 'screens' }
};

// Read from config:
function getLayerPath(layer: string, config: Config): string {
  if (config.layerAliases && config.layerAliases[layer]) {
    return config.layerAliases[layer];
  }
  return layer; // default: use layer name as-is
}
```

**For each found layer, record:**
```typescript
{
  name: "features",
  path: "src/features",
  exists: true,
  sliced: true,  // pages, widgets, features, entities are sliced
  fileCount: 0   // will be populated in step 3
}
```

**Non-sliced layers:** `app`, `shared`
**Sliced layers:** `pages`, `widgets`, `features`, `entities`

### Step 3: Detect Slices (for sliced layers)

**Action:** List and analyze slices in each sliced layer

```
For each sliced layer (pages, widgets, features, entities):
  1. List immediate subdirectories (these are slices)
  2. For each slice, detect segments
  3. Check for public API (index.ts/index.js)
  4. Count files
```

**Glob commands for slice detection:**
```bash
# List slices in features layer
Glob: "{srcDir}/features/*/"  # Returns: auth/, cart/, checkout/, ...

# List slices in entities layer
Glob: "{srcDir}/entities/*/"  # Returns: user/, product/, order/, ...

# List slices in pages layer
Glob: "{srcDir}/pages/*/"     # Returns: home/, profile/, settings/, ...

# List slices in widgets layer
Glob: "{srcDir}/widgets/*/"   # Returns: header/, sidebar/, footer/, ...
```

**For each slice, detect segments:**
```bash
# Standard segments to check
Glob: "{srcDir}/features/{sliceName}/ui/"      # UI components
Glob: "{srcDir}/features/{sliceName}/model/"   # Business logic, state
Glob: "{srcDir}/features/{sliceName}/api/"     # API functions
Glob: "{srcDir}/features/{sliceName}/lib/"     # Utilities
Glob: "{srcDir}/features/{sliceName}/config/"  # Configuration
```

**Check for public API:**
```bash
Glob: "{srcDir}/features/{sliceName}/index.ts"
Glob: "{srcDir}/features/{sliceName}/index.tsx"
Glob: "{srcDir}/features/{sliceName}/index.js"
```

**Count files in slice:**
```bash
Glob: "{srcDir}/features/{sliceName}/**/*.{ts,tsx,js,jsx}"
# Count the results
```

### Step 4: Analyze Patterns

**Action:** Detect naming conventions and common patterns

**1. Naming Convention Detection:**
```typescript
function detectNamingConvention(sliceNames: string[]): 'kebab-case' | 'camelCase' | 'PascalCase' {
  const patterns = {
    'kebab-case': /^[a-z]+(-[a-z]+)*$/,      // user-profile, shopping-cart
    'camelCase': /^[a-z]+([A-Z][a-z]+)*$/,    // userProfile, shoppingCart
    'PascalCase': /^([A-Z][a-z]+)+$/          // UserProfile, ShoppingCart
  };

  const counts = { 'kebab-case': 0, 'camelCase': 0, 'PascalCase': 0 };

  for (const name of sliceNames) {
    for (const [convention, regex] of Object.entries(patterns)) {
      if (regex.test(name)) {
        counts[convention as keyof typeof counts]++;
      }
    }
  }

  // Return the most common pattern
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as any;
}
```

**2. Segment Usage Analysis:**
```
Standard segments: ui, model, api, lib, config
Custom segments: anything else found in slices

For each slice:
  → List subdirectories
  → Categorize as standard or custom
  → Track frequency of each segment
```

**3. Index File Pattern:**
```typescript
// Read a sample index.ts to detect export style
// Look for:
// - Barrel exports: export * from './ui'
// - Named exports: export { Component } from './ui'
// - Default exports: export default Component

// Check export style
Grep: "export \\* from" in index.ts files  // Barrel
Grep: "export \\{" in index.ts files       // Named
Grep: "export default" in index.ts files   // Default
```

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

## UTILITY FUNCTIONS

### countFiles()

Count TypeScript/JavaScript files in a directory.

```typescript
/**
 * Count source files in a given path using Glob.
 * @param dirPath - Directory path to count files in
 * @returns Number of source files found
 */
function countFiles(dirPath: string): number {
  // Use Glob to find all source files
  const globPattern = `${dirPath}/**/*.{ts,tsx,js,jsx}`;
  const files = glob(globPattern);
  return files.length;
}
```

**Glob command:**
```bash
Glob: "{dirPath}/**/*.{ts,tsx,js,jsx}"
# Count the length of returned array

# NOTE: For very large slices (1000+ files), use head_limit for memory safety:
# Glob: "{dirPath}/**/*.{ts,tsx,js,jsx}" head_limit=1000
# Then check if result.length === 1000 to detect if there are more files
```

**Example:**
```typescript
countFiles('src/features/auth')  // Returns: 12
countFiles('src/entities/user')  // Returns: 8
```

---

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
