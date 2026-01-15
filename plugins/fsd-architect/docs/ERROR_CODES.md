# FSD Architect Error Codes

Complete reference for all error codes used in FSD Architect plugin.

## Error Code Ranges

| Range | Category | Description |
|-------|----------|-------------|
| E1xx | Detection Errors | Source/layer detection failures |
| E2xx | Validation Errors | FSD rule violations |
| E3xx | Generation Errors | Scaffolding failures |
| E4xx | Configuration Errors | Config file issues |
| E5xx | Cache Errors | Cache file issues |
| W1xx | Warnings | Non-blocking issues |

---

## E1xx: Detection Errors

### E101: No Source Directory

**Location:** `commands/init.md`
**Cause:** Source directory not found during initialization

```
[E101] Source directory not found

No valid source directory detected. Searched:
  - src/
  - app/
  - lib/

Solution: Specify the source directory explicitly:
  /fsd:init --src <path>
```

### E102: Not an FSD Project

**Location:** `commands/init.md`
**Cause:** No FSD layers detected in source directory

```
[E102] No FSD layers detected

The project does not appear to use Feature-Sliced Design.
No standard FSD layers found in 'src/'.

Solutions:
  1. Create a new FSD structure: /fsd:init (will prompt)
  2. Specify different source directory: /fsd:init --src <path>
```

### E103: Config Already Exists

**Location:** `commands/init.md`
**Cause:** `.fsd-architect.json` already exists

```
[E103] Configuration already exists

.fsd-architect.json already exists.

Solutions:
  1. Use existing config: /fsd:analyze
  2. Overwrite config: /fsd:init --force
```

### E104: Config Not Found

**Location:** `commands/analyze.md`
**Cause:** `.fsd-architect.json` missing when required

```
[E104] Configuration not found

.fsd-architect.json is required for this command.

Solution: Initialize first:
  /fsd:init
```

### E105: Invalid Layer Structure

**Location:** `commands/analyze.md`
**Cause:** Layer directories contain invalid structure

```
[E105] Invalid layer structure

Layer 'features' contains non-slice directories:
  - src/features/utils/  (should be in shared/lib)
  - src/features/types/  (should be in shared/types)

Solution: Move utility code to appropriate layers.
```

### E106: Steiger Failed

**Location:** `commands/validate.md`
**Cause:** Steiger execution error

```
[E106] Steiger execution failed

Error running Steiger: [error message]

Solutions:
  1. Install Steiger: npm install -D @feature-sliced/steiger
  2. Skip Steiger: /fsd:validate --no-steiger
```

### E107: Unknown Topic

**Location:** `commands/explain.md`
**Cause:** Invalid topic for explain command

```
[E107] Unknown topic

Topic 'controllers' not recognized.

Available topics:
  layers, feature-vs-widget, entity-vs-feature,
  public-api, segments, cross-imports, hierarchy,
  shared, slices

Or ask a custom question:
  /fsd:explain "your question here"
```

---

## E2xx: Validation Errors

### E201: Forbidden Cross-Slice Import

**Location:** `skills/boundary-checker/SKILL.md`
**Cause:** Same-layer slice importing from another slice

```
[E201] Forbidden Cross-Slice Import

Feature 'auth' imports from feature 'cart'.
Location: src/features/auth/model/session.ts:15

Rule: Features cannot import from other features.
      Each feature should be isolated.

Solutions:
  1. Move shared logic to entities layer
  2. Create a composition in widgets layer
  3. Use @x/ cross-reference pattern (advanced)

Learn more: https://feature-sliced.design/docs/reference/isolation
```

### E202: Public API Sidestep

**Location:** `skills/boundary-checker/SKILL.md`
**Cause:** Direct import of internal path instead of public API

```
[E202] Public API Sidestep

Importing from internal path instead of public API.
Location: src/features/cart/api/addToCart.ts:8

Found:   import { formatPrice } from '@entities/product/lib/formatters'
Expected: import { formatPrice } from '@entities/product'

Solutions:
  1. Export through public API:
     // src/entities/product/index.ts
     export { formatPrice } from './lib/formatters';

  2. Import from public API:
     import { formatPrice } from '@entities/product';

Learn more: https://feature-sliced.design/docs/reference/public-api
```

### E203: Forbidden Higher-Layer Import

**Location:** `skills/boundary-checker/SKILL.md`
**Cause:** Lower layer importing from higher layer

