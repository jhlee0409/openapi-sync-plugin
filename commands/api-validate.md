---
name: api:validate
description: Validate that code matches OpenAPI spec
argument-hint: [--strict] [--fix]
---

# API Validate

코드가 OpenAPI 스펙과 일치하는지 검증합니다. CI/CD 파이프라인에서 사용 가능.

## Usage

```bash
# 기본 검증
/api:validate

# 엄격 모드 (warning도 error로)
/api:validate --strict

# 자동 수정 제안
/api:validate --fix
```

## Validation Checks

### 1. Missing Endpoints

스펙에는 있지만 코드에 없는 엔드포인트:

```
❌ MISSING: 스펙에 있지만 코드 없음

  POST /api/v1/clips/{id}/render
    → Expected: src/entities/clips/api/clips-api.ts
    → Status: File exists, function missing

  GET /api/v1/notifications
    → Expected: src/entities/notifications/api/
    → Status: Directory not found
```

### 2. Type Mismatches

타입 정의가 스펙과 다른 경우:

```
⚠️ TYPE MISMATCH: 타입이 스펙과 다름

  User (src/entities/user/model/types.ts:5)
    - status: string
    + status: 'active' | 'inactive'  (spec: enum)

  CreateProjectRequest (src/entities/project/model/types.ts:12)
    - workspaceId?: string
    + workspaceId: string  (spec: required)
```

### 3. Extra Code

코드에는 있지만 스펙에 없는 것:

```
⚠️ EXTRA: 코드에 있지만 스펙에 없음

  src/entities/export/api/legacy-api.ts
    - GET /api/v1/legacy/export (removed from spec)

  src/entities/user/model/types.ts
    - legacyToken: string (not in spec)
```

### 4. Naming Inconsistencies

네이밍 컨벤션 불일치:

```
⚠️ NAMING: 네이밍 컨벤션 불일치

  src/entities/user/api/user-api.ts:15
    - fetchUser() → should be getUser()

  src/entities/project/api/queries.ts:8
    - useProjectData() → should be useProject()
```

### 5. Import/Path Issues

잘못된 import나 path:

```
❌ PATH: 경로 불일치

  src/entities/user/api/user-api.ts:20
    - path: '/users/{id}'
    + path: '/api/v1/users/{id}' (spec)
```

## Output Format

```
═══════════════════════════════════════════════════
  API Validation Report
═══════════════════════════════════════════════════

📊 Summary:
   ❌ 2 errors
   ⚠️  5 warnings
   ✅ 18 passed

───────────────────────────────────────────────────
❌ ERRORS (must fix)
───────────────────────────────────────────────────

1. Missing endpoint implementation
   POST /api/v1/clips/{id}/render
   Fix: /api:sync --endpoint="/api/v1/clips/{id}/render"

2. Required field missing
   CreateProjectRequest.workspaceId
   Location: src/entities/project/model/types.ts:12
   Fix: Add 'workspaceId: string' to interface

───────────────────────────────────────────────────
⚠️ WARNINGS (should fix)
───────────────────────────────────────────────────

1. Type mismatch (non-breaking)
   User.status: string → enum
   Location: src/entities/user/model/types.ts:8

2. Extra code (not in spec)
   GET /api/v1/legacy/export
   Location: src/entities/export/api/legacy-api.ts:15
   Consider: Remove or keep for backwards compatibility

3. Naming inconsistency
   fetchUser → getUser
   Location: src/entities/user/api/user-api.ts:15

───────────────────────────────────────────────────
✅ PASSED (18)
───────────────────────────────────────────────────

  users: 5/5 endpoints ✓
  projects: 4/4 endpoints ✓
  clips: 3/5 endpoints (2 missing)
  cache: 2/2 endpoints ✓
  ...

═══════════════════════════════════════════════════

Exit code: 1 (errors found)
```

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Validate API
  run: claude /api:validate --strict

# Exit codes:
#   0 = all passed
#   1 = errors found
#   2 = warnings found (with --strict)
```

## Auto-Fix Mode

```bash
/api:validate --fix
```

```
🔧 Auto-fix available for 3 issues:

1. [auto] Type mismatch: User.status
   Will update: src/entities/user/model/types.ts

2. [auto] Missing endpoint: POST /clips/{id}/render
   Will generate: src/entities/clips/api/clips-api.ts

3. [manual] Extra code: legacy-api.ts
   Cannot auto-fix: requires manual decision

Apply auto-fixes? [y/N]
```

## Flags

```bash
--strict      # warnings도 error로 처리 (CI용)
--fix         # 자동 수정 가능한 것 수정
--json        # JSON 형식 출력
--quiet       # errors만 출력
--tag=name    # 특정 태그만 검증
```

## Validation Config

`.openapi-sync.json`에서 검증 규칙 설정:

```json
{
  "validation": {
    "ignoreExtra": false,
    "ignoreNaming": true,
    "ignorePaths": [
      "src/entities/legacy/*"
    ],
    "customRules": {
      "requireJsDoc": false,
      "requireTypes": true
    }
  }
}
```
