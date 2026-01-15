---
description: Analyze FSD project structure and generate health report
---

# /fsdarch:analyze

현재 FSD 프로젝트 구조를 분석하고 상세 리포트를 생성합니다.

## Prerequisites

- `.fsd-architect.json` 설정 파일 존재 (없으면 `/fsdarch:init` 먼저 실행)

---

## EXECUTION INSTRUCTIONS

When `/fsdarch:analyze` is invoked, Claude MUST perform these steps in order:

1. **Load configuration** - Read `.fsd-architect.json` (error E104 if missing)
2. **Check cache** - Use skill: cache-manager for incremental analysis
3. **Use skill: layer-detector** - Scan all layers and slices
4. **Use skill: boundary-checker** - Analyze import dependencies
5. **Calculate health score** - Score based on 5 criteria
6. **Generate report** - Display formatted analysis results
7. **Update cache** - Save analysis results for incremental updates

---

## Flow Overview

```
┌───────────────────────────────────────────────────────────────┐
│                      /fsdarch:analyze                         │
├───────────────────────────────────────────────────────────────┤
│  1. Load .fsd-architect.json                                  │
│     ├─ Not found → Error E104, suggest /fsdarch:init          │
│     └─ Found → Continue                                       │
│                                                               │
│  2. Check cache (unless --force)                              │
│     ├─ Valid cache exists → Use incremental analysis          │
│     └─ No cache / stale → Full scan                           │
│                                                               │
│  3. Invoke skill: layer-detector                              │
│     → Scan all layers, slices, segments                       │
│     → Count files per layer/slice                             │
│                                                               │
│  4. Invoke skill: boundary-checker                            │
│     → Parse import statements                                 │
│     → Build dependency graph                                  │
│     → Detect violations (E201, E202, E203, E204, E205)        │
│                                                               │
│  5. Calculate health score (100 points)                       │
│     → Layer hierarchy (30%)                                   │
│     → Public API usage (25%)                                  │
│     → Slice isolation (20%)                                   │
│     → Naming consistency (15%)                                │
│     → Segment structure (10%)                                 │
│                                                               │
│  6. Display report with issues and recommendations            │
│                                                               │
│  7. Update .fsd-architect.cache.json                          │
└───────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Step 1: Load Configuration

**Action:** Read and parse `.fsd-architect.json`

```
1. Use Read tool to read .fsd-architect.json
2. If file not found:
   → Display error E104 and stop
3. If JSON parse error:
   → Display error E401 with line number
4. Validate required fields:
   → srcDir (required)
   → layers (required)
5. Extract configuration values for subsequent steps
```

**Read tool command:**
```
Read: .fsd-architect.json
```

**Error output if missing:**
```
[E104] Configuration not found

.fsd-architect.json is required for this command.

Solution: Initialize first:
  /fsdarch:init
```

**Progress output:**
```
> Loading configuration...
```

### Step 1.5: Check Cache (Optional)

**Action:** Invoke skill: cache-manager for incremental analysis

```
1. Skip if --force flag is set
2. Read .fsd-architect.cache.json (if exists)
3. Compare file mtimes with cached values
4. Identify files that changed since last analysis
5. Only re-analyze changed files (incremental mode)
```

**Cache benefits:**
- Faster analysis on large projects
- Only re-scan modified files
- Preserve previous violation history

**Progress output (if using cache):**
```
> Using cached analysis (15 files changed since last run)
```

### Step 2: Scan Layer Structure

**Action:** Invoke skill: layer-detector

```
1. For each layer in config.layers:
   → Glob for {srcDir}/{layerPath}/**/*
   → If sliced layer: list immediate subdirectories as slices
   → For each slice: list segments (ui/, model/, api/, lib/)
   → Count files per layer/slice

