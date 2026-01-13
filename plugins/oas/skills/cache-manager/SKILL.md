---
name: cache-manager
description: Manage OpenAPI spec cache and implementation state for efficient diff-based sync
---

# Cache Manager

Smart caching system for saving tokens and time.

## Core Principle: Smart Caching

```
┌─────────────────────────────────────────────────────────────────┐
│  Smart Caching Strategy                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Check cache validity (HEAD request or mtime)                │
│  2. Use cache if unchanged → Fast ✅                            │
│  3. Full fetch only when changed → Accurate ✅                  │
└─────────────────────────────────────────────────────────────────┘
```

## Caching Modes

| Mode | Flag | Behavior |
|------|------|----------|
| **Smart** | (default) | HEAD/mtime check → use cache if unchanged |
| **Force** | `--force` | Always fetch, ignore cache |
| **Offline** | `--offline` | Use cache only, no network requests |

## Cache Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Remote URL Source (https://...)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   sync/diff/status 실행                                         │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────┐                                               │
│   │ Cache exists?│                                              │
│   └──────┬──────┘                                               │
│          │                                                      │
│    Yes   │   No                                                 │
│    ▼     └────────────────────┐                                 │
│   ┌─────────────────┐         │                                 │
│   │ HEAD request    │         │                                 │
│   │ (ETag/Last-Mod) │         │                                 │
│   └────────┬────────┘         │                                 │
│            │                  │                                 │
│   ┌────────┴────────┐         │                                 │
│   │                 │         │                                 │
│   ▼                 ▼         ▼                                 │
│ [Unchanged]      [Changed]  [No Cache]                          │
│   │                 │         │                                 │
│   ▼                 └────┬────┘                                 │
│ Use Cache              ▼                                        │
│ (Fast ⚡)         Full Fetch                                    │
│                        │                                        │
│                        ▼                                        │
│                  Update Cache                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Local File Source (./openapi.json)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   sync/diff/status 실행                                         │
│         │                                                       │
│         ▼                                                       │
│   ┌──────────────────────┐                                      │
│   │ Compare file mtime   │                                      │
│   │ vs cache.lastFetch   │                                      │
│   └──────────┬───────────┘                                      │
│              │                                                  │
│   ┌──────────┴──────────┐                                       │
│   │                     │                                       │
│   ▼                     ▼                                       │
│ [mtime ≤ cache]    [mtime > cache]                              │
│   │                     │                                       │
│   ▼                     ▼                                       │
│ Use Cache           Read File                                   │
│ (Fast ⚡)           Update Cache                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cache Files

### 1. Spec Cache (.openapi-sync.cache.json)

```json
{
  "version": "1.0.0",
  "lastFetch": "2024-01-13T12:00:00Z",
  "specHash": "sha256:abc123...",
  "source": "https://api.example.com/openapi.json",

  "httpCache": {
    "etag": "\"abc123def456\"",
    "lastModified": "Sat, 13 Jan 2024 12:00:00 GMT"
  },

  "localCache": {
    "mtime": 1705147200000
  },

  "meta": {
    "title": "My API",
    "version": "2.0.0",
    "endpointCount": 150
  },

  "endpoints": {
    "publisher": [
      { "method": "POST", "path": "/publisher/auth/{provider}", "operationId": "getAuthUrl" },
      { "method": "GET", "path": "/publisher/platforms", "operationId": "getPlatforms" }
    ],
    "video": [
      { "method": "GET", "path": "/videos/{id}", "operationId": "getVideo" }
    ]
  },

  "schemas": {
    "User": "sha256:def456...",
    "Project": "sha256:ghi789..."
  }
}
```

### 2. Implementation State Cache (.openapi-sync.state.json)

