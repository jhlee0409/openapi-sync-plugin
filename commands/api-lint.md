---
name: api:lint
description: Lint OpenAPI spec AND codebase for inconsistencies
argument-hint: [--spec] [--code] [--fix] [--rule=name]
---

# API Lint

OpenAPI 스펙과 코드베이스의 일관성을 검사. 수동으로 작성된 스펙/코드의 불일치를 찾아냄.

## 검사 대상

```
/api:lint           → 스펙 + 코드 둘 다 검사 (기본)
/api:lint --spec    → OpenAPI 스펙만 검사
/api:lint --code    → 코드베이스만 검사
```

## Usage

```bash
# 전체 검사
/api:lint

# 특정 규칙만
/api:lint --rule=naming
/api:lint --rule=response-structure

# 수정 제안
/api:lint --fix
```

## Part 1: Spec Lint Rules (--spec)

### 1. response-key-consistency

List 응답의 키 이름 일관성 검사:

```
⚠️ INCONSISTENT: List response keys vary

  Found 4 different patterns:
    "items"    → 12 endpoints (48%)
    "results"  → 8 endpoints (32%)
    "videos"   → 3 endpoints (12%)
    "projects" → 2 endpoints (8%)

  Examples:
    GET /shortform/videos     → { videos: [...] }
    GET /project/projects     → { results: [...] }
    GET /workspace/users      → { items: [...] }

  💡 Recommendation:
    Standardize on "items" (most common)
    Or use resource-specific names consistently
```

### 2. timestamp-naming

타임스탬프 필드명 일관성:

```
⚠️ INCONSISTENT: Timestamp field naming varies

  Found 3 patterns:
    "created_at"   → 15 schemas
    "created"      → 8 schemas
    "createdAt"    → 3 schemas (camelCase)

  Examples:
    UserProfile.created_at
    Project.created
    VideoClip.createdAt

  💡 Recommendation:
    Standardize on "created_at" (most common, follows snake_case)
```

### 3. id-type-consistency

ID 필드 타입 일관성:

```
⚠️ INCONSISTENT: ID field types vary

  Found mixed types for same concepts:
    project_id:
      - integer → 5 usages
      - string  → 3 usages

    video_id:
      - integer → 4 usages
      - string  → 2 usages

  Examples:
    POST /project/project     → project_id: integer
    GET /shortform/video/{id} → video_id: string

  💡 Recommendation:
    Use consistent type per entity
    Consider: string for UUIDs, integer for auto-increment
```

### 4. boolean-prefix

Boolean 필드 prefix 일관성:

```
⚠️ INCONSISTENT: Boolean field prefixes vary

  Found patterns:
    "is_*"     → 12 fields (is_active, is_deleted)
    "has_*"    → 3 fields (has_access, has_template)
    "allow_*"  → 2 fields (allow_auto_join)
    "use_*"    → 2 fields (use_template)
    no prefix  → 5 fields (active, enabled, visible)

  💡 Recommendation:
    Standardize on "is_*" prefix for state
    Use "has_*" for possession
    Use "can_*" for permissions
```

### 5. operationId-format

OperationId 형식 일관성:

```
⚠️ INCONSISTENT: operationId formats vary

  Found patterns:
    "{verb}_{resource}"           → 45% (get_user, create_project)
    "{verb}{Resource}"            → 30% (getUser, createProject)
    "{verb}_{resource}_{path}_{method}" → 25% (auto-generated)

  Examples:
    get_my_videos_history_videos_get  ← Too verbose
    getUser                           ← Clean
    create_project_project_project_post ← Redundant

  💡 Recommendation:
    Use "{verb}{Resource}" pattern (e.g., getUser, listProjects)
    Remove auto-generated suffixes
```

### 6. required-fields

Required 필드 일관성:

```
⚠️ INCONSISTENT: Required fields vary between similar schemas

  CreateProjectRequest:
    required: [name, workspace_id]

  UpdateProjectRequest:
    required: [name]  ← workspace_id not required (expected)

  CreateVideoRequest:
    required: [title]  ← missing project_id? (inconsistent with other creates)

  💡 Recommendation:
    Review create requests - should all require parent ID?
```

