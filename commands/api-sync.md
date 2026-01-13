---
name: api:sync
description: Sync codebase with OpenAPI spec - generate types and API code (100% accuracy by default)
argument-hint: [--dry-run] [--only-types] [--tag=name] [--trust-cache]
---

# OpenAPI Sync

Generate or update API code based on OpenAPI spec and detected project patterns.

## Prerequisites

1. Check `.openapi-sync.json` exists - if not, run `/api:init`
2. Load config and detected patterns

## Sync Process (Conservative Mode - Default)

### Step 0: Cache-Assisted Verification

```
Use skill: cache-manager

캐시는 "힌트"로만 사용. 정확도 100% 보장.

1. 캐시 파일 확인
   - .openapi-sync.cache.json (스펙 캐시)
   - .openapi-sync.state.json (구현 상태)

2. Quick hash 비교 (힌트용)
   - hash 같음 → "변경 없을 가능성 높음" 표시
   - hash 다름 → "변경 감지됨" 표시

3. 항상 Step 1로 진행 (스펙 직접 검증)
   - 캐시 hash가 같아도 실제 스펙과 코드 비교
   - 차이 있으면 생성, 없으면 스킵
   - 100% 정확도 보장
```

**Output:**
```
/api:sync

🔍 Verifying against spec...
   Cache hint: likely unchanged (hash match)

   Checking 150 endpoints against codebase...
   ✅ All endpoints up to date

No changes needed.
```

**--trust-cache 모드 (빠름, 위험):**
```
/api:sync --trust-cache

⚡ Trust cache mode
   Cache hash: abc123... (matched)
   Skipping verification.

✅ No changes detected (cached)

⚠️  Warning: Using cached state. Run without --trust-cache for full verification.
```

### Step 1: Fetch & Diff (변경 있을 때만)

```
1. 새 스펙 fetch
2. 캐시된 스펙과 diff 계산

   Invoke skill: cache-manager (computeDiff)

3. Diff 결과:
   - added: 새로 추가된 엔드포인트
   - modified: 변경된 엔드포인트
   - removed: 삭제된 엔드포인트
   - unchanged: 변경 없음 (스킵)
```

**Output:**
```
📊 Spec Changes Detected:
   +3 added, ~2 modified, -1 removed
   (145 unchanged - skipping)
```

### Step 2: Compare with Existing Code (변경분만)

```
변경된 엔드포인트만 코드와 비교:

For each endpoint in (added + modified):
  1. Check if corresponding code exists
  2. Compare types/schemas
  3. Mark as: NEW | CHANGED | NEEDS_UPDATE
```

### Step 3: Show Diff Summary

```
=== OpenAPI Sync Preview ===

📥 OpenAPI: My API v2.1.0
   Source: https://api.example.com/openapi.json
   Last synced: 2024-01-15

📊 Changes Detected:

NEW (3 endpoints):
  + POST /api/v1/clips/{id}/render
  + GET  /api/v1/clips/{id}/status
  + DELETE /api/v1/clips/{id}/cache

CHANGED (2 endpoints):
  ~ GET /api/v1/users/{id}
    - Added field: preferences (object)
    - Changed type: status (string → enum)
  ~ POST /api/v1/projects
    - New required field: workspaceId

UNCHANGED (15 endpoints)

REMOVED from spec (1 endpoint):
  - GET /api/v1/legacy/export
    ⚠️ Code exists at: src/entities/export/api/legacy-api.ts

Proceed with generation? [y/N/select]
```

### Step 4: Generate Code

Use `code-generator` skill:

```
Invoke skill: code-generator
```

Based on detected patterns, generate:

#### For FSD Structure:

```
src/entities/{tag}/
├── api/
│   ├── {tag}-api.ts        # API functions
│   ├── {tag}-api-paths.ts  # Path constants
│   └── queries.ts          # React Query hooks
└── model/
    └── types.ts            # TypeScript types
```

#### For Feature-based Structure:

```
src/features/{tag}/
├── api.ts          # API functions + paths
├── hooks.ts        # React Query hooks
└── types.ts        # TypeScript types
```

#### For Flat Structure:

```
src/api/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

### Step 5: Type Generation

Generate types from schemas:

```typescript
// From OpenAPI schema
{
  "User": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "status": { "type": "string", "enum": ["active", "inactive"] }
    },
    "required": ["id", "name", "email"]
  }
}

// Generated TypeScript
export interface User {
  id: string
  name: string
  email: string
  status?: 'active' | 'inactive'
}

export interface GetUserRequest {
  id: string
}

