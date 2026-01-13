# openapi-sync

OpenAPI 스펙과 코드베이스를 동기화하는 Claude Code 플러그인.

**기존 도구와의 차이점:** 하드코딩된 템플릿 대신 **프로젝트의 기존 코드를 학습**해서 일관된 스타일로 생성.

```
"API 파일 하나 보여주면, 100개 더 만들어줄게"
```

[English](./README.md)

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

## Command 레퍼런스

### /api:init

프로젝트 초기화 및 패턴 학습.

```bash
/api:init                      # 자동 패턴 감지
/api:init ./openapi.json       # 로컬 스펙 파일 사용
/api:init https://api.com/spec # 원격 스펙 URL 사용
/api:init --force              # 기존 설정 덮어쓰기
/api:init --interactive        # 자동 감지 스킵, 수동 설정
/api:init --sample=path        # 특정 샘플 파일 지정
```

### /api:sync

OpenAPI 스펙 기반 코드 생성/업데이트.

```bash
# 기본
/api:sync                    # 기본 (Conservative, 100% 정확도)
/api:sync --dry-run          # 미리보기만, 파일 변경 없음
/api:sync --force            # 캐시 무시, 전체 재생성
/api:sync --trust-cache      # 캐시 신뢰 모드 (빠름, 99% 정확도)

# 태그별 필터
/api:sync --tag=users        # 특정 태그만
/api:sync --tag=users --tag=projects  # 여러 태그
/api:sync --exclude-tag=internal      # 태그 제외

# 엔드포인트별 필터
/api:sync --endpoint="/api/v1/users/{id}"
/api:sync --endpoint="/api/v1/clips/*"  # 와일드카드

# 변경 타입별 필터
/api:sync --only-added       # 새 엔드포인트만
/api:sync --only-changed     # 수정된 엔드포인트만

# 파일 타입별 필터
/api:sync --only-types       # 타입만
/api:sync --only-api         # API 함수만
/api:sync --only-hooks       # 훅만
```

### /api:diff

OpenAPI 스펙 변경사항 비교.

```bash
/api:diff                    # 캐시 vs 현재 비교
/api:diff --remote           # 원격 스펙과 비교
/api:diff old.json new.json  # 두 파일 비교
/api:diff --breaking-only    # Breaking changes만 표시
/api:diff --tag=users        # 특정 태그만
/api:diff --json             # JSON 출력
```

### /api:validate

코드-스펙 일치 검증 (CI/CD 친화적).

```bash
/api:validate                # 기본 검증
/api:validate --strict       # 경고도 에러 처리 (CI용)
/api:validate --fix          # 자동 수정 가능한 것 수정
/api:validate --tag=users    # 특정 태그만
/api:validate --json         # JSON 출력
/api:validate --quiet        # 에러만 출력
```

### /api:lint

스펙 + 코드 일관성 검사.

```bash
/api:lint                    # 스펙 + 코드 전체 검사
/api:lint --spec             # 스펙만 검사
/api:lint --code             # 코드만 검사
/api:lint --fix              # 수정 제안 표시
/api:lint --rule=type-naming # 특정 규칙만
/api:lint --severity=critical # 심각도별 필터
/api:lint --json             # JSON 출력
```

### /api:status

캐시 기반 빠른 상태 확인.

```bash
/api:status                  # 즉시 상태 (~0.1초)
/api:status --check-remote   # 원격 스펙 hash 확인 (~1초)
/api:status --tag=users      # 특정 태그 상태 확인
/api:status --list-tags      # 모든 태그 커버리지 표시
/api:status --json           # JSON 출력
/api:status --quiet          # 요약만
```

## 태그 필터링

OpenAPI 태그로 작업 필터링. 태그는 각 엔드포인트의 `tags` 필드에서 추출됩니다.

### 태그 확인

```bash
# 사용 가능한 태그 목록
/api:sync --list-tags

📋 사용 가능한 태그:

태그             엔드포인트   상태
─────────────────────────────────────
workspace        18          ⚠️ 부분 (14/18)
user             12          ✅ 완료
billing          8           ❌ 미구현
...
```

### 태그로 필터링

```bash
# 특정 태그만 동기화
/api:sync --tag=workspace

# 여러 태그 (OR 로직)
/api:sync --tag=workspace --tag=billing

# 태그 제외
/api:sync --exclude-tag=internal

# 조합
/api:sync --tag=workspace --exclude-tag=deprecated
```

### 태그 지원 커맨드