### 7. enum-casing

Enum 값 케이싱 일관성:

```
⚠️ INCONSISTENT: Enum value casing varies

  status enums:
    "active", "inactive"     → lowercase
    "PENDING", "COMPLETED"   → UPPERCASE
    "InProgress"             → PascalCase

  💡 Recommendation:
    Standardize on lowercase or SCREAMING_SNAKE_CASE
```

### 8. nullable-vs-optional

Nullable과 Optional 사용 일관성:

```
⚠️ INCONSISTENT: Nullable vs Optional usage

  Some fields use nullable:
    { "type": "string", "nullable": true }

  Some fields are simply optional:
    (not in "required" array)

  Some use both:
    optional + nullable

  💡 Recommendation:
    nullable = can be explicitly null
    optional = can be omitted
    Be explicit about the difference
```

### 9. description-coverage

Description 커버리지:

```
⚠️ LOW COVERAGE: Many items lack descriptions

  Endpoints: 45/150 have descriptions (30%)
  Schemas: 12/50 have descriptions (24%)
  Parameters: 20/200 have descriptions (10%)

  Missing descriptions for important endpoints:
    POST /project/project - no description
    GET /ai-tools/models - no description

  💡 Recommendation:
    Add descriptions for all public endpoints
    At minimum: summary for each operation
```

### 10. path-naming

Path 네이밍 패턴:

```
⚠️ INCONSISTENT: Path naming patterns vary

  Found patterns:
    kebab-case: /short-form/videos (majority)
    snake_case: /ai_tools/execute (some)
    mixed: /shortform/video (no separator)

  💡 Recommendation:
    Standardize on kebab-case for URLs
```

## Part 2: Code Lint Rules (--code)

코드베이스의 패턴 일관성 검사.

### 핵심 원칙: 프로젝트 기준 감지

```
⚠️ 우리가 "표준"을 정하지 않음
⚠️ 해당 프로젝트 내 패턴을 먼저 학습
⚠️ 가장 많이 쓰인 패턴이 그 프로젝트의 기준
⚠️ 기준에서 벗어난 것만 불일치로 표시
```

**예시:**
- 프로젝트 A: camelCase 90% → camelCase가 기준, PascalCase가 불일치
- 프로젝트 B: PascalCase 90% → PascalCase가 기준, camelCase가 불일치
- 둘 다 "틀린 게" 아니라 "일관되지 않은 것"을 찾는 것

샘플 기반 분석으로 가장 많이 사용된 패턴을 기준으로 불일치 탐지.

### 1. export-pattern-consistency

Barrel export 패턴 일관성:

```
⚠️ INCONSISTENT: Export patterns vary across entities

  Found 2 patterns:
    "export *"           → 8 files (67%)
    "export { named }"   → 4 files (33%)

  Examples:
    src/entities/video/api/index.ts:1
      export * from './video-api';

    src/entities/short-form/api/index.ts:1
      export { shortFormApi } from './short-form-api';

  💡 Recommendation:
    Standardize on "export *" (majority pattern)
```

### 2. immutability-pattern

Object immutability 패턴:

```
⚠️ INCONSISTENT: Immutability patterns vary

  Found 2 patterns:
    Object.freeze()  → 6 usages (55%)
    as const         → 5 usages (45%)

  Examples:
    src/entities/video/api/video-api.ts:33
      export const videoApi = Object.freeze({ ... });

    src/entities/voc/api/voc-api.ts:38
      export const vocApi = { ... } as const;

  💡 Recommendation:
    Standardize on Object.freeze() for runtime protection
    Or use "as const" for simpler type narrowing
```

### 3. type-naming-convention

Type 네이밍 컨벤션:

```
⚠️ INCONSISTENT: Type naming conventions vary

  Detected project pattern (majority):
    PascalCase → 45 types (75%) ← This project's standard

  Deviations from project pattern:
    camelCase  → 12 types (20%)
    snake_case → 3 types (5%)

  Inconsistent examples:
    src/entities/upload/model/upload-types.ts:2
      export type uploadVideoPresignedUrlQuery = { ... }
      → Project uses PascalCase elsewhere

    src/entities/upload/model/upload-types.ts:8
      export type uploadVideoPresignedUrlResponse = { ... }
      → Project uses PascalCase elsewhere

  💡 Suggestion:
    Consider aligning with project's majority pattern (PascalCase)
    Or update config to allow mixed conventions
```

### 4. api-function-parameter-style

API 함수 파라미터 스타일:

```
⚠️ INCONSISTENT: API function parameter patterns vary

  Found 2 patterns:
    "props with destructure"  → 60%
      async (props: { id: string }) => { const { id } = props; ... }

    "direct params"           → 40%
      async (params: QueryType): Promise<ResponseType> => { ... }

  Examples:
    src/entities/video/api/video-api.ts:10
      const getVideo = async (props: { videoId: string }) => {
        const { videoId } = props;

    src/entities/upload/api/upload-api.ts:22
      const getVideoPreSignedUrl = async (
        params: uploadVideoPresignedUrlQuery,
      ): Promise<uploadVideoPresignedUrlResponse> => {

  💡 Recommendation:
    Standardize on one pattern:
    - "props": Simpler, self-documenting
    - "params with types": Better type reuse
```

### 5. query-key-format

Query key 네이밍 형식:

```
⚠️ INCONSISTENT: Query key formats vary

  Found 3 patterns:
    Simple string     → ['video'], ['user']
    Kebab compound    → ['project-directory']
    Array tuple       → ['billing', 'encryption-public-key']

  Examples:
    src/entities/video/api/video-queries.ts:7
      createQuery(['video'], videoApi.getVideo)

    src/entities/project/api/project-queries.ts:9
      createQuery(['project-directory'], projectApi.getDirectory)

    src/entities/billing/api/billing-queries.ts:7
      createQuery(['billing', 'encryption-public-key'], ...)

  💡 Recommendation:
    Standardize on array tuple pattern for better organization:
    ['entity', 'action', ...params]
```

### 6. config-structure

Config 파일 구조:

```
⚠️ INCONSISTENT: Config path structures vary

  Found 2 patterns:
    "Function properties"     → 7 files
      getUser: (id) => `/users/${id}`

    "Nested object"           → 3 files
      USER: { LIST: '/users', DETAIL: '/users/:id' }

  Examples:
    src/entities/billing/config/billing-api-paths.ts
      getEncryptionPublicKey: () => `${BASE_PATH}/encryption-public-key`,

    src/entities/short-form/config/short-form-api-paths.ts
      GENERATION: { LIST: `${PREFIX}/generation`, ... }

  💡 Recommendation:
    Function properties are more flexible (dynamic params)
```

### 7. barrel-export-completeness

Barrel export 완전성:

```
⚠️ MISSING: Some entities missing barrel exports

  Missing index.ts in:
    src/entities/video/model/
      Has: types.ts
      Missing: index.ts with "export type * from './types'"

    src/entities/workspace/config/
      Has: workspace-api-paths.ts
      Missing: index.ts

  💡 Recommendation:
    Add barrel exports to all directories for consistent imports
```

### 8. file-naming-convention

파일 네이밍 컨벤션:

```
✅ CONSISTENT: File naming follows {entity}-{type}.ts pattern

  ✓ video-api.ts, video-queries.ts, video-types.ts
  ✓ billing-api.ts, billing-queries.ts, billing-types.ts
  ✓ ai-tool-api.ts, ai-tool-queries.ts

  Minor inconsistencies:
    src/entities/common/model/common-types.ts  ← "common-types"
    src/entities/ai-tool/model/types.ts        ← just "types"

  💡 Recommendation:
    Standardize on "{entity}-types.ts" pattern
```

### 9. mutation-vs-query-separation

Mutation과 Query 분리:

```
✅ MOSTLY CONSISTENT: Mutations separated from queries

  Pattern: *-queries.ts + *-mutations.ts

  Exceptions:
    src/entities/ai-tool/api/
      Has: ai-tool-api.ts, ai-tool-queries.ts
      Missing: ai-tool-mutations.ts (mutations in api file?)

  💡 Recommendation:
    Always separate mutations into *-mutations.ts
```

### 10. return-type-annotation

Return type 명시:

```
⚠️ INCONSISTENT: Some API functions missing return types

  With explicit return type    → 65%
  Without explicit return type → 35%

  Examples:
    src/entities/billing/api/billing-api.ts:15
      const getEncryptionPublicKey = async (): Promise<BillingEncryptionKeyResponse> =>
      ✓ Has return type

    src/entities/video/api/video-api.ts:10
      const getVideo = async (props: { videoId: string }) => {
      ✗ Missing return type

  💡 Recommendation:
    Always annotate return types for API functions
```

## Output Format

```
═══════════════════════════════════════════════════
  API Lint Report (Spec + Code)
═══════════════════════════════════════════════════

📄 Spec: AIAAS Shorts Maker API v2.0.0
   Source: https://api-dev.viskits.ai/openapi.json
   Endpoints: 150 | Schemas: 50

📁 Codebase: /Users/jack/client/buzzni-shorts-maker
   Entities: 17 | API files: 34

───────────────────────────────────────────────────
📊 Summary
───────────────────────────────────────────────────

  SPEC INCONSISTENCIES:
    🔴 High:    2 (type conflicts)
    🟡 Medium:  5 (naming variations)
    🟢 Low:     3 (minor differences)

  CODE INCONSISTENCIES:
    🟡 High:    1 (25% deviation - type-naming)
    🟡 Medium:  6 (pattern variations)
    🟢 Low:     2 (minor differences)

  TOTAL: 3 high, 11 medium, 5 low inconsistencies
  ✅ Consistent: 12 patterns

───────────────────────────────────────────────────
🔴 CRITICAL (SPEC)
───────────────────────────────────────────────────

1. [id-type-consistency] Mixed ID types
   project_id uses both integer and string
   Impact: Type safety issues, client confusion
   Affected: 8 endpoints

2. [required-fields] Inconsistent required fields
   Create requests missing expected parent IDs
   Impact: Validation inconsistency
   Affected: 3 schemas

───────────────────────────────────────────────────
🟡 HIGH INCONSISTENCY (CODE)
───────────────────────────────────────────────────

1. [type-naming-convention] Mixed type naming patterns
   Project majority: PascalCase (75%)
   Deviations found: 12 types use camelCase

   src/entities/upload/model/upload-types.ts
     - uploadVideoPresignedUrlQuery (camelCase)
     - uploadVideoPresignedUrlResponse (camelCase)

   Impact: Inconsistent within codebase
   Affected: 12 types (25% of total)

───────────────────────────────────────────────────
🟡 WARNING (SPEC)
───────────────────────────────────────────────────

1. [response-key-consistency] 4 different list key names
   items, results, videos, projects

2. [timestamp-naming] 3 different timestamp patterns
   created_at, created, createdAt

3. [boolean-prefix] 5 different boolean patterns
   is_*, has_*, allow_*, use_*, none

───────────────────────────────────────────────────
🟡 WARNING (CODE)
───────────────────────────────────────────────────

1. [export-pattern-consistency] Mixed export patterns
   export * (67%) vs export { named } (33%)
   Affected: 12 index.ts files

2. [immutability-pattern] Object.freeze vs as const
   Object.freeze (55%) vs as const (45%)
   Affected: 11 API objects

3. [query-key-format] 3 different query key formats
   Simple, kebab-compound, array-tuple
   Affected: 34 queries

4. [api-function-parameter-style] 2 parameter styles
   props-destructure (60%) vs direct-params (40%)
   Affected: 28 functions

5. [return-type-annotation] Missing return types
   65% have explicit types, 35% don't
   Affected: 18 functions

6. [barrel-export-completeness] Missing index.ts
   Affected: 3 directories

───────────────────────────────────────────────────
🟢 INFO
───────────────────────────────────────────────────

1. [description-coverage] 30% endpoint coverage
   Consider adding more descriptions

───────────────────────────────────────────────────
✅ PASSED (15)
───────────────────────────────────────────────────

  ✓ http-method-usage
  ✓ status-code-consistency
  ✓ security-scheme-usage
  ✓ content-type-consistency
  ...

═══════════════════════════════════════════════════

💡 Run /api:lint --fix to see suggested fixes
```