2. Build LayerInfo structure for each layer:
   {
     name: "features",
     path: "src/features",
     slices: [
       { name: "auth", segments: ["ui", "model", "api"], hasPublicApi: true, fileCount: 12 },
       { name: "cart", segments: ["ui", "model"], hasPublicApi: true, fileCount: 8 }
     ],
     totalFiles: 156,
     isSliced: true
   }
```

**Glob commands to execute:**
```bash
# For each layer defined in config
Glob: "{srcDir}/app/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/pages/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/widgets/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/features/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/entities/**/*.{ts,tsx,js,jsx}"
Glob: "{srcDir}/shared/**/*.{ts,tsx,js,jsx}"

# For sliced layers - get slice list
Glob: "{srcDir}/features/*/"
Glob: "{srcDir}/entities/*/"

# Check public API for each slice
Glob: "{srcDir}/features/*/index.{ts,tsx,js,jsx}"
```

**TypeScript interfaces:**
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

**Progress output:**
```
> Scanning 6 layers, 20 slices...
```

### Step 3: Analyze Dependencies

**Action:** Invoke skill: boundary-checker

```
1. For each TypeScript/JavaScript file in the project:
   → Read file content
   → Parse import/require statements
   → Extract import paths

2. For each import:
   → Resolve to actual file path
   → Determine source layer/slice
   → Determine target layer/slice
   → Check against FSD rules

3. Build dependency graph:
   → Track all layer → layer dependencies
   → Track all slice → slice dependencies
   → Identify violations
```

**Grep commands to find imports:**
```bash
# Find all import statements
Grep: "^import .* from ['\"]" --type ts
Grep: "require\\(['\"]" --type ts

# Focus on potential violations (cross-layer/slice imports)
Grep: "from ['\"]@features/" --type ts
Grep: "from ['\"]@entities/" --type ts
Grep: "from ['\"]\\.\\./\\.\\." --type ts  # Relative cross-boundary
```

**Violation detection rules:**
```typescript
// Layer hierarchy (lowest = 1, highest = 6)
const LAYER_ORDER = {
  shared: 1,
  entities: 2,
  features: 3,
  widgets: 4,
  pages: 5,
  app: 6
};

// E203: Higher layer import from lower layer
function checkLayerViolation(source: Layer, target: Layer): boolean {
  return LAYER_ORDER[source] < LAYER_ORDER[target];
}

// E201: Cross-slice import (same layer)
function checkCrossSlice(source: Slice, target: Slice, layer: Layer): boolean {
  return source.layer === target.layer && source.name !== target.name;
}

// E202: Public API sidestep
function checkPublicApiSidestep(importPath: string): boolean {
  // Import should be @entities/user, not @entities/user/model/types
  return importPath.split('/').length > 2 && !importPath.endsWith('/index');
}

