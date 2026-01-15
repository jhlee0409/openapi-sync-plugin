---
description: Analyze FSD project structure and generate health report
---

# /fsdarch:analyze

현재 FSD 프로젝트 구조를 분석하고 상세 리포트를 생성합니다.

## Prerequisites

- `.fsd-architect.json` 설정 파일 존재 (없으면 `/fsdarch:init` 먼저 실행)

## Execution Flow

### Step 1: Load Configuration

1. `.fsd-architect.json` 읽기
2. 없으면 사용자에게 안내:
   ```
   Configuration not found. Run /fsdarch:init first.
   ```

### Step 2: Scan Layer Structure

Use skill: layer-detector

1. 각 레이어별로 스캔:
   - 슬라이스 목록
   - 세그먼트 구조
   - 파일 수

2. 레이어 메타데이터 수집:
   ```typescript
   interface LayerInfo {
     name: string;
     path: string;
     slices: SliceInfo[];
     totalFiles: number;
     isSliced: boolean;
   }

   interface SliceInfo {
     name: string;
     segments: string[];
     hasPublicApi: boolean;
     fileCount: number;
   }
   ```

### Step 3: Analyze Dependencies

Use skill: boundary-checker

1. Import 문 분석:
   - 각 레이어/슬라이스의 의존성 추출
   - 레이어 간 의존성 그래프 생성

2. 위반 사항 감지:
   - 상위 레이어 import
   - Cross-slice import (동일 레이어)
   - Public API 우회

### Step 4: Calculate Health Score

다음 기준으로 점수 계산 (100점 만점):

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Layer Hierarchy | 30% | 레이어 계층 규칙 준수 |
| Public API Usage | 25% | Public API를 통한 접근 |
| Slice Isolation | 20% | 슬라이스 간 격리 |
| Naming Consistency | 15% | 네이밍 컨벤션 일관성 |
| Segment Structure | 10% | 세그먼트 구조 일관성 |

### Step 5: Generate Report

다음 형식으로 결과 출력:

```
═══════════════════════════════════════════════════════════════
                    FSD ARCHITECTURE REPORT
═══════════════════════════════════════════════════════════════

📊 Health Score: 85/100 (Good)

📁 Layer Summary:
┌─────────────┬─────────┬───────────┬─────────┐
│ Layer       │ Slices  │ Files     │ Status  │
├─────────────┼─────────┼───────────┼─────────┤
│ app         │ -       │ 12        │ ✓       │
│ pages       │ 5       │ 45        │ ✓       │
│ widgets     │ 3       │ 28        │ ✓       │
│ features    │ 8       │ 156       │ ⚠ 2     │
│ entities    │ 4       │ 67        │ ✓       │
│ shared      │ -       │ 89        │ ✓       │
└─────────────┴─────────┴───────────┴─────────┘

⚠️ Issues Found: 2

  1. [E201] features/auth → features/user (forbidden cross-slice)
     Location: src/features/auth/model/session.ts:15

  2. [E202] features/cart → entities/product/internal
     Location: src/features/cart/api/addToCart.ts:8
     Bypasses public API

📈 Dependency Graph:
   pages ──→ widgets ──→ features ──→ entities ──→ shared
      │         │           │            │
      └─────────┴───────────┴────────────┘

💡 Recommendations:
   1. Move shared auth/user logic to entities/session
   2. Use entities/product public API (index.ts)

═══════════════════════════════════════════════════════════════
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | JSON 형식으로 출력 | `/fsdarch:analyze --json` |
| `--layer <name>` | 특정 레이어만 분석 | `/fsdarch:analyze --layer features` |
| `--slice <name>` | 특정 슬라이스만 분석 | `/fsdarch:analyze --slice auth` |
| `--force` | 캐시 무시하고 전체 스캔 | `/fsdarch:analyze --force` |
| `--verbose` | 상세 정보 출력 | `/fsdarch:analyze --verbose` |

## Output Formats

### Default (Terminal)

위의 예시와 같은 형식화된 텍스트 출력.

### JSON (`--json`)

```json
{
  "score": 85,
  "layers": {
    "app": { "files": 12, "issues": 0 },
    "pages": { "slices": 5, "files": 45, "issues": 0 },
    "features": { "slices": 8, "files": 156, "issues": 2 }
  },
  "issues": [
    {
      "code": "E201",
      "type": "forbidden-cross-slice",
      "source": "features/auth",
      "target": "features/user",
      "location": "src/features/auth/model/session.ts:15"
    }
  ],
  "recommendations": [
    "Move shared auth/user logic to entities/session"
  ]
}
```

## Caching

Use skill: cache-manager

1. 분석 결과는 `.fsd-architect.cache.json`에 캐시
2. 파일 mtime 기반 증분 분석
3. `--force` 플래그로 캐시 무시 가능

## Error Handling

### E104: Config Not Found

```
[E104] Configuration not found

Run /fsdarch:init to initialize FSD Architect configuration.
```

### E105: Invalid Layer Structure

```
[E105] Invalid layer structure

Layer 'features' contains non-slice directories:
  - src/features/utils/  (should be in shared/lib)
  - src/features/types/  (should be in shared/types)
```

## Examples

### Example 1: Full Analysis

```
/fsdarch:analyze

> Loading configuration...
> Scanning 6 layers, 20 slices...
> Analyzing dependencies...
> Health Score: 85/100
```

### Example 2: Single Layer

```
/fsdarch:analyze --layer features

> Analyzing features layer...
> Found 8 slices: auth, cart, checkout, favorites, orders, profile, search, wishlist
> Issues: 2 cross-slice imports
```

### Example 3: JSON Output

```
/fsdarch:analyze --json > fsd-report.json

> Report saved to fsd-report.json
```
