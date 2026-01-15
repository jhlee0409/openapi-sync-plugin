# Competitive Analysis: FSD Tooling Landscape

## Executive Summary

FSD(Feature-Sliced Design) 생태계에는 두 가지 주요 도구가 있습니다:
- **Steiger**: 공식 FSD 린터 (구조 검증)
- **eslint-plugin-fsd-lint**: 커뮤니티 ESLint 플러그인 (import 규칙)

이 플러그인(fsd-architect)은 이들이 제공하지 않는 영역에 집중합니다:
- **Interactive Setup** (인터랙티브 셋업)
- **Pattern Learning** (패턴 학습)
- **Code Generation** (코드 생성)
- **Contextual Guidance** (맥락적 가이드)

---

## Tool Comparison Matrix

### Feature Coverage

| Feature | fsd-architect | Steiger | eslint-plugin-fsd-lint |
|---------|---------------|---------|------------------------|
| **Detection & Analysis** |
| Layer structure detection | ✅ | ❌ | ❌ |
| Slice enumeration | ✅ | ⚠️ (validation only) | ❌ |
| Dependency graph | ✅ | ❌ | ❌ |
| Project health report | ✅ | ❌ | ❌ |
| **Validation** |
| Import boundary rules | ⚠️ (via Steiger) | ✅ 20 rules | ✅ 7 rules |
| Public API enforcement | ⚠️ (via Steiger) | ✅ | ✅ |
| Naming conventions | ✅ (configurable) | ✅ (fixed) | ❌ |
| **Code Generation** |
| Slice scaffolding | ✅ | ❌ | ❌ |
| Pattern-matched generation | ✅ | ❌ | ❌ |
| Template customization | ✅ | ❌ | ❌ |
| **Setup & Configuration** |
| Interactive initialization | ✅ | ❌ | ❌ |
| Auto-detection of patterns | ✅ | ❌ | ❌ |
| Config file generation | ✅ | ❌ | ❌ |
| **Education & Guidance** |
| Contextual explanations | ✅ | ❌ | ❌ |
| Suggested fixes | ✅ | ❌ | ⚠️ (auto-fix some) |
| Learning resources | ✅ | ❌ | ❌ |
| **Integration** |
| CI/CD support | ❌ | ✅ | ✅ |
| Pre-commit hooks | ❌ | ✅ | ✅ |
| IDE integration | ❌ | ❌ | ✅ (via ESLint) |
| Real-time linting | ❌ | ❌ | ✅ |

---

## Steiger Analysis

### Overview

- **Repository:** https://github.com/feature-sliced/steiger
- **Maintainer:** Feature-Sliced Design Team (Official)
- **Type:** CLI Linter
- **Language:** TypeScript

### Available Rules (20 Total)

#### Error-Level Rules

| Rule | Description | Category |
|------|-------------|----------|
| `fsd/forbidden-imports` | Blocks higher-layer and cross-slice imports | Import |
| `fsd/public-api` | Requires public API definitions (index files) | Structure |
| `fsd/no-public-api-sidestep` | Prevents bypassing slice public APIs | Import |
| `fsd/no-segmentless-slices` | Requires slices to contain segments | Structure |
| `fsd/no-layer-public-api` | Forbids layer-level index files | Structure |
| `fsd/no-reserved-folder-names` | Blocks segment-named subfolders | Naming |
| `fsd/no-ui-in-app` | Forbids UI segments on App layer | Structure |
| `fsd/typo-in-layer-name` | Validates layer naming | Naming |
| `fsd/no-segments-on-sliced-layers` | Prevents segments in sliced layers | Structure |

#### Warning-Level Rules

| Rule | Description | Category |
|------|-------------|----------|
| `fsd/inconsistent-naming` | Ensures pluralization consistency | Naming |
| `fsd/excessive-slicing` | Limits ungrouped slices | Best Practice |
| `fsd/insignificant-slice` | Detects slices with ≤1 references | Best Practice |
| `fsd/ambiguous-slice-names` | Prevents confusing slice names | Naming |
| `fsd/no-processes` | Discourages deprecated Processes layer | Migration |
| `fsd/repetitive-naming` | Maintains naming consistency | Naming |
| `fsd/shared-lib-grouping` | Limits ungrouped shared/lib modules | Best Practice |
| `fsd/segments-by-purpose` | Encourages purpose-based grouping | Best Practice |

#### Disabled by Default

