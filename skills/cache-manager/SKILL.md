---
name: cache-manager
description: Manage OpenAPI spec cache and implementation state for efficient diff-based sync
---

# Cache Manager

캐싱 시스템으로 토큰과 시간을 절약하는 스킬.

## 핵심 원칙: 캐시는 힌트, 검증은 필수

```
⚠️ 캐시는 "빠른 힌트"로만 사용
⚠️ 코드 생성 전 항상 실제 스펙과 직접 비교
⚠️ 정확도 100% > 속도
```

**Conservative Mode (기본):**
- 캐시 hash 비교 → 힌트만 제공
- 항상 스펙 fetch → 코드와 직접 비교
- 차이 있으면 생성, 없으면 스킵

**Trust Cache Mode (--trust-cache):**
- 캐시 hash 같으면 스킵
- 빠르지만 edge case 위험
- 명시적 요청 시에만 사용

## Cache Files

### 1. 스펙 캐시 (.openapi-sync.cache.json)

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

### 2. 구현 상태 캐시 (.openapi-sync.state.json)

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
첫 실행 또는 캐시 없을 때:

1. OpenAPI 스펙 fetch
2. 스펙 hash 생성 (SHA256)
3. 엔드포인트 목록 추출
4. 스키마 hash 생성
5. .openapi-sync.cache.json 저장

6. 코드베이스 스캔
7. 구현된 엔드포인트 목록 추출
8. .openapi-sync.state.json 저장
```

### 2. Check for Changes (빠른 체크)

```typescript
async function hasChanges(): Promise<{
  specChanged: boolean;
  newHash: string;
  oldHash: string;
}> {
  // 1. 현재 스펙의 hash만 가져오기 (HEAD 또는 ETag)
  const newHash = await getSpecHash(source);

  // 2. 캐시된 hash와 비교
  const cache = readCache();

  return {
    specChanged: newHash !== cache.specHash,
    newHash,
    oldHash: cache.specHash
  };
}
```

### 3. Compute Diff (변경 시에만)

```typescript
interface SpecDiff {
  added: Endpoint[];      // 새로 추가된 엔드포인트
  removed: Endpoint[];    // 삭제된 엔드포인트
  modified: {             // 변경된 엔드포인트
    endpoint: Endpoint;
    changes: SchemaChange[];
  }[];
  unchanged: Endpoint[];  // 변경 없음
}

function computeDiff(oldSpec: Cache, newSpec: Spec): SpecDiff {
  const oldEndpoints = new Map(oldSpec.endpoints);
  const newEndpoints = new Map(newSpec.endpoints);

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  // 새 스펙의 각 엔드포인트 확인
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

  // 삭제된 엔드포인트 확인
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
변경 처리 후:

1. 새 스펙으로 cache 업데이트
2. 구현 상태 업데이트
3. 타임스탬프 갱신
```

## Hash Generation

### Spec Hash

```typescript
function generateSpecHash(spec: OpenAPISpec): string {
  // 전체 스펙을 정규화된 JSON으로 변환 후 hash
  const normalized = JSON.stringify(spec, Object.keys(spec).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

### Schema Hash (개별 스키마용)

```typescript
function generateSchemaHash(schema: Schema): string {
  const normalized = JSON.stringify(schema, Object.keys(schema).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

### Quick Hash (빠른 변경 체크용)

```typescript
async function getQuickHash(url: string): Promise<string> {
  // 방법 1: HEAD 요청으로 ETag/Last-Modified 확인
  const response = await fetch(url, { method: 'HEAD' });
  const etag = response.headers.get('ETag');
  if (etag) return etag;

  // 방법 2: 전체 다운로드 후 hash
  const spec = await fetch(url).then(r => r.text());
  return crypto.createHash('sha256').update(spec).digest('hex');
}
```

## Efficiency Gains

### Before (캐싱 없음)

```
매 요청:
1. 스펙 전체 fetch       → 5초, 10K 토큰
2. 스펙 전체 분석        → 3초, 20K 토큰
3. 코드베이스 전체 스캔  → 10초, 15K 토큰
4. 전체 비교             → 2초, 10K 토큰
─────────────────────────────────────
Total: 20초, 55K 토큰
```

### After - Conservative Mode (기본, 정확도 100%)

```
변경 없을 때:
1. 스펙 fetch            → 2초, 2K 토큰
2. 캐시 힌트 확인        → 0.1초
3. 스펙-코드 직접 비교   → 3초, 5K 토큰
4. 변경 없음 확인        → 스킵
─────────────────────────────────────
Total: 5초, 7K 토큰 (87% 절약)

변경 있을 때:
1. 스펙 fetch            → 2초, 2K 토큰
2. 스펙-코드 직접 비교   → 3초, 5K 토큰
3. 변경분만 생성         → 3초, 5K 토큰
─────────────────────────────────────
Total: 8초, 12K 토큰 (78% 절약)
```

### After - Trust Cache Mode (--trust-cache, 빠름)

```
변경 없을 때:
1. Hash 비교만           → 1초, 0.5K 토큰
─────────────────────────────────────
Total: 1초, 0.5K 토큰 (99% 절약)

⚠️ 주의: 캐시 손상/서버 오류 시 변경 누락 가능
```

### 모드별 비교

| 모드 | 변경 없음 | 변경 있음 | 정확도 |
|-----|----------|----------|--------|
| 캐싱 없음 | 20초, 55K | 20초, 55K | 100% |
| Conservative (기본) | 5초, 7K | 8초, 12K | 100% |
| Trust Cache | 1초, 0.5K | 6초, 7.5K | 99%* |

*edge case 위험 있음

## Cache Invalidation

```
캐시 무효화 조건:
1. 수동 요청: /api:sync --force
2. 캐시 파일 없음
3. 캐시 버전 불일치
4. 24시간 이상 경과 (선택적)
```

## Error Handling

```
캐시 읽기 실패:
  → 새로 생성

캐시 손상:
  → 삭제 후 새로 생성

스펙 fetch 실패:
  → 캐시된 버전 사용 (경고 출력)
```
