---
description: Initialize FSD architecture analysis and configuration
---

# /fsd:init

프로젝트의 FSD 구조를 분석하고 설정 파일을 생성합니다.

## Prerequisites

- 프로젝트 루트 디렉토리에서 실행
- `src/` 또는 유사한 소스 디렉토리 존재

## Execution Flow

### Step 1: Detect Source Directory

1. 다음 순서로 소스 디렉토리를 탐색:
   - `src/`
   - `app/`
   - `lib/`
   - 현재 디렉토리

2. 디렉토리를 찾지 못하면 사용자에게 질문:
   ```
   소스 디렉토리를 찾을 수 없습니다.
   FSD 구조가 있는 디렉토리 경로를 입력해주세요:
   ```

### Step 2: Detect FSD Layers

Use skill: layer-detector

1. 다음 패턴으로 FSD 레이어 디렉토리 탐색:
   ```
   {srcDir}/{app,pages,widgets,features,entities,shared}
   ```

2. 발견된 레이어 목록 생성

3. 레이어가 없으면:
   - 새 FSD 프로젝트인지 확인
   - 기본 구조 생성 여부 질문

### Step 3: Analyze Existing Patterns

REQUIRED: 기존 코드가 있는 경우에만 실행

1. **Naming Convention 감지**
   - 슬라이스 디렉토리명 분석 (kebab-case, camelCase, PascalCase)
   - 파일명 패턴 분석

2. **Segment 사용 패턴**
   - 사용 중인 세그먼트 목록: `ui/`, `model/`, `api/`, `lib/`, `config/`
   - 커스텀 세그먼트 감지

3. **Index File 패턴**
   - Barrel exports 사용 여부 (`index.ts`)
   - Public API 스타일

4. **Import Alias 감지**
   - `tsconfig.json` 또는 `vite.config.ts`에서 paths 읽기
   - 감지된 별칭: `@shared`, `@entities`, `@features` 등

### Step 4: Generate Configuration

1. `.fsd-architect.json` 파일 생성:

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
    "naming": "<detected>",
    "indexFiles": true,
    "segments": ["ui", "model", "api", "lib"]
  },
  "aliases": {
    "@app": "src/app",
    "@shared": "src/shared"
  },
  "ignore": ["**/*.test.ts", "**/*.spec.ts"]
}
```

2. `.gitignore`에 캐시 파일 추가 확인:
   ```
   .fsd-architect.cache.json
   ```

### Step 5: Display Summary

다음 형식으로 결과 출력:

```
═══════════════════════════════════════════════════════════════
                    FSD ARCHITECT INITIALIZED
═══════════════════════════════════════════════════════════════

📁 Source Directory: src/

📊 Detected Layers:
   ✓ app/       (found)
   ✓ pages/     (found, 5 slices)
   ✓ widgets/   (found, 3 slices)
   ✓ features/  (found, 8 slices)
   ✓ entities/  (found, 4 slices)
   ✓ shared/    (found)

🔍 Detected Patterns:
   • Naming: kebab-case
   • Index files: Yes (barrel exports)
   • Segments: ui, model, api, lib

📝 Created: .fsd-architect.json

💡 Next Steps:
   1. Run /fsd:analyze for detailed structure analysis
   2. Run /fsd:scaffold <layer> <name> to create new slices
   3. Run /fsd:validate to check for FSD violations

═══════════════════════════════════════════════════════════════
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--force` | 기존 설정 덮어쓰기 | `/fsd:init --force` |
| `--src <path>` | 소스 디렉토리 지정 | `/fsd:init --src app/` |
| `--minimal` | 최소 설정만 생성 | `/fsd:init --minimal` |

## Error Handling

### E101: No Source Directory

```
[E101] Source directory not found

No valid source directory detected. Searched:
  - src/
  - app/
  - lib/

Please specify the source directory:
  /fsd:init --src <path>
```

### E102: Not an FSD Project

```
[E102] No FSD layers detected

The project does not appear to use Feature-Sliced Design.
No standard FSD layers found in 'src/'.

Would you like to:
  1. Create a new FSD structure? [y/N]
  2. Specify a different source directory?
```

### E103: Config Already Exists

```
[E103] Configuration already exists

.fsd-architect.json already exists.
Use --force to overwrite:
  /fsd:init --force
```

## Examples

### Example 1: Standard React Project

```
/fsd:init

> Scanning src/...
> Found 6 FSD layers
> Analyzing patterns from existing slices...
> Created .fsd-architect.json
```

### Example 2: Custom Source Directory

```
/fsd:init --src packages/web/src

> Scanning packages/web/src/...
> Found 5 FSD layers (missing: app)
> Created .fsd-architect.json
```

### Example 3: New Project

```
/fsd:init

> No FSD structure detected
> Create new FSD structure? [y/N]: y
> Created: src/app/, src/pages/, src/widgets/, src/features/, src/entities/, src/shared/
> Created .fsd-architect.json
```
