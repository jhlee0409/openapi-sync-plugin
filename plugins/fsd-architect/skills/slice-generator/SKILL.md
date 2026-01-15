---
name: slice-generator
description: Generate FSD-compliant slice boilerplate with pattern matching
---

# Slice Generator Skill

FSD 규격에 맞는 슬라이스 보일러플레이트를 생성합니다. 프로젝트 패턴을 학습하여 일관된 스타일로 생성합니다.

## EXECUTION INSTRUCTIONS

### Step 1: Validate Input

1. Check layer is valid sliced layer: pages, widgets, features, entities
2. **Sanitize slice name (SECURITY CRITICAL):**
   - MUST NOT contain `..` (path traversal attack)
   - MUST NOT contain `/` or `\` (path separator injection)
   - MUST NOT start with `.` (hidden file creation)
   - MUST match pattern: `^[a-zA-Z][a-zA-Z0-9-_]*$`
   - If validation fails, throw E304 with sanitization guidance
3. **Sanitize segment names (SECURITY CRITICAL - same rules as slice):**
   - For each segment in `--segments` flag:
     - MUST NOT contain `..` (path traversal attack)
     - MUST NOT contain `/` or `\` (path separator injection)
     - MUST NOT start with `.` (hidden file creation)
     - MUST match pattern: `^[a-zA-Z][a-zA-Z0-9-_]*$`
     - If validation fails, throw E305 with sanitization guidance
   - **Validation function:**
     ```typescript
     function validateSegmentName(segment: string): { valid: boolean; error?: string } {
       if (segment.includes('..')) {
         return { valid: false, error: 'E305: Segment contains ".." (path traversal blocked)' };
       }
       if (segment.includes('/') || segment.includes('\\')) {
         return { valid: false, error: 'E305: Segment contains path separators' };
       }
       if (segment.startsWith('.')) {
         return { valid: false, error: 'E305: Hidden segment not allowed' };
       }
       if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(segment)) {
         return { valid: false, error: 'E305: Invalid segment name format' };
       }
       return { valid: true };
     }

     // Validate all segments before creation
     for (const segment of options.segments) {
       const result = validateSegmentName(segment);
       if (!result.valid) {
         throw new Error(result.error);
       }
     }
     ```
4. Check slice name doesn't already exist
5. Validate naming format matches project convention

### Step 1.5: Load Configuration

**Action:** Read .fsd-architect.json and extract layer settings

```
1. Use Read tool to load .fsd-architect.json
2. If not exists:
   → Warn user: "Config not found. Run /fsdarch:init first"
   → Use DEFAULT_CONFIG as fallback
3. Extract from config:
   - srcDir (default: 'src')
   - layerAliases (default: {} - no aliases)
   - patterns (for consistency)
```

**Read command:**
```bash
Read: .fsd-architect.json
```

**Fallback config:**
```typescript
const DEFAULT_CONFIG: FsdConfig = {
  srcDir: 'src',
  layerAliases: {},  // No aliases = use layer names as-is
  patterns: DEFAULT_PATTERNS
};
```

**Config structure:**
```typescript
interface FsdConfig {
  srcDir: string;
  layerAliases?: {
    app?: string;    // e.g., 'core' for Next.js
    pages?: string;  // e.g., 'views' for Next.js
  };
  patterns?: PatternConfig;
}
```

### Step 2: Load Project Patterns

Use layer-detector skill:

1. Get naming convention (kebab-case, camelCase, PascalCase)
2. Get segment list from config or detect from existing slices
3. Get index file pattern

**If no patterns found (new/empty project), use defaults:**

```typescript
const DEFAULT_PATTERNS = {
  naming: 'kebab-case',
  segments: ['ui', 'model', 'api', 'lib'],
  indexFiles: true,
  styleGuide: {
    quotes: 'single',
    semicolons: true,
    componentStyle: 'function',  // vs 'arrow'
    typeStyle: 'interface',      // vs 'type'
    indentation: 2,
  }
};
```

REQUIRED: If `loadPatterns()` returns empty, apply `DEFAULT_PATTERNS` instead of failing.

### Step 3: Analyze Existing Slices

For the same layer, analyze existing slices:

1. Find 2-3 representative slices
2. Read their structure
3. Extract patterns:
   - File naming
   - Export style
   - TypeScript patterns
   - Component patterns (if React)

### Step 4: Transform Slice Name

Based on detected naming convention:

| Input | kebab-case | PascalCase | camelCase |
|-------|------------|------------|-----------|
| user profile | user-profile | UserProfile | userProfile |
| UserProfile | user-profile | UserProfile | userProfile |

### Step 5: Generate Directory Structure

**Action:** Create slice directory using resolved path with layerAliases

```
1. Load config (from Step 1.5)
2. Verify parent layer directory exists using getLayerPath():
   layerPath = getLayerPath(layer, config)
   → Use Glob to check: "{layerPath}/"
   → If not exists, create it or error
