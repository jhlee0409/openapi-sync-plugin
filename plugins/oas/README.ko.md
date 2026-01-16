# openapi-sync (oas)

[English](./README.md) | **한국어**

OpenAPI 스펙과 코드베이스를 동기화하는 Claude Code 플러그인.

**기존 도구와의 차이점:** 하드코딩된 템플릿 대신 **프로젝트의 기존 코드를 학습**해서 일관된 스타일로 생성.

```
"API 파일 하나 보여주면, 100개 더 만들어줄게"
```

## 설치

```bash
# 플러그인 마켓플레이스 추가 (최초 1회)
/plugin marketplace add jhlee0409/claude-plugins

# 플러그인 설치
/plugin install oas@jhlee0409-plugins
```

개발/테스트용:
```bash
# 로컬 디렉토리에서 플러그인 로드
claude --plugin-dir /path/to/claude-plugins
```

## 빠른 시작

```bash
# 1. OpenAPI 스펙으로 초기화 (URL 또는 로컬 경로)
/oas:init https://api.example.com/openapi.json
# 또는
/oas:init ./docs/openapi.yaml

# 2. 스펙 기반 코드 생성
/oas:sync

# 3. 일관성 검사
/oas:lint
```

## Commands

| Command | Description |
|---------|-------------|
| `/oas:init <url\|path>` | OpenAPI 스펙으로 초기화, 패턴 학습 |
| `/oas:sync` | **완전 동기화** - NEW, RENAME, MODIFY, REMOVE 모두 처리 |
| `/oas:migrate` | 대규모 버전 업그레이드 (v1→v2) 단계별 마이그레이션 |
| `/oas:status` | 캐시 기반 빠른 상태 확인 |
| `/oas:diff` | 스펙 변경사항 비교 |
| `/oas:validate` | 코드-스펙 일치 검증 |
| `/oas:lint` | 스펙 + 코드 일관성 검사 |
| `/oas:analyze` | 감지된 패턴 심층 분석 |

## 핵심 기능

### 1. 샘플 기반 패턴 학습

기존 API 코드를 분석해서 프로젝트 패턴을 학습:

```bash
/oas:init ./openapi.json                        # 로컬 파일
/oas:init https://api.example.com/openapi.json  # 원격 URL

📄 OpenAPI: My API v2.0.0 (25 endpoints)

🔍 기존 API 코드 검색 중...
   src/entities/*/api/에서 5개 API 파일 발견

📂 감지된 패턴:
  ✓ HTTP 클라이언트: createApi() (Axios wrapper)
  ✓ 데이터 페칭: React Query v5 + createQuery helper
  ✓ 구조: FSD (Feature-Sliced Design)
  ✓ 네이밍: camelCase functions, PascalCase types

이 패턴으로 코드를 생성할까요?
```

### 2. 일관된 코드 생성

학습된 패턴으로 새 API 코드 생성:

```bash
/oas:sync --tag=publisher

생성됨:
  ✓ src/entities/publisher/api/publisher-api.ts
  ✓ src/entities/publisher/api/publisher-queries.ts
  ✓ src/entities/publisher/api/publisher-mutations.ts
  ✓ src/entities/publisher/model/publisher-types.ts
  ✓ src/entities/publisher/config/publisher-api-paths.ts
```

### 3. 완전 동기화

`/oas:sync`가 **모든 변경 타입**을 자동으로 처리:

```bash
/oas:sync

═══════════════════════════════════════════════════════════════
  OpenAPI Sync Plan
  My API v1.0.0 → v1.1.0
═══════════════════════════════════════════════════════════════

📊 요약: 6개 변경 감지

┌─────────────────────────────────────────────────────────────┐
│ 타입     │ 개수 │ 영향 파일 │ 자동 │                       │
├─────────────────────────────────────────────────────────────┤
│ 🟢 NEW    │ 2    │ 8 (new)   │ ✅   │                       │
│ 🔵 RENAME │ 1    │ 12        │ ✅   │ 모든 사용처 업데이트! │
│ 🟠 MODIFY │ 2    │ 5         │ ✅   │                       │
│ 🔴 REMOVE │ 1    │ 3         │ ❌   │ 사용자 결정 필요      │
└─────────────────────────────────────────────────────────────┘

# 적용되는 변경:
# - 새 엔드포인트/타입 생성
# - 이름 변경 시 전체 프로젝트 사용처 자동 업데이트
# - 기존 타입 수정
# - 삭제된 엔드포인트 처리 (사용자 선택)
```

