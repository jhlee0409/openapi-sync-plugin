# FSD Architect 개선 계획

Cross-verification을 통해 발견된 문제점과 개선 사항에 대한 구체적인 구현 계획.

## 현재 상태 (Coverage)

| 시나리오 | 현재 | 목표 |
|---------|------|------|
| 신규 프로젝트 (0부터 세팅) | 65% | 90% |
| 기존 프로젝트 마이그레이션 | 30% | 70% |
| 기존 FSD 고도화 | 80% | 90% |

---

## Priority 1: scaffold layerAliases 버그 수정 (CRITICAL)

**파일:** `skills/slice-generator/SKILL.md`
**예상 영향:** 신규 프로젝트 커버리지 +15%

### 문제점

현재 코드 (line 76):
```
{srcDir}/{layer}/{sliceName}/
```

`{layer}`가 하드코딩되어 있어 Next.js 프로젝트에서 layerAliases가 무시됨.

**예시 문제:**
- 설정: `layerAliases: { app: "core", pages: "views" }`
- 기대: `src/core/` 생성
- 실제: `src/app/` 생성 (Next.js 라우팅과 충돌!)

### 수정 계획

#### 1. Step 1.5 추가: 설정 로드

**위치:** Step 2 (Load Project Patterns) 앞에 추가

```markdown
### Step 1.5: Load Configuration

**Action:** Read .fsd-architect.json and extract layer settings

\`\`\`
1. Use Read tool to load .fsd-architect.json
2. If not exists:
   → Warn user: "Config not found. Run /fsdarch:init first"
   → Fallback to DEFAULT_CONFIG
3. Extract:
   - srcDir
   - layerAliases (if exists)
   - patterns
\`\`\`

**Fallback config:**
\`\`\`typescript
const DEFAULT_CONFIG = {
  srcDir: 'src',
  layerAliases: {},  // No aliases = use layer names as-is
  patterns: DEFAULT_PATTERNS
};
\`\`\`
```

#### 2. resolveSlicePath() 함수 구현

**위치:** ALGORITHM 섹션 앞에 UTILITY FUNCTIONS 추가

```markdown
## UTILITY FUNCTIONS

### resolveSlicePath()

Resolves the actual filesystem path for a slice, applying layerAliases.

\`\`\`typescript
/**
 * Resolve slice path with layer aliases applied.
 * @param layer - FSD layer name (app, pages, features, etc.)
 * @param sliceName - Name of the slice to create
 * @param config - Loaded .fsd-architect.json config
 * @returns Absolute path to create the slice
 */
function resolveSlicePath(
  layer: string,
  sliceName: string,
  config: FsdConfig
): string {
  // Apply layer alias if configured
  const layerDir = config.layerAliases?.[layer] ?? layer;

  // Build full path
  return `${config.srcDir}/${layerDir}/${sliceName}`;
}
\`\`\`

**Examples:**
\`\`\`typescript
// Standard project (no aliases)
resolveSlicePath('features', 'auth', { srcDir: 'src', layerAliases: {} })
// → 'src/features/auth'

// Next.js project (with aliases)
resolveSlicePath('app', 'providers', {
  srcDir: 'src',
  layerAliases: { app: 'core', pages: 'views' }
})
// → 'src/core/providers'

// Next.js hybrid (pages layer)
resolveSlicePath('pages', 'home', {
  srcDir: 'src',
  layerAliases: { app: 'core', pages: 'views' }
})
// → 'src/views/home'
\`\`\`
```

#### 3. Step 5 수정: resolveSlicePath 사용

**기존 (line 72-77):**
```markdown
### Step 5: Generate Directory Structure

Create base directory:
\`\`\`
{srcDir}/{layer}/{sliceName}/
\`\`\`
```

**수정:**
```markdown
### Step 5: Generate Directory Structure

**Action:** Create slice directory using resolved path

\`\`\`
1. Load config (from Step 1.5)
2. Compute actual path:
   slicePath = resolveSlicePath(layer, sliceName, config)
3. Verify parent directory exists
4. Create slice directory
\`\`\`

**Path resolution:**
\`\`\`typescript
// Apply layer aliases from config
const layerDir = config.layerAliases?.[layer] ?? layer;
const slicePath = `${config.srcDir}/${layerDir}/${sliceName}`;
\`\`\`

**Example paths:**
| Layer | Slice | No Alias | With Alias (core/views) |
|-------|-------|----------|-------------------------|
| features | auth | src/features/auth | src/features/auth |
| app | providers | src/app/providers | src/core/providers |
| pages | home | src/pages/home | src/views/home |
```

