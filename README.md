# openapi-sync

OpenAPI 스펙과 코드베이스를 동기화하는 Claude Code 플러그인.

**기존 도구와의 차이점:** 하드코딩된 템플릿 대신 **프로젝트의 기존 코드를 학습**해서 일관된 스타일로 생성.

```
"API 파일 하나 보여주면, 100개 더 만들어줄게"
```

## 설치

```bash
# Claude Code에서 플러그인 설치
claude plugins install openapi-sync
```

## 빠른 시작

```bash
# 1. 프로젝트 초기화
/api:init

# 2. 스펙 기반 코드 생성
/api:sync

# 3. 일관성 검사
/api:lint
```

## Commands

| Command | Description |
|---------|-------------|
| `/api:init` | 프로젝트 초기화, 패턴 학습, 설정 파일 생성 |
| `/api:sync` | OpenAPI 스펙 기반 코드 생성/동기화 |
| `/api:status` | 캐시 기반 빠른 상태 확인 |
| `/api:diff` | 스펙 변경사항 비교 |
| `/api:validate` | 코드-스펙 일치 검증 |
| `/api:lint` | 스펙 + 코드 일관성 검사 |

## 핵심 기능

### 1. 샘플 기반 패턴 학습

기존 API 코드를 분석해서 프로젝트 패턴을 학습:

```bash
/api:init

? OpenAPI 스펙 URL: https://api.example.com/openapi.json
? 기존 API 코드 샘플: src/entities/user/api/user-api.ts

패턴 학습 중...
  ✓ HTTP 클라이언트: createApi() (Axios wrapper)
  ✓ 데이터 페칭: React Query v5 + createQuery helper
  ✓ 구조: FSD (Feature-Sliced Design)
  ✓ 네이밍: camelCase functions, PascalCase types
```

### 2. 일관된 코드 생성

학습된 패턴으로 새 API 코드 생성:

```bash
/api:sync --tag=publisher

생성됨:
  ✓ src/entities/publisher/api/publisher-api.ts
  ✓ src/entities/publisher/api/publisher-queries.ts
  ✓ src/entities/publisher/api/publisher-mutations.ts
  ✓ src/entities/publisher/model/publisher-types.ts
  ✓ src/entities/publisher/config/publisher-api-paths.ts
```

### 3. 캐싱 & Diff 기반 처리

변경된 부분만 처리해서 토큰/시간 절약:

```bash
/api:sync

✓ 스펙 변경 없음 (캐시 힌트)
✓ 코드-스펙 직접 비교 완료
✓ 변경 필요 없음

# 변경 있을 때
/api:sync

변경 감지:
  +2 added, ~1 modified, -0 removed
  (148 unchanged - 스킵)

생성 중...
  ✓ POST /clips/{id}/render (new)
  ✓ GET /clips/{id}/status (new)
  ~ GET /users/{id} (updated: +preferences field)
```

### 4. 프로젝트 기준 일관성 검사

프로젝트 자체의 majority 패턴을 기준으로 불일치 탐지:

```bash
/api:lint

프로젝트 패턴 분석...
  Type naming: PascalCase (97.5%)
  Export style: export * (72.9%)
  Return types: Explicit (60.3%)

불일치 발견:
  🟡 upload-types.ts: 8개 타입이 camelCase 사용
     → 프로젝트 기준(PascalCase)과 다름

/api:lint --fix

  ✓ 8개 타입 PascalCase로 변환
  ✓ 3개 파일 import 업데이트
  ✓ TypeScript 체크 통과
```

## Flags

### /api:sync

```bash
/api:sync                    # 기본 (Conservative, 100% 정확도)
/api:sync --dry-run          # 미리보기
/api:sync --tag=users        # 특정 태그만
/api:sync --only-types       # 타입만 생성
/api:sync --only-added       # 새로 추가된 것만
/api:sync --force            # 캐시 무시, 전체 재생성
/api:sync --trust-cache      # 캐시 신뢰 모드 (빠름, 99% 정확도)
```

### /api:lint

```bash
/api:lint                    # 스펙 + 코드 전체 검사
/api:lint --spec             # 스펙만 검사
/api:lint --code             # 코드만 검사
/api:lint --fix              # 자동 수정
/api:lint --rule=type-naming # 특정 규칙만
```

### /api:status

```bash
/api:status                  # 캐시 기반 즉시 상태 (~0.1초)
/api:status --check-remote   # 원격 스펙 hash 확인 (~1초)
```

## 설정 파일

### .openapi-sync.json

```json
{
  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },
  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts"
  },
  "patterns": {
    "structure": { "type": "auto" },
    "httpClient": { "import": "auto" },
    "dataFetching": { "queryKeyPattern": "auto" }
  },
  "lint": {
    "code": {
      "rules": {
        "type-naming-convention": "warning",
        "export-pattern-consistency": "info"
      },
      "thresholds": {
        "majorityThreshold": 60
      }
    }
  }
}
```

## 성능

| 작업 | 시간 | 토큰 |
|------|------|------|
| `/api:status` | ~0.1초 | 0.5K |
| `/api:sync` (변경 없음) | ~5초 | 7K |
| `/api:sync` (변경 있음) | ~8초 | 12K |
| `/api:lint` | ~3초 | 5K |
| `/api:lint --fix` | ~10초 | 10K |

캐싱 없이 전체 처리: ~20초, 55K 토큰 → **87% 절약**

## 철학

### 1. 샘플 기반 학습

```
❌ "FSD 구조에 Axios 패턴으로 생성할게"
✅ "user-api.ts 보니까 이렇게 쓰네, 똑같이 만들어줄게"
```

### 2. 프로젝트 기준 일관성

```
❌ "PascalCase가 TypeScript 표준이니까 틀렸어"
✅ "이 프로젝트는 PascalCase 97% 써서, camelCase는 불일치야"
```

### 3. 정확도 > 속도

```
❌ 캐시 hash 같으면 스킵 (edge case 위험)
✅ 캐시는 힌트, 항상 실제 스펙-코드 비교 (100% 정확도)
```

### 4. 점진적 변경

```
❌ 매번 전체 재생성
✅ 변경분만 감지해서 처리 (diff 기반)
```

## 지원 환경

- **OpenAPI:** 3.0.x, 3.1.x, Swagger 2.0
- **언어:** TypeScript
- **HTTP 클라이언트:** Axios, Fetch, ky, 기타 (자동 감지)
- **데이터 페칭:** React Query, SWR, 기타 (자동 감지)
- **구조:** FSD, Feature-based, Flat, 기타 (자동 감지)

## 라이선스

MIT
