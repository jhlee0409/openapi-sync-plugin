# Performance Optimization Guide

Strategies and best practices for optimal OAS plugin performance.

---

## Quick Reference

| Scenario | Command | Expected Speed |
|----------|---------|----------------|
| No changes | `/oas:sync` | < 2 seconds |
| Small changes | `/oas:sync` | 5-10 seconds |
| Large spec (500+) | `/oas:sync --tag=X` | 10-30 seconds |
| First sync | `/oas:sync` | 30-60 seconds |
| Offline | `/oas:sync --offline` | < 1 second |

---

## Smart Caching Strategy

### How Caching Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART CACHING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   /oas:sync                                                  │
│       │                                                      │
│       ▼                                                      │
│   ┌─────────────────┐                                        │
│   │ Cache exists?   │                                        │
│   └────────┬────────┘                                        │
│            │                                                 │
│     No     │      Yes                                        │
│     │      │        │                                        │
│     │      │        ▼                                        │
│     │      │   ┌─────────────────┐                           │
│     │      │   │ HEAD request    │ ← Fast check (no body)    │
│     │      │   │ Check ETag      │                           │
│     │      │   └────────┬────────┘                           │
│     │      │            │                                    │
│     │      │   Match    │    Different                       │
│     │      │     │      │        │                           │
│     │      │     ▼      │        ▼                           │
│     │      │  ┌──────┐  │   ┌─────────┐                      │
│     │      │  │ USE  │  │   │ FETCH   │                      │
│     │      │  │CACHE │  │   │ NEW     │                      │
│     │      │  │ ⚡   │  │   │ SPEC    │                      │
│     │      │  └──────┘  │   └─────────┘                      │
│     │      │            │                                    │
│     │      └────────────┘                                    │
│     │                                                        │
│     ▼                                                        │
│   ┌─────────────────┐                                        │
│   │ Full fetch      │                                        │
│   │ Create cache    │                                        │
│   └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cache Validation Methods

| Source Type | Validation Method | Fast Check |
|-------------|-------------------|------------|
| Remote URL | ETag/Last-Modified via HEAD | Yes |
| Local file | File mtime comparison | Yes |
| Offline | No validation needed | Instant |

### Cache Files

```
.openapi-sync.cache.json     # Spec cache with metadata
.openapi-sync.state.json     # Implementation state
```

**Cache structure:**
```json
{
  "version": "1.0",
  "timestamp": "2024-01-13T12:00:00Z",
  "source": "https://api.example.com/openapi.json",
  "etag": "\"abc123def456\"",
  "lastModified": "Sat, 13 Jan 2024 10:00:00 GMT",
  "spec": { ... }
}
```

### Cache Hit Scenarios

| Scenario | Result | Network Cost |
|----------|--------|--------------|
| ETag matches | Cache hit | 1 HEAD request |
| ETag differs | Cache miss | HEAD + GET |
| No ETag support | Always fetch | 1 GET request |
| --offline | Use cache | 0 requests |
| --force | Ignore cache | 1 GET request |

---

## Network Optimization

### Conditional Requests

**HEAD Request (Default):**
```
HEAD /openapi.json HTTP/1.1
Host: api.example.com

Response headers checked:
- ETag: "abc123"
- Last-Modified: Sat, 13 Jan 2024 10:00:00 GMT
```

**Conditional GET (If-None-Match):**
```
GET /openapi.json HTTP/1.1
Host: api.example.com
If-None-Match: "abc123"

304 Not Modified → Use cache
200 OK → New content
```

### Timeout Configuration

| Timeout Type | Default | Purpose |
|--------------|---------|---------|
| Connection | 10s | Initial connection |
| Read | 30s | Receiving data |
| Total | 60s | Entire operation |

**For slow networks:**
```
Recommended flags when network is slow:
- Use --offline if cache exists
- Use --force sparingly
- Consider --tag filtering to reduce payload
```

### Retry Strategy