#### 4. ALGORITHM 섹션 수정

**기존 (line 240):**
```
slicePath = resolveSlicePath(layer, sliceName)
```

**수정:**
```
// Step 1.5: Load config
config = loadConfig('.fsd-architect.json')
if not config:
  config = DEFAULT_CONFIG
  warn("Using default config. Run /fsdarch:init for full setup.")

// Step 5: Resolve path with aliases
slicePath = resolveSlicePath(layer, sliceName, config)
```

---

## Priority 2: tsconfig.json/package.json 자동 생성

**파일:** `commands/init.md`
**예상 영향:** 신규 프로젝트 커버리지 +10%

### 문제점

현재 init.md는 tsconfig.json을 읽기만 하고 생성하지 않음.
신규 프로젝트에서 FSD path aliases가 자동 설정되지 않음.

### 수정 계획

#### 1. Step 4.5 추가: tsconfig.json 설정

**위치:** Step 4 (Generate Configuration) 뒤에 추가

```markdown
### Step 4.5: Configure TypeScript Paths (Optional)

**Condition:** User confirmed "Yes" in AskUserQuestion

**Action:** Add or update tsconfig.json with FSD path aliases

\`\`\`
1. Check if tsconfig.json exists
2. If exists:
   → Read current config
   → Merge FSD paths into compilerOptions.paths
3. If not exists AND TypeScript detected:
   → Create minimal tsconfig.json with paths
4. If JavaScript only:
   → Create jsconfig.json with paths
\`\`\`

**AskUserQuestion (before modifying):**
\`\`\`
question: "Would you like to configure path aliases for FSD layers?"
header: "Path Aliases"
options:
  - label: "Yes, update tsconfig.json (Recommended)"
    description: "Adds @app, @features, @shared, etc. aliases"
  - label: "No, I'll configure manually"
    description: "Skip path alias configuration"
\`\`\`

**tsconfig.json paths template:**
\`\`\`json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@pages/*": ["src/pages/*"],
      "@widgets/*": ["src/widgets/*"],
      "@features/*": ["src/features/*"],
      "@entities/*": ["src/entities/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
\`\`\`

**Next.js with aliases:**
\`\`\`json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/core/*"],
      "@views/*": ["src/views/*"],
      "@widgets/*": ["src/widgets/*"],
      "@features/*": ["src/features/*"],
      "@entities/*": ["src/entities/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
\`\`\`
```

#### 2. Vite/Next.js alias 설정 지원

```markdown
### Step 4.6: Configure Bundler Aliases (Optional)

**Condition:** Vite or Next.js detected AND user confirmed

**For Vite projects:**
\`\`\`typescript
// vite.config.ts addition
resolve: {
  alias: {
    '@app': path.resolve(__dirname, './src/app'),
    '@pages': path.resolve(__dirname, './src/pages'),
    '@widgets': path.resolve(__dirname, './src/widgets'),
    '@features': path.resolve(__dirname, './src/features'),
    '@entities': path.resolve(__dirname, './src/entities'),
    '@shared': path.resolve(__dirname, './src/shared'),
  }
}
\`\`\`

**For Next.js projects:**
tsconfig.json paths are automatically used by Next.js.
No additional configuration needed.
```

---

## Priority 3: /fsdarch:migrate 커맨드 생성

**파일:** `commands/migrate.md` (신규)
**예상 영향:** 마이그레이션 커버리지 +40%

### 커맨드 개요

기존 프로젝트를 FSD 구조로 마이그레이션하는 가이드 제공.

### 파일 구조

```
commands/
└── migrate.md  (신규 생성)
```

### 상세 내용