| 커맨드 | 예시 |
|--------|------|
| `/api:sync` | `--tag=users`, `--exclude-tag=internal` |
| `/api:diff` | `--tag=users`, `--list-tags` |
| `/api:status` | `--tag=users`, `--list-tags` |
| `/api:validate` | `--tag=users` |

### 태그 기반 생성

`--tag` 사용 시 매칭되는 태그의 엔드포인트만 처리:

```bash
/api:sync --tag=billing

생성됨:
  src/entities/billing/
  ├── api/billing-api.ts        (8개 함수)
  ├── api/billing-queries.ts    (8개 훅)
  ├── config/billing-api-paths.ts
  └── model/billing-types.ts    (12개 타입)
```

## Sync 모드

| 모드 | 커맨드 | 속도 | 정확도 | 사용 시점 |
|------|--------|------|--------|----------|
| Conservative (기본) | `/api:sync` | 보통 | 100% | 항상 권장 |
| Trust Cache | `/api:sync --trust-cache` | 빠름 | 99%* | 빠른 체크 필요 시 |
| Force | `/api:sync --force` | 느림 | 100% | 캐시 무시, 전체 재생성 |

*Trust Cache: 서버 ETag/Last-Modified 오류나 캐시 손상 시 변경 누락 가능

## 인터랙티브 선택

`/api:sync` 플래그 없이 실행 시 변경 선택 가능:

```
📊 변경 감지:

NEW (3):
  [ ] POST /api/v1/clips/{id}/render (clips)
  [ ] GET  /api/v1/clips/{id}/status (clips)
  [ ] DELETE /api/v1/cache/{key} (cache)

CHANGED (2):
  [ ] GET /api/v1/users/{id} (users)
  [ ] POST /api/v1/projects (projects)

선택: [a]ll / [n]one / [t]ag / [숫자 입력]
> 1,2,4

선택된 엔드포인트 생성 중...
```

## Breaking Changes 감지

`/api:diff`가 자동으로 breaking changes 감지:

```
🚨 BREAKING CHANGES:

1. 요청에 필수 필드 추가됨
   POST /api/v1/projects
   + workspaceId (required)
   → 기존 클라이언트 코드 수정 필요

2. 응답에서 필드 제거됨
   GET /api/v1/users/{id}
   - legacyToken
   → 해당 필드 사용 코드 확인 필요

3. 타입 변경됨
   GET /api/v1/users/{id}
   status: string → enum['active','inactive']
   → 타입 호환성 확인 필요

4. 엔드포인트 제거됨
   GET /api/v1/legacy/export
   → 사용 코드 제거 필요
```

## 생성 파일 구조

### FSD (Feature-Sliced Design)

```
src/entities/{tag}/
├── api/
│   ├── {tag}-api.ts        # API 함수
│   ├── {tag}-api-paths.ts  # 경로 상수
│   └── queries.ts          # React Query 훅
└── model/
    └── types.ts            # TypeScript 타입
```

### Feature-based

```
src/features/{tag}/
├── api.ts          # API 함수 + 경로
├── hooks.ts        # React Query 훅
└── types.ts        # TypeScript 타입
```

### Flat

```
src/api/{tag}/
├── api.ts
├── hooks.ts
└── types.ts
```

## 설정 파일

### .openapi-sync.json

> **참고:** 대부분의 값은 `/api:init` 실행 시 코드베이스에서 **자동 감지**됩니다.
> `openapi.source`와 `samples`만 제공하면 나머지는 기존 코드에서 학습합니다.

#### 최소 설정 (필수값만)

```json
{
  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },
  "samples": {
    "api": "src/entities/user/api/user-api.ts"
  }
}
```

#### 전체 설정 (자동 생성 예시)

아래는 `/api:init`이 코드베이스 스캔 후 생성하는 예시입니다.
**모든 값은 예시일 뿐** - 실제 값은 당신의 프로젝트 코드에서 감지됩니다.

