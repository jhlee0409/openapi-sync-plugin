---
description: Adversarial cross-verification loop for thorough validation
---

[CROSS-VERIFY MODE ACTIVATED]

$ARGUMENTS

## Cross-Verification Protocol

You are now running an **adversarial verification loop** - two agents critique each other's outputs until convergence.

### Why This Works
- **Fresh context each round**: Each agent only sees the previous round's output, not full history
- **No confirmation bias**: Agents can't be influenced by their own previous reasoning
- **Adversarial pressure**: Critic actively looks for flaws, Verifier must defend or fix

### Execution Algorithm

```
Round 1: VERIFIER
  Input: Only the target (code, feature, implementation)
  Task: Produce initial verification assessment

Round 2: CRITIC
  Input: Only Verifier's assessment (NOT the original target)
  Task: Find flaws, gaps, incorrect claims in the assessment

Round 3: VERIFIER
  Input: Only Critic's critique
  Task: Address criticisms, defend valid points, acknowledge gaps

Round N: Continue alternating...

STOP when: Agent explicitly states "no further feedback" or equivalent
MAX ROUNDS: 10 (safety limit)
```

### Agent Spawning Rules

**CRITICAL: Fresh context = no conversation history, but ALWAYS include target reference**

"Fresh context"의 의미:
- ❌ 이전 대화 히스토리 없음
- ✅ 검증 대상(파일/범위)에 대한 참조는 항상 포함
- ✅ Agent는 tool access로 코드를 직접 읽을 수 있음

For VERIFIER rounds:
```
Task tool with:
- subagent_type: "verify-agent"
- model: "sonnet" (faster iterations)
- prompt: Contains:
  1. [항상] 검증 대상 참조: "Target: src/auth/login.ts (lines 1-150)"
  2a. [Round 1] "Verify this code thoroughly. List all issues with evidence."
  2b. [Round 3+] Previous Critic output + "Address these criticisms. Re-verify the code where needed."
```

For CRITIC rounds:
```
Task tool with:
- subagent_type: "momus" (ruthless critic)
- model: "sonnet" (faster iterations)
- prompt: Contains:
  1. [항상] 검증 대상 참조: "Target: src/auth/login.ts (lines 1-150)"
  2. Previous Verifier output
  3. "Critique this verification ruthlessly. You can read the target code to verify claims. What did they miss? What claims are unsupported?"
```

**핵심: Critic도 코드를 직접 읽어서 Verifier 주장을 검증할 수 있음**

### Convergence Detection (진짜 합의 vs 피로)

**피로 기반 종료 금지:**
- ❌ "더 이상 할 말 없음" → 이건 피로
- ❌ "대충 괜찮은 것 같음" → 이건 타협
- ❌ 단순히 라운드 수가 많아서 → 이건 지침

**진짜 합의 조건 (모두 충족해야 종료):**
1. **쟁점 해소**: 모든 제기된 이슈에 대해 증거 기반 결론 도출
2. **상호 수용**: Critic이 Verifier의 반박을 증거로 인정
3. **잔여 이슈 명시**: 해결된 것과 미해결 것 명확히 분리
4. **최종 판정 합의**: PASS/FAIL/CONDITIONAL에 양측 동의

**수렴 판정 방법:**
```
Round N의 Critic 출력에서 확인:
- "Verifier의 [X] 주장을 [증거]로 확인했다" ← 수용
- "이 부분은 여전히 증거 불충분" ← 미해결 (계속)
- "모든 쟁점이 증거로 해소되었다" ← 수렴
```

**최종 라운드 필수 질문:**
수렴 직전, 마지막 Critic에게 명시적으로 물어야 함:
> "모든 쟁점이 증거 기반으로 해소되었는가?
> 해소되지 않은 쟁점이 있다면 무엇인가?
> 이 검증 결과를 신뢰할 수 있는가?"

### Output Format

After each round, report:
```
=== ROUND N: [VERIFIER/CRITIC] ===
[Agent output]

Status: [Continuing / Converged]
```

Final output (합의 도달 시):
```
=== CROSS-VERIFY COMPLETE ===
Rounds: N
Convergence: [GENUINE_CONSENSUS / FORCED_STOP]

## 최종 판정
[PASS / FAIL / CONDITIONAL]

## 해소된 쟁점 (증거 포함)
1. [쟁점 1]: [결론] - 증거: [file:line 또는 command output]
2. [쟁점 2]: [결론] - 증거: [file:line 또는 command output]

## 미해소 쟁점 (있다면)
1. [쟁점]: [왜 해소 안 됐는지]

## 조건부 통과 조건 (CONDITIONAL인 경우)
- [ ] [해결해야 할 것 1]
- [ ] [해결해야 할 것 2]

## 신뢰도 근거
- 검증 범위: [어디까지 봤는지]
- 증거 품질: [실행 결과 vs 코드 리뷰만]
- 엣지케이스 커버리지: [테스트됨/미테스트]
```