// E204: Missing public API
function checkMissingPublicApi(slice: Slice): boolean {
  return !slice.hasPublicApi;
}
```

**Progress output:**
```
> Analyzing dependencies...
```

### Step 4: Calculate Health Score

**Action:** Compute weighted health score (100 points max)

**Scoring criteria:**

| Criterion | Weight | How to Calculate |
|-----------|--------|------------------|
| Layer Hierarchy | 30% | 100 - (E203 violations * 10), min 0 |
| Public API Usage | 25% | (slices with index.ts / total slices) * 100 - (E202 violations * 5) |
| Slice Isolation | 20% | 100 - (E201 violations * 10), min 0 |
| Naming Consistency | 15% | (slices matching dominant pattern / total slices) * 100 |
| Segment Structure | 10% | (slices with standard segments / total slices) * 100 |

**Calculation algorithm:**
```typescript
function calculateHealthScore(analysis: AnalysisResult): number {
  const weights = {
    layerHierarchy: 0.30,
    publicApi: 0.25,
    sliceIsolation: 0.20,
    namingConsistency: 0.15,
    segmentStructure: 0.10
  };

  // Layer Hierarchy: Penalize E203 violations
  const e203Count = analysis.violations.filter(v => v.code === 'E203').length;
  const layerScore = Math.max(0, 100 - e203Count * 10);

  // Public API: Check index.ts presence, penalize E202
  const slicesWithApi = analysis.slices.filter(s => s.hasPublicApi).length;
  const e202Count = analysis.violations.filter(v => v.code === 'E202').length;
  const apiScore = Math.max(0, (slicesWithApi / analysis.slices.length) * 100 - e202Count * 5);

  // Slice Isolation: Penalize E201 violations
  const e201Count = analysis.violations.filter(v => v.code === 'E201').length;
  const isolationScore = Math.max(0, 100 - e201Count * 10);

  // Naming Consistency: Check dominant pattern match
  const namingScore = analysis.patterns.namingConsistency * 100;

  // Segment Structure: Check standard segment usage
  const segmentScore = analysis.patterns.segmentConsistency * 100;

  return Math.round(
    layerScore * weights.layerHierarchy +
    apiScore * weights.publicApi +
    isolationScore * weights.sliceIsolation +
    namingScore * weights.namingConsistency +
    segmentScore * weights.segmentStructure
  );
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Work';
  return 'Critical';
}
```

### Step 5: Generate Report

**Action:** Display formatted analysis report

**Report template:**
```
═══════════════════════════════════════════════════════════════
                    FSD ARCHITECTURE REPORT
═══════════════════════════════════════════════════════════════

📊 Health Score: {score}/100 ({label})

📁 Layer Summary:
┌─────────────┬─────────┬───────────┬─────────┐
│ Layer       │ Slices  │ Files     │ Status  │
├─────────────┼─────────┼───────────┼─────────┤
│ {layerName} │ {count} │ {files}   │ {status}│
└─────────────┴─────────┴───────────┴─────────┘

⚠️ Issues Found: {issueCount}

  {for each violation}
  {index}. [{code}] {source} → {target} ({description})
     Location: {file}:{line}

📈 Dependency Graph:
   {visual graph representation}

💡 Recommendations:
   {numbered list of suggestions}

═══════════════════════════════════════════════════════════════
```

**Status icons:**
```
✓  = No issues
⚠ N = N issues found
✗  = Critical issues
```

**Recommendation generation:**
```typescript
function generateRecommendations(violations: Violation[]): string[] {
  const recommendations: string[] = [];

  // Group by violation type
  const e201s = violations.filter(v => v.code === 'E201');
  const e202s = violations.filter(v => v.code === 'E202');
  const e203s = violations.filter(v => v.code === 'E203');
  const e204s = violations.filter(v => v.code === 'E204');

  if (e201s.length > 0) {
    recommendations.push(
      `Extract shared logic between ${e201s[0].source} and ${e201s[0].target} to entities or shared layer`
    );
  }

  if (e202s.length > 0) {
    recommendations.push(
      `Export ${e202s[0].target} through its slice public API (index.ts)`
    );
  }

  if (e203s.length > 0) {
    recommendations.push(
      `Refactor ${e203s[0].source} to not depend on higher layer ${e203s[0].target}`
    );
  }

  if (e204s.length > 0) {
    recommendations.push(
      `Add index.ts to slices: ${e204s.map(v => v.source).join(', ')}`
    );
  }

  return recommendations;
}
```

**Example output:**
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

### Step 6: Update Cache

**Action:** Save analysis results for incremental updates

```
1. Build cache object with:
   → Timestamp of analysis
   → File mtimes for all scanned files
   → Violation list
   → Layer/slice structure

2. Write to .fsd-architect.cache.json

3. Cache is automatically invalidated when:
   → Files are modified (mtime changes)
   → Config is changed
   → --force flag is used
```

**Cache structure:**
```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "configHash": "abc123...",
  "files": {
    "src/features/auth/model/session.ts": {
      "mtime": 1705312200000,
      "imports": ["@entities/user", "@shared/api"]
    }
  },
  "violations": [...],
  "score": 85
}
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