```json
{
  "version": "1.0.0",
  "lastSync": "2024-01-13T12:00:00Z",
  "lastScan": "2024-01-13T12:00:00Z",
  "implemented": {
    "publisher": {
      "path": "src/entities/publisher",
      "endpoints": ["getAuthUrl", "getPlatforms", "publishVideo", "disconnectPlatform"],
      "files": {
        "api": "src/entities/publisher/api/publisher-api.ts",
        "types": "src/entities/publisher/model/publisher-types.ts",
        "paths": "src/entities/publisher/config/publisher-api-paths.ts"
      }
    },
    "video": {
      "path": "src/entities/video",
      "endpoints": ["getVideo", "getSubtitles"],
      "files": { ... }
    }
  },
  "missing": ["tools", "public"],
  "partial": {
    "workspace": {
      "implemented": ["getPlatforms", "createWorkspace"],
      "missing": ["getInvitation", "acceptInvitation"]
    }
  }
}
```

## Cache Operations

### 1. Initialize Cache

```
On first run or when cache doesn't exist:

1. Fetch OpenAPI spec (full request)
2. Store HTTP headers (ETag, Last-Modified) or file mtime
3. Generate spec hash (SHA256)
4. Extract endpoint list
5. Generate schema hashes
6. Save .openapi-sync.cache.json

7. Scan codebase
8. Extract implemented endpoint list
9. Save .openapi-sync.state.json
```

### 2. Smart Cache Check

```typescript
interface CacheCheckResult {
  cacheValid: boolean;
  reason: 'etag_match' | 'mtime_match' | 'changed' | 'no_cache' | 'forced';
  cachedSpec?: OpenAPISpec;
}

async function checkCache(source: string, flags: Flags): Promise<CacheCheckResult> {
  // Force mode: always refetch
  if (flags.force) {
    return { cacheValid: false, reason: 'forced' };
  }

  const cache = readCache();
  if (!cache) {
    return { cacheValid: false, reason: 'no_cache' };
  }

  // Offline mode: always use cache
  if (flags.offline) {
    return { cacheValid: true, reason: 'etag_match', cachedSpec: cache.spec };
  }

  // Remote URL: HEAD request
  if (source.startsWith('http')) {
    return await checkRemoteCache(source, cache);
  }

  // Local file: mtime check
  return checkLocalCache(source, cache);
}

async function checkRemoteCache(url: string, cache: Cache): Promise<CacheCheckResult> {
  const response = await fetch(url, { method: 'HEAD' });

  // Check ETag first (most reliable)
  const etag = response.headers.get('ETag');
  if (etag && cache.httpCache?.etag === etag) {
    return { cacheValid: true, reason: 'etag_match', cachedSpec: cache.spec };
  }

  // Fallback to Last-Modified
  const lastModified = response.headers.get('Last-Modified');
  if (lastModified && cache.httpCache?.lastModified === lastModified) {
    return { cacheValid: true, reason: 'etag_match', cachedSpec: cache.spec };
  }

  return { cacheValid: false, reason: 'changed' };
}

function checkLocalCache(filePath: string, cache: Cache): CacheCheckResult {
  const stats = fs.statSync(filePath);
  const mtime = stats.mtimeMs;

  if (cache.localCache?.mtime === mtime) {
    return { cacheValid: true, reason: 'mtime_match', cachedSpec: cache.spec };
  }

  return { cacheValid: false, reason: 'changed' };
}
```

### 3. Fetch and Update Cache

```typescript
async function fetchAndUpdateCache(source: string): Promise<OpenAPISpec> {
  let spec: OpenAPISpec;
  let cacheData: Partial<Cache> = {};

  if (source.startsWith('http')) {
    const response = await fetch(source);
    spec = await response.json();

    // Store HTTP cache headers
    cacheData.httpCache = {
      etag: response.headers.get('ETag'),
      lastModified: response.headers.get('Last-Modified')
    };
  } else {
    // Local file
    const content = fs.readFileSync(source, 'utf-8');
    spec = JSON.parse(content);

    const stats = fs.statSync(source);
    cacheData.localCache = {
      mtime: stats.mtimeMs
    };
  }

  // Update cache
  cacheData.lastFetch = new Date().toISOString();
  cacheData.specHash = generateSpecHash(spec);
  cacheData.source = source;
  // ... extract endpoints, schemas, etc.

  saveCache(cacheData);
  return spec;
}
```

