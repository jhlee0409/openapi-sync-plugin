# FSD Architect Plugin Architecture

## Overview

FSD Architect는 **Feature-Sliced Design** 아키텍처를 위한 Claude Code 플러그인입니다. 프로젝트 구조 분석, 아키텍처 검증, 슬라이스 스캐폴딩을 제공합니다.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORE PRINCIPLES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LEARN, DON'T ENFORCE                                         │
│     → 프로젝트의 기존 패턴을 학습하여 일관된 코드 생성            │
│     → 획일적인 규칙 강제 대신 팀 컨벤션 존중                      │
│                                                                  │
│  2. COMPLEMENT, DON'T REPLACE                                    │
│     → Steiger, ESLint와 통합하여 사용                            │
│     → 기존 도구가 못하는 영역(설명, 생성, 가이드)에 집중          │
│                                                                  │
│  3. GUIDE, DON'T DICTATE                                         │
│     → "왜" 이렇게 해야 하는지 설명                               │
│     → 팀이 결정할 수 있도록 옵션 제시                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## FSD Layer Hierarchy

FSD는 7개 레이어로 구성됩니다. 상위 레이어는 하위 레이어만 import할 수 있습니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FSD LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   app      ─┐                                                    │
│             │  ← App-specific: 전역 설정, 프로바이더, 라우팅      │
│   pages    ─┤                                                    │
│             │  ← Page compositions: 페이지 단위 조합              │
│   widgets  ─┤                                                    │
│             │  ← Compositional: 여러 feature 조합한 UI 블록       │
│   features ─┤                                                    │
│             │  ← User scenarios: 사용자 시나리오 단위 기능        │
│   entities ─┤                                                    │
│             │  ← Business entities: 비즈니스 엔티티               │
│   shared   ─┘                                                    │
│               ← Reusable: 공통 UI, 유틸, 설정                    │
│                                                                  │
│   (deprecated: processes - widgets로 대체됨)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Import Rules

```
Layer         Can Import From
─────────────────────────────────────
app        → pages, widgets, features, entities, shared
pages      → widgets, features, entities, shared
widgets    → features, entities, shared
features   → entities, shared
entities   → shared
shared     → (external only)
```

## Execution Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXECUTION MODEL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User invokes: /fsdarch:analyze                                     │
│         │                                                        │
│         ▼                                                        │
│   ┌──────────────────┐                                           │
│   │ commands/analyze.md │ ◄── Claude reads this as instructions  │
│   └────────┬─────────┘                                           │
│            │                                                     │
│            │ "Use skill: layer-detector"                         │
│            ▼                                                     │
│   ┌─────────────────────────────┐                                │
│   │ skills/layer-detector/SKILL.md │ ◄── Claude reads and follows│
│   └─────────────────────────────┘                                │
│            │                                                     │
│            │ Claude executes using available tools:              │
│            │   - Glob (find layer directories)                   │
│            │   - Grep (find import patterns)                     │
│            │   - Read (analyze file contents)                    │
│            │   - Write (generate scaffolding)                    │
│            ▼                                                     │
│   ┌─────────────────┐                                            │
│   │  Task Complete  │                                            │
│   └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Commands

### Available Commands

| Command | Description | Confidence |
|---------|-------------|------------|
| `/fsdarch:init` | 프로젝트 FSD 구조 분석 및 설정 초기화 | HIGH |
| `/fsdarch:analyze` | 현재 FSD 구조 상세 분석 및 리포트 | HIGH |
| `/fsdarch:scaffold` | 새 슬라이스/세그먼트 보일러플레이트 생성 | HIGH |
| `/fsdarch:validate` | FSD 규칙 위반 검사 및 수정 가이드 | MEDIUM |
| `/fsdarch:explain` | FSD 개념 및 결정 이유 설명 | HIGH |

### Command Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     TYPICAL WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. /fsdarch:init                                                   │
│      └─→ 프로젝트 스캔 → 기존 패턴 학습 → .fsd-architect.json 생성│
│                                                                  │
│   2. /fsdarch:analyze                                                │
│      └─→ 구조 분석 → 의존성 그래프 → 헬스 리포트 출력            │
│                                                                  │
│   3. /fsdarch:scaffold user                                          │
│      └─→ 패턴 적용 → entities/user/ 구조 생성                    │
│                                                                  │
│   4. /fsdarch:validate                                               │
│      └─→ Import 규칙 검사 → 위반 사항 + 수정 가이드 출력         │
│                                                                  │
│   5. /fsdarch:explain "feature vs widget"                            │
│      └─→ FSD 개념 설명 → 프로젝트 맥락에서 예시 제시             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Skills

### Skill Architecture

```
skills/
├── layer-detector/       # FSD 레이어 구조 감지
│   └── SKILL.md
├── boundary-checker/     # Import 경계 검증
│   └── SKILL.md
├── slice-generator/      # 슬라이스 코드 생성
│   └── SKILL.md
└── cache-manager/        # 분석 결과 캐싱
    └── SKILL.md
```

