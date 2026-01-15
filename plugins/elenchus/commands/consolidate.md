---
description: Consolidate verification results into prioritized fix plan using MCP state
---

[ELENCHUS CONSOLIDATE MODE ACTIVATED]

$ARGUMENTS

## Elenchus Consolidate Protocol (MCP-Backed)

이 커맨드는 MCP 서버의 세션 데이터를 사용하여 검증 결과를 통합합니다.

### Prerequisites

- `/elenchus:verify` 실행 완료
- 세션 ID 필요 (verify 결과에서 확인)

### Workflow

```
1. elenchus_get_issues로 이슈 조회
2. 이슈 분류 (MUST/SHOULD/NICE TO HAVE/WONT FIX)
3. 우선순위 점수 계산
4. 수정 계획 생성
```

### Step 1: Get Issues from Session

MCP 툴로 이슈 조회:

```
elenchus_get_issues({
  sessionId: "[이전 verify 세션 ID]",
  status: "all"
})
```

### Step 2: Classify Issues

```markdown
## 버킷 분류

### Bucket A: MUST FIX
조건: CRITICAL 전체 + 서비스 영향 HIGH
- 모든 CRITICAL 이슈
- 보안 관련 HIGH 이슈

### Bucket B: SHOULD FIX
조건: 나머지 HIGH + MEDIUM
- 기능 관련 HIGH 이슈
- MEDIUM 이슈

### Bucket C: NICE TO HAVE
조건: LOW
- 코드 품질 관련

### Bucket D: WONT FIX
조건: 범위 외, 의도된 동작, 비용>효과
- 단, CRITICAL은 절대 WONT FIX 불가
```

### Step 3: Priority Score

각 이슈에 점수 부여:

```
점수 = (심각도 × 2) + 악용 용이성 - 수정 노력

심각도: CRITICAL=10, HIGH=7, MEDIUM=4, LOW=1
악용 용이성: 1-5 (5가 가장 쉬움)
수정 노력: 1-5 (5가 가장 어려움)
```

### Step 4: Generate Fix Plan

각 MUST FIX/SHOULD FIX에 대해:

```markdown
### FIX-[번호]: [이슈 ID] - [요약]

**우선순위 점수**: [점수]
**위치**: [파일:라인]

**현재 코드**:
```[언어]
[문제 코드]
```

**수정 코드**:
```[언어]
[수정된 코드]
```

**검증 방법**:
[수정 후 어떻게 확인할지]
```

### Output Format

```markdown
=== ELENCHUS CONSOLIDATE COMPLETE ===

## 요약
| 버킷 | 개수 |
|------|------|
| MUST FIX | N |
| SHOULD FIX | N |
| NICE TO HAVE | N |
| WONT FIX | N |

## Bucket A: MUST FIX

### FIX-1: [이슈 ID] - [요약]
[상세 수정 계획]

## Bucket B: SHOULD FIX
[수정 계획]

## 실행 순서
```
[FIX-1] → [FIX-2] → ...
```

## 다음 단계
```
/elenchus:apply --session=[sessionId] --scope=must_fix
```
```

### Session Continuity

이전 verify 세션을 이어서 사용:

```
# 세션 목록 확인 (MCP Resource)
elenchus://sessions/

# 특정 세션 데이터 확인
elenchus://sessions/[sessionId]
```

### Core Principles

```
CRITICAL은 절대 WONT FIX 불가.
모든 수정에 구체적 코드 제시.
실행 순서는 의존성 고려.
```

BEGIN ELENCHUS CONSOLIDATE WITH MCP NOW.