```
[E203] Forbidden Higher-Layer Import

Entity 'user' imports from feature 'auth'.
Location: src/entities/user/model/index.ts:5

Rule: entities (layer 3) cannot import from features (layer 4).
      Lower layers must not depend on higher layers.

Layer hierarchy (low → high):
  shared (1) → entities (2) → features (3) → widgets (4) → pages (5) → app (6)

Solutions:
  1. Move the shared logic to a lower layer
  2. Invert the dependency direction
```

### E204: Missing Public API

**Location:** `skills/boundary-checker/SKILL.md`
**Cause:** Slice has no index.ts file

```
[E204] Missing Public API

Slice 'auth' has no public API (index.ts).
Location: src/features/auth/

Every slice must export through a public API file.

Solution: Create public API:
  // src/features/auth/index.ts
  export { LoginForm } from './ui';
  export { useAuth } from './model';
  export type { User } from './model';
```

### E205: Circular Dependency

**Location:** `skills/boundary-checker/SKILL.md`
**Cause:** Circular import between slices

```
[E205] Circular Dependency Detected

Circular import chain:
  features/auth → features/user → features/auth

This creates a dependency cycle that can cause:
  - Runtime errors
  - Bundle size issues
  - Maintenance difficulties

Solutions:
  1. Extract shared logic to entities layer
  2. Create a new slice that both depend on
  3. Use dependency injection pattern
```

---

## E3xx: Generation Errors

### E301: Slice Already Exists

**Location:** `skills/slice-generator/SKILL.md`
**Cause:** Target slice directory already exists

```
[E301] Slice Already Exists

'auth' already exists in features layer.
Location: src/features/auth/

Solutions:
  1. Choose a different name
  2. Add segments to existing slice: /fsd:scaffold features auth api
  3. Overwrite (DESTRUCTIVE): /fsd:scaffold features auth --force
```

### E302: Invalid Layer

**Location:** `skills/slice-generator/SKILL.md`
**Cause:** Attempting to create slice in non-sliced layer

```
[E302] Invalid Layer

Cannot create slice in 'app' layer.
The 'app' layer is not sliced.

Valid sliced layers:
  ✓ pages
  ✓ widgets
  ✓ features
  ✓ entities

Non-sliced layers (no slices):
  ✗ app
  ✗ shared
```

### E303: Invalid Slice Name

**Location:** `skills/slice-generator/SKILL.md`
**Cause:** Slice name contains invalid characters

```
[E303] Invalid Slice Name

Slice name 'my slice' contains invalid characters.

Valid naming patterns:
  ✓ kebab-case: user-profile
  ✓ camelCase: userProfile
  ✓ PascalCase: UserProfile

Invalid patterns:
  ✗ Spaces: my slice
  ✗ Special chars: user@profile
  ✗ Numbers first: 123user
```

### E304: Path Traversal Attempt

**Location:** `skills/slice-generator/SKILL.md`
**Cause:** Slice name contains path traversal sequences (SECURITY)

```
[E304] Path Traversal Attempt Blocked

Slice name contains forbidden characters.

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

---

## E4xx: Configuration Errors

### E401: Invalid Configuration

**Cause:** Malformed JSON in `.fsd-architect.json`

```
[E401] Invalid Configuration

Cannot parse .fsd-architect.json: Unexpected token at line 5

Solutions:
  1. Fix JSON syntax errors
  2. Validate JSON: cat .fsd-architect.json | jq .
  3. Regenerate config: /fsd:init --force
```

### E402: Missing Required Field

**Cause:** Configuration missing required field

```
[E402] Missing Required Field

Configuration is missing required field: srcDir

Required fields:
  - srcDir: Source directory path

Solution: Add missing field to .fsd-architect.json:
  {
    "srcDir": "src",
    ...
  }
```

### E403: Invalid Layer Path

**Cause:** Layer path is outside srcDir or absolute

```
[E403] Invalid Layer Path

Layer path '../outside' is outside source directory.

Rules:
  - Layer paths must be relative to srcDir
  - Layer paths must not contain '..'
  - Layer paths must not be absolute

Solution: Update layer paths in .fsd-architect.json:
  {
    "layers": {
      "features": { "path": "features" }  // relative to srcDir
    }
  }
```

### E404: Unknown Layer Name

**Cause:** Configuration contains unknown layer name

```
[E404] Unknown Layer Name

Unknown layer 'controllers' in configuration.

Valid FSD layers:
  - app
  - pages
  - widgets
  - features
  - entities
  - shared

Solution: Use standard FSD layer names.
```

### E405: Invalid Pattern Configuration

**Cause:** Pattern configuration has invalid value

```
[E405] Invalid Pattern Configuration