| Rule | Description | Why Disabled |
|------|-------------|--------------|
| `fsd/no-cross-imports` | Same-layer cross-imports | Too strict for most projects |
| `fsd/no-higher-level-imports` | Higher-layer imports | Covered by forbidden-imports |
| `fsd/import-locality` | Relative/absolute patterns | Style preference |

### Strengths

1. **Official Support**: FSD 팀이 직접 관리
2. **Comprehensive Rules**: 20개 규칙으로 대부분의 FSD 패턴 커버
3. **Zero Config**: 설정 없이 바로 사용 가능
4. **CI-Friendly**: CLI 기반으로 CI/CD 통합 용이

### Limitations

1. **Not Extendable**: 커스텀 규칙 추가 불가
   > "Currently, Steiger is not extendable with more rules, though that will change in the near future."
2. **No Code Generation**: 린팅만 가능, 코드 생성 없음
3. **No Interactive Mode**: 배치 실행만 지원
4. **No Explanations**: 규칙 위반만 표시, "왜"는 설명 안 함

### Usage Example

```bash
# Install
npm install -D @feature-sliced/steiger

# Run
npx steiger src/

# Output
src/features/auth/model/session.ts
  error  fsd/forbidden-imports  Import from 'features/user' is not allowed
```

---

## eslint-plugin-fsd-lint Analysis

### Overview

- **Repository:** https://github.com/effozen/eslint-plugin-fsd-lint
- **Maintainer:** Community (effozen)
- **Type:** ESLint Plugin
- **Language:** JavaScript

### Available Rules (7 Total)

| Rule | Description | Auto-fixable |
|------|-------------|--------------|
| `fsd/forbidden-imports` | Prevents higher-layer imports | ❌ |
| `fsd/no-relative-imports` | Blocks cross-slice relative imports | ❌ |
| `fsd/no-public-api-sidestep` | Requires index file imports | ❌ |
| `fsd/no-cross-slice-dependency` | Prevents same-layer dependencies | ❌ |
| `fsd/no-ui-in-business-logic` | Blocks UI in logic layers | ❌ |
| `fsd/no-global-store-imports` | Requires hook-based store access | ❌ |
| `fsd/ordered-imports` | Enforces layered import grouping | ✅ |

### Configuration Presets

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    // Choose one:
    'plugin:fsd-lint/base',        // Minimal rules
    'plugin:fsd-lint/recommended', // Standard rules
    'plugin:fsd-lint/strict',      // All rules enabled
  ]
};
```

### Strengths

1. **IDE Integration**: ESLint 통합으로 실시간 피드백
2. **Configurable**: 규칙별 on/off 설정 가능
3. **Import Ordering**: auto-fix 가능한 import 정렬
4. **Path Aliases**: `@shared`, `@/features` 등 별칭 지원

### Limitations

1. **Import-Only**: Import 규칙만 검증, 구조는 검증 안 함
   > "Does not validate actual FSD folder structure existence"
2. **No Barrel Validation**: re-export 체인 검증 불가
   > "Cannot prevent barrel file re-exports that bypass public API"
3. **Limited Rules**: Steiger 대비 규칙 수 적음 (7 vs 20)
4. **No Monorepo Support**: 모노레포 레이어 구조 미지원

### Usage Example

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['fsd-lint'],
  extends: ['plugin:fsd-lint/recommended'],
  settings: {
    'fsd-lint': {
      rootDir: 'src',
      aliases: {
        '@shared': 'src/shared',
        '@features': 'src/features',
      }
    }
  }
};
```

---

## Gap Analysis

### What Existing Tools CANNOT Do

| Gap | Description | Impact |
|-----|-------------|--------|
| **Interactive Setup** | 초기 FSD 구조 설정 가이드 없음 | 신규 프로젝트 진입 장벽 |
| **Pattern Learning** | 기존 코드에서 패턴 학습 불가 | 일관성 없는 코드 생성 |
| **Code Generation** | 슬라이스/세그먼트 스캐폴딩 없음 | 수동 작업 반복 |
| **Contextual Guidance** | "왜" 위반인지 설명 없음 | 학습 곡선 높음 |
| **Refactoring Help** | 수정 방법 제안 없음 | 위반 수정에 시간 소요 |
| **Structure Visualization** | 의존성 그래프 없음 | 아키텍처 파악 어려움 |
| **Custom Conventions** | 팀별 컨벤션 저장 불가 | 코드 스타일 불일치 |

