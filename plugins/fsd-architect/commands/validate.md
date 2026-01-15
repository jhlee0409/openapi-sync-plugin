---
description: Validate FSD rules and provide fix guidance
---

# /fsd:validate

FSD 아키텍처 규칙 위반을 검사하고 수정 가이드를 제공합니다. Steiger와 통합하여 심층 분석을 수행합니다.

## Prerequisites

- `.fsd-architect.json` 설정 파일 존재
- (권장) `@feature-sliced/steiger` 설치

## Execution Flow

### Step 1: Check Steiger Installation

1. `npx steiger --version` 실행하여 설치 확인
2. 미설치 시 안내:
   ```
   Steiger not found. Install for comprehensive validation:
   npm install -D @feature-sliced/steiger

   Continuing with basic validation...
   ```

### Step 2: Run Steiger (if available)

```bash
npx steiger src/ --reporter json
```

1. JSON 출력 파싱
2. 위반 사항 목록 수집

### Step 3: Run Custom Validations

Use skill: boundary-checker

1. **Import Boundary Check**
   - 레이어 계층 규칙 검증
   - Cross-slice import 검증
   - Public API 우회 검증

2. **Structure Validation**
   - 세그먼트 구조 일관성
   - Index file 존재 여부
   - 네이밍 컨벤션 일관성

3. **Pattern Compliance**
   - 프로젝트 설정과 일치 여부
   - 커스텀 규칙 검증

### Step 4: Enhance with Context

각 위반 사항에 대해:

1. **왜 문제인지 설명**
2. **어떻게 수정해야 하는지 가이드**
3. **관련 FSD 문서 링크**

### Step 5: Display Results

```
═══════════════════════════════════════════════════════════════
                    FSD VALIDATION REPORT
═══════════════════════════════════════════════════════════════

🔍 Scanned: 397 files in 6 layers

❌ Violations Found: 3

───────────────────────────────────────────────────────────────
[E201] Forbidden Cross-Slice Import
───────────────────────────────────────────────────────────────

📍 Location: src/features/auth/model/session.ts:15

   14 │ import { getUserById } from '@entities/user';
 → 15 │ import { validateCart } from '@features/cart/model';
   16 │ import { SESSION_TIMEOUT } from './constants';

❓ Why is this a problem?
   Features are isolated user scenarios. The 'auth' feature imports
   from 'cart' feature, creating a hidden dependency. If 'cart' is
   removed or changed, 'auth' will break unexpectedly.

✅ How to fix:

   Option 1: Move to Entities
   If 'validateCart' is business logic, move it to entities:

   // src/entities/cart/lib/validation.ts
   export function validateCart(cart: Cart): boolean { ... }

   // src/features/auth/model/session.ts
   import { validateCart } from '@entities/cart';

   Option 2: Use Composition in Widgets/Pages
   If these features need to work together, compose them at a higher layer:

   // src/widgets/auth-cart/model/useAuthWithCart.ts
   import { useAuth } from '@features/auth';
   import { useCart } from '@features/cart';

📚 Learn more: https://feature-sliced.design/docs/reference/isolation

───────────────────────────────────────────────────────────────
[E202] Public API Sidestep
───────────────────────────────────────────────────────────────

📍 Location: src/features/cart/api/addToCart.ts:8

   7 │ import { Product } from '@entities/product';
 → 8 │ import { formatPrice } from '@entities/product/lib/formatters';
   9 │

❓ Why is this a problem?
   You're importing from an internal module of 'product' entity instead
   of its public API. This breaks encapsulation - if the internal
   structure changes, your code will break.

✅ How to fix:

   Step 1: Export through public API
   // src/entities/product/index.ts
   export { formatPrice } from './lib/formatters';

   Step 2: Import from public API
   // src/features/cart/api/addToCart.ts
   import { Product, formatPrice } from '@entities/product';

📚 Learn more: https://feature-sliced.design/docs/reference/public-api

───────────────────────────────────────────────────────────────
[W101] Inconsistent Naming
───────────────────────────────────────────────────────────────

📍 Location: src/features/

   Most slices use kebab-case:
   ✓ auth/
   ✓ user-profile/
   ✓ shopping-cart/

   But found:
   ✗ ProductReviews/  (PascalCase)

⚠️ Why this matters:
   Inconsistent naming makes the codebase harder to navigate and
   can cause issues on case-sensitive file systems.

✅ How to fix:

   Rename the directory:
   mv src/features/ProductReviews src/features/product-reviews

   Update imports:
   // Before
   import { ... } from '@features/ProductReviews';
   // After
   import { ... } from '@features/product-reviews';

───────────────────────────────────────────────────────────────

📊 Summary:
   • Errors: 2 (must fix)
   • Warnings: 1 (recommended)

💡 Quick fixes available:
   Run /fsd:validate --fix to auto-fix W101 (naming)

═══════════════════════════════════════════════════════════════
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--fix` | 자동 수정 가능한 문제 수정 | `/fsd:validate --fix` |
| `--strict` | 경고도 에러로 처리 | `/fsd:validate --strict` |
| `--json` | JSON 형식 출력 | `/fsd:validate --json` |
| `--layer <name>` | 특정 레이어만 검증 | `/fsd:validate --layer features` |
| `--no-steiger` | Steiger 실행 건너뛰기 | `/fsd:validate --no-steiger` |