## Fix Suggestions

```bash
/api:lint --fix
```

```
🔧 Suggested Fixes for Critical Issues

───────────────────────────────────────────────────
1. [id-type-consistency] Standardize project_id to integer
───────────────────────────────────────────────────

Affected endpoints:
  - GET /shortform/video/{video_id}
  - POST /project/clips

Suggested schema change:
  Before: { "project_id": { "type": "string" } }
  After:  { "project_id": { "type": "integer" } }

Apply this fix? [y/n/skip all]

───────────────────────────────────────────────────
2. [response-key-consistency] Standardize to "items"
───────────────────────────────────────────────────

Affected endpoints:
  - GET /shortform/videos (videos → items)
  - GET /project/projects (results → items)

⚠️  Breaking change warning:
    Clients may depend on current key names.
    Consider: Add "items" alias, deprecate old keys.

Show migration guide? [y/n]
```

## Flags

```bash
--rule=name       # 특정 규칙만 실행
--ignore=pattern  # 특정 경로/스키마 무시
--fix             # 수정 제안 표시
--json            # JSON 형식 출력
--severity=level  # critical/warning/info 필터
--output=file     # 결과를 파일로 저장
```

## Config

`.openapi-sync.json`에서 lint 규칙 설정:

```json
{
  "lint": {
    "spec": {
      "rules": {
        "response-key-consistency": "warning",
        "timestamp-naming": "warning",
        "id-type-consistency": "critical",
        "boolean-prefix": "info",
        "operationId-format": "off",
        "description-coverage": "info"
      },
      "ignore": {
        "paths": ["/internal/*", "/debug/*"],
        "schemas": ["LegacyResponse", "DeprecatedUser"]
      },
      "custom": {
        "preferredListKey": "items",
        "preferredTimestamp": "created_at",
        "preferredBooleanPrefix": "is_"
      }
    },
    "code": {
      "rules": {
        "export-pattern-consistency": "warning",
        "immutability-pattern": "warning",
        "type-naming-convention": "critical",
        "api-function-parameter-style": "warning",
        "query-key-format": "warning",
        "config-structure": "info",
        "barrel-export-completeness": "warning",
        "file-naming-convention": "info",
        "mutation-vs-query-separation": "warning",
        "return-type-annotation": "warning"
      },
      "ignore": {
        "paths": ["src/entities/legacy/*"],
        "files": ["*.test.ts", "*.spec.ts"]
      },
      "preferences": {
        "_comment": "Override auto-detected patterns (optional)",
        "exportPattern": "auto",
        "immutabilityPattern": "auto",
        "typeNaming": "auto",
        "parameterStyle": "auto",
        "queryKeyFormat": "auto"
      },
      "thresholds": {
        "_comment": "Minimum % to consider a pattern as 'project standard'",
        "majorityThreshold": 60,
        "highInconsistency": 25,
        "mediumInconsistency": 10
      }
    }
  }
}
```

## Integration with Other Commands

```bash
# lint 후 sync
/api:lint && /api:sync

# CI에서 lint 실패 시 중단
/api:lint --severity=critical

# lint 결과를 sync에 반영 (일관된 코드 생성)
/api:sync --normalize
```

## Custom Rules

프로젝트별 커스텀 규칙 추가:

```json
{
  "lint": {
    "customRules": [
      {
        "name": "workspace-id-required",
        "description": "All create endpoints should require workspace_id",
        "check": "endpoints.filter(e => e.method === 'POST' && !e.requestBody.required.includes('workspace_id'))",
        "severity": "warning"
      }
    ]
  }
}
```
