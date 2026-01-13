---
name: api:status
description: Quick status check - show sync state without fetching spec
argument-hint: [--check-remote]
---

# API Status

캐시 기반 빠른 상태 확인. 스펙 fetch 없이 즉시 결과 표시.

## Usage

```bash
# 로컬 캐시 기반 상태 (즉시)
/api:status

# 원격 스펙과 비교 (느림)
/api:status --check-remote
```

## Quick Status (Default)

캐시 파일만 읽어서 즉시 표시:

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
   /api:sync --tag=workspace  - Complete workspace
   /api:sync --tag=tools      - Add tools domain
   /api:diff --check-remote   - Check for spec changes
```

## Check Remote (--check-remote)

원격 스펙 hash만 확인 (빠름, 전체 다운로드 X):

```
/api:status --check-remote

Checking remote spec...

📄 Spec Status:
   Local hash:  abc123...
   Remote hash: def456...
   Status: ⚠️ SPEC CHANGED

🔄 Changes since last sync:
   Run /api:diff to see details
   Run /api:sync to update
```

또는:

```
/api:status --check-remote

📄 Spec Status:
   Local hash:  abc123...
   Remote hash: abc123...
   Status: ✅ UP TO DATE

No changes since last sync.
```

## Cache Files Read

```
.openapi-sync.cache.json  → 스펙 정보, hash
.openapi-sync.state.json  → 구현 상태, 커버리지
```

## No Cache (First Run)

```
/api:status

⚠️ No cache found

Run /api:init to initialize OpenAPI sync.
```

## Flags

```bash
--check-remote    # 원격 스펙과 hash 비교
--json            # JSON 형식 출력
--quiet           # 요약만 출력
```

## Performance

```
/api:status                → ~0.1초 (캐시 읽기만)
/api:status --check-remote → ~1초 (HEAD 요청)
/api:sync                  → ~5-8초 (Conservative, 정확도 100%)
/api:sync --trust-cache    → ~1초 (캐시 신뢰, 빠름)
/api:sync --force          → ~20초 (전체 재스캔)
```

## 정확도 vs 속도

| 명령어 | 용도 | 정확도 |
|-------|------|--------|
| `/api:status` | 빠른 현황 확인 | 캐시 기반 |
| `/api:sync` | 실제 동기화 | 100% (항상 검증) |
| `/api:sync --trust-cache` | 빠른 동기화 | 99%* |

*캐시 손상/서버 오류 시 누락 가능