### Skill Descriptions

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| `layer-detector` | FSD 레이어 구조 감지 및 분석 | 프로젝트 경로 | 레이어 맵, 슬라이스 목록 |
| `boundary-checker` | Import 규칙 위반 검사 | 레이어 맵, 파일 목록 | 위반 목록, 수정 가이드 |
| `slice-generator` | 슬라이스 보일러플레이트 생성 | 레이어, 슬라이스명, 패턴 | 생성된 파일 목록 |
| `cache-manager` | 분석 결과 캐싱 및 관리 | 분석 데이터 | 캐시 상태 |

## State Management

### Configuration Files

```
.fsd-architect.json       # 사용자 설정 (git commit)
.fsd-architect.cache.json # 분석 캐시 (gitignore)
```

### Configuration Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "srcDir": {
      "type": "string",
      "default": "src",
      "description": "FSD 구조가 있는 소스 디렉토리"
    },
    "layers": {
      "type": "object",
      "description": "레이어별 커스텀 설정",
      "properties": {
        "app": { "$ref": "#/$defs/layerConfig" },
        "pages": { "$ref": "#/$defs/layerConfig" },
        "widgets": { "$ref": "#/$defs/layerConfig" },
        "features": { "$ref": "#/$defs/layerConfig" },
        "entities": { "$ref": "#/$defs/layerConfig" },
        "shared": { "$ref": "#/$defs/layerConfig" }
      }
    },
    "patterns": {
      "type": "object",
      "description": "프로젝트에서 학습한 패턴",
      "properties": {
        "naming": {
          "type": "string",
          "enum": ["camelCase", "kebab-case", "PascalCase"]
        },
        "indexFiles": {
          "type": "boolean",
          "description": "index.ts 배럴 파일 사용 여부"
        },
        "segments": {
          "type": "array",
          "items": { "type": "string" },
          "description": "사용하는 세그먼트 (ui, model, api, lib, config)"
        }
      }
    },
    "aliases": {
      "type": "object",
      "description": "Import 별칭 매핑",
      "additionalProperties": { "type": "string" }
    },
    "ignore": {
      "type": "array",
      "items": { "type": "string" },
      "description": "분석 제외 패턴"
    }
  },
  "$defs": {
    "layerConfig": {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "sliced": { "type": "boolean" }
      }
    }
  }
}
```

### Example Configuration

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
    "@pages": "src/pages",
    "@widgets": "src/widgets",
    "@features": "src/features",
    "@entities": "src/entities",
    "@shared": "src/shared"
  },
  "ignore": ["**/*.test.ts", "**/*.spec.ts"]
}
```

## Tool Usage

Claude executes all operations using Claude Code's built-in tools:

| Operation | Tool | Example |
|-----------|------|---------|
| Find layers | `Glob` | `src/{app,pages,widgets,features,entities,shared}` |
| Find imports | `Grep` | `import.*from ['"]@(entities|features)` |
| Read files | `Read` | Read slice index.ts |
| Write files | `Write` | Create new slice structure |
| Edit files | `Edit` | Update public API exports |
| Run linter | `Bash` | `npx steiger src/` |

## Integration with Existing Tools

### Steiger Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                  STEIGER INTEGRATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   /fsdarch:validate                                                  │
│         │                                                        │
│         ├─→ Run: npx steiger src/                                │
│         │                                                        │
│         ├─→ Parse Steiger output                                 │
│         │                                                        │
│         └─→ Enhance with:                                        │
│              • Contextual explanations (왜 위반인가?)             │
│              • Suggested fixes (코드 레벨)                        │
│              • Learning resources (관련 FSD 문서 링크)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ESLint Integration

플러그인은 `eslint-plugin-fsd-lint`와 함께 사용할 수 있습니다:

```json
// .eslintrc.json
{
  "extends": ["plugin:fsd-lint/recommended"]
}
```

ESLint는 Import 규칙을 강제하고, 이 플러그인은 구조 분석과 코드 생성을 담당합니다.

## Differentiation Strategy

### What This Plugin Does (NOT covered by Steiger/ESLint)

| Capability | This Plugin | Steiger | ESLint-FSD |
|------------|-------------|---------|------------|
| Interactive Setup | ✅ `/fsdarch:init` | ❌ | ❌ |
| Pattern Learning | ✅ 프로젝트 컨벤션 학습 | ❌ | ❌ |
| Code Generation | ✅ `/fsdarch:scaffold` | ❌ | ❌ |
| Contextual Explanations | ✅ "왜" 설명 | ❌ 규칙만 | ❌ 규칙만 |
| Refactoring Guidance | ✅ 수정 방법 제시 | ❌ | ⚠️ auto-fix 일부 |
| Structure Visualization | ✅ 레이어 맵 | ❌ | ❌ |
| Custom Conventions | ✅ 팀 컨벤션 저장 | ❌ | ⚠️ Regex만 |

### What This Plugin Does NOT Do (Covered by Steiger/ESLint)