3. Compute slice path using resolveSlicePath():
   slicePath = resolveSlicePath(layer, sliceName, config)
4. Create slice directory
```

**CRITICAL: Apply layerAliases**

```typescript
// Step 2: Verify layer directory exists
const layerPath = getLayerPath(layer, config);  // Uses utility function
// Glob: "{layerPath}/" to verify

// Step 3: Compute full slice path
const slicePath = resolveSlicePath(layer, sliceName, config);
```

**Example paths:**

| Layer | getLayerPath() | resolveSlicePath() |
|-------|----------------|-------------------|
| features | src/features | src/features/auth |
| app (aliased→core) | src/core | src/core/providers |
| pages (aliased→views) | src/views | src/views/home |

**Glob command to verify parent (using getLayerPath):**
```bash
Glob: "{getLayerPath(layer, config)}/"
# e.g., "src/core/" for Next.js app layer with alias
```

### Step 6: Generate Segments

For each configured segment:

#### ui/ segment
```typescript
// index.ts
export { {Name}Component } from './{Name}Component';

// {Name}Component.tsx
import React from 'react';

interface {Name}ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function {Name}Component({ className, children }: {Name}ComponentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
```

#### model/ segment
```typescript
// index.ts
export * from './types';
export { use{Name} } from './use{Name}';

// types.ts
export interface {Name} {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// use{Name}.ts
import { useState, useCallback } from 'react';
import type { {Name} } from './types';

export function use{Name}(initialData?: {Name} | null) {
  const [data, setData] = useState<{Name} | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, setData, isLoading, setIsLoading, error, setError, reset };
}
```

#### api/ segment
```typescript
// index.ts
export { {name}Api } from './{name}Api';

// {name}Api.ts
import type { {Name} } from '../model';

const BASE_URL = '/api/{name}';

export const {name}Api = {
  getAll: async (): Promise<{Name}[]> => {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('Failed to fetch {name} list');
    return response.json();
  },

  getById: async (id: string): Promise<{Name}> => {
    const response = await fetch(`${BASE_URL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch {name}');
    return response.json();
  },

  create: async (data: Omit<{Name}, 'id' | 'createdAt' | 'updatedAt'>): Promise<{Name}> => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create {name}');
    return response.json();
  },

  update: async (id: string, data: Partial<{Name}>): Promise<{Name}> => {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update {name}');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete {name}');
  },
};
```

#### lib/ segment
```typescript
// index.ts
// Export utilities here
```

### Step 7: Generate Public API

```typescript
// index.ts
// Public API - export only what should be accessible from outside

// UI Components
export { {Name}Component } from './ui';

// Model (types, hooks, store)
export type { {Name} } from './model';
export { use{Name} } from './model';

// API (if needed externally)
// export { {name}Api } from './api';
```

### Step 8: Apply Project-Specific Patterns

1. Match import style (single quotes vs double quotes)
2. Match semicolon usage
3. Match component style (function vs arrow)
4. Match type style (interface vs type)

### Step 9: Return Result

```typescript
interface GenerationResult {
  slicePath: string;
  files: {
    path: string;
    created: boolean;
  }[];
  patterns: {
    naming: string;
    segments: string[];
  };
}
```

## UTILITY FUNCTIONS

### resolveSlicePath()

Resolves the actual filesystem path for a slice, applying layerAliases from config.

```typescript
/**
 * Resolve slice path with layer aliases applied.
 *
 * @param layer - FSD layer name (app, pages, widgets, features, entities)
 * @param sliceName - Name of the slice to create
 * @param config - Loaded .fsd-architect.json config
 * @returns Full path to create the slice directory
 *
 * @example
 * // Standard project (no aliases)
 * resolveSlicePath('features', 'auth', { srcDir: 'src', layerAliases: {} })
 * // → 'src/features/auth'
 *
 * // Next.js project (with aliases)
 * resolveSlicePath('app', 'providers', {
 *   srcDir: 'src',
 *   layerAliases: { app: 'core', pages: 'views' }
 * })
 * // → 'src/core/providers'
 *
 * // Next.js hybrid (pages layer)
 * resolveSlicePath('pages', 'home', {
 *   srcDir: 'src',
 *   layerAliases: { app: 'core', pages: 'views' }
 * })
 * // → 'src/views/home'
 */
function resolveSlicePath(
  layer: string,
  sliceName: string,
  config: FsdConfig
): string {
  // Apply layer alias if configured, otherwise use layer name as-is
  const layerDir = config.layerAliases?.[layer] ?? layer;

  // Build full path: srcDir/layerDir/sliceName
  return `${config.srcDir}/${layerDir}/${sliceName}`;
}
```

### getLayerPath()

Get the actual directory path for a layer (for checking existence).

```typescript
/**
 * Get the actual directory path for an FSD layer.
 *
 * @param layer - FSD layer name
 * @param config - Loaded config
 * @returns Directory path for the layer
 */
function getLayerPath(layer: string, config: FsdConfig): string {
  const layerDir = config.layerAliases?.[layer] ?? layer;
  return `${config.srcDir}/${layerDir}`;
}
```

---

## ALGORITHM

```
function generateSlice(layer, sliceName, options):
  // Step 1: Validate
  if layer not in [pages, widgets, features, entities]:
    throw E302('Invalid layer')

  // Step 1.5: Load config
  config = loadConfig('.fsd-architect.json')
  if not config:
    config = DEFAULT_CONFIG
    warn("Using default config. Run /fsdarch:init for full setup.")

  // Step 5: Verify layer directory exists (using getLayerPath)
  layerPath = getLayerPath(layer, config)
  if not exists(layerPath):
    mkdir(layerPath)  // Create layer directory if missing

  // Step 5: Resolve slice path with aliases (CRITICAL FIX)
  slicePath = resolveSlicePath(layer, sliceName, config)
  if exists(slicePath):
    throw E301('Slice exists')

  // Load patterns
  patterns = loadPatterns()
  existingSlices = findExistingSlices(layer)
  styleGuide = analyzeStyle(existingSlices)

  // Transform name
  transformedName = transformName(sliceName, patterns.naming)

  // Generate
  files = []

  mkdir(slicePath)

  // SECURITY: Validate all segment names before creation
  for segment in options.segments or patterns.segments:
    result = validateSegmentName(segment)
    if not result.valid:
      throw E305(result.error)

  for segment in options.segments or patterns.segments:
    segmentPath = slicePath + '/' + segment
    mkdir(segmentPath)

    templates = getTemplates(layer, segment)
    for template in templates:
      content = renderTemplate(template, {
        name: transformedName,
        Name: pascalCase(transformedName),
        styleGuide: styleGuide
      })
      write(segmentPath + '/' + template.filename, content)
      files.push(segmentPath + '/' + template.filename)

  // Generate public API
  publicApi = generatePublicApi(layer, transformedName, options.segments)
  write(slicePath + '/index.ts', publicApi)

  return {
    slicePath: slicePath,
    files: files,
    patterns: patterns
  }
```

## REFERENCE: Layer-Specific Templates

### entities
- Focus on data types and API
- Include model/types.ts with entity definition
- Include api/ for data fetching
- UI is optional (common components)

### features
- Focus on user actions
- Include model/use{Name}.ts hook
- UI components for the feature
- API for feature-specific calls

### widgets
- Focus on composition
- Minimal model (mostly composition logic)
- UI is primary segment
- No direct API (use features/entities)

### pages
- Focus on layout
- UI only (page composition)
- No model/api (delegate to widgets/features)

## ERROR HANDLING

### Slice Already Exists (E301)

If slice directory exists:
- Return error with existing path
- Suggest `--force` flag or different name

### Invalid Layer (E302)

If layer is not sliced:
- Return error
- List valid layers

### Invalid Name (E303)

If name contains invalid characters:
- Return error
- Suggest valid format

### Path Traversal Attempt (E304)

If slice name contains path traversal sequences:
- Return error immediately (SECURITY)
- Log the attempt for security monitoring
- Provide clear error message:

```
[E304] Path Traversal Attempt Blocked

Slice name '../../etc/passwd' contains forbidden characters.

Security Policy:
  - '..' sequences are blocked (directory traversal)
  - '/' and '\' are blocked (path separators)
  - Names starting with '.' are blocked (hidden files)

Valid slice names:
  ✓ user-profile
  ✓ auth
  ✓ shopping-cart

Invalid slice names:
  ✗ ../malicious
  ✗ foo/bar
  ✗ .hidden
```

### Segment Path Traversal Attempt (E305)

If segment name (from `--segments` flag) contains path traversal sequences:
- Return error immediately (SECURITY)
- Same security policy as slice names
- Provide clear error message:

```
[E305] Segment Path Traversal Attempt Blocked

Segment name '../../etc' contains forbidden characters.

Security Policy (same as slice names):
  - '..' sequences are blocked (directory traversal)
  - '/' and '\' are blocked (path separators)
  - Names starting with '.' are blocked (hidden files)

Valid segment names:
  ✓ ui
  ✓ model
  ✓ api
  ✓ lib
  ✓ config

Invalid segment names:
  ✗ ../../../etc
  ✗ ui/malicious
  ✗ .hidden-segment
```