### 4. 프로젝트 기준 일관성 검사

프로젝트 자체의 majority 패턴을 기준으로 불일치 탐지:

```bash
/oas:lint

프로젝트 패턴 분석...
  Type naming: PascalCase (97.5%)
  Export style: export * (72.9%)
  Return types: Explicit (60.3%)

불일치 발견:
  🟡 upload-types.ts: 8개 타입이 camelCase 사용
     → 프로젝트 기준(PascalCase)과 다름

/oas:lint --fix

  ✓ 8개 타입 PascalCase로 변환
  ✓ 3개 파일 import 업데이트
  ✓ TypeScript 체크 통과
```

## Command 레퍼런스

### /oas:init

프로젝트 초기화 및 패턴 학습.

```bash
/oas:init                      # 자동 패턴 감지
/oas:init ./openapi.json       # 로컬 스펙 파일 사용
/oas:init https://api.com/spec # 원격 스펙 URL 사용
/oas:init --force              # 기존 설정 덮어쓰기
/oas:init --interactive        # 자동 감지 스킵, 수동 설정
/oas:init --sample=path        # 특정 샘플 파일 지정
```

### /oas:sync

**완전 동기화** - 모든 변경 타입(NEW, RENAME, MODIFY, REMOVE) 처리.

```bash
# 기본
/oas:sync                    # 완전 동기화 (기본)
/oas:sync --dry-run          # 미리보기만, 파일 변경 없음
/oas:sync --force            # 캐시 무시, 강제 fetch
/oas:sync --offline          # 캐시된 스펙만 사용 (네트워크 없음)

# 범위 제어
/oas:sync --only-new         # 새 엔드포인트만 생성
/oas:sync --only-changes     # RENAME + MODIFY만
/oas:sync --only-renames     # 이름 변경만
/oas:sync --skip-remove      # REMOVE 처리 건너뜀

# 태그별 필터
/oas:sync --tag=users        # 특정 태그만
/oas:sync --tag=users --tag=projects  # 여러 태그

# 엔드포인트별 필터
/oas:sync --endpoint="/api/v1/users/{id}"
/oas:sync --endpoint="/api/v1/clips/*"  # 와일드카드

# 안전
/oas:sync --keep-backup      # 완료 후 백업 유지
/oas:sync --no-verify        # TypeScript 검증 건너뜀
```

**처리되는 변경 타입:**
| 타입 | 아이콘 | 설명 |
|------|--------|------|
| NEW | 🟢 | 새 엔드포인트/스키마 → 자동 생성 |
| RENAME | 🔵 | 이름 변경 → 모든 사용처 자동 업데이트 |
| MAYBE_RENAME | 🟡 | RENAME 가능성 (점수 0.5~0.8) → 사용자 확인 필요 |
| MODIFY | 🟠 | 필드 변경 → 타입 정의 업데이트 |
| REMOVE | 🔴 | 스펙에서 삭제 → 사용자 선택 |

### /oas:diff

OpenAPI 스펙 변경사항 비교.

```bash
/oas:diff                    # 캐시 vs 현재 비교
/oas:diff --remote           # 원격 스펙과 비교
/oas:diff old.json new.json  # 두 파일 비교
/oas:diff --breaking-only    # Breaking changes만 표시
/oas:diff --force            # 캐시 무시, 새 스펙 가져오기
/oas:diff --offline          # 캐시된 스펙만 사용 (네트워크 없음)
/oas:diff --tag=users        # 특정 태그만
/oas:diff --exclude-tag=internal  # 특정 태그 제외
/oas:diff --list-tags        # 태그별 변경 요약 표시
```