| Capability | This Plugin | Use Instead |
|------------|-------------|-------------|
| Real-time Import Linting | ❌ | ESLint-FSD |
| CI/CD Rule Enforcement | ❌ | Steiger |
| Pre-commit Hooks | ❌ | Steiger + lint-staged |
| IDE Integration | ❌ | ESLint-FSD |

## Error Handling

### Error Code Ranges

| Range | Category | Example |
|-------|----------|---------|
| E1xx | Detection Errors | E101: Layer not found |
| E2xx | Validation Errors | E201: Invalid import |
| E3xx | Generation Errors | E301: Slice already exists |
| E4xx | Configuration Errors | E401: Invalid config |
| E5xx | Cache Errors | E501: Cache corrupted |

### Error Response Format

```markdown
[E201] Invalid Import Detected

**Location:** src/features/auth/model/session.ts:15
**Issue:** Feature 'auth' imports from feature 'user'
**Rule:** Features cannot import from other features

**Why This Matters:**
Features are isolated user scenarios. Cross-feature imports create
hidden dependencies that make refactoring difficult.

**Suggested Fix:**
1. Move shared logic to `entities/user/` or `entities/session/`
2. Or create a new feature that composes both: `features/auth-with-user/`

**Learn More:** https://feature-sliced.design/docs/reference/layers#features
```

## Performance Considerations

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHING STRATEGY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   First Run:                                                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────────┐              │
│   │ Scan All │ →  │ Analyze  │ →  │ Write Cache  │              │
│   │  Files   │    │ Patterns │    │ (.cache.json)│              │
│   └──────────┘    └──────────┘    └──────────────┘              │
│                                                                  │
│   Subsequent Runs:                                               │
│   ┌──────────┐    ┌──────────┐    ┌──────────────┐              │
│   │ Check    │ →  │ Diff     │ →  │ Incremental  │              │
│   │ mtime    │    │ Changed  │    │ Analysis     │              │
│   └──────────┘    └──────────┘    └──────────────┘              │
│                                                                  │
│   Cache Invalidation:                                            │
│   - Config file changed (.fsd-architect.json)                    │
│   - Source directory structure changed                           │
│   - Manual: /fsdarch:analyze --force                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| `/fsdarch:init` | < 30s | First-time full scan |
| `/fsdarch:analyze` (cached) | < 5s | Incremental analysis |
| `/fsdarch:scaffold` | < 3s | Template generation |
| `/fsdarch:validate` | < 10s | Depends on project size |

## Implementation Phases

### Phase 1: Core Detection (HIGH Confidence)

**Target:** v0.1.0

- [x] Directory structure created
- [x] Plugin metadata defined
- [ ] `/fsdarch:init` command
- [ ] `/fsdarch:analyze` command
- [ ] `layer-detector` skill
- [ ] `cache-manager` skill
- [ ] Configuration file schema

**Architectural Proof:** OAS plugin's `/oas:init` and `/oas:analyze` demonstrate identical patterns.

### Phase 2: Code Generation (HIGH Confidence)

**Target:** v0.2.0

- [ ] `/fsdarch:scaffold` command
- [ ] `slice-generator` skill
- [ ] Template system
- [ ] Pattern matching for style consistency

**Architectural Proof:** OAS plugin's `/oas:sync` demonstrates pattern-matched code generation.

### Phase 3: Validation (MEDIUM Confidence)

**Target:** v0.3.0

- [ ] `/fsdarch:validate` command
- [ ] `boundary-checker` skill
- [ ] Steiger integration
- [ ] Enhanced error explanations

**R&D Needed:** AST parsing strategy for accurate import analysis.

### Phase 4: Education & Polish (HIGH Confidence)

**Target:** v1.0.0

- [ ] `/fsdarch:explain` command
- [ ] Interactive tutorials
- [ ] Migration guides
- [ ] Comprehensive documentation

## Section Markers

Use these markers in skill files to indicate execution requirements:

| Marker | Meaning |
|--------|---------|
| `## EXECUTION INSTRUCTIONS` | Claude MUST follow these steps |
| `## REQUIRED:` | Mandatory action or check |
| `## REFERENCE:` | Context information only |
| `## ALGORITHM:` | Logic explanation |
| `## ERROR HANDLING` | How to handle failures |

## Anti-Patterns

### DON'T: Include executable code

```typescript
// DON'T: This looks like code to execute
const layers = fs.readdirSync(srcDir);
```

### DO: Describe the action

```markdown
1. Use Glob to find directories matching `src/{app,pages,widgets,features,entities,shared}`
2. For each found directory, identify it as an FSD layer
3. Build a layer map with paths and metadata
```

### DON'T: Enforce without explanation

```markdown
This import is not allowed.
```

### DO: Explain and guide

```markdown
This import violates FSD layer hierarchy because features should not
import from other features. Consider:
1. Moving shared logic to entities layer
2. Creating a composite feature
```

---

## Related Documentation

- [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) - Steiger, ESLint 비교 분석
- [QUICKSTART.md](./QUICKSTART.md) - 빠른 시작 가이드 (TBD)
- [FSD Official Docs](https://feature-sliced.design/) - 공식 FSD 문서