### 4. Compute Diff (only when changes detected)

```typescript
interface SpecDiff {
  added: Endpoint[];      // Newly added endpoints
  removed: Endpoint[];    // Deleted endpoints
  modified: {             // Changed endpoints
    endpoint: Endpoint;
    changes: SchemaChange[];
  }[];
  unchanged: Endpoint[];  // No changes
}

function computeDiff(oldSpec: Cache, newSpec: Spec): SpecDiff {
  const oldEndpoints = new Map(oldSpec.endpoints);
  const newEndpoints = new Map(newSpec.endpoints);

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  // Check each endpoint in new spec
  for (const [key, endpoint] of newEndpoints) {
    if (!oldEndpoints.has(key)) {
      added.push(endpoint);
    } else {
      const oldEndpoint = oldEndpoints.get(key);
      const changes = compareSchemas(oldEndpoint, endpoint);
      if (changes.length > 0) {
        modified.push({ endpoint, changes });
      } else {
        unchanged.push(endpoint);
      }
    }
  }

  // Check for deleted endpoints
  for (const [key, endpoint] of oldEndpoints) {
    if (!newEndpoints.has(key)) {
      removed.push(endpoint);
    }
  }

  return { added, removed, modified, unchanged };
}
```

## Hash Generation

### Spec Hash

```typescript
function generateSpecHash(spec: OpenAPISpec): string {
  // Convert entire spec to normalized JSON and hash
  const normalized = JSON.stringify(spec, Object.keys(spec).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

### Schema Hash (for individual schemas)

```typescript
function generateSchemaHash(schema: Schema): string {
  const normalized = JSON.stringify(schema, Object.keys(schema).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

## Cache Invalidation

```
Cache invalidation conditions:

1. --force flag: Always refetch
2. Cache file not found: Full fetch required
3. Cache version mismatch: Schema upgrade needed
4. ETag/Last-Modified changed: Remote spec updated
5. File mtime changed: Local spec updated
```

## Command Flag Reference

```
┌─────────────────────────────────────────────────────────────────┐
│  Flag Usage                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /oas:sync                                                      │
│    → Smart caching (HEAD/mtime check)                           │
│    → Use cache if unchanged                                     │
│                                                                 │
│  /oas:sync --force                                              │
│    → Ignore cache completely                                    │
│    → Always full fetch                                          │
│    → Use when: cache seems stale, debugging                     │
│                                                                 │
│  /oas:sync --offline                                            │
│    → Use cache only, no network                                 │
│    → Fail if no cache exists                                    │
│    → Use when: airplane mode, CI without network                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│  Error Scenarios                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HEAD request failed (network error):                           │
│    → Fall back to full fetch                                    │
│    → If fetch also fails → Use cache with warning               │
│                                                                 │
│  Cache read failure:                                            │
│    → Create new cache                                           │
│                                                                 │
│  Cache corrupted (invalid JSON):                                │
│    → Delete and create new                                      │
│                                                                 │
│  Spec fetch failure + no cache:                                 │
│    → Error: "Cannot fetch spec and no cache available"          │
│                                                                 │
│  --offline + no cache:                                          │
│    → Error: "Offline mode requires existing cache"              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Output Messages

```
┌─────────────────────────────────────────────────────────────────┐
│  Cache Status Messages                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Using cached spec (ETag unchanged)                          │
│  ✅ Using cached spec (file not modified)                       │
│  🔄 Spec changed, fetching updates...                           │
│  ⚠️ Network error, using cached version                         │
│  📥 No cache found, fetching spec...                            │
│  🔄 Force mode: refetching spec...                              │
│  📦 Offline mode: using cached spec                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
