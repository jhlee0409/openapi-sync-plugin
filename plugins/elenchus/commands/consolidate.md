---
description: Consolidate verification results into prioritized, actionable fix list.
---

[ELENCHUS CONSOLIDATE MODE ACTIVATED]

$ARGUMENTS

## Elenchus Consolidate Protocol

You are now running **Elenchus Consolidate** - transforming raw verification results into an actionable fix plan.

### Prerequisites

이 커맨드 실행 전 필요:
- `/elenchus:verify` 실행 완료
- 검증 결과 (이슈 테이블) 존재

**검증 결과가 없으면**: 먼저 `/elenchus:verify <target>`을 실행하세요.

### Input Detection

#### Case 1: 컨텍스트에 이전 verify 결과 존재
→ 해당 결과 자동 사용

#### Case 2: $ARGUMENTS에 파일 경로 지정
→ 해당 파일에서 verify 결과 로드

#### Case 3: 결과 없음
→ 사용자에게 verify 먼저 실행 요청

### Consolidation Process

```
Step 1: 이슈 분류
  - Bucket A (MUST FIX): CRITICAL + 서비스 영향 HIGH
  - Bucket B (SHOULD FIX): 나머지 HIGH + MEDIUM
  - Bucket C (NICE TO HAVE): LOW
  - Bucket D (WONT FIX): 범위 외, 의도된 동작

Step 2: 우선순위 점수
  점수 = (심각도 × 2) + 악용 용이성 - 수정 노력

Step 3: 수정 계획 구체화
  - 현재 코드
  - 수정 코드
  - 영향 범위
  - 검증 방법

Step 4: 의존성 분석
  - 수정 간 의존성 파악
  - 실행 순서 결정

Step 5: Phase 분류
  - Phase 1: 독립적 CRITICAL
  - Phase 2: 의존성 있는 CRITICAL
  - Phase 3: HIGH/MEDIUM
```

### Agent Usage

```
Task tool with:
- subagent_type: "elenchus-consolidator"
- model: "sonnet"
- prompt:
  1. 검증 결과 (이슈 테이블)
  2. "표준 통합 프로토콜에 따라 수정 계획 생성"
```

### Output Format

```markdown
=== ELENCHUS CONSOLIDATE COMPLETE ===

## 입력 요약
- **검증 대상**: [대상]
- **총 이슈**: N개
- **입력 소스**: [이전 verify / 파일 경로]

## 버킷 분류

### Bucket A: MUST FIX (N개)
| 순위 | ID | 요약 | 심각도 | 점수 |
|------|-----|------|--------|------|
| 1 | SEC-01 | SQL Injection | CRITICAL | 19 |

### Bucket B: SHOULD FIX (N개)
[테이블]

### Bucket C: NICE TO HAVE (N개)
[테이블]

### Bucket D: WONT FIX (N개)
| ID | 요약 | 사유 |
|----|------|------|

## 수정 계획

### Phase 1: 독립적 CRITICAL

#### FIX-1: SEC-01 - SQL Injection

**위치**: `src/db/queries.ts:45`

**현재 코드**:
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**수정 코드**:
```typescript
const query = `SELECT * FROM users WHERE id = ?`;
const result = await db.execute(query, [userId]);
```

**영향 범위**:
- 파일: `src/db/queries.ts`
- 테스트: `tests/db.test.ts`

**검증 방법**:
1. SQL Injection 공격 시도로 실패 확인
2. 정상 쿼리 동작 확인

---

### Phase 2: 의존성 있는 수정
[수정 계획]

### Phase 3: HIGH/MEDIUM 수정
[수정 계획]

## 실행 순서

```
[FIX-1] ──┬──▶ [FIX-4]
          │
[FIX-2] ──┘
    │
    ▼
[FIX-3]
```

## 예상 소요
| Phase | 이슈 수 | 예상 시간 |
|-------|---------|----------|
| Phase 1 | N | ~N분 |
| Phase 2 | N | ~N분 |
| Phase 3 | N | ~N분 |
| **총** | N | ~N분 |

## 다음 단계

### 옵션 1: 전체 적용
```
/elenchus:apply --scope=all
```

### 옵션 2: MUST FIX만 적용
```
/elenchus:apply --scope=must_fix
```

### 옵션 3: 수동 검토 후 적용
수정 계획 검토 후 개별 FIX 선택 적용

## 통합 컨텍스트 (다음 단계용)

```json
{
  "target": "[대상]",
  "buckets": {
    "must_fix": ["FIX-1", "FIX-2"],
    "should_fix": ["FIX-3", "FIX-4"],
    "nice_to_have": ["FIX-5"],
    "wont_fix": ["MNT-02"]
  },
  "execution_order": ["FIX-1", "FIX-2", "FIX-4", "FIX-3"],
  "fixes": {
    "FIX-1": {
      "issues": ["SEC-01"],
      "file": "src/db/queries.ts",
      "lines": [45, 46],
      "change": {...}
    }
  }
}
```
```

### Execution Checklist

1. [ ] 이전 verify 결과 확인
2. [ ] 없으면 사용자에게 verify 먼저 요청
3. [ ] elenchus-consolidator 실행
4. [ ] 버킷 분류 결과 출력
5. [ ] 수정 계획 상세 출력
6. [ ] 실행 순서 시각화
7. [ ] 다음 단계 (apply) 안내

### Core Principles

```
CRITICAL은 절대 WONT FIX 불가.
모든 수정에 구체적 코드 제시.
의존성 고려한 실행 순서.
사용자가 선택할 수 있는 옵션 제공.
```

BEGIN ELENCHUS CONSOLIDATE NOW.
