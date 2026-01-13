# Quick Start Guide

Get up and running with the OAS plugin in 5 minutes.

---

## Cheat Sheet

### Commands at a Glance

```
┌─────────────┬─────────────────────────────────────────────────┐
│  Command    │  Purpose                                        │
├─────────────┼─────────────────────────────────────────────────┤
│ /oas:init   │  Initialize project with OpenAPI spec           │
│ /oas:sync   │  Generate/update code from spec                 │
│ /oas:diff   │  Show changes between spec versions             │
│ /oas:status │  Show implementation coverage                   │
│ /oas:validate │  Verify code matches spec                     │
│ /oas:lint   │  Check for inconsistencies                      │
│ /oas:analyze │  Analyze project patterns                      │
└─────────────┴─────────────────────────────────────────────────┘
```

### Most Common Flags

```
--force       Skip cache, always fetch fresh
--offline     Use cached spec only (no network)
--dry-run     Preview what would happen
--tag=name    Focus on specific domain only
--only-types  Generate types only
```

---

## 5-Minute Setup

### Step 1: Initialize (30 seconds)

```bash
/oas:init https://your-api.com/openapi.json
```

**What happens:**
- Fetches your OpenAPI spec
- Analyzes your codebase patterns
- Creates `.openapi-sync.json` config
- Adds cache files to `.gitignore`

### Step 2: Sync (2 minutes)

```bash
/oas:sync
```

**What happens:**
- Generates types, API functions, and hooks
- Matches your existing code style
- Creates files in detected structure

### Step 3: Verify (30 seconds)

```bash
/oas:validate
```

**What happens:**
- Checks generated code matches spec
- Reports any missing endpoints
- Shows type mismatches

**Done!** Your API client code is ready.

---

## Common Workflows

### Daily Development

```bash
# Start of day: Check if spec changed
/oas:diff --remote

# If changes detected: Update code
/oas:sync

# After implementing feature: Validate
/oas:validate
```

### Adding a New Domain

```bash
# Generate code for specific tag
/oas:sync --tag=billing

# Verify it was generated correctly
/oas:status --tag=billing
```

### Before Pull Request

```bash
# Validate code matches spec
/oas:validate --strict

# Check for inconsistencies
/oas:lint
```

### Updating After Spec Changes

```bash
# See what changed
/oas:diff --remote

# Check for breaking changes
/oas:diff --breaking-only

# Apply updates
/oas:sync
```

### Offline Development

```bash
# First, cache the spec
/oas:sync

# Later, work offline
/oas:sync --offline
/oas:validate --offline
```

---

## FAQ

### Setup Issues

**Q: "Config file not found" error**

```bash
# Run init first
/oas:init https://your-api.com/openapi.json
```

**Q: "No patterns detected" during init**

Provide a sample file explicitly:
```bash
/oas:init https://api.com/spec.json --sample-api=src/api/user-api.ts
```

**Q: Plugin can't access spec URL**

Try with authentication:
```json
// .openapi-sync.json
{
  "openapi": {
    "source": "https://api.com/openapi.json",
    "auth": {
      "type": "bearer",
      "token": "${API_TOKEN}"
    }
  }
}
```

### Sync Issues

**Q: Changes not being picked up**

```bash
# Force fresh fetch
/oas:sync --force
```

**Q: Want to regenerate everything**

```bash
# Delete cache and force sync
rm .openapi-sync.cache.json
/oas:sync --force
```

**Q: Only want types, no hooks**

```bash
/oas:sync --only-types
```

**Q: Sync is slow**

```bash
# Use tag filtering
/oas:sync --tag=user  # Only user domain
```

### Code Generation

**Q: Generated code doesn't match my style**

1. Check sample file in config:
```json
{
  "samples": {
    "api": "src/path/to/your/style.ts"
  }
}
```

2. Re-initialize with specific sample:
```bash
/oas:init --sample-api=src/my/preferred/style.ts
```

**Q: Want to exclude certain endpoints**

```json
{
  "ignore": [
    "/internal/*",
    "/admin/*"
  ]
}
```

**Q: Wrong directory structure**

Specify output path:
```json
{
  "output": {
    "basePath": "src/features"
  }
}
```

### Validation Issues

**Q: False positive warnings**

Add to ignore list:
```json
{
  "validation": {
    "ignorePaths": ["src/legacy/*"]
  }
}
```

**Q: Want to see only errors**

```bash
/oas:validate --quiet
```

---

## Tips & Tricks

### Speed Up Your Workflow

