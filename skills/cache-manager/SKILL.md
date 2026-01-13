---
name: cache-manager
description: Manage OpenAPI spec cache and implementation state for efficient diff-based sync
---

# Cache Manager

Caching system skill for saving tokens and time.

## Core Principle: Cache is Hint, Verification is Required

```
⚠️ Cache is used as "fast hint" only
⚠️ Always compare directly with actual spec before code generation
⚠️ 100% accuracy > speed
```

**Conservative Mode (default):**
- Cache hash comparison → Provides hint only
- Always fetch spec → Compare directly with code
- Generate if different, skip if same

**Trust Cache Mode (--trust-cache):**
- Skip if cache hash matches
- Fast but edge case risk
- Use only when explicitly requested

## Cache Files

### 1. Spec Cache (.openapi-sync.cache.json)

```json
{
  "version": "1.0.0",
  "lastFetch": "2024-01-13T12:00:00Z",
  "specHash": "sha256:abc123...",
  "source": "https://api.example.com/openapi.json",
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

1. Fetch OpenAPI spec
2. Generate spec hash (SHA256)
3. Extract endpoint list
4. Generate schema hashes
5. Save .openapi-sync.cache.json

6. Scan codebase
7. Extract implemented endpoint list
8. Save .openapi-sync.state.json
```

### 2. Check for Changes (fast check)

```typescript
async function hasChanges(): Promise<{
  specChanged: boolean;
  newHash: string;
  oldHash: string;
}> {
  // 1. Get current spec hash only (HEAD or ETag)
  const newHash = await getSpecHash(source);

  // 2. Compare with cached hash
  const cache = readCache();

  return {
    specChanged: newHash !== cache.specHash,
    newHash,
    oldHash: cache.specHash
  };
}
```

### 3. Compute Diff (only when changes detected)

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

### 4. Update Cache

```
After processing changes:

1. Update cache with new spec
2. Update implementation state
3. Refresh timestamp
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

### Quick Hash (for fast change check)

```typescript
async function getQuickHash(url: string): Promise<string> {
  // Method 1: HEAD request to check ETag/Last-Modified
  const response = await fetch(url, { method: 'HEAD' });
  const etag = response.headers.get('ETag');
  if (etag) return etag;

  // Method 2: Download full content and hash
  const spec = await fetch(url).then(r => r.text());
  return crypto.createHash('sha256').update(spec).digest('hex');
}
```

## Efficiency Gains

### Before (no caching)

```
Each request:
1. Fetch entire spec       → 5s, 10K tokens
2. Analyze entire spec     → 3s, 20K tokens
3. Scan entire codebase    → 10s, 15K tokens
4. Full comparison         → 2s, 10K tokens
─────────────────────────────────────
Total: 20s, 55K tokens
```

### After - Conservative Mode (default, 100% accuracy)

```
When no changes:
1. Fetch spec              → 2s, 2K tokens
2. Check cache hint        → 0.1s
3. Direct spec-code compare → 3s, 5K tokens
4. No changes confirmed    → Skip
─────────────────────────────────────
Total: 5s, 7K tokens (87% savings)

When changes detected:
1. Fetch spec              → 2s, 2K tokens
2. Direct spec-code compare → 3s, 5K tokens
3. Generate changes only   → 3s, 5K tokens
─────────────────────────────────────
Total: 8s, 12K tokens (78% savings)
```

### After - Trust Cache Mode (--trust-cache, fast)

```
When no changes:
1. Hash comparison only    → 1s, 0.5K tokens
─────────────────────────────────────
Total: 1s, 0.5K tokens (99% savings)

⚠️ Warning: May miss changes if cache corrupted/server error
```

### Mode Comparison

| Mode | No Changes | With Changes | Accuracy |
|------|------------|--------------|----------|
| No caching | 20s, 55K | 20s, 55K | 100% |
| Conservative (default) | 5s, 7K | 8s, 12K | 100% |
| Trust Cache | 1s, 0.5K | 6s, 7.5K | 99%* |

*edge case risk exists

## Cache Invalidation

```
Cache invalidation conditions:
1. Manual request: /api:sync --force
2. Cache file not found
3. Cache version mismatch
4. More than 24 hours elapsed (optional)
```

## Error Handling

```
Cache read failure:
  → Create new cache

Cache corrupted:
  → Delete and create new

Spec fetch failure:
  → Use cached version (with warning)
```
