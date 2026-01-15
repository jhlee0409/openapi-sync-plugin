---
description: Adversarial cross-verification with standardized criteria. Internal agents only.
---

[ELENCHUS VERIFY MODE ACTIVATED]

$ARGUMENTS

## Elenchus Verify Protocol

You are now running the **Elenchus Verify** command - an adversarial verification loop using only internal Elenchus agents and standardized verification criteria.

### Key Differences from Legacy cross-verify

| 항목 | 기존 cross-verify | 새 verify |
|------|-------------------|-----------|
| 에이전트 | 외부 (momus 등) | 내부 (elenchus-*) |
| 기준 | 자유 | 표준화 (26개 항목) |
| 출력 | 자유 형식 | 구조화된 형식 |
| 후속 단계 | 없음 | consolidate → apply |

### Verification Agents (Internal Only)

**IMPORTANT**: 이 검증에서는 Elenchus 내부 에이전트만 사용합니다:

| 라운드 | 에이전트 | 역할 |
|--------|---------|------|
| 홀수 | elenchus-verifier | 코드 검토 및 이슈 도출 |
| 짝수 | elenchus-critic | 검증 결과 비평 |

외부 에이전트 (momus, oracle 등) 사용 금지.

### Standardized Criteria

모든 검증은 **verification-criteria.md**의 26개 항목을 따릅니다:

```
SECURITY (8항목): SEC-01 ~ SEC-08
CORRECTNESS (6항목): COR-01 ~ COR-06
RELIABILITY (4항목): REL-01 ~ REL-04
MAINTAINABILITY (4항목): MNT-01 ~ MNT-04
PERFORMANCE (4항목): PRF-01 ~ PRF-04
```

### Execution Algorithm

```
Round 1: ELENCHUS-VERIFIER
  Input: 검증 대상 + 표준 기준
  Task: 26개 항목 전체 검토, 이슈 도출
  Output: 구조화된 검증 보고서

Round 2: ELENCHUS-CRITIC
  Input: Round 1 보고서 + 표준 기준
  Task: 완결성/증거성/정확성 검증
  Output: 비평 보고서

Round 3+: 수렴까지 반복

STOP CONDITIONS:
  • 진짜 수렴: 26개 항목 95%+ 검토, 모든 이슈 증거 있음
  • 강제 종료: 10 라운드 도달
```

### Agent Spawning (Internal Agents Only)

For VERIFIER rounds:
```
Task tool with:
- subagent_type: "elenchus-verifier"
- model: "sonnet"
- prompt:
  1. 검증 대상 참조
  2. 표준 기준 26개 항목 첨부
  3. [Round 1] "전체 항목 검토"
  3. [Round 3+] "이전 비평 반영 + 재검토"
```

For CRITIC rounds:
```
Task tool with:
- subagent_type: "elenchus-critic"
- model: "sonnet"
- prompt:
  1. 검증 대상 참조
  2. 이전 Verifier 출력
  3. "완결성/증거성/정확성 검증"
```

### Convergence Criteria (Strict)

수렴하려면 **모든 조건** 충족 필요:

1. **완결성**: 26개 항목 중 25개+ 검토 (95%)
2. **증거성**: 모든 CRITICAL/HIGH에 코드 증거
3. **정확성**: Critic 직접 확인과 80% 일치
4. **합의**: 심각도 이의 없음

### Issue Tracking Table (Mandatory)

매 라운드 업데이트:

```markdown
| ID | 이슈 | 제기자 | 라운드 | 상태 | 증거 | 심각도 |
|----|------|-------|-------|------|------|--------|
| SEC-01 | SQL Injection | V1 | R1 | 해소 (R3) | db.ts:45 | CRITICAL |
| COR-02 | 경계 조건 | C1 | R2 | 진행 중 | - | HIGH |
```

### Output Format

```markdown
=== ELENCHUS VERIFY ROUND N: [VERIFIER/CRITIC] ===

## 라운드 결과
[에이전트 출력]

## 이슈 테이블 (업데이트)
[테이블]

## 카테고리 커버리지
- SECURITY: N/8 완료
- CORRECTNESS: N/6 완료
- RELIABILITY: N/4 완료
- MAINTAINABILITY: N/4 완료
- PERFORMANCE: N/4 완료
- **총**: N/26 (N%)

## 수렴 상태
[CONTINUING / CONVERGING / CONVERGED / FORCED_STOP]

수렴 불가 사유: [있다면]
```

### Final Output

```markdown
=== ELENCHUS VERIFY COMPLETE ===

## 요약
- **라운드**: N
- **수렴 상태**: [GENUINE_CONSENSUS / FORCED_STOP]
- **최종 판정**: [PASS / FAIL / CONDITIONAL]

## 카테고리별 결과

### SECURITY (N개 이슈)
[이슈 목록]

### CORRECTNESS (N개 이슈)
[이슈 목록]

### RELIABILITY (N개 이슈)
[이슈 목록]

### MAINTAINABILITY (N개 이슈)
[이슈 목록]

### PERFORMANCE (N개 이슈)
[이슈 목록]

## 최종 이슈 테이블

| ID | 요약 | 심각도 | 위치 | 상태 |
|----|------|--------|------|------|
| SEC-01 | ... | CRITICAL | file:45 | CONFIRMED |

## 통계
| 심각도 | 개수 |
|--------|------|
| CRITICAL | N |
| HIGH | N |
| MEDIUM | N |
| LOW | N |
| **총** | N |

## 다음 단계
- CRITICAL/HIGH 이슈 N개 → `/elenchus:consolidate` 권장
- 모든 이슈 해결 후 → `/elenchus:verify` 재실행

## 검증 컨텍스트 (다음 단계용)

```json
{
  "target": "[대상]",
  "issues": [
    {"id": "SEC-01", "severity": "CRITICAL", "location": "file:45", ...}
  ],
  "coverage": {"security": 8, "correctness": 6, ...},
  "verdict": "CONDITIONAL"
}
```
```

### Execution Checklist

1. [ ] $ARGUMENTS에서 검증 대상 파악
2. [ ] 대상이 모호하면 사용자에게 명확화 요청
3. [ ] Round 1: elenchus-verifier 실행 (26개 항목)
4. [ ] 이슈 테이블 초기화
5. [ ] Round 2: elenchus-critic 실행
6. [ ] 매 라운드 이슈 테이블 업데이트
7. [ ] 수렴 기준 체크 (95% 커버리지 등)
8. [ ] 수렴 시: 최종 보고서 생성
9. [ ] 후속 단계 안내 (consolidate/apply)

### Core Principles

```
외부 에이전트 사용 금지.
26개 항목 전체 검토.
증거 없으면 확인 안 된 것.
수렴은 피로가 아닌 합의.
```

BEGIN ELENCHUS VERIFY NOW.