```json
{
  "$schema": "https://openapi-sync.dev/schema/v1.json",
  "version": "1.0.0",

  "openapi": {
    "source": "./openapi.json",
    "remote": "https://api.example.com/openapi.json",
    "title": "My API",
    "version": "2.0.0"
  },

  // ⬇️ package.json에서 자동 감지
  "project": {
    "framework": "react",           // 감지: react, vue, angular, svelte, next, nuxt 등
    "language": "typescript",       // 감지: typescript 또는 javascript
    "httpClient": "axios-custom",   // 감지: axios, fetch, ky, 또는 커스텀 래퍼
    "dataFetching": "react-query"   // 감지: react-query, swr, 또는 none
  },

  // ⬇️ 사용자가 기존 코드 샘플 경로 제공
  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  // ⬇️ 샘플 디렉토리 구조 & 코드에서 자동 감지
  "patterns": {
    "structure": {
      "type": "fsd",                                              // 디렉토리 패턴에서 감지
      "apiPath": "src/entities/{domain}/api/{domain}-api.ts",     // 샘플에서 감지
      "typesPath": "src/entities/{domain}/model/types.ts",        // 샘플에서 감지
      "hooksPath": "src/entities/{domain}/api/queries.ts"         // 샘플에서 감지
    },
    "httpClient": {
      "import": "import { createApi } from '@/shared/api'",       // 샘플 import에서 감지
      "usage": "createApi().{method}<{Type}>({path})",            // 샘플 코드에서 감지
      "responseAccess": ".data"                                   // 샘플 코드에서 감지
    }
    // naming, codeStyle: 샘플에서 자동 추론, 보통 설정 불필요
  },

  // ⬇️ 선택: 검증 동작 오버라이드
  "validation": {
    "ignorePaths": ["src/entities/legacy/*"]                      // 레거시 코드 스킵
  },

  "tagMapping": {
    "user-controller": "user",
    "project-controller": "project"
  },

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ]
}
```

### 자동 감지 원리

| 필드 | 감지 소스 |
|------|----------|
| `project.framework` | `package.json` dependencies |
| `project.httpClient` | 샘플 코드 imports (`axios`, `fetch`, `ky` 등) |
| `patterns.structure.*Path` | 샘플 파일 위치 → `{domain}` 패턴 추출 |
| `patterns.httpClient.*` | 샘플 코드 분석 |
| `patterns.naming.*` | 샘플 함수/타입명 |
| `patterns.codeStyle.*` | 샘플 코드 포맷팅 |

**어떤 프레임워크, 구조, 패턴이든 동작합니다** - 샘플 파일만 제공하면 그 스타일을 그대로 학습하고 복제합니다.

### 설정 필드 레퍼런스

#### 루트 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `$schema` | | IDE 자동완성용 JSON 스키마 URL |
| `version` | | 설정 파일 버전 (예: "1.0.0") |

#### openapi

| 필드 | 필수 | 설명 |
|------|------|------|
| `openapi.source` | ✅ | OpenAPI 스펙 경로 또는 URL |
| `openapi.remote` | | 원격 URL (로컬 파일과 다를 때) |
| `openapi.title` | | API 제목 (스펙 info.title에서 자동 입력) |
| `openapi.version` | | API 버전 (스펙 info.version에서 자동 입력) |

#### samples

| 필드 | 필수 | 설명 |
|------|------|------|
| `samples.api` | ✅ | API 함수 샘플 파일 경로 |
| `samples.types` | | TypeScript 타입 샘플 파일 경로 |
| `samples.hooks` | | React Query/SWR 훅 샘플 파일 경로 |
| `samples.keys` | | Query key factory 샘플 파일 경로 |

#### project (자동 감지)

| 필드 | 설명 |
|------|------|
| `project.framework` | 프레임워크: react, vue, angular, svelte, next, nuxt 등 |
| `project.language` | 언어: typescript 또는 javascript |
| `project.httpClient` | HTTP 클라이언트: axios, fetch, ky, 또는 커스텀 래퍼명 |
| `project.dataFetching` | 데이터 페칭 라이브러리: react-query, swr, 또는 none |

#### patterns (자동 감지)

| 필드 | 설명 |
|------|------|
| `patterns.structure.type` | 구조 타입: fsd, feature, flat |
| `patterns.structure.apiPath` | `{domain}` 플레이스홀더가 포함된 API 파일 경로 템플릿 |
| `patterns.structure.typesPath` | 타입 파일 경로 템플릿 |
| `patterns.structure.hooksPath` | 훅 파일 경로 템플릿 |
| `patterns.httpClient.import` | HTTP 클라이언트 import 문 |
| `patterns.httpClient.usage` | HTTP 클라이언트 사용 패턴 |
| `patterns.httpClient.responseAccess` | 응답 데이터 접근 방식 (예: ".data") |

> **참고:** `patterns.naming.*`과 `patterns.codeStyle.*`은 샘플에서 자동 추론됩니다. 수동 설정은 거의 필요 없습니다.

#### validation

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `validation.ignorePaths` | [] | 스킵할 경로 Glob 패턴 (예: `["src/legacy/*"]`) |

#### 기타

| 필드 | 설명 |
|------|------|
| `tagMapping` | OpenAPI 태그를 도메인명에 매핑 (예: `{"user-controller": "user"}`) |
| `ignore` | 무시할 엔드포인트 경로 (예: `["/health", "/internal/*"]`) |