1. **Use tag filtering**
   ```bash
   # Focus on what you're working on
   /oas:sync --tag=user
   ```

2. **Preview before sync**
   ```bash
   # See what will be generated
   /oas:sync --dry-run
   ```

3. **Cache for offline work**
   ```bash
   # At start of day (with network)
   /oas:sync

   # Rest of day (can be offline)
   /oas:sync --offline
   ```

### Debug Issues

1. **See cache status**
   ```bash
   /oas:status --check-remote
   ```

2. **Force fresh start**
   ```bash
   rm .openapi-sync.cache.json
   /oas:sync --force
   ```

3. **Verbose output**
   ```bash
   /oas:sync --verbose
   ```

### CI/CD Integration

1. **Cache in build, use in test**
   ```bash
   # Build step
   /oas:sync --force

   # Test step
   /oas:validate --strict --offline
   ```

2. **Fail on breaking changes**
   ```bash
   # In CI
   /oas:diff --breaking-only
   # Returns non-zero if breaking changes found
   ```

### Team Collaboration

1. **Commit config, ignore cache**
   ```bash
   # .gitignore
   .openapi-sync.cache.json
   .openapi-sync.state.json
   ```

2. **Share sample files**
   ```
   Put samples in a shared location:
   src/shared/examples/
   ```

---

## Command Reference

### /oas:init

```bash
# Basic
/oas:init <spec-url-or-path>

# With authentication
/oas:init https://api.com/spec.json --auth-token=$TOKEN

# With sample
/oas:init https://api.com/spec.json --sample-api=path/to/sample.ts

# Force overwrite existing config
/oas:init --force
```

### /oas:sync

```bash
# Default (smart caching)
/oas:sync

# Force fresh fetch
/oas:sync --force

# Use cache only
/oas:sync --offline

# Preview only
/oas:sync --dry-run

# Single tag
/oas:sync --tag=user

# Types only
/oas:sync --only-types

# API functions only
/oas:sync --only-api

# Hooks only
/oas:sync --only-hooks
```

### /oas:diff

```bash
# Compare with remote
/oas:diff --remote

# Compare two files
/oas:diff old.json new.json

# Breaking changes only
/oas:diff --breaking-only

# Single tag
/oas:diff --tag=user

# List tags with changes
/oas:diff --list-tags
```

### /oas:status

```bash
# Overview
/oas:status

# Check if remote changed
/oas:status --check-remote

# Single tag
/oas:status --tag=user

# List all tags
/oas:status --list-tags
```

### /oas:validate

```bash
# Basic validation
/oas:validate

# Strict mode (warnings as errors)
/oas:validate --strict

# With fix suggestions
/oas:validate --fix

# Quiet (errors only)
/oas:validate --quiet
```

### /oas:lint

```bash
# Check both spec and code
/oas:lint

# Spec only
/oas:lint --spec

# Code only
/oas:lint --code

# Specific rule
/oas:lint --rule=naming

# With fix suggestions
/oas:lint --fix
```

### /oas:analyze

```bash
# Full analysis
/oas:analyze

# Specific domain
/oas:analyze --domain=user

# Verbose output
/oas:analyze --verbose
```

---

## Getting Help

- [EXAMPLES.md](./EXAMPLES.md) - Complete code examples
- [EXTENSIBILITY.md](./EXTENSIBILITY.md) - Customization options
- [ERROR-CODES.md](./ERROR-CODES.md) - Error troubleshooting
- [TESTING.md](./TESTING.md) - Test scenarios
- [ARCHITECTURE.md](./ARCHITECTURE.md) - How it works

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    OAS PLUGIN CHEAT SHEET                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SETUP                                                      │
│  /oas:init <url>           Initialize with spec            │
│  /oas:analyze              Analyze project patterns        │
│                                                             │
│  GENERATE                                                   │
│  /oas:sync                 Generate/update code            │
│  /oas:sync --tag=X         Single domain only              │
│  /oas:sync --only-types    Types only                      │
│  /oas:sync --dry-run       Preview changes                 │
│                                                             │
│  COMPARE                                                    │
│  /oas:diff                 Show spec changes               │
│  /oas:diff --breaking-only Breaking changes only           │
│  /oas:status               Show coverage                   │
│                                                             │
│  VERIFY                                                     │
│  /oas:validate             Check code vs spec              │
│  /oas:lint                 Find inconsistencies            │
│                                                             │
│  CACHE                                                      │
│  --force                   Bypass cache                    │
│  --offline                 Use cache only                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
