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
3. Check slice name doesn't already exist
4. Validate naming format matches project convention

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

Create base directory:
```
{srcDir}/{layer}/{sliceName}/
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
  // TODO: Define props
}

export function {Name}Component(props: {Name}ComponentProps) {
  return (
    <div>
      {/* TODO: Implement */}
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
  // TODO: Define entity fields
}

// use{Name}.ts
import { useState } from 'react';
import type { {Name} } from './types';

export function use{Name}() {
  // TODO: Implement hook
  return {};
}
```

#### api/ segment
```typescript
// index.ts
export { {name}Api } from './{name}Api';

// {name}Api.ts
// TODO: Import your HTTP client
// import { httpClient } from '@shared/api';

export const {name}Api = {
  getAll: async () => {
    // TODO: Implement
  },
  getById: async (id: string) => {
    // TODO: Implement
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

## ALGORITHM

```
function generateSlice(layer, sliceName, options):
  // Validate
  if layer not in [pages, widgets, features, entities]:
    throw E302('Invalid layer')

  slicePath = resolveSlicePath(layer, sliceName)
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