## Validation Rules

### Error-Level Rules

| Code | Rule | Description |
|------|------|-------------|
| E201 | forbidden-cross-slice | 동일 레이어 슬라이스 간 import |
| E202 | public-api-sidestep | Public API 우회 import |
| E203 | forbidden-higher-import | 상위 레이어 import |
| E204 | missing-public-api | Index file 누락 |
| E205 | circular-dependency | 순환 의존성 |

### Warning-Level Rules

| Code | Rule | Description |
|------|------|-------------|
| W101 | inconsistent-naming | 네이밍 컨벤션 불일치 |
| W102 | unused-export | Public API에 미사용 export |
| W103 | missing-segment | 일반적 세그먼트 누락 |
| W104 | oversized-slice | 슬라이스 내 파일 과다 |

## Auto-Fix Support

`--fix` 플래그로 자동 수정 가능한 문제:

| Rule | Auto-fix Action |
|------|-----------------|
| W101 (naming) | 디렉토리 이름 변경 + import 업데이트 |
| W102 (unused) | Public API에서 제거 (확인 후) |
| E202 (sidestep) | Public API에 export 추가 (확인 후) |

## Steiger Integration

Steiger가 설치되어 있으면 추가 검증:

| Steiger Rule | Integration |
|--------------|-------------|
| `fsd/forbidden-imports` | 결과 병합 + 컨텍스트 추가 |
| `fsd/public-api` | 결과 병합 + 수정 가이드 |
| `fsd/inconsistent-naming` | 결과 병합 + 자동 수정 |

## Error Handling

### E106: Steiger Failed

```
[E106] Steiger execution failed

Error running Steiger: spawn npx ENOENT

Possible solutions:
1. Check Node.js installation
2. Run: npm install -D @feature-sliced/steiger
3. Use --no-steiger to skip Steiger validation
```

## Examples

### Example 1: Full Validation

```
/fsd:validate

> Running Steiger...
> Running custom validations...
> Found: 2 errors, 1 warning
```

### Example 2: With Auto-Fix

```
/fsd:validate --fix

> Fixing W101: Renaming ProductReviews → product-reviews
> Updating 3 import statements...
> Fixed: 1 issue
> Remaining: 2 errors (manual fix required)
```

### Example 3: CI Mode

```
/fsd:validate --strict --json > validation-report.json

> Exit code: 1 (violations found)
> Report saved to validation-report.json
```
