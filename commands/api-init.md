---
name: api:init
description: Initialize OpenAPI sync - learns your project patterns automatically
argument-hint: [openapi-spec-path-or-url]
---

# OpenAPI Sync Initialization

Initialize OpenAPI sync by learning your project's existing patterns. Works with ANY codebase.

## Flow Overview

```
┌─────────────────────────────────────────────────────────┐
│                    /api:init                            │
├─────────────────────────────────────────────────────────┤
│  1. Get OpenAPI spec location                           │
│  2. Detect framework (package.json)                     │
│  3. Find existing API code (sample discovery)           │
│  4. Analyze samples OR ask user                         │
│  5. Generate .openapi-sync.json                         │
│  6. Show summary                                        │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Get OpenAPI Spec Location

**Supported sources:**
```
파일:  ./openapi.json, ./docs/swagger.yaml
URL:   https://api.example.com/openapi.json
```

**If argument provided:**
```
http:// or https:// → URL로 fetch
그 외 → 로컬 파일로 읽기
```

**If no argument:**
```
1. 로컬에서 openapi.json, swagger.json 등 검색
2. 있으면 사용할지 확인
3. 없으면 경로/URL 입력 요청
```

**Validate:**
```
- OpenAPI 3.x 또는 Swagger 2.x 구조 확인
- title, version, endpoints 추출
```

## Step 2: Framework Detection

**Read package.json:**

```typescript
// Detect ecosystem
const framework = detectFramework(packageJson)

// Output example:
{
  framework: "react",         // react, vue, angular, svelte, etc.
  language: "typescript",     // typescript or javascript
  httpClient: "axios",        // from dependencies
  dataFetching: "react-query" // from dependencies
}
```

**Report:**
```
📦 package.json 분석:
  Framework: React + TypeScript
  HTTP Client: axios
  Data Fetching: @tanstack/react-query v5
```

## Step 3: Sample Discovery

**Use pattern-detector skill:**

```
Invoke skill: pattern-detector
```

**Search for existing API code:**
1. Common API locations
2. Files with HTTP calls
3. Files with query hooks
4. Type definition files

**Possible outcomes:**

```
OUTCOME A: Samples found
  → "Found 5 API files in src/entities/*/api/"
  → Proceed to sample analysis

OUTCOME B: No samples found
  → "No existing API code found"
  → Go to interactive mode
```

## Step 4a: Sample Analysis (if samples found)

**Analyze discovered files:**

```
Analyzing samples...

📂 Structure detected:
  Pattern: src/entities/{domain}/api/
  Samples: user, project, clip (3 domains)

🔌 HTTP Client:
  Type: Custom wrapper (createApi)
  Location: src/shared/api/create-api.ts
  Pattern: createApi().{method}<T>(path)

📦 Data Fetching:
  Library: React Query v5
  Pattern: Query Key Factory
  Hooks: Separate file (queries.ts)

📝 Types:
  Location: src/entities/{domain}/model/types.ts
  Style: interface
  Naming: {Entity}, {Operation}Request, {Operation}Response

🏷️ Naming:
  Functions: get{Entity}, create{Entity}
  Hooks: use{Entity}, useCreate{Entity}
  Files: {domain}-api.ts, queries.ts, types.ts
```

**Ask confirmation:**
```
이 패턴들로 코드를 생성할까요? [Y/n/수정]
```

## Step 4b: Interactive Mode (if no samples)

**Ask user for guidance:**

```
Q1: "API 코드를 어디에 생성할까요?"
    Options:
    - src/api/{domain}/ (flat)
    - src/features/{domain}/api/ (feature-based)
    - src/entities/{domain}/api/ (FSD)
    - 직접 입력

Q2: "HTTP 클라이언트는 무엇을 사용하나요?"
    Options (based on package.json):
    - Axios (detected)
    - Fetch (native)
    - 기타

Q3: "데이터 페칭 라이브러리를 사용하나요?"
    Options (based on package.json):
    - React Query (detected)
    - SWR
    - 없음

