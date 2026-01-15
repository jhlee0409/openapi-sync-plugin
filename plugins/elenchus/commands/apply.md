---
description: Apply consolidated fixes with MCP-backed tracking and rollback
---

[ELENCHUS APPLY MODE ACTIVATED]

$ARGUMENTS

## Elenchus Apply Protocol (MCP-Backed)

이 커맨드는 MCP 서버를 통해 수정 사항을 추적하고 롤백을 지원합니다.

### Prerequisites

- `/elenchus:consolidate` 실행 완료 (수정 계획 있음)
- 세션 ID 필요
- 코드베이스 clean 상태 권장

### Arguments

플러그인은 자연어 인수를 파싱합니다:

```
/elenchus:apply                    # 대화형 적용 (세션 ID 자동 감지)
/elenchus:apply --scope=must_fix   # MUST FIX만 적용 (기본)
/elenchus:apply --scope=should_fix # MUST + SHOULD FIX
/elenchus:apply --scope=all        # 전체 적용
/elenchus:apply --dry-run          # 시뮬레이션만
```

**참고:** 세션 ID는 가장 최근 verify 세션에서 자동으로 가져옵니다. 명시적으로 지정하려면 대화에서 sessionId를 언급하세요.

### Workflow

```
1. elenchus_checkpoint로 체크포인트 생성
2. 각 FIX 순차 적용
3. 적용마다 elenchus_submit_round로 기록
4. 실패 시 elenchus_rollback
5. 완료 시 elenchus_end_session
```

### Step 1: Create Checkpoint

적용 전 체크포인트 생성:

```
elenchus_checkpoint({
  sessionId: "[sessionId]"
})
```

### Step 2: Apply Fixes

각 FIX에 대해:

```
1. Edit tool로 코드 수정
2. 구문 검증 (lint/compile)
3. 결과를 MCP에 기록:

elenchus_submit_round({
  sessionId: "[sessionId]",
  role: "verifier",
  output: "FIX-1 적용 완료: [상세 내용]",
  issuesResolved: ["SEC-01", "COR-05"]
})
```

### Step 3: Handle Failures

실패 시 롤백:

```
elenchus_rollback({
  sessionId: "[sessionId]",
  toRound: [체크포인트 라운드]
})
```

### Step 4: Complete

모든 적용 완료 시:

```
elenchus_end_session({
  sessionId: "[sessionId]",
  verdict: "CONDITIONAL"  // 재검증 필요하면
})
```

### Output Format (Per FIX)

```markdown
### FIX-N 적용 중...

**대상 이슈**: [이슈 ID]
**파일**: [파일 경로]

**변경 내용**:
```diff
- [이전 코드]
+ [새 코드]
```

**결과**: ✅ SUCCESS / ❌ FAILED

**MCP 기록**: Round [N] submitted
```

### Final Output

```markdown
=== ELENCHUS APPLY COMPLETE ===

## 요약
| 항목 | 결과 |
|------|------|
| 적용 성공 | N개 |
| 적용 실패 | N개 |
| 롤백 | N개 |

## 해결된 이슈
- SEC-01 ✅
- COR-05 ✅

## 미해결 이슈
- REL-01 ⚠️ (수동 해결 필요)

## 다음 단계
```
/elenchus:verify --session=[sessionId]  # 재검증
```
```

### Rollback Support

MCP 서버의 체크포인트 기능으로 안전한 롤백:

```
# 체크포인트 목록은 세션 리소스에서 확인
elenchus://sessions/[sessionId]

# 롤백 실행
elenchus_rollback({ sessionId, toRound: N })
```

### Core Principles

```
적용 전 체크포인트.
실패 시 즉시 롤백.
모든 변경 MCP에 기록.
재검증으로 확인.
```

BEGIN ELENCHUS APPLY WITH MCP NOW.