Invalid naming convention: 'snake_case'

Valid naming conventions:
  - kebab-case
  - camelCase
  - PascalCase

Solution: Update patterns in .fsd-architect.json:
  {
    "patterns": {
      "naming": "kebab-case"
    }
  }
```

---

## E5xx: Cache Errors

### E501: Cache Corrupted

**Cause:** Invalid JSON in `.fsd-architect.cache.json`

```
[E501] Cache Corrupted

Cannot parse cache file: Invalid JSON

Solution: Delete cache file (will regenerate on next run):
  rm .fsd-architect.cache.json
```

### E502: Cache Write Failed

**Cause:** Cannot write to cache file

```
[E502] Cache Write Failed

Cannot write to .fsd-architect.cache.json

Possible causes:
  - Insufficient disk space
  - File permission denied
  - Read-only file system

Solutions:
  1. Check disk space: df -h
  2. Check permissions: ls -la .fsd-architect.cache.json
  3. Continue without cache: /fsd:analyze --no-cache
```

### E503: Cache Version Mismatch

**Cause:** Cache from older plugin version

```
[E503] Cache Version Mismatch

Cache was created with plugin version 0.1.0.
Current plugin version is 0.2.0.

Action: Cache automatically invalidated. Full rescan will run.
```

### E504: Cache Timestamp Invalid

**Cause:** Cache timestamp is corrupt or in future

```
[E504] Cache Timestamp Invalid

Cache timestamp is invalid or in the future.

Solution: Delete cache file:
  rm .fsd-architect.cache.json
```

---

## W1xx: Warnings (Non-blocking)

### W101: Inconsistent Naming

**Cause:** Mix of naming conventions detected

```
[W101] Inconsistent Naming

Mixed naming conventions in features layer:
  kebab-case: auth, user-profile, shopping-cart
  PascalCase: ProductReviews  ← inconsistent

Recommendation: Standardize on one convention.

Auto-fix available: /fsd:validate --fix
```

### W102: Unused Export

**Cause:** Export in index.ts not imported anywhere

```
[W102] Unused Export

Export 'legacyHelper' in features/auth/index.ts is not imported anywhere.

Recommendation:
  1. Remove if truly unused
  2. Verify intended external usage
```

### W103: Missing Segment

**Cause:** Common segment missing in slice

```
[W103] Missing Segment

Slice 'auth' is missing common segment 'model/'.
Other features use: ui/, model/, api/

Recommendation: Add model/ segment if business logic is needed.
```

### W104: Oversized Slice

**Cause:** Slice contains too many files

```
[W104] Oversized Slice

Slice 'user' contains 47 files.
Average slice size is 12 files.

Recommendation: Consider splitting into smaller slices:
  - entities/user (core user data)
  - entities/user-preferences (settings)
  - entities/user-avatar (media)
```

---

## Quick Reference

| Code | Severity | Category | Quick Fix |
|------|----------|----------|-----------|
| E101 | Error | Detection | `/fsd:init --src <path>` |
| E102 | Error | Detection | `/fsd:init` to create structure |
| E103 | Error | Detection | `/fsd:init --force` |
| E104 | Error | Detection | `/fsd:init` first |
| E105 | Error | Detection | Move files to correct layers |
| E106 | Error | Detection | Install Steiger or `--no-steiger` |
| E107 | Error | Detection | Check available topics |
| E201 | Error | Validation | Move to entities/shared |
| E202 | Error | Validation | Export through index.ts |
| E203 | Error | Validation | Invert dependency |
| E204 | Error | Validation | Create index.ts |
| E205 | Error | Validation | Extract shared logic |
| E301 | Error | Generation | Choose different name |
| E302 | Error | Generation | Use sliced layer |
| E303 | Error | Generation | Fix naming format |
| E304 | Error | Generation | Remove path characters |
| E401 | Error | Config | Fix JSON syntax |
| E402 | Error | Config | Add required field |
| E403 | Error | Config | Use relative paths |
| E404 | Error | Config | Use valid layer name |
| E405 | Error | Config | Use valid pattern |
| E501 | Error | Cache | Delete cache file |
| E502 | Error | Cache | Check permissions |
| E503 | Info | Cache | Auto-invalidated |
| E504 | Error | Cache | Delete cache file |
| W101 | Warning | Style | `/fsd:validate --fix` |
| W102 | Warning | Style | Remove or verify usage |
| W103 | Warning | Style | Add missing segment |
| W104 | Warning | Style | Split slice |
