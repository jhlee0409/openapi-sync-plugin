---
name: cache-manager
description: Manage analysis cache for incremental FSD validation
---

# Cache Manager Skill

분석 결과를 캐시하여 증분 검증을 지원합니다.

## WHEN TO USE

This skill is invoked by:
- `/fsdarch:analyze` - To enable incremental analysis
- `/fsdarch:validate` - To speed up validation

## EXECUTION INSTRUCTIONS

### Step 1: Check Cache Existence

**Action:** Check if cache file exists

```
1. Use Glob to check for .fsd-architect.cache.json
2. If not found → return { valid: false, reason: 'no-cache' }
3. If found → proceed to Step 2
```

**Glob command:**
```bash
Glob: ".fsd-architect.cache.json"
```

### Step 2: Validate Cache

**Action:** Read and validate cache integrity

```
1. Read .fsd-architect.cache.json using Read tool
2. Parse JSON (handle parse errors → E501)
3. Check version field matches current plugin version
4. Compute hash of .fsd-architect.json
5. Compare with cached configHash
```

**Read commands:**
```bash
Read: .fsd-architect.cache.json
Read: .fsd-architect.json  # For hash comparison
```

**Validation checks:**
```typescript
// Version check
if (cache.version !== '1.0.0') {
  return { valid: false, reason: 'version-mismatch' };  // E503
}

// Config hash check (simple string hash)
const currentConfig = await read('.fsd-architect.json');
const currentHash = simpleHash(currentConfig);
if (cache.configHash !== currentHash) {
  return { valid: false, reason: 'config-changed' };
}

// Age check (24 hours = 86400000 ms)
if (Date.now() - cache.timestamp > 86400000) {
  return { valid: false, reason: 'expired' };
}
```

```typescript
interface CacheFile {
  version: string;
  configHash: string;
  timestamp: number;
  layers: LayerCache;
  files: FileCache;
}

interface LayerCache {
  [layerName: string]: {
    path: string;
    slices: string[];
    lastModified: number;
  };
}

interface FileCache {
  [filePath: string]: {
    mtime: number;
    imports: string[];
    violations: Violation[];
  };
}
```

### Step 3: Detect Changes

1. Get current file list using Glob
2. Compare with cached file list
3. For each file, check mtime against cached mtime

```typescript
interface ChangeSet {
  added: string[];    // New files
  modified: string[]; // Changed files
  removed: string[];  // Deleted files
  unchanged: string[];
}
```

### Step 4: Return Cache Status

```typescript
interface CacheStatus {
  valid: boolean;
  reason?: 'no-cache' | 'version-mismatch' | 'config-changed' | 'expired';
  changes?: ChangeSet;
  cached?: {
    layers: LayerCache;
    files: FileCache;
  };
}
```

## WRITE CACHE

### Step 1: Prepare Cache Data

1. Get current analysis results
2. Get file mtimes for all analyzed files
3. Compute config hash

### Step 2: Write Cache File

```json
{
  "version": "0.1.0",
  "configHash": "abc123...",
  "timestamp": 1699999999999,
  "layers": {
    "features": {
      "path": "src/features",
      "slices": ["auth", "cart", "checkout"],
      "lastModified": 1699999999000
    }
  },
  "files": {
    "src/features/auth/model/session.ts": {
      "mtime": 1699999998000,
      "imports": ["@entities/user", "@features/cart"],
      "violations": [
        {
          "code": "E201",
          "target": "@features/cart"
        }
      ]
    }
  }
}
```

### Step 3: Update .gitignore

Check if `.fsd-architect.cache.json` is in `.gitignore`.
If not, suggest adding it:

```
# FSD Architect cache
.fsd-architect.cache.json
```

## INVALIDATE CACHE

### When to Invalidate

1. Plugin version changed
2. Config file changed
3. Cache older than 24 hours
4. Manual `--force` flag

### How to Invalidate

1. Delete `.fsd-architect.cache.json`
2. Or return `{ valid: false }` to trigger full rescan

## ALGORITHM

```
function checkCache():
  cachePath = '.fsd-architect.cache.json'

  if not exists(cachePath):
    return { valid: false, reason: 'no-cache' }

  cache = read(cachePath)

  // Version check
  if cache.version != PLUGIN_VERSION:
    return { valid: false, reason: 'version-mismatch' }

  // Config check
  currentConfigHash = hash(read('.fsd-architect.json'))
  if cache.configHash != currentConfigHash:
    return { valid: false, reason: 'config-changed' }

  // Age check (24 hours)
  if now() - cache.timestamp > 86400000:
    return { valid: false, reason: 'expired' }

  // Detect changes
  currentFiles = glob('**/*.{ts,tsx,js,jsx}')
  changes = detectChanges(cache.files, currentFiles)

  return {
    valid: true,
    changes: changes,
    cached: cache
  }

function writeCache(analysisResult):
  cache = {
    version: PLUGIN_VERSION,
    configHash: hash(read('.fsd-architect.json')),
    timestamp: now(),
    layers: analysisResult.layers,
    files: {}
  }

  for file in analysisResult.files:
    cache.files[file.path] = {
      mtime: getMtime(file.path),
      imports: file.imports,
      violations: file.violations
    }

  write('.fsd-architect.cache.json', cache)
  ensureGitignore('.fsd-architect.cache.json')
```

## PERFORMANCE

### Incremental Analysis

When cache is valid with changes:

1. Only re-analyze `changes.added` and `changes.modified`
2. Remove `changes.removed` from cache
3. Keep `changes.unchanged` from cache
4. Merge results

### Expected Performance

| Scenario | Full Scan | Incremental |
|----------|-----------|-------------|
| 100 files | ~5s | ~0.5s |
| 500 files | ~20s | ~1s |
| 1000 files | ~45s | ~2s |

## ERROR HANDLING

### Corrupted Cache

If cache file is invalid JSON:
- Delete cache file
- Return `{ valid: false, reason: 'corrupted' }`
- Continue with full scan

### Disk Space

If cannot write cache:
- Log warning
- Continue without cache
- Analysis results still valid