```
On network error:
1. First failure: Retry immediately (might be transient)
2. Second failure: Wait 1 second, retry
3. Third failure: Use cache if available, else error

Retryable errors:
- Connection timeout
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

Non-retryable errors:
- 400 Bad Request
- 401 Unauthorized
- 404 Not Found
- Invalid JSON/YAML
```

---

## Large Spec Handling

### Detection Thresholds

| Size | Classification | Strategy |
|------|----------------|----------|
| < 100 endpoints | Small | Normal processing |
| 100-500 endpoints | Medium | Progress reporting |
| 500-1000 endpoints | Large | Batch processing |
| > 1000 endpoints | Very Large | Batch + tag filter recommended |

### Batch Processing

When endpoint count > 500:

```
1. Parse spec once (keep in memory)
2. Process in batches of 100 endpoints:
   - Generate types for batch
   - Generate API functions for batch
   - Generate hooks for batch
   - Write files immediately
   - Clear batch from memory
3. Report progress: "Processing 200/1500 endpoints..."
4. Suggest tag filtering for future runs
```

**Output for large spec:**
```
📊 Large spec detected (1500 endpoints)
   Processing in batches of 100...

   [████████░░░░░░░░░░░░] 40% (600/1500)

   💡 Tip: Use --tag=<domain> to process specific areas faster
```

### Tag Filtering for Performance

```bash
# Instead of processing all 1500 endpoints:
/oas:sync                    # 60+ seconds

# Process only what you need:
/oas:sync --tag=users        # 5 seconds (50 endpoints)
/oas:sync --tag=billing      # 3 seconds (30 endpoints)
```

### Memory Management

**INSTRUCTIONS for Claude:**

1. **Don't load entire spec into memory if not needed**
   - Parse once, reference by path
   - Clear parsed schemas after generating

2. **Generate files immediately**
   - Don't batch all generated content in memory
   - Write each file as it's generated

3. **Progress reporting for long operations**
   - Report every 100 endpoints
   - Allow user to see progress

---

## Incremental Sync Strategy

### Change Detection

```
Only process what changed:

NEW spec vs CACHED spec:
├── Added endpoints → Generate new files
├── Modified endpoints → Update existing files
├── Removed endpoints → Mark for review (don't auto-delete)
└── Unchanged endpoints → SKIP entirely
```

### Dependency Tracking

When an endpoint changes, also update:
```
1. Shared types used by the endpoint
2. Query hooks that call the endpoint
3. Re-export barrel files if new files added
```

### Incremental Output

```
/oas:sync

📊 Changes Detected:
   +3 added, ~2 modified, -1 removed
   (145 unchanged - skipping)

Processing changes only...

Generated:
  ✓ src/entities/clip/api/clip-api.ts (+3 functions)
  ✓ src/entities/clip/model/types.ts (+3 types)

Updated:
  ✓ src/entities/user/model/types.ts (~2 fields)

Skipped:
  - 145 unchanged endpoints (no changes needed)

Time: 8 seconds (vs 45 seconds for full sync)
```

---

## Mode Comparison

### Performance by Mode

| Mode | Network | Speed | Accuracy | Use When |
|------|---------|-------|----------|----------|
| Smart (default) | HEAD only* | Fast | 100% | Always |
| --force | Full GET | Slow | 100% | Cache seems wrong |
| --offline | None | Instant | Cache-based | No network |
| --dry-run | HEAD only* | Fast | Preview | Before sync |

*Full GET only when changes detected

### Expected Times

| Spec Size | Smart Mode | Force Mode | Offline |
|-----------|------------|------------|---------|
| 50 endpoints | 2-5s | 10-15s | <1s |
| 200 endpoints | 5-15s | 20-40s | <1s |
| 500 endpoints | 15-30s | 45-90s | 1-2s |
| 1000+ endpoints | 30-60s | 2-5min | 2-5s |

### Choosing the Right Mode