## 캐시 파일

```
.openapi-sync.cache.json  → 스펙 캐시 (hash, endpoints, schemas)
.openapi-sync.state.json  → 구현 상태 (coverage)
```

### 캐시 무효화

다음 조건에서 캐시가 자동 무효화됩니다:
- `--force` 플래그 사용
- 캐시 파일 없음
- 캐시 버전 불일치
- 24시간 경과 (설정 가능)

## Lint 규칙

### 스펙 규칙 (10개)

| 규칙 | 설명 | 심각도 |
|------|------|--------|
| `response-key-consistency` | 리스트 응답 키 네이밍 | warning |
| `timestamp-naming` | 타임스탬프 필드명 | warning |
| `id-type-consistency` | ID 필드 타입 일관성 | error |
| `boolean-prefix` | Boolean 필드 접두사 | info |
| `operationId-format` | operationId 형식 | warning |
| `required-fields` | 필수 필드 일관성 | warning |
| `enum-casing` | Enum 값 케이싱 | info |
| `nullable-vs-optional` | nullable vs optional 사용 | info |
| `description-coverage` | 설명 커버리지 % | info |
| `path-naming` | URL 경로 네이밍 패턴 | warning |

### 코드 규칙 (10개)

| 규칙 | 설명 | 심각도 |
|------|------|--------|
| `export-pattern-consistency` | Barrel export 패턴 | warning |
| `immutability-pattern` | Object.freeze vs as const | warning |
| `type-naming-convention` | 타입 네이밍 (PascalCase 등) | warning |
| `api-function-parameter-style` | API 함수 파라미터 스타일 | info |
| `query-key-format` | Query key 네이밍 형식 | warning |
| `config-structure` | Config 파일 구조 | info |
| `barrel-export-completeness` | index.ts 파일 누락 | warning |
| `file-naming-convention` | 파일 네이밍 패턴 | info |
| `mutation-vs-query-separation` | Mutation/Query 파일 분리 | warning |
| `return-type-annotation` | 명시적 리턴 타입 | warning |

**참고:** 코드 규칙은 프로젝트 기반 감지를 사용합니다. 코드베이스의 majority 패턴이 "표준"이 됩니다 - 외부 규칙이 아닌 불일치를 찾습니다.

## CI/CD 통합

### GitHub Actions

```yaml
name: API Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate API
        run: claude /api:validate --strict

      - name: Lint API
        run: claude /api:lint --severity=critical
```

### Exit Codes

| 코드 | 의미 |
|------|------|
| 0 | 모든 체크 통과 |
| 1 | 에러 발견 |
| 2 | 경고 발견 (`--strict` 사용 시) |

## 성능

| 작업 | 시간 | 토큰 |
|------|------|------|
| `/api:status` | ~0.1초 | 0.5K |
| `/api:status --check-remote` | ~1초 | 0.5K |
| `/api:sync` (변경 없음) | ~5초 | 7K |
| `/api:sync` (변경 있음) | ~8초 | 12K |
| `/api:sync --trust-cache` | ~1초 | 0.5K |
| `/api:sync --force` | ~20초 | 55K |
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

## 에러 처리

| 에러 | 해결 방법 |
|------|----------|
| Invalid OpenAPI spec | 스펙 경로 확인, 포맷 검증 |
| Pattern detection failed | `--interactive` 모드 사용 |
| package.json not found | 프로젝트 루트에서 실행 |
| Config already exists | `--force` 사용 또는 merge 선택 |
| Cache corrupted | 다음 실행 시 자동 재생성 |

## 지원 환경

- **OpenAPI:** 3.0.x, 3.1.x, Swagger 2.0
- **언어:** TypeScript
- **HTTP 클라이언트:** Axios, Fetch, ky, 기타 (자동 감지)
- **데이터 페칭:** React Query, SWR, 기타 (자동 감지)
- **프레임워크:** React, Vue, Angular, Svelte (자동 감지)
- **구조:** FSD, Feature-based, Flat, 기타 (자동 감지)

## 트러블슈팅

### "No patterns detected"

```bash
# 샘플 수동 지정
/api:init --sample=src/api/user-api.ts

# 또는 인터랙티브 모드 사용
/api:init --interactive
```

### "Cache seems outdated"

```bash
# 전체 sync 강제
/api:sync --force

# 또는 원격만 확인
/api:status --check-remote
```

### "Generated code doesn't match my style"

1. `.openapi-sync.json`의 샘플 파일 경로 확인
2. `/api:analyze`로 감지된 패턴 확인
3. 필요시 config에서 patterns 수동 조정

## 라이선스

MIT