export type GetUserResponse = User
```

### Step 6: API Function Generation

Based on HTTP client pattern:

```typescript
// Axios pattern
export const getUser = async (params: GetUserRequest): Promise<GetUserResponse> => {
  const { id } = params
  const response = await createApi().get<GetUserResponse>(
    USER_API_PATHS.detail(id)
  )
  return response.data
}

// Fetch pattern
export const getUser = async (params: GetUserRequest): Promise<GetUserResponse> => {
  const { id } = params
  const response = await fetch(USER_API_PATHS.detail(id))
  if (!response.ok) throw new Error('Failed to fetch user')
  return response.json()
}
```

### Step 7: Query Hook Generation

Based on state manager pattern:

```typescript
// React Query with factory pattern
export const useUser = (id: string, options?: UseQueryOptions<GetUserResponse>) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser({ id }),
    ...options,
  })
}

// React Query simple pattern
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser({ id }),
  })
}

// SWR pattern
export const useUser = (id: string) => {
  return useSWR(['users', id], () => getUser({ id }))
}
```

### Step 8: Report Results

```
=== Sync Complete ===

Generated:
  ✓ src/entities/clip/model/types.ts (3 types)
  ✓ src/entities/clip/api/clip-api.ts (3 functions)
  ✓ src/entities/clip/api/clip-api-paths.ts (3 paths)
  ✓ src/entities/clip/api/queries.ts (3 hooks)

Updated:
  ✓ src/entities/user/model/types.ts (+2 fields)
  ✓ src/entities/project/model/types.ts (+1 required field)

Skipped:
  - src/entities/export/api/legacy-api.ts (endpoint removed from spec)

Next: Review generated code and run your type checker
```

## Flags

```bash
# 미리보기 (파일 생성 안함)
/api:sync --dry-run

# 타입만 생성
/api:sync --only-types

# 강제 덮어쓰기 (기존 코드 무시)
/api:sync --force

# 캐시 신뢰 모드 (빠름, 검증 스킵 - 주의!)
/api:sync --trust-cache
```

## Sync Modes

| 모드 | 명령어 | 속도 | 정확도 | 사용 시점 |
|-----|--------|-----|--------|----------|
| Conservative (기본) | `/api:sync` | 보통 | 100% | 항상 권장 |
| Trust Cache | `/api:sync --trust-cache` | 빠름 | 99%* | 빠른 확인 필요 시 |
| Force | `/api:sync --force` | 느림 | 100% | 캐시 무시하고 전체 재생성 |

*Trust Cache: 서버 ETag/Last-Modified 오류, 캐시 손상 시 누락 가능

## Partial Sync (부분 동기화)

특정 부분만 선택적으로 동기화:

### By Tag

```bash
# 특정 태그만
/api:sync --tag=users
/api:sync --tag=clips

# 여러 태그
/api:sync --tag=users --tag=projects

# 태그 제외
/api:sync --exclude-tag=internal
```

### By Endpoint

```bash
# 특정 엔드포인트만
/api:sync --endpoint=/api/v1/users
/api:sync --endpoint="/api/v1/users/{id}"

# 패턴 매칭
/api:sync --endpoint="/api/v1/clips/*"
```

### By Change Type

```bash
# 새로 추가된 것만
/api:sync --only-added

# 변경된 것만
/api:sync --only-changed

# 새로 추가 + 변경된 것
/api:sync --only-added --only-changed
```

### By File Type

```bash
# 타입만
/api:sync --only-types

# API 함수만 (타입 제외)
/api:sync --only-api

# 훅만
/api:sync --only-hooks

# 조합
/api:sync --only-types --only-api
```

## Partial Sync Examples

```bash
# clips 태그의 새 엔드포인트만 타입 생성
/api:sync --tag=clips --only-added --only-types

# users 관련 변경사항만 미리보기
/api:sync --tag=users --only-changed --dry-run

# 특정 엔드포인트 하나만 전체 생성
/api:sync --endpoint="/api/v1/clips/{id}/render"
```

## Interactive Selection

플래그 없이 실행 시 변경사항 선택 가능:

```
/api:sync

📊 Changes Detected:

NEW (3):
  [ ] POST /api/v1/clips/{id}/render (clips)
  [ ] GET  /api/v1/clips/{id}/status (clips)
  [ ] DELETE /api/v1/cache/{key} (cache)

CHANGED (2):
  [ ] GET /api/v1/users/{id} (users)
  [ ] POST /api/v1/projects (projects)

Select: [a]ll / [n]one / [t]ag / [enter numbers]
> 1,2,4

Generating selected endpoints...
```
