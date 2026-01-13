---
description: Quick status check - show sync state without fetching spec
argument-hint: [--check-remote] [--tag=name] [--list-tags]
uses-skills: [output-format]
---

# API Status

Cache-based quick status check. Shows results instantly without fetching spec.

## Usage

```bash
# Local cache-based status (instant)
/oas-status

# Compare with remote spec (slower)
/oas-status --check-remote
```

## Quick Status (Default)

Read cache files only for instant display:

```
═══════════════════════════════════════════════════
  API Sync Status
═══════════════════════════════════════════════════

📄 Spec: AIAAS Shorts Maker API v2.0.0
   Source: https://api-dev.viskits.ai/openapi.json
   Last sync: 2024-01-13 12:00:00 (2 hours ago)
   Spec hash: abc123...

📊 Coverage:
   ✅ Implemented: 12 domains (110 endpoints)
   ⚠️  Partial: 3 domains (15/25 endpoints)
   ❌ Missing: 2 domains (8 endpoints)

───────────────────────────────────────────────────
✅ IMPLEMENTED (12)
───────────────────────────────────────────────────
  ai-tool       9/9   ████████████ 100%
  billing       8/8   ████████████ 100%
  common        5/5   ████████████ 100%
  generative    10/10 ████████████ 100%
  history       3/3   ████████████ 100%
  organization  5/5   ████████████ 100%
  project       28/28 ████████████ 100%
  publisher     4/4   ████████████ 100%  ← NEW
  share         7/7   ████████████ 100%
  short-form    8/8   ████████████ 100%
  upload        10/10 ████████████ 100%
  video         3/3   ████████████ 100%

───────────────────────────────────────────────────
⚠️ PARTIAL (3)
───────────────────────────────────────────────────
  workspace     12/18 ████████░░░░  67%
    Missing: invitation, credit-usage, transactions
  user          3/5   ███████░░░░░  60%
    Missing: consents, avatar
  auth          4/6   ████████░░░░  67%
    Missing: social-auth callback

───────────────────────────────────────────────────
❌ MISSING (2)
───────────────────────────────────────────────────
  tools         0/4   ░░░░░░░░░░░░   0%
  public        0/1   ░░░░░░░░░░░░   0%

═══════════════════════════════════════════════════

💡 Quick actions:
   /oas-sync --tag=workspace  - Complete workspace
   /oas-sync --tag=tools      - Add tools domain
   /oas-diff --check-remote   - Check for spec changes
```

## Check Remote (--check-remote)

Check remote spec hash only (fast, no full download):

```
/oas-status --check-remote

Checking remote spec...

📄 Spec Status:
   Local hash:  abc123...
   Remote hash: def456...
   Status: ⚠️ SPEC CHANGED

🔄 Changes since last sync:
   Run /oas-diff to see details
   Run /oas-sync to update
```

Or:

```
/oas-status --check-remote

📄 Spec Status:
   Local hash:  abc123...
   Remote hash: abc123...
   Status: ✅ UP TO DATE

No changes since last sync.
```

## Cache Files Read

```
.openapi-sync.cache.json  → Spec info, hash
.openapi-sync.state.json  → Implementation state, coverage
```

## No Cache (First Run)

```
/oas-status

⚠️ No cache found

Run /oas-init to initialize OpenAPI sync.
```

## Flags

```bash
--check-remote    # Compare with remote spec hash
--json            # JSON format output
--quiet           # Summary only
--tag=name        # Filter status by specific tag(s)
--list-tags       # List all available tags with coverage
```

## Tag Filtering

Filter status view by specific tags:

### Filter by Tag

```bash
# Status for specific tag only
/oas-status --tag=workspace

═══════════════════════════════════════════════════
  API Status: workspace tag
═══════════════════════════════════════════════════

📊 Coverage (workspace):
   ✅ Implemented: 14/18 endpoints (78%)
   ❌ Missing: 4 endpoints

───────────────────────────────────────────────────
✅ IMPLEMENTED (14)
───────────────────────────────────────────────────
  GET    /workspaces                    getMyWorkspaces
  GET    /workspaces/organization       getOrganizationWorkspaces
  GET    /workspaces/{id}               getWorkspaceDetail
  POST   /workspaces/{id}/switch        switchWorkspace
  ...

───────────────────────────────────────────────────
❌ MISSING (4)
───────────────────────────────────────────────────
  GET    /workspaces/{id}/credit-usage    ← NEW in spec
  GET    /workspaces/{id}/transactions    ← NEW in spec
  GET    /workspaces/{id}/usage-report    ← NEW in spec
  GET    /workspaces/{id}/icon/default    ← NEW in spec

💡 Run: /oas-sync --tag=workspace
```

### List All Tags

```bash
/oas-status --list-tags

📋 Tags Overview:

Tag              Implemented   Total   Coverage   Actions
─────────────────────────────────────────────────────────────
workspace        14            18      78%        /oas-sync --tag=workspace
user             12            12      100%       ✓ Complete
project          28            28      100%       ✓ Complete
billing          0             8       0%         /oas-sync --tag=billing
auth             10            10      100%       ✓ Complete
clips            15            15      100%       ✓ Complete
public           0             1       0%         /oas-sync --tag=public

Summary:
  ✅ Complete: 4 tags
  ⚠️ Partial: 1 tag
  ❌ Missing: 2 tags

Total coverage: 79/92 endpoints (86%)
```

### Multiple Tags

```bash
# Status for multiple tags
/oas-status --tag=workspace --tag=billing

📊 Coverage (workspace + billing):
   workspace: 14/18 (78%)
   billing:   0/8   (0%)

   Combined: 14/26 (54%)
```

## Accuracy vs Speed

| Command | Purpose | Accuracy |
|---------|---------|----------|
| `/oas-status` | Quick status check | Cache-based |
| `/oas-sync` | Actual sync | 100% (always verified) |
| `/oas-sync --trust-cache` | Fast sync | 99%* |

*May miss changes if cache is corrupted or server error occurs