**FORCED_STOP (10 라운드 도달) 시:**
```
=== CROSS-VERIFY FORCED STOP ===
Rounds: 10 (maximum reached)
Convergence: FAILED

## 합의 실패 사유
[왜 합의에 도달하지 못했는지]

## 현재까지의 쟁점 상태
| 쟁점 | Verifier 주장 | Critic 주장 | 상태 |
|-----|--------------|-------------|------|
| ... | ... | ... | 미해결 |

## 권장 행동
[사용자가 취해야 할 다음 단계]
```

### Example Flow

```
User: /cross-verify src/auth/login.ts

Round 1 (Verifier):
> Spawns verify-agent with: target reference + "verify this"
> Agent reads src/auth/login.ts
> Gets: "Found 3 issues: missing rate limiting (line 45), weak token expiry (line 78), no refresh mechanism"

Round 2 (Critic):
> Spawns momus with: target reference + Round 1 output
> Agent reads src/auth/login.ts to verify claims
> Gets: "Verification missed: CSRF protection not checked, session fixation risk at line 92, password policy not verified"

Round 3 (Verifier):
> Spawns verify-agent with: target reference + Round 2 critique
> Agent re-reads relevant parts of code
> Gets: "Addressed: CSRF handled by framework (middleware.ts:23). Session fixation valid - added to issues. Password policy exists in UserValidator.ts:15."

Round 4 (Critic):
> Spawns momus with: target reference + Round 3 response
> Agent verifies the new claims in code
> Gets: "Confirmed framework CSRF. UserValidator check valid. No further major issues."

Round 5 (Verifier):
> Spawns verify-agent with: target reference + Round 4
> Gets: "All points addressed. No further feedback needed."

=== CONVERGED at Round 5 ===
```

**핵심 차이점: 매 라운드 agent가 코드를 직접 읽어서 주장을 검증/반박함**

### Issue Tracking (필수)

라운드 진행 중 **쟁점 추적표**를 유지해야 함:

```
| ID | 쟁점 | 제기자 | 라운드 | 현재 상태 | 증거 |
|----|-----|-------|-------|----------|------|
| 1  | rate limiting 없음 | V1 | R1 | 해소 (R3) | middleware.ts:45 |
| 2  | CSRF 미확인 | C1 | R2 | 해소 (R3) | framework 기본 제공 |
| 3  | session fixation | C1 | R2 | 미해소 | 추가 조사 필요 |
```

**상태 전이:**
- `제기됨` → `반박됨` → `재반박됨` → `해소됨` 또는 `미해소`
- 모든 쟁점이 `해소됨` 또는 명시적 `미해소`가 되어야 수렴

### Target Scope Handling

**Single file:**
```
/cross-verify src/auth/login.ts
```

**Multiple files (verify sequentially):**
```
/cross-verify src/auth/login.ts src/auth/logout.ts src/auth/session.ts
→ Run cross-verify loop for each file, aggregate final results
```

**Directory (ask for clarification):**
```
/cross-verify src/auth/
→ "이 디렉토리에는 N개 파일이 있습니다. 전체 검증하시겠습니까, 아니면 특정 파일을 지정하시겠습니까?"
```

**Feature-based (identify relevant files first):**
```
/cross-verify the authentication system
→ First identify relevant files, then ask user to confirm scope
```

### Execution Checklist

1. [ ] Parse $ARGUMENTS to identify verification target
2. [ ] If target is vague or multi-file, ask user to clarify scope
3. [ ] Initialize issue tracking table
4. [ ] Start Round 1 with Verifier
5. [ ] After each round: update issue tracking table
6. [ ] Check convergence criteria (not just "no more feedback")
7. [ ] If potential convergence: ask explicit final questions to Critic
8. [ ] Generate final verdict with evidence for each resolved issue
9. [ ] If FORCED_STOP: document unresolved issues and why

### 핵심 원칙

```
피로로 끝나지 않는다.
타협으로 끝나지 않는다.
증거 기반 합의로만 끝난다.

모든 쟁점은 추적된다.
모든 결론에는 증거가 있다.
미해소 쟁점은 명시적으로 남긴다.
```

BEGIN CROSS-VERIFICATION NOW.