```markdown
---
description: Migrate existing project to FSD architecture
---

# /fsdarch:migrate

기존 프로젝트를 FSD 아키텍처로 마이그레이션하는 가이드를 제공합니다.

## Prerequisites

- 프로젝트 루트 디렉토리에서 실행
- 기존 소스 코드 존재

---

## EXECUTION INSTRUCTIONS

### Step 1: Analyze Current Structure

**Action:** Scan existing project structure

\`\`\`
1. Find source directory (src/, app/, lib/)
2. List all directories and categorize:
   - Components → potential widgets/features/shared UI
   - Pages/Views → potential pages layer
   - Hooks → potential features/entities model
   - Utils/Helpers → potential shared/lib
   - Types → potential shared/types or entity types
   - Services/API → potential shared/api or entity api
   - Store/State → potential features/entities model
3. Identify dependencies between modules
4. Detect import patterns (relative vs absolute)
\`\`\`

**Glob commands:**
\`\`\`bash
Glob: "{srcDir}/*/"
Glob: "{srcDir}/**/*.{ts,tsx,js,jsx}"
\`\`\`

### Step 2: Classify Modules

**Action:** Categorize existing code into FSD layers

\`\`\`typescript
interface ModuleClassification {
  suggestedLayer: 'shared' | 'entities' | 'features' | 'widgets' | 'pages' | 'app';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  currentPath: string;
  suggestedPath: string;
}
\`\`\`

**Classification rules:**
| Current Pattern | Suggested Layer | Confidence |
|----------------|-----------------|------------|
| components/ui/* | shared/ui | High |
| components/Button.tsx | shared/ui | High |
| hooks/useAuth.ts | features/auth/model | Medium |
| utils/* | shared/lib | High |
| types/* | shared/types | High |
| services/api.ts | shared/api | High |
| services/user.ts | entities/user/api | Medium |
| pages/* | pages | High |
| store/auth/* | features/auth/model | Medium |
| store/user/* | entities/user/model | Medium |

### Step 3: Generate Migration Plan

**Action:** Create step-by-step migration guide

\`\`\`
1. Phase 1: Create FSD structure (non-breaking)
   - Create layer directories
   - Set up path aliases

2. Phase 2: Migrate shared layer (safest)
   - Move utils → shared/lib
   - Move types → shared/types
   - Move UI components → shared/ui

3. Phase 3: Migrate entities (domain models)
   - Identify domain entities
   - Create entity slices
   - Move related code

4. Phase 4: Migrate features (user actions)
   - Identify user-facing features
   - Create feature slices
   - Migrate hooks, components, API calls

5. Phase 5: Migrate widgets (compositions)
   - Identify composite components
   - Create widget slices

6. Phase 6: Migrate pages (routes)
   - Update route components
   - Import from proper layers

7. Phase 7: Cleanup
   - Remove old directories
   - Update all imports
\`\`\`

### Step 4: Output Migration Report

**Template:**
\`\`\`
═══════════════════════════════════════════════════════════════
                    FSD MIGRATION ANALYSIS
═══════════════════════════════════════════════════════════════

📊 Current Structure Analysis:
   • Total files: {fileCount}
   • Directories: {dirCount}
   • Components: {componentCount}
   • Hooks: {hookCount}

📦 Suggested Layer Distribution:
   shared/    {sharedCount} files
   entities/  {entityCount} files
   features/  {featureCount} files
   widgets/   {widgetCount} files
   pages/     {pageCount} files
   app/       {appCount} files

🔄 Migration Phases:
   Phase 1: Create structure (0 file moves)
   Phase 2: shared layer ({phase2Count} files)
   Phase 3: entities layer ({phase3Count} files)
   Phase 4: features layer ({phase4Count} files)
   Phase 5: widgets layer ({phase5Count} files)
   Phase 6: pages layer ({phase6Count} files)
   Phase 7: cleanup

⚠️  High-Risk Areas:
   • {riskArea1}: {reason}
   • {riskArea2}: {reason}

💡 Recommendations:
   1. Start with Phase 1-2 (non-breaking changes)
   2. Migrate one feature at a time in Phase 4
   3. Run tests after each phase

═══════════════════════════════════════════════════════════════
\`\`\`

### Step 5: Interactive Migration Mode (Optional)

**AskUserQuestion:**
\`\`\`
question: "Would you like to start migration?"
header: "Start"
options:
  - label: "Phase 1: Create structure"
    description: "Create FSD directories without moving files"
  - label: "View detailed file mapping"
    description: "Show which files go where"
  - label: "Export plan to file"
    description: "Save migration plan to migration-plan.md"
  - label: "Cancel"
    description: "Exit without changes"
\`\`\`

---

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--dry-run` | 변경 없이 분석만 | `/fsdarch:migrate --dry-run` |
| `--phase <n>` | 특정 단계만 실행 | `/fsdarch:migrate --phase 2` |
| `--export` | 계획을 파일로 저장 | `/fsdarch:migrate --export` |

---

## Examples

### Example 1: Analysis Only

