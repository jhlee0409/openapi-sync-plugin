# FSD Architect

**Feature-Sliced Design 아키텍처 어시스턴트** for Claude Code

FSD 프로젝트의 구조 분석, 검증, 스캐폴딩을 지원하는 Claude Code 플러그인입니다.

## Features

| Command | Description |
|---------|-------------|
| `/fsdarch:init` | FSD 구조 분석 및 설정 초기화 |
| `/fsdarch:analyze` | 프로젝트 구조 분석 및 헬스 리포트 |
| `/fsdarch:scaffold` | 슬라이스/세그먼트 보일러플레이트 생성 |
| `/fsdarch:validate` | FSD 규칙 위반 검사 및 수정 가이드 |
| `/fsdarch:explain` | FSD 개념 설명 (프로젝트 맥락) |
| `/fsdarch:migrate` | 기존 프로젝트 FSD 마이그레이션 가이드 |

## Quick Start

```bash
# 1. 프로젝트 초기화
/fsdarch:init

# 2. 구조 분석
/fsdarch:analyze

# 3. 새 슬라이스 생성
/fsdarch:scaffold features auth

# 4. 규칙 검증
/fsdarch:validate
```

## Why FSD Architect?

### Pain Points 해결

| 문제 | 해결책 |
|------|--------|
| 레이어/도메인 구분 기준이 모호함 | `/fsdarch:explain` - 맥락에 맞는 설명 |
| FSD 규칙을 매번 기억해야 함 | `/fsdarch:validate` - 자동 검증 + 가이드 |
| 러닝 커브가 높음 | `/fsdarch:explain` - 인터랙티브 학습 |
| 수동 보일러플레이트 작업 | `/fsdarch:scaffold` - 패턴 학습 기반 생성 |
| 규모가 커질수록 관리 어려움 | `/fsdarch:analyze` - 헬스 리포트 |

### 기존 도구와의 차별화

```
┌─────────────────────────────────────────────────────────────┐
│                     FSD TOOLCHAIN                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   fsd-architect (이 플러그인)                                │
│   ├── Interactive Setup (인터랙티브 셋업)                    │
│   ├── Pattern Learning (패턴 학습)                           │
│   ├── Code Generation (코드 생성)                            │
│   └── Contextual Guidance (맥락 가이드)                      │
│                                                              │
│   Steiger (구조 린팅)                                        │
│   └── CI/CD, Pre-commit hooks                               │
│                                                              │
│   eslint-plugin-fsd-lint (Import 린팅)                       │
│   └── 실시간 IDE 피드백                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**fsd-architect + Steiger + ESLint = 완전한 FSD 지원**

## Commands

### /fsdarch:init

프로젝트의 FSD 구조를 분석하고 `.fsd-architect.json` 설정 파일을 생성합니다.

```bash
/fsdarch:init
/fsdarch:init --src packages/web/src
/fsdarch:init --force  # 기존 설정 덮어쓰기
```

### /fsdarch:analyze

현재 프로젝트 구조를 분석하고 헬스 리포트를 생성합니다.

```bash
/fsdarch:analyze
/fsdarch:analyze --layer features  # 특정 레이어만
/fsdarch:analyze --json            # JSON 출력
```

Output example:
```
📊 Health Score: 85/100 (Good)

📁 Layer Summary:
┌─────────────┬─────────┬───────────┐
│ Layer       │ Slices  │ Status    │
├─────────────┼─────────┼───────────┤
│ features    │ 8       │ ⚠ 2 issues│
│ entities    │ 4       │ ✓         │
└─────────────┴─────────┴───────────┘
```

### /fsdarch:scaffold

새 슬라이스 또는 세그먼트를 생성합니다. 프로젝트 패턴을 학습하여 일관된 스타일로 생성합니다.

```bash
/fsdarch:scaffold features auth
/fsdarch:scaffold entities user --segments model,api
/fsdarch:scaffold widgets header --dry-run
```

Output:
```
📁 Created structure:

src/features/auth/
├── index.ts
├── ui/
│   └── LoginForm.tsx
├── model/
│   └── useAuth.ts
└── api/
    └── authApi.ts
```

### /fsdarch:validate

FSD 규칙 위반을 검사하고 수정 가이드를 제공합니다.

```bash
/fsdarch:validate
/fsdarch:validate --fix    # 자동 수정 가능한 문제 수정
/fsdarch:validate --strict # 경고도 에러로 처리
```

Output:
```
❌ [E201] Forbidden Cross-Slice Import

📍 src/features/auth/model/session.ts:15
   import { validateCart } from '@features/cart/model';

❓ Why: Features should be isolated user scenarios.

✅ Fix: Move shared logic to entities or compose in widgets.
```

### /fsdarch:explain

FSD 개념을 프로젝트 맥락에서 설명합니다.

```bash
/fsdarch:explain layers
/fsdarch:explain feature-vs-widget
/fsdarch:explain "entities에서 다른 entity를 참조해도 되나요?"
```

### /fsdarch:migrate

기존 프로젝트를 FSD 구조로 마이그레이션하는 분석 및 가이드를 제공합니다.

```bash
/fsdarch:migrate              # 분석 및 마이그레이션 계획 출력
/fsdarch:migrate --dry-run    # 변경 없이 분석만
/fsdarch:migrate --phase 1    # Phase 1 실행 (구조 생성)
/fsdarch:migrate --export     # 계획을 파일로 저장
```

Output:
```
📊 Current Structure Analysis:
   • Total files: 156
   • Components: 45
   • Hooks: 12

📦 Suggested Layer Distribution:
   shared/    → 28 files (from utils/, types/)
   entities/  → 15 files (from models/, services/)
   features/  → 35 files (from hooks/, components/)
   ...

🔄 Migration Phases:
   Phase 1: Create structure (Safe)
   Phase 2: shared layer (28 files)
   Phase 3: entities layer (15 files)
   ...
```

## Configuration

`.fsd-architect.json`:

```json
{
  "srcDir": "src",
  "layers": {
    "app": { "path": "app", "sliced": false },
    "pages": { "path": "pages", "sliced": true },
    "widgets": { "path": "widgets", "sliced": true },
    "features": { "path": "features", "sliced": true },
    "entities": { "path": "entities", "sliced": true },
    "shared": { "path": "shared", "sliced": false }
  },
  "patterns": {
    "naming": "kebab-case",
    "indexFiles": true,
    "segments": ["ui", "model", "api", "lib"]
  },
  "aliases": {
    "@app": "src/app",
    "@shared": "src/shared"
  }
}
```

## Integration

### With Steiger

```bash
npm install -D @feature-sliced/steiger
```

`/fsdarch:validate`가 자동으로 Steiger 결과를 통합하고 컨텍스트를 추가합니다.

### With ESLint

```bash
npm install -D eslint-plugin-fsd-lint
```

```javascript
// .eslintrc.js
module.exports = {
  extends: ['plugin:fsd-lint/recommended']
};
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - 플러그인 아키텍처
- [Competitive Analysis](./docs/COMPETITIVE_ANALYSIS.md) - 기존 도구 비교
- [FSD Official](https://feature-sliced.design/) - 공식 FSD 문서

## License

MIT