```
Default (/oas:sync):
  ✓ Use this 99% of the time
  ✓ Automatically optimal
  ✓ Fast when unchanged
  ✓ Accurate when changed

Force (/oas:sync --force):
  - Cache seems stale
  - Debugging issues
  - After spec URL changed

Offline (/oas:sync --offline):
  - No network access
  - CI/CD with pre-cached spec
  - Airplane mode development

Tag Filter (/oas:sync --tag=X):
  - Large spec (500+ endpoints)
  - Only working on specific domain
  - Faster iteration cycles
```

---

## Best Practices

### For Fast Development

1. **Use tag filtering**
   ```bash
   # Focus on what you're working on
   /oas:sync --tag=users
   ```

2. **Let caching work**
   ```bash
   # Don't use --force unless necessary
   /oas:sync  # Smart caching handles it
   ```

3. **Check before full sync**
   ```bash
   # Preview what will change
   /oas:sync --dry-run
   ```

### For CI/CD Pipelines

1. **Pre-cache in build**
   ```bash
   # In build step: fetch and cache spec
   /oas:sync --force  # Creates cache

   # In test step: use cache
   /oas:sync --offline  # No network needed
   ```

2. **Cache invalidation**
   ```bash
   # Invalidate cache when spec URL changes
   # Or on schedule (daily/weekly)
   /oas:sync --force
   ```

### For Large Teams

1. **Commit cache files (optional)**
   ```bash
   # .openapi-sync.cache.json in .gitignore by default
   # But can be committed for team-wide caching
   ```

2. **Use tag-based ownership**
   ```bash
   # Team A: owns users domain
   /oas:sync --tag=users

   # Team B: owns billing domain
   /oas:sync --tag=billing
   ```

---

## Troubleshooting Performance

### "Sync is slow even with caching"

**Possible causes:**
1. Cache miss every time (ETag changing)
   - Check if spec includes dynamic timestamps
   - Consider using local file source

2. Large spec without tag filtering
   - Use `--tag` to focus on relevant endpoints

3. Network latency
   - Check HEAD request time
   - Consider `--offline` with periodic cache updates

### "Cache never hits"

**Check:**
1. Server returns ETag or Last-Modified?
   ```bash
   # Test with curl
   curl -I https://api.example.com/openapi.json
   ```

2. Spec includes timestamps that change?
   - Some generators add "generatedAt" timestamps
   - This causes ETag to change on every request

3. Using `--force` accidentally?
   - Remove flag for normal operation

### "Out of memory with large spec"

**Solutions:**
1. Use tag filtering
   ```bash
   /oas:sync --tag=users  # Process subset
   ```

2. Process incrementally
   - Sync one tag at a time
   - Clear cache between runs if needed

---

## Performance Monitoring

### Timing Output

```
/oas:sync

⏱️ Performance Summary:
   Cache check: 0.2s
   Spec fetch: 0s (cache hit)
   Parse: 0.3s
   Generate: 1.5s
   Write: 0.5s
   Total: 2.5s
```

### Verbose Timing

```bash
/oas:sync --verbose

⏱️ Detailed Timing:
   [0.0s] Starting sync
   [0.1s] Cache found, checking freshness
   [0.2s] HEAD request sent
   [0.4s] ETag matched, using cache
   [0.5s] Parsing cached spec
   [0.8s] Detected 150 endpoints
   [0.9s] Comparing with codebase
   [1.2s] Found 3 changes
   [1.5s] Generating types
   [2.0s] Generating API functions
   [2.3s] Generating hooks
   [2.5s] Writing 4 files
   [2.6s] Complete

Total: 2.6s (cache hit, 3 changes processed)
```

---

## Reference

For edge cases and error handling:
- [EDGE-CASES.md](./EDGE-CASES.md) - Section 4: Performance Edge Cases
- [ERROR-CODES.md](./ERROR-CODES.md) - E1xx Network errors

For testing performance:
- [TESTING.md](./TESTING.md) - Large spec test scenarios