### /oas:validate

코드-스펙 일치 검증.

```bash
/oas:validate                # 기본 검증
/oas:validate --strict       # 경고도 에러로 처리
/oas:validate --fix          # 자동 수정 가능한 것 수정
/oas:validate --force        # 캐시 무시, 새 스펙 가져오기
/oas:validate --offline      # 캐시된 스펙만 사용 (네트워크 없음)
/oas:validate --tag=users    # 특정 태그만
/oas:validate --quiet        # 에러만 출력
```

### /oas:lint

스펙 + 코드 일관성 검사.

```bash
/oas:lint                    # 스펙 + 코드 전체 검사
/oas:lint --spec             # 스펙만 검사
/oas:lint --code             # 코드만 검사
/oas:lint --fix              # 수정 제안 표시
/oas:lint --rule=type-naming # 특정 규칙만
/oas:lint --severity=critical # 심각도별 필터
/oas:lint --ignore=pattern   # 특정 경로/스키마 무시
/oas:lint --force            # 캐시 무시, 새 스펙 가져오기
/oas:lint --offline          # 캐시된 스펙만 사용 (네트워크 없음)
```

### /oas:status

캐시 기반 빠른 상태 확인.

```bash
/oas:status                  # 즉시 상태 (~0.1초)
/oas:status --check-remote   # 원격 스펙 hash 확인 (~1초)
/oas:status --tag=users      # 특정 태그 상태 확인
/oas:status --list-tags      # 모든 태그 커버리지 표시
/oas:status --quiet          # 요약만
/oas:status --verbose        # 상세 커버리지 분석
```

### /oas:analyze

감지된 패턴 심층 분석.

```bash
/oas:analyze                 # 전체 패턴 분석
/oas:analyze --verbose       # 모든 파일 경로와 코드 샘플 표시
/oas:analyze --domain=users  # 특정 도메인만 분석
```

### /oas:migrate

**대규모 버전 업그레이드** (v1→v2) 단계별 마이그레이션, 커스텀 코드 보호.

```bash
# 단계별 마이그레이션 (대규모 업그레이드 권장)
/oas:migrate                    # 인터랙티브 Phase별 마이그레이션

# 미리보기
/oas:migrate --dry-run          # 모든 Phase 미리보기

# 한번에 실행 (확신이 있을 때)
/oas:migrate --all-at-once      # Phase 확인 건너뜀

# 특정 Phase
/oas:migrate --types-only       # Phase 1: 타입만
/oas:migrate --api-only         # Phase 2: API 함수만
/oas:migrate --phase=1          # 특정 Phase 번호

# 롤백 지원
/oas:migrate --rollback         # 마지막 Phase 롤백
/oas:migrate --rollback-to=2    # 체크포인트 2로 롤백
/oas:migrate --rollback-all     # 전체 마이그레이션 취소
```

**마이그레이션 Phase:**
| Phase | 내용 | 안전도 |
|-------|------|--------|
| 1 | Types & Schemas | 가장 안전 |
| 2 | API Functions | 중간 |
| 3 | Hooks & Features | 검토 필요 |
| 4 | Cleanup | 선택적 |

**`/oas:sync` vs `/oas:migrate` 언제 사용?**
| 상황 | 명령어 |
|------|--------|
| 일상적인 스펙 변경 | `/oas:sync` |
| 필드 추가/제거 | `/oas:sync` |
| 이름 변경 | `/oas:sync` |
| **v1 → v2 업그레이드** | `/oas:migrate` |
| **50%+ 엔드포인트 변경** | `/oas:migrate` |
| **10개+ breaking changes** | `/oas:migrate` |

## 태그 필터링

OpenAPI 태그로 작업 필터링. 태그는 각 엔드포인트의 `tags` 필드에서 추출됩니다.

### 태그 확인

```bash
# 사용 가능한 태그 목록
/oas:sync --list-tags

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
/oas:sync --tag=workspace

# 여러 태그 (OR 로직)
/oas:sync --tag=workspace --tag=billing

# 태그 제외
/oas:sync --exclude-tag=internal

# 조합
/oas:sync --tag=workspace --exclude-tag=deprecated
```