Q4: "참고할 샘플 코드가 있나요?"
    - 있음 → "파일 경로를 알려주세요" OR "코드를 붙여넣어 주세요"
    - 없음 → Use framework defaults

Alternative:
"샘플 코드를 붙여넣으면 그 스타일을 복제합니다:"
[User pastes code]
→ Analyze pasted code
→ Extract patterns
```

## Step 5: Generate Config

**Create .openapi-sync.json:**

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

  "project": {
    "framework": "react",
    "language": "typescript",
    "httpClient": "axios-custom",
    "dataFetching": "react-query"
  },

  "patterns": {
    "structure": {
      "type": "fsd",
      "apiPath": "src/entities/{domain}/api/{domain}-api.ts",
      "typesPath": "src/entities/{domain}/model/types.ts",
      "hooksPath": "src/entities/{domain}/api/queries.ts",
      "keysPath": "src/entities/{domain}/api/{domain}-keys.ts"
    },

    "httpClient": {
      "import": "import { createApi } from '@/shared/api'",
      "usage": "createApi().{method}<{Type}>({path})",
      "responseAccess": ".data"
    },

    "dataFetching": {
      "queryKeyPattern": "factory",
      "keysImport": "import { {domain}Keys } from './{domain}-keys'"
    },

    "naming": {
      "functions": {
        "get": "get{Entity}",
        "list": "get{Entity}List",
        "create": "create{Entity}",
        "update": "update{Entity}",
        "delete": "delete{Entity}"
      },
      "hooks": {
        "query": "use{Entity}",
        "queryList": "use{Entity}List",
        "mutation": "use{Verb}{Entity}"
      },
      "types": {
        "entity": "{Entity}",
        "request": "{Operation}Request",
        "response": "{Operation}Response"
      }
    },

    "codeStyle": {
      "quotes": "single",
      "semicolons": false,
      "indentation": "2",
      "trailingComma": "all"
    }
  },

  "samples": {
    "api": "src/entities/user/api/user-api.ts",
    "types": "src/entities/user/model/types.ts",
    "hooks": "src/entities/user/api/queries.ts",
    "keys": "src/entities/user/api/user-keys.ts"
  },

  "tagMapping": {},

  "ignore": [
    "/health",
    "/metrics",
    "/internal/*"
  ]
}
```

## Step 6: Summary

```
✅ OpenAPI Sync 초기화 완료

📄 OpenAPI Spec:
   My API v2.0.0
   25 endpoints, 8 tags
   Source: ./openapi.json

🔍 감지된 패턴:
   Structure: FSD (Feature-Sliced Design)
   HTTP: createApi() (custom Axios wrapper)
   State: React Query v5 (factory pattern)
   Types: interface, separate files

📁 샘플 코드:
   API: src/entities/user/api/user-api.ts
   Types: src/entities/user/model/types.ts
   Hooks: src/entities/user/api/queries.ts

📝 설정 저장: .openapi-sync.json

🚀 다음 단계:
   /api:analyze  - 패턴 상세 분석
   /api:sync     - 코드 생성 시작
   /api:sync --dry-run  - 생성될 파일 미리보기
```

## Error Handling

```
OpenAPI 스펙 오류:
  → "유효하지 않은 OpenAPI 스펙입니다: {error}"
  → "스펙 경로를 확인해주세요"

패턴 감지 실패:
  → Interactive mode로 전환
  → "패턴을 자동으로 감지하지 못했습니다. 몇 가지 질문을 드릴게요."

package.json 없음:
  → "package.json을 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요."

기존 설정 파일 존재:
  → ".openapi-sync.json이 이미 있습니다. 덮어쓸까요? [y/N/merge]"
```

## Flags

- `--force`: 기존 설정 덮어쓰기
- `--interactive`: 자동 감지 건너뛰고 직접 설정
- `--sample=path`: 특정 샘플 파일 지정