\`\`\`
/fsdarch:migrate --dry-run

> Analyzing src/...
> Found 156 files in 23 directories
> Classification complete
>
> [Migration Report displayed]
\`\`\`

### Example 2: Start Phase 1

\`\`\`
/fsdarch:migrate --phase 1

> Creating FSD structure...
> Created: src/shared/
> Created: src/entities/
> Created: src/features/
> Created: src/widgets/
> Created: src/pages/
> Created: src/app/
>
> Ready for Phase 2. Run: /fsdarch:migrate --phase 2
\`\`\`
```

---

## Priority 4: @x/ Cross-Reference 지원

**파일:** `skills/boundary-checker/SKILL.md`
**예상 영향:** 기존 FSD 커버리지 +5%

### 문제점

@x/ 패턴이 문서에 언급되어 있지만 실제 검증 로직이 없음.

### 수정 계획

#### 1. @x/ 패턴 설명 추가

```markdown
## Cross-Reference Pattern (@x/)

FSD에서 같은 레이어 내 slice 간 참조가 필요할 때 사용하는 패턴.

### When to Use

- entities 간 관계가 있을 때 (User → Order)
- features 간 조합이 필요할 때

### Pattern

\`\`\`typescript
// ❌ 일반적으로 금지됨
import { Order } from '@entities/order';  // entities/user에서

// ✅ @x/ 패턴 사용
import { Order } from '@entities/user/@x/order';
\`\`\`

### Detection Logic

\`\`\`typescript
function isXReference(importPath: string): boolean {
  return /@x\//.test(importPath);
}

function validateXReference(
  importPath: string,
  sourceSlice: string,
  targetSlice: string
): ValidationResult {
  // @x/ must be from source slice's @x folder
  const expectedPrefix = `@entities/${sourceSlice}/@x/`;

  if (!importPath.startsWith(expectedPrefix)) {
    return {
      valid: false,
      error: `Cross-reference must be from ${sourceSlice}/@x/, not direct import`
    };
  }

  return { valid: true };
}
\`\`\`
```

#### 2. boundary-checker 수정

**위치:** E201 Cross-Slice Import 검증 로직에 추가

```markdown
### Special Case: @x/ Cross-Reference

When detecting cross-slice imports:

\`\`\`
1. Check if import uses @x/ pattern
2. If YES:
   → Validate @x/ structure exists in source slice
   → Validate export is properly re-exported
   → Allow import (no E201 error)
3. If NO:
   → Apply standard cross-slice import rules
   → Raise E201 if violation
\`\`\`

**Validation:**
\`\`\`typescript
// In source slice: entities/user/@x/order.ts
export { Order } from '@entities/order';  // Re-export

// In consumer: entities/user/model/index.ts
import { Order } from '../@x/order';  // ✅ Allowed
\`\`\`
```

---

## 구현 순서

### Phase 1: Critical Fix (1순위)
1. `slice-generator/SKILL.md` 수정
   - Step 1.5 추가 (설정 로드)
   - resolveSlicePath() 함수 추가
   - Step 5 수정 (경로 해석)
   - ALGORITHM 섹션 업데이트

### Phase 2: Developer Experience (2순위)
2. `init.md` 수정
   - Step 4.5 추가 (tsconfig.json)
   - Step 4.6 추가 (bundler aliases)

### Phase 3: Migration Support (3순위)
3. `commands/migrate.md` 생성
   - 전체 커맨드 구현

### Phase 4: Advanced Features (4순위)
4. `boundary-checker/SKILL.md` 수정
   - @x/ 패턴 문서화
   - 검증 로직 추가

---

## 검증 체크리스트

### Priority 1 완료 조건
- [ ] Next.js 프로젝트에서 scaffold 실행 시 올바른 경로 생성
- [ ] layerAliases 없는 프로젝트에서 기존 동작 유지
- [ ] resolveSlicePath() 함수가 모든 케이스 처리

### Priority 2 완료 조건
- [ ] 신규 프로젝트에서 tsconfig.json 자동 생성
- [ ] 기존 tsconfig.json에 paths 병합
- [ ] jsconfig.json 지원 (JavaScript 프로젝트)

### Priority 3 완료 조건
- [ ] 기존 프로젝트 분석 기능 동작
- [ ] 마이그레이션 계획 생성
- [ ] Phase별 실행 지원

### Priority 4 완료 조건
- [ ] @x/ 패턴 인식
- [ ] 올바른 @x/ 사용 시 E201 미발생
- [ ] 잘못된 @x/ 사용 시 에러 표시
