---
description: Adversarial cross-verification with MCP-backed state management
---

[ELENCHUS VERIFY MODE ACTIVATED]

$ARGUMENTS

## Elenchus Verify Protocol (MCP-Backed)

이 검증은 **Elenchus MCP 서버**를 통해 상태를 관리합니다.

### MCP Server Required

이 커맨드를 사용하려면 Elenchus MCP 서버가 설정되어 있어야 합니다.

**설정 확인:**
```bash
# ~/.claude.json에 다음이 있어야 함:
{
  "mcpServers": {
    "elenchus": {
      "command": "node",
      "args": ["/path/to/mcp-servers/elenchus/dist/index.js"]
    }
  }
}
```

### Verification Workflow

```
Step 1: 세션 시작
  → elenchus_start_session 호출
  → 컨텍스트 자동 수집

Step 2: 검증 루프
  → Round N (Verifier): elenchus_submit_round
  → Round N+1 (Critic): elenchus_submit_round
  → 수렴까지 반복

Step 3: 세션 종료
  → elenchus_end_session 호출
  → 최종 판정 기록
```

### Step 1: Start Session

먼저 MCP 툴로 세션을 시작하세요:

```
elenchus_start_session({
  target: "[검증 대상 경로]",
  requirements: "[사용자 요구사항]",
  workingDir: "[현재 작업 디렉토리]"
})
```

**응답 예시:**
```json
{
  "sessionId": "2024-01-15_src-auth_abc123",
  "status": "initialized",
  "context": {
    "target": "src/auth/",
    "filesCollected": 12,
    "requirements": "보안 취약점 검증"
  }
}
```

### Step 2: Verification Loop

#### Round 1: Verifier

1. 컨텍스트 가져오기:
```
elenchus_get_context({ sessionId: "[sessionId]" })
```

2. 표준 검증 기준에 따라 코드 검토 (26개 항목)

3. 결과 제출:
```
elenchus_submit_round({
  sessionId: "[sessionId]",
  role: "verifier",
  output: "[검증 보고서 전체]",
  issuesRaised: [
    {
      id: "SEC-01",
      category: "SECURITY",
      severity: "CRITICAL",
      summary: "SQL Injection 취약점",
      location: "src/db/queries.ts:45",
      description: "사용자 입력이 쿼리에 직접 삽입",
      evidence: "line 45: const query = `SELECT * FROM users WHERE id = ${userId}`"
    }
  ]
})
```

#### Round 2+: Critic/Verifier 교대

서버가 `nextRole`을 알려줍니다:
- `verifier`: 다음 라운드는 Verifier
- `critic`: 다음 라운드는 Critic
- `complete`: 수렴 완료

### Convergence Detection

서버가 자동으로 수렴을 감지합니다:

```json
{
  "convergence": {
    "isConverged": false,
    "reason": "2 critical issues unresolved",
    "categoryCoverage": {
      "SECURITY": { "checked": 6, "total": 8 },
      "CORRECTNESS": { "checked": 4, "total": 6 }
    },
    "unresolvedIssues": 5,
    "criticalUnresolved": 2,
    "roundsWithoutNewIssues": 0
  }
}
```

### Arbiter Intervention

서버가 문제를 감지하면 개입합니다:

```json
{
  "intervention": {
    "type": "CONTEXT_EXPAND",
    "reason": "4 new files discovered - significant scope expansion",
    "action": "Review if all files are necessary for verification",
    "newContextFiles": ["src/utils/auth.ts", "src/middleware/session.ts"]
  }
}
```

**개입 유형:**
- `CONTEXT_EXPAND`: 컨텍스트 확장 필요
- `SOFT_CORRECT`: 경미한 교정 필요
- `LOOP_BREAK`: 순환 논쟁 감지
- `HARD_ROLLBACK`: 체크포인트로 롤백 권장

### Step 3: End Session

수렴 시:
```
elenchus_end_session({
  sessionId: "[sessionId]",
  verdict: "CONDITIONAL"  // PASS | FAIL | CONDITIONAL
})
```

### Checkpoint & Rollback

중요한 시점에 체크포인트:
```
elenchus_checkpoint({ sessionId: "[sessionId]" })
```

문제 발생 시 롤백:
```
elenchus_rollback({ sessionId: "[sessionId]", toRound: 2 })
```

### Output Format

각 라운드 후 다음 형식으로 보고:

```markdown
=== ELENCHUS ROUND N: [VERIFIER/CRITIC] ===

## 라운드 결과
[에이전트 출력]

## 서버 응답
- 이슈 제기: N개
- 이슈 해결: N개
- 컨텍스트 확장: [예/아니오]
- 수렴 상태: [진행 중/수렴]

## 다음 단계
→ [다음 역할] 또는 [완료]
```

### Standard Verification Criteria

모든 검증은 26개 표준 항목을 따릅니다:

```
SECURITY (8항목): SEC-01 ~ SEC-08
CORRECTNESS (6항목): COR-01 ~ COR-06
RELIABILITY (4항목): REL-01 ~ REL-04
MAINTAINABILITY (4항목): MNT-01 ~ MNT-04
PERFORMANCE (4항목): PRF-01 ~ PRF-04
```

### Core Principles

```
상태는 서버가 관리한다.
컨텍스트는 서버가 공유한다.
수렴은 서버가 판단한다.
개입은 서버가 결정한다.
```

BEGIN ELENCHUS VERIFY WITH MCP NOW.