### 태그 지원 커맨드

| 커맨드 | 예시 |
|--------|------|
| `/oas:sync` | `--tag=users`, `--exclude-tag=internal` |
| `/oas:diff` | `--tag=users`, `--list-tags` |
| `/oas:status` | `--tag=users`, `--list-tags` |
| `/oas:validate` | `--tag=users` |

### 태그 기반 생성

`--tag` 사용 시 매칭되는 태그의 엔드포인트만 처리:

```bash
/oas:sync --tag=billing

생성됨:
  src/entities/billing/
  ├── api/billing-api.ts        (8개 함수)
  ├── api/billing-queries.ts    (8개 훅)
  ├── config/billing-api-paths.ts
  └── model/billing-types.ts    (12개 타입)
```

## Sync 변경 타입

| 타입 | 아이콘 | 자동 | 설명 |
|------|--------|------|------|
| NEW | 🟢 | ✅ | 새 엔드포인트/스키마 감지 → 새 파일 생성 |
| RENAME | 🔵 | ✅ | operationId/스키마 이름 변경 → 전체 프로젝트 사용처 업데이트 |
| MAYBE_RENAME | 🟡 | ❓ | RENAME 가능성 (확인 필요) → 사용자 결정: rename 또는 분리 |
| MODIFY | 🟠 | ✅ | 필드 추가/제거/변경 → 타입 정의 업데이트 |
| REMOVE | 🔴 | ❌ | 스펙에서 삭제됨 → 사용자 선택: 삭제/유지/deprecated |

**이름 변경 감지 알고리즘 (가중치 스코어링):**

removed + added 항목을 가중치 스코어링으로 비교:
```
totalScore =
  pathScore * 0.15 +      // 경로 유사도 (15%)
  opIdScore * 0.25 +      // operationId 유사도 (25%)
  schemaScore * 0.30 +    // 스키마 구조 (30%)
  fieldScore * 0.30;      // 필드 겹침 (30%)

if (totalScore >= 0.8) → RENAME (자동)
if (totalScore >= 0.5) → MAYBE_RENAME (사용자 확인)
if (totalScore < 0.5)  → DELETE + ADD (별개 항목)
```

## 인터랙티브 선택

`/oas:sync` 실행 시 Sync Plan을 보여주고 확인 요청:

```
═══════════════════════════════════════════════════════════════════
  OpenAPI Sync Plan
  My API v1.0.0 → v1.1.0
═══════════════════════════════════════════════════════════════════

📊 요약: 8개 변경 감지

🟢 NEW: 2개 엔드포인트
  + POST /api/v1/clips/{id}/render
  + GET /api/v1/clips/{id}/status

🔵 RENAME: 1개 (12개 사용처)
  ↻ getTaskStatus → getTask

🟠 MODIFY: 4개 타입 변경
  ~ CreateProjectRequest: +workspaceId (required)
  ~ UserResponse: status → enum type

🔴 REMOVE: 1개 엔드포인트 (사용자 결정 필요)
  - DELETE /api/v1/sessions/{id}

동기화를 진행할까요?
  [A] 모두 적용 (자동 변경만, REMOVE는 별도 질문)
  [S] 특정 변경 선택
  [P] 미리보기 (dry-run)
  [C] 취소
```

**응답 옵션:**
- `[A]` - 모든 자동 변경 적용, REMOVE 항목은 별도 질문
- `[S]` - 적용할 특정 변경 선택
- `[P]` - 적용 없이 미리보기
- `[C]` - 취소

## Breaking Changes 감지

`/oas:diff`가 자동으로 breaking changes 감지:

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

대규모 버전 업그레이드(v1→v2)는 `/oas:migrate`를 사용해서 단계별로 롤백 지원하며 마이그레이션하세요.

## 내부 Skills

sync/migrate 기능을 구동하는 스킬들:

| Skill | 목적 |
|-------|------|
| `cache-manager` | 스펙 fetch, 캐시 버전과 diff 계산 |
| `openapi-parser` | OpenAPI/Swagger 스펙 구조 파싱 |
| `pattern-detector` | 기존 코드 샘플에서 패턴 학습 |
| `code-generator` | 프로젝트 패턴에 맞는 새 코드 생성 |
| `code-spec-mapper` | 양방향 코드 ↔ 스펙 매핑 구축 |
| `import-tracker` | 프로젝트 전체 import 의존성 추적 |
| `refactoring-engine` | 이름 변경 + 자동 사용처 업데이트 |
| `migration-applier` | 필드/타입 변경 원자적 적용 |

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

> **참고:** 대부분의 값은 `/oas:init` 실행 시 코드베이스에서 **자동 감지**됩니다.
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

아래는 `/oas:init`이 코드베이스 스캔 후 생성하는 예시입니다.
**모든 값은 예시일 뿐** - 실제 값은 당신의 프로젝트 코드에서 감지됩니다.

```json
{
  "version": "1.0.0",

  "openapi": {
    "source": "https://api.example.com/openapi.json"
  },

  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  "tagMapping": {
    "user-controller": "user",
    "project-controller": "project"
  },

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ],

  "validation": {
    "ignorePaths": ["src/entities/legacy/*"]
  }
}
```

> **참고:** `project.*`와 `patterns.*`는 샘플에서 자동 감지되어 내부적으로 저장됩니다.
> 수동 설정할 필요 없습니다.

### 설정 필드 레퍼런스

| 필드 | 필수 | 설명 |
|------|------|------|
| `version` | | 설정 파일 버전 (예: "1.0.0") |
| `openapi.source` | ✅ | OpenAPI 스펙 경로 또는 URL |
| `samples.api` | ✅ | API 함수 샘플 파일 경로 |
| `samples.types` | | TypeScript 타입 샘플 파일 경로 |
| `samples.hooks` | | React Query/SWR 훅 샘플 파일 경로 |
| `samples.keys` | | Query key factory 샘플 파일 경로 |
| `tagMapping` | | OpenAPI 태그를 도메인명에 매핑 (예: `{"user-controller": "user"}`) |
| `ignore` | | 무시할 엔드포인트 경로 (예: `["/health", "/internal/*"]`) |
| `validation.ignorePaths` | | 검증 스킵할 경로 Glob 패턴 |

> **참고:** `project.*`와 `patterns.*`는 `/oas:init`에서 샘플 코드를 분석해 자동 감지하고 내부적으로 저장됩니다. 수동 설정 불필요.

## 캐시 파일

```
.openapi-sync.json            → 메인 설정 (openapi source, samples 등)
.openapi-sync.cache.json      → 스펙 캐시 (hash, endpoints, schemas)
.openapi-sync.state.json      → 구현 상태 (coverage, timestamps)
.openapi-sync.mapping.json    → 코드-스펙 양방향 매핑
.oas-refactor-backup/         → sync 리팩토링 중 백업
.openapi-migrate-backup/      → 대규모 마이그레이션 중 Phase 체크포인트
```

### 시간 추적 필드

| 파일 | 필드 | 설명 |
|------|------|------|
| cache.json | `lastFetch` | OpenAPI 스펙을 서버에서 마지막으로 가져온 시간 |
| state.json | `lastScan` | 코드베이스를 마지막으로 스캔한 시간 |
| state.json | `lastSync` | `/oas:sync`로 코드를 마지막으로 생성한 시간 |

`/oas:status`로 이 타임스탬프들을 확인할 수 있습니다.

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
/oas:init --sample=src/api/user-api.ts

# 또는 인터랙티브 모드 사용
/oas:init --interactive
```

### "Cache seems outdated"

```bash
# 전체 sync 강제
/oas:sync --force

# 또는 원격만 확인
/oas:status --check-remote
```

### "Generated code doesn't match my style"

1. `.openapi-sync.json`의 샘플 파일 경로 확인
2. `/oas:analyze`로 감지된 패턴 확인
3. 필요시 config에서 patterns 수동 조정

## 라이선스

MIT
