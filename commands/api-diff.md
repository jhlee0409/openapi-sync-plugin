---
name: api:diff
description: Compare OpenAPI spec changes between versions
argument-hint: [old-spec] [new-spec] | [--remote]
---

# API Diff

Compare OpenAPI spec changes to see what's new, changed, or removed.

## Usage

```bash
# 현재 스펙 vs 원격 최신 스펙
/api:diff --remote

# 두 파일 비교
/api:diff ./old-openapi.json ./new-openapi.json

# 현재 스펙 vs 특정 파일
/api:diff ./previous-version.json

# 캐시된 이전 버전과 비교
/api:diff
```

## Diff Process

### Step 1: Load Specs

```
OLD SPEC:
  - 캐시된 이전 버전 (.openapi-sync.cache.json)
  - 또는 지정된 파일/URL

NEW SPEC:
  - .openapi-sync.json의 source
  - --remote 시 원격에서 fetch
```

### Step 2: Compare

**Endpoints 비교:**
```
각 endpoint에 대해:
  path + method 조합으로 매칭

상태 분류:
  ADDED:    new에만 존재
  REMOVED:  old에만 존재
  CHANGED:  둘 다 존재, 내용 다름
  UNCHANGED: 둘 다 존재, 동일
```

**Schema 비교:**
```
각 schema에 대해:
  - 필드 추가/삭제
  - 타입 변경
  - required 변경
  - enum 값 변경
```

### Step 3: Output

```
═══════════════════════════════════════════════════
  API Diff: My API v1.0.0 → v2.0.0
═══════════════════════════════════════════════════

📊 Summary:
   +3 added, ~2 changed, -1 removed, 15 unchanged

───────────────────────────────────────────────────
✅ ADDED (3)
───────────────────────────────────────────────────

+ POST /api/v1/clips/{id}/render
  Tag: clips
  Request: RenderClipRequest
  Response: RenderJob

+ GET /api/v1/clips/{id}/render/status
  Tag: clips
  Response: RenderStatus

+ DELETE /api/v1/cache/{key}
  Tag: cache
  Response: void

───────────────────────────────────────────────────
⚠️ CHANGED (2)
───────────────────────────────────────────────────

~ GET /api/v1/users/{id}
  Response: User
    + preferences: object (added)
    ~ status: string → enum['active','inactive'] (type changed)

~ POST /api/v1/projects
  Request: CreateProjectRequest
    + workspaceId: string (added, required)

───────────────────────────────────────────────────
❌ REMOVED (1)
───────────────────────────────────────────────────

- GET /api/v1/legacy/export
  ⚠️  Warning: 코드가 존재함
      src/entities/export/api/legacy-api.ts:15

═══════════════════════════════════════════════════

🔄 Next steps:
   /api:sync              - 변경사항 반영
   /api:sync --only=clips - clips만 업데이트
```

## Change Detection Details

### Endpoint Changes

```typescript
interface EndpointChange {
  type: 'added' | 'removed' | 'changed'
  method: string
  path: string
  tag: string
  changes?: {
    parameters?: ParameterChange[]
    requestBody?: SchemaChange
    response?: SchemaChange
    deprecated?: boolean
  }
}
```

### Schema Changes

```typescript
interface SchemaChange {
  type: 'added' | 'removed' | 'type_changed' | 'required_changed'
  field: string
  old?: any
  new?: any
}

// Examples:
{ type: 'added', field: 'preferences', new: { type: 'object' } }
{ type: 'removed', field: 'legacyId' }
{ type: 'type_changed', field: 'status', old: 'string', new: "enum['active','inactive']" }
{ type: 'required_changed', field: 'workspaceId', old: false, new: true }
```

## Breaking Changes Detection

자동으로 breaking change 감지:

```
🚨 BREAKING CHANGES:

1. Required field added to request
   POST /api/v1/projects
   + workspaceId (required)
   → 기존 클라이언트 코드 수정 필요

2. Field removed from response
   GET /api/v1/users/{id}
   - legacyToken
   → 이 필드 사용하는 코드 확인 필요

3. Type changed
   GET /api/v1/users/{id}
   status: string → enum
   → 타입 호환성 확인 필요

4. Endpoint removed
   GET /api/v1/legacy/export
   → 사용 코드 제거 필요
```

## Flags

```
--remote        원격 스펙과 비교
--json          JSON 형식으로 출력
--breaking-only breaking changes만 표시
--tag=name      특정 태그만 비교
```

## Cache Management

```
diff 실행 시:
1. 현재 스펙을 .openapi-sync.cache.json에 저장
2. 다음 diff 시 이전 버전으로 사용

캐시 위치: .openapi-sync.cache.json
캐시 내용: { timestamp, spec, version }
```