### Where fsd-architect Fills the Gap

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOOLING LANDSCAPE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                            │
│   │  fsd-architect  │ ←── Setup, Learning, Generation, Guide    │
│   └────────┬────────┘                                            │
│            │                                                     │
│            │ Enhances & Integrates                               │
│            ▼                                                     │
│   ┌─────────────────┐    ┌─────────────────┐                     │
│   │     Steiger     │    │ eslint-fsd-lint │                     │
│   │  (Structure)    │    │   (Imports)     │                     │
│   └─────────────────┘    └─────────────────┘                     │
│            │                      │                              │
│            └──────────┬───────────┘                              │
│                       │                                          │
│                       ▼                                          │
│              ┌─────────────────┐                                 │
│              │   FSD Project   │                                 │
│              └─────────────────┘                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Strategy

### Recommended Toolchain

```json
// package.json
{
  "devDependencies": {
    "@feature-sliced/steiger": "^0.5.0",
    "eslint-plugin-fsd-lint": "^1.0.0"
    // fsd-architect는 Claude Code 플러그인으로 별도 설치
  },
  "scripts": {
    "lint:fsd": "steiger src/",
    "lint": "eslint src/ && npm run lint:fsd"
  }
}
```

### Workflow Integration

| Stage | Tool | Purpose |
|-------|------|---------|
| **Setup** | fsd-architect `/fsdarch:init` | 초기 구조 설정 |
| **Development** | eslint-plugin-fsd-lint | 실시간 import 검증 |
| **Code Review** | fsd-architect `/fsdarch:analyze` | 구조 분석 리포트 |
| **Pre-commit** | Steiger | 구조 규칙 검증 |
| **CI/CD** | Steiger | 자동화된 검증 |
| **Scaffolding** | fsd-architect `/fsdarch:scaffold` | 슬라이스 생성 |
| **Learning** | fsd-architect `/fsdarch:explain` | 개념 설명 |

### Non-Overlapping Responsibilities

```
fsd-architect:
  ✅ Interactive setup and configuration
  ✅ Pattern detection and learning
  ✅ Code generation with style matching
  ✅ Contextual explanations and guidance
  ✅ Structure visualization
  ❌ Real-time linting (use ESLint)
  ❌ CI/CD enforcement (use Steiger)

Steiger:
  ✅ Comprehensive structure validation
  ✅ CI/CD pipeline integration
  ✅ Pre-commit hooks
  ❌ Code generation
  ❌ Interactive guidance

eslint-plugin-fsd-lint:
  ✅ Real-time IDE feedback
  ✅ Import rule enforcement
  ✅ Auto-fix for import ordering
  ❌ Structure validation
  ❌ Code generation
```

---

## Competitive Positioning

### Unique Value Proposition

| Competitor Limitation | fsd-architect Solution |
|----------------------|------------------------|
| "Steiger just tells me it's wrong" | "여기가 왜 위반인지 설명하고 수정 방법을 제안합니다" |
| "I have to create every slice manually" | "패턴을 학습해서 일관된 스타일로 생성합니다" |
| "I don't know where to start with FSD" | "인터랙티브 셋업으로 단계별로 안내합니다" |
| "Different team members have different conventions" | "프로젝트 컨벤션을 저장하고 공유합니다" |

### Target Users

| User Type | Primary Tool | fsd-architect Use |
|-----------|--------------|-------------------|
| **FSD Beginner** | fsd-architect | 학습, 셋업, 가이드 |
| **Solo Developer** | fsd-architect + ESLint | 스캐폴딩, 검증 |
| **Team Lead** | All three | 컨벤션 정의, 분석 |
| **CI/CD Engineer** | Steiger | - |

---

## Conclusion

fsd-architect는 기존 도구를 **대체하지 않고 보완**합니다:

1. **Steiger**: 구조 검증의 표준 → CI/CD에서 사용
2. **eslint-plugin-fsd-lint**: Import 규칙 → IDE에서 사용
3. **fsd-architect**: 셋업, 생성, 가이드 → 개발 시작과 학습에 사용

세 도구를 함께 사용하면 FSD 아키텍처의 전체 라이프사이클을 커버할 수 있습니다.

---

## References

- [Steiger GitHub](https://github.com/feature-sliced/steiger)
- [eslint-plugin-fsd-lint GitHub](https://github.com/effozen/eslint-plugin-fsd-lint)
- [Feature-Sliced Design Official](https://feature-sliced.design/)
- [FSD Ecosystem](https://github.com/feature-sliced)
