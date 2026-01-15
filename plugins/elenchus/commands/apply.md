---
description: Apply consolidated fixes to codebase with verification and rollback support.
---

[ELENCHUS APPLY MODE ACTIVATED]

$ARGUMENTS

## Elenchus Apply Protocol

You are now running **Elenchus Apply** - applying the consolidated fix plan to your codebase with built-in verification and rollback.

### Prerequisites

이 커맨드 실행 전 필요:
- `/elenchus:consolidate` 실행 완료
- 수정 계획 (FIX 목록) 존재
- 코드베이스 clean 상태 (uncommitted 변경 없음)

### Arguments

```
/elenchus:apply                    # 이전 consolidate 결과 사용, 대화형
/elenchus:apply --scope=must_fix   # MUST FIX만 적용
/elenchus:apply --scope=should_fix # MUST + SHOULD FIX 적용
/elenchus:apply --scope=all        # 모든 FIX 적용
/elenchus:apply --dry-run          # 실제 적용 없이 시뮬레이션
```

### Pre-Apply Verification

적용 전 필수 확인:

```markdown
## 사전 검증

- [ ] 코드베이스 상태: `git status` clean 확인
- [ ] 기존 테스트: 모든 테스트 통과 확인
- [ ] 적용 범위: [MUST_FIX / SHOULD_FIX / ALL]
- [ ] 적용 대상: N개 FIX
```

### Application Process

```
FOR each FIX in execution_order:
    1. 📋 변경 전 상태 기록
    2. ✏️ 코드 수정 적용 (Edit tool 사용)
    3. 🔍 구문 검증 (lint/compile)
    4. 🧪 단위 테스트 실행
    5. ✅ 성공: 다음 FIX로
       ❌ 실패: 롤백 후 보고
```

### Agent Usage

```
Task tool with:
- subagent_type: "elenchus-applier"
- model: "sonnet"
- prompt:
  1. 통합 컨텍스트 (consolidate 결과)
  2. 적용 범위
  3. "표준 적용 프로토콜에 따라 순차 적용"
```

### Output Format (Per FIX)

```markdown
### FIX-N 적용 중...

**대상 이슈**: [이슈 ID 목록]
**파일**: [파일 경로]

**적용할 변경**:
```diff
- [이전 코드]
+ [새 코드]
```

**적용 결과**: ✅ SUCCESS / ❌ FAILED

**검증 결과**:
- 구문 검증: ✅ PASS
- 단위 테스트: ✅ PASS (N개 통과)
- 관련 테스트: ✅ PASS

---
```

### Final Output

```markdown
=== ELENCHUS APPLY COMPLETE ===

## 요약

| 항목 | 결과 |
|------|------|
| 계획된 FIX | N개 |
| ✅ 성공 적용 | N개 |
| ❌ 실패/롤백 | N개 |
| ⏭️ 건너뜀 | N개 |

## 적용된 변경

### FIX-1: SEC-01 (SQL Injection)
- **상태**: ✅ APPLIED
- **파일**: `src/db/queries.ts`
- **라인**: 45-46
- **검증**: 모든 테스트 통과

### FIX-2: COR-01 (로직 오류)
- **상태**: ✅ APPLIED
- **파일**: `src/utils/calc.ts`
- **라인**: 23
- **검증**: 모든 테스트 통과

### FIX-3: REL-02 (재시도 로직)
- **상태**: ❌ FAILED → ROLLED_BACK
- **실패 사유**: 의존성 충돌
- **필요 조치**: retry-util 버전 업데이트 필요

## 이슈 해결 상태

| 이슈 ID | FIX ID | 상태 |
|---------|--------|------|
| SEC-01 | FIX-1 | ✅ RESOLVED |
| SEC-04 | FIX-1 | ✅ RESOLVED |
| COR-01 | FIX-2 | ✅ RESOLVED |
| REL-02 | FIX-3 | ⚠️ UNRESOLVED |

## 해결된 이슈
- CRITICAL: N개 → **0개 남음**
- HIGH: N개 → **M개 남음**
- MEDIUM: N개 → **M개 남음**

## 미해결 이슈 (재검증 시 확인 필요)

| ID | 요약 | 사유 |
|----|------|------|
| REL-02 | 재시도 로직 | FIX 적용 실패 |

## 다음 단계

### 미해결 이슈가 있는 경우
1. 수동으로 문제 해결 (의존성 업데이트 등)
2. `/elenchus:apply` 재실행 또는
3. `/elenchus:verify` 재검증

### 모든 이슈 해결된 경우
```
/elenchus:verify <target>  # 재검증으로 이슈 0 확인
```

### 변경사항 커밋
```bash
git add .
git commit -m "fix: resolve security and correctness issues (elenchus)"
```

## 재검증 컨텍스트

```json
{
  "target": "[대상]",
  "previous_issues": ["SEC-01", "SEC-04", "COR-01", "REL-02"],
  "resolved_issues": ["SEC-01", "SEC-04", "COR-01"],
  "unresolved_issues": ["REL-02"],
  "applied_fixes": ["FIX-1", "FIX-2"],
  "failed_fixes": ["FIX-3"]
}
```

재검증 시 이 컨텍스트가 자동으로 전달되어 이전 이슈 해결 여부를 확인합니다.
```

### Rollback Handling

```markdown
## 롤백 발생 시

### 자동 롤백 (단일 FIX 실패)
```
FIX-3 적용 실패
→ 자동 롤백 완료
→ 다음 FIX (FIX-4)로 진행 (의존성 없으면)
```

### 연쇄 롤백 (의존성 FIX 실패)
```
FIX-3 실패 (FIX-4가 FIX-3에 의존)
→ FIX-3 롤백
→ FIX-4 건너뜀 (의존성)
→ FIX-5로 진행 (독립적이면)
```

### 전체 롤백 필요 시
사용자에게 확인 요청:
```
⚠️ 여러 FIX 실패로 전체 롤백이 권장됩니다.
실행할까요? [Y/n]

git reset --hard HEAD
```
```

### Dry Run Mode

`--dry-run` 옵션 시:

```markdown
## DRY RUN 결과 (실제 적용 없음)

### 적용될 변경 미리보기

#### FIX-1: SEC-01
**파일**: `src/db/queries.ts`
```diff
- const query = `SELECT * FROM users WHERE id = ${userId}`;
+ const query = `SELECT * FROM users WHERE id = ?`;
+ const result = await db.execute(query, [userId]);
```

**예상 영향**:
- 영향받는 파일: 1개
- 예상 테스트: 3개

---

### 적용 시뮬레이션 완료

- 적용될 FIX: N개
- 예상 변경 파일: N개
- 예상 영향 테스트: N개

실제 적용하려면: `/elenchus:apply --scope=must_fix`
```

### Execution Checklist

1. [ ] 이전 consolidate 결과 확인
2. [ ] 없으면 consolidate 먼저 요청
3. [ ] 적용 범위 결정 (--scope)
4. [ ] 사전 검증 (git status, 테스트)
5. [ ] elenchus-applier로 순차 적용
6. [ ] 각 FIX별 검증 결과 기록
7. [ ] 실패 시 자동 롤백
8. [ ] 최종 결과 및 재검증 안내

### Core Principles

```
하나씩 적용하고 검증한다.
실패 시 즉시 롤백한다.
모든 변경을 추적한다.
재검증 컨텍스트를 준비한다.
```

BEGIN ELENCHUS APPLY NOW.
