---
description: Complete verification pipeline - verify, consolidate, apply, and re-verify until zero issues.
---

[ELENCHUS COMPLETE PIPELINE ACTIVATED]

$ARGUMENTS

## Elenchus Complete Protocol

You are now running the **Elenchus Complete Pipeline** - the full verification-to-resolution cycle that continues until zero issues remain.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  ELENCHUS COMPLETE PIPELINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────┐    ┌─────────────┐    ┌─────────┐           │
│    │  VERIFY  │───▶│ CONSOLIDATE │───▶│  APPLY  │           │
│    └──────────┘    └─────────────┘    └─────────┘           │
│         ▲                                   │               │
│         │                                   ▼               │
│         │            ┌───────────────────────┐              │
│         │            │     RE-VERIFY         │              │
│         │            │  (이슈 남았는지 확인)  │              │
│         │            └───────────────────────┘              │
│         │                      │                            │
│         │         ┌────────────┼────────────┐              │
│         │         ▼                         ▼              │
│         │    이슈 있음                  이슈 없음           │
│         │         │                         │              │
│         └─────────┘                    ✅ COMPLETE          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Arguments

```
/elenchus:complete <target>              # 전체 파이프라인 실행
/elenchus:complete <target> --max-cycles=3   # 최대 사이클 제한
/elenchus:complete <target> --scope=must_fix # MUST FIX만 처리
```

### Execution Algorithm

```python
cycle = 0
max_cycles = 5  # 기본값

while cycle < max_cycles:
    cycle += 1
    print(f"=== CYCLE {cycle} ===")

    # Phase 1: VERIFY
    verify_result = run_elenchus_verify(target)

    if verify_result.verdict == "PASS":
        print("✅ ZERO ISSUES - COMPLETE")
        break

    # Phase 2: CONSOLIDATE
    consolidate_result = run_elenchus_consolidate(verify_result)

    if not consolidate_result.must_fix:
        print("✅ NO MUST-FIX ISSUES - COMPLETE")
        break

    # Phase 3: APPLY
    apply_result = run_elenchus_apply(consolidate_result)

    # Phase 4: 다음 사이클 (RE-VERIFY)
    print(f"Applied {apply_result.success_count} fixes, continuing to re-verify...")

if cycle >= max_cycles:
    print(f"⚠️ MAX CYCLES ({max_cycles}) reached")
```

### Cycle Tracking

```markdown
## 사이클 추적

| 사이클 | 시작 이슈 | 해결 | 남은 이슈 | 새 이슈 |
|--------|----------|------|----------|--------|
| 1 | 8 | 6 | 2 | 0 |
| 2 | 2 | 1 | 1 | 1 |
| 3 | 2 | 2 | 0 | 0 |

**최종**: ✅ 3 사이클 후 이슈 0 달성
```

### Output Format

```markdown
=== ELENCHUS COMPLETE: CYCLE N ===

## Phase 1: VERIFY
[verify 요약]
- 발견 이슈: N개 (CRITICAL: N, HIGH: N, ...)

## Phase 2: CONSOLIDATE
[consolidate 요약]
- MUST FIX: N개
- SHOULD FIX: N개

## Phase 3: APPLY
[apply 요약]
- 적용 성공: N개
- 적용 실패: N개

## Phase 4: RE-VERIFY 필요 여부
- 남은 MUST FIX: N개
- 새로 발견된 이슈: N개

→ [CONTINUING TO CYCLE N+1 / COMPLETE]

---
```

### Final Complete Output

```markdown
=== ELENCHUS COMPLETE: FINISHED ===

## 파이프라인 요약

| 항목 | 결과 |
|------|------|
| 총 사이클 | N회 |
| 최종 상태 | ✅ ZERO ISSUES |
| 총 해결 이슈 | N개 |
| 적용된 FIX | N개 |

## 사이클별 진행

### Cycle 1
- 시작: 8개 이슈
- 해결: 6개
- 종료: 2개 남음

### Cycle 2
- 시작: 2개 이슈 (+ 1개 새 발견)
- 해결: 2개
- 종료: 1개 남음

### Cycle 3
- 시작: 1개 이슈
- 해결: 1개
- 종료: **0개** ✅

## 최종 검증 결과

```
SECURITY:      ✅ 0 issues
CORRECTNESS:   ✅ 0 issues
RELIABILITY:   ✅ 0 issues
MAINTAINABILITY: ✅ 0 issues (1 WONT_FIX)
PERFORMANCE:   ✅ 0 issues

VERDICT: ✅ PASS
```

## 적용된 변경 요약

| FIX ID | 이슈 | 파일 | 사이클 |
|--------|------|------|--------|
| FIX-1 | SEC-01, SEC-04 | db/queries.ts | 1 |
| FIX-2 | COR-01 | utils/calc.ts | 1 |
| FIX-3 | REL-02 | api/client.ts | 2 |

## WONT FIX (의도적 미해결)

| ID | 요약 | 사유 |
|----|------|------|
| MNT-02 | 함수 복잡도 | 현재 수준 허용 가능 |

## 권장 다음 단계

1. 변경사항 커밋:
```bash
git add .
git commit -m "fix: resolve all critical issues via elenchus complete pipeline"
```

2. PR 생성 또는 배포 진행
```

### Stop Conditions

파이프라인이 종료되는 조건:

| 조건 | 상태 | 행동 |
|------|------|------|
| 이슈 0개 | ✅ SUCCESS | 완료 |
| MUST FIX 0개 | ✅ SUCCESS | 완료 (남은 건 WONT_FIX) |
| max_cycles 도달 | ⚠️ INCOMPLETE | 경고 + 수동 해결 안내 |
| 무한 루프 감지 | ❌ ERROR | 중단 + 분석 필요 |

### Infinite Loop Detection

새 이슈가 계속 발생하면 무한 루프로 판단:

```markdown
## ⚠️ 무한 루프 감지

최근 3 사이클:
- Cycle 3: 2개 해결 → 2개 새 발견
- Cycle 4: 2개 해결 → 2개 새 발견
- Cycle 5: 2개 해결 → 2개 새 발견

**진단**: 수정이 새로운 이슈를 유발하고 있습니다.

**권장 행동**:
1. 파이프라인 중단
2. 새로 발생하는 이슈 패턴 분석
3. 근본 원인 해결 후 재시도
```

### Execution Checklist

1. [ ] 대상 파악 및 범위 설정
2. [ ] max_cycles 설정 (기본 5)
3. [ ] Cycle 1 시작
4. [ ] 각 Phase 실행 및 결과 기록
5. [ ] 이슈 남았으면 다음 Cycle
6. [ ] 이슈 0 또는 max_cycles 도달 시 종료
7. [ ] 무한 루프 감지 시 중단
8. [ ] 최종 결과 보고

### Core Principles

```
이슈 0이 될 때까지 멈추지 않는다.
단, 무한 루프는 감지하고 중단한다.
모든 사이클을 추적하고 기록한다.
새로 발견된 이슈도 추적한다.
```

### Integration with Other Commands

개별 명령어로도 파이프라인 단계 실행 가능:

```bash
# 검증만
/elenchus:verify <target>

# 검증 결과 통합만
/elenchus:consolidate

# 적용만
/elenchus:apply --scope=must_fix

# 또는 한 번에
/elenchus:complete <target>
```

BEGIN ELENCHUS COMPLETE PIPELINE NOW.
