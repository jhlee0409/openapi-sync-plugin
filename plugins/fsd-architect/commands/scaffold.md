---
description: Generate FSD-compliant slice or segment boilerplate
---

# /fsd:scaffold

새 슬라이스 또는 세그먼트 보일러플레이트를 생성합니다. 프로젝트 패턴을 학습하여 일관된 스타일로 코드를 생성합니다.

## Syntax

```
/fsd:scaffold <layer> <slice-name> [segment]
```

## Prerequisites

- `.fsd-architect.json` 설정 파일 존재

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `layer` | FSD 레이어 (entities, features, widgets, pages) | `features` |
| `slice-name` | 슬라이스 이름 | `auth` |
| `segment` | (선택) 특정 세그먼트만 생성 | `ui`, `model`, `api` |

## Execution Flow

### Step 1: Validate Input

1. 레이어 유효성 검사 (sliced layer인지 확인)
2. 슬라이스 이름 검사 (기존 존재 여부)
3. 세그먼트 유효성 검사

### Step 2: Load Project Patterns

Use skill: layer-detector

1. 설정 파일에서 패턴 로드:
   - Naming convention (kebab-case, camelCase, etc.)
   - 사용 중인 세그먼트
   - Index file 패턴

2. 동일 레이어의 기존 슬라이스 분석:
   - 파일 구조 패턴
   - Export 스타일
   - 타입 정의 패턴

### Step 3: Generate Structure

Use skill: slice-generator

1. 슬라이스 디렉토리 생성
2. 설정된 세그먼트별 파일 생성
3. Public API (index.ts) 생성

### Step 4: Apply Patterns

1. **Naming Convention 적용**
   - 디렉토리명: 설정된 컨벤션 따름
   - 파일명: 기존 패턴 따름

2. **Import Style 적용**
   - Alias 사용 (설정된 경우)
   - 상대 경로 스타일

3. **Code Style 적용**
   - 기존 코드에서 학습한 패턴
   - TypeScript/JavaScript 설정

### Step 5: Display Result

```
═══════════════════════════════════════════════════════════════
                    SLICE CREATED: auth
═══════════════════════════════════════════════════════════════

📁 Created structure:

src/features/auth/
├── index.ts          # Public API
├── ui/
│   ├── index.ts
│   ├── LoginForm.tsx
│   └── LoginForm.module.css
├── model/
│   ├── index.ts
│   ├── types.ts
│   └── useAuth.ts
├── api/
│   ├── index.ts
│   └── authApi.ts
└── lib/
    └── index.ts

📝 Files created: 10
🎨 Pattern applied: kebab-case, barrel exports

💡 Next steps:
   1. Implement your business logic in model/
   2. Create UI components in ui/
   3. Define API calls in api/
   4. Export public interface through index.ts

═══════════════════════════════════════════════════════════════
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--segments <list>` | 생성할 세그먼트 지정 | `--segments ui,model,api` |
| `--minimal` | 최소 구조만 생성 (index.ts만) | `--minimal` |
| `--no-ui` | UI 세그먼트 제외 | `--no-ui` |
| `--force` | 기존 파일 덮어쓰기 | `--force` |
| `--dry-run` | 실제 생성 없이 미리보기 | `--dry-run` |

## Generated Templates

### entities Layer

```
src/entities/<name>/
├── index.ts           # Public API
├── model/
│   ├── index.ts
│   ├── types.ts       # Entity types/interfaces
│   └── store.ts       # State management (if detected)
├── api/
│   ├── index.ts
│   └── <name>Api.ts   # API functions
├── ui/
│   ├── index.ts
│   └── <Name>Card.tsx # Common UI component
└── lib/
    └── index.ts
```

### features Layer

```
src/features/<name>/
├── index.ts           # Public API
├── model/
│   ├── index.ts
│   ├── types.ts
│   └── use<Name>.ts   # Feature hook
├── api/
│   ├── index.ts
│   └── <name>Api.ts
├── ui/
│   ├── index.ts
│   └── <Name>Button.tsx
└── lib/
    └── index.ts
```

### widgets Layer

```
src/widgets/<name>/
├── index.ts           # Public API
├── ui/
│   ├── index.ts
│   └── <Name>Widget.tsx
└── model/
    ├── index.ts
    └── use<Name>Widget.ts
```

### pages Layer

```
src/pages/<name>/
├── index.ts           # Public API
└── ui/
    ├── index.ts
    └── <Name>Page.tsx
```

## Template Variables

생성 시 다음 변수가 자동 치환됩니다:

| Variable | Example Input | kebab-case | PascalCase | camelCase |
|----------|---------------|------------|------------|-----------|
| `<name>` | `user-profile` | `user-profile` | `UserProfile` | `userProfile` |
| `<Name>` | `user-profile` | - | `UserProfile` | - |

## Error Handling

### E301: Slice Already Exists

```
[E301] Slice already exists

'auth' already exists in features layer.
Use --force to overwrite (WARNING: destructive)
Or choose a different name.
```

### E302: Invalid Layer

```
[E302] Invalid layer for scaffolding

'app' layer is not sliced. Cannot create slices in app layer.
Available sliced layers: pages, widgets, features, entities
```

### E303: Invalid Slice Name

```
[E303] Invalid slice name

Slice name 'my slice' contains invalid characters.
Use kebab-case, camelCase, or PascalCase without spaces.
```

## Examples

### Example 1: Create Feature Slice

```
/fsd:scaffold features auth

> Analyzing existing feature patterns...
> Detected: kebab-case, TypeScript, React Query
> Creating slice: src/features/auth/
> Created 10 files
```

### Example 2: Create Entity with Specific Segments

```
/fsd:scaffold entities user --segments model,api

> Creating minimal entity slice...
> Created: src/entities/user/
>   - index.ts
>   - model/index.ts, types.ts
>   - api/index.ts, userApi.ts
```

### Example 3: Dry Run

```
/fsd:scaffold widgets header --dry-run

> DRY RUN - No files will be created

Would create:
  src/widgets/header/
  ├── index.ts
  ├── ui/
  │   ├── index.ts
  │   └── HeaderWidget.tsx
  └── model/
      ├── index.ts
      └── useHeaderWidget.ts
```

### Example 4: Add Segment to Existing Slice

```
/fsd:scaffold features auth api

> Adding segment to existing slice...
> Created: src/features/auth/api/
>   - index.ts
>   - authApi.ts
> Updated: src/features/auth/index.ts (added export)
```
