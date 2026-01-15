---
description: Complete pipeline - verify, consolidate, apply, re-verify until zero issues
---

[ELENCHUS COMPLETE PIPELINE ACTIVATED]

$ARGUMENTS

## Elenchus Complete Protocol (MCP-Backed)

전체 파이프라인을 MCP 세션으로 관리하며 이슈 0까지 자동 반복합니다.

### Pipeline Overview

```
┌────────────────────────────────────────────────────────┐
│                 ELENCHUS COMPLETE                       │
├────────────────────────────────────────────────────────┤
│                                                         │
│  CYCLE N:                                               │
│  ┌──────────┐   ┌─────────────┐   ┌─────────┐         │
│  │  VERIFY  │──▶│ CONSOLIDATE │──▶│  APPLY  │         │
│  └──────────┘   └─────────────┘   └─────────┘         │
│       ▲                                 │              │
│       │         ┌─────────────┐         │              │
│       └─────────│  RE-VERIFY  │◀────────┘              │
│                 └─────────────┘                        │
│                       │                                │
│              ┌────────┴────────┐                       │
│              ▼                 ▼                       │
│         이슈 있음          이슈 없음                   │
│              │                 │                       │
│         CYCLE N+1         ✅ COMPLETE                  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Arguments

```
/elenchus:complete <target>
/elenchus:complete <target> --max-cycles=3
/elenchus:complete <target> --scope=must_fix
```

### Execution Algorithm

```
cycle = 0
max_cycles = args.max_cycles || 5
sessionId = null

while (cycle < max_cycles) {
  cycle++

  // Phase 1: VERIFY
  if (cycle == 1) {
    result = elenchus_start_session(target, requirements, workingDir)
    sessionId = result.sessionId
  }

  // Run verification rounds until convergence
  while (!converged && round < maxRounds) {
    verifierResult = runVerifier()
    elenchus_submit_round(sessionId, 'verifier', verifierResult)

    criticResult = runCritic()
    roundResult = elenchus_submit_round(sessionId, 'critic', criticResult)

    converged = roundResult.convergence.isConverged
  }

  // Check if done
  issues = elenchus_get_issues(sessionId, 'unresolved')
  if (issues.filter(i => i.severity in ['CRITICAL', 'HIGH']).length == 0) {
    break  // No critical/high issues
  }

  // Phase 2: CONSOLIDATE
  // (분류 및 수정 계획)

  // Phase 3: APPLY
  elenchus_checkpoint(sessionId)
  applyFixes()

  // Phase 4: RE-VERIFY (다음 cycle)
}

elenchus_end_session(sessionId, verdict)
```

### MCP Tools Usage per Phase

| Phase | MCP Tools |
|-------|-----------|
| VERIFY | start_session, submit_round, get_context |
| CONSOLIDATE | get_issues |
| APPLY | checkpoint, submit_round (issuesResolved) |
| RE-VERIFY | submit_round, get_issues |
| END | end_session |

### Cycle Tracking

MCP 세션에 모든 사이클이 기록됩니다:

```json
{
  "rounds": [
    { "number": 1, "role": "verifier", "cycle": 1 },
    { "number": 2, "role": "critic", "cycle": 1 },
    { "number": 3, "role": "verifier", "cycle": 1, "note": "apply" },
    { "number": 4, "role": "verifier", "cycle": 2 },
    ...
  ]
}
```

### Stop Conditions

| 조건 | 상태 | 행동 |
|------|------|------|
| CRITICAL/HIGH 이슈 0 | ✅ SUCCESS | 완료 |
| max_cycles 도달 | ⚠️ INCOMPLETE | 경고 + 수동 해결 안내 |
| 무한 루프 감지 | ❌ ERROR | 중단 |

### Infinite Loop Detection

MCP 서버의 Arbiter가 자동 감지:

```json
{
  "intervention": {
    "type": "LOOP_BREAK",
    "reason": "Same issues being raised/challenged repeatedly",
    "action": "Force conclusion on disputed issues"
  }
}
```

### Output Format

```markdown
=== ELENCHUS COMPLETE: CYCLE N ===

## Phase 1: VERIFY
- 발견 이슈: N개
- 수렴 라운드: N

## Phase 2: CONSOLIDATE
- MUST FIX: N개
- SHOULD FIX: N개

## Phase 3: APPLY
- 적용 성공: N개
- 적용 실패: N개

## Phase 4: RE-VERIFY
- 남은 이슈: N개
- 새 이슈: N개

→ [CONTINUING TO CYCLE N+1 / COMPLETE]
```

### Final Output

```markdown
=== ELENCHUS COMPLETE: FINISHED ===

## 파이프라인 요약
| 항목 | 결과 |
|------|------|
| 총 사이클 | N |
| 최종 판정 | PASS / CONDITIONAL |
| 해결 이슈 | N개 |
| 미해결 이슈 | N개 |

## 사이클별 진행
| Cycle | 시작 이슈 | 해결 | 새 발견 | 종료 이슈 |
|-------|----------|------|--------|----------|
| 1 | 8 | 6 | 0 | 2 |
| 2 | 2 | 2 | 0 | 0 |

## 최종 검증 결과
- SECURITY: ✅ 0 issues
- CORRECTNESS: ✅ 0 issues
- RELIABILITY: ✅ 0 issues
- MAINTAINABILITY: ✅ 0 issues
- PERFORMANCE: ✅ 0 issues

**VERDICT: ✅ PASS**

## 세션 정보
- Session ID: [sessionId]
- 저장 위치: ~/.claude/elenchus/sessions/[sessionId]/
```

### Session Persistence

완료 후에도 세션이 보존됩니다:

```bash
# 나중에 다시 확인
/elenchus:resume [sessionId]

# 또는 MCP Resource로 직접 접근
elenchus://sessions/[sessionId]
```

### Core Principles

```
이슈 0이 될 때까지 멈추지 않는다.
모든 사이클이 MCP에 기록된다.
무한 루프는 Arbiter가 감지한다.
세션은 영구 보존된다.
```

BEGIN ELENCHUS COMPLETE PIPELINE WITH MCP NOW.
