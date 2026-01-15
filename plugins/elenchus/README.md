# Elenchus Plugin

Adversarial verification and complete resolution pipeline inspired by Socratic elenchus method.

> **Elenchus** (ἔλεγχος): Socrates' method of refutation through questioning, exposing contradictions to arrive at truth.

## What's New in v2.0

### Complete Pipeline
이제 검증에서 수정까지 전체 파이프라인을 제공합니다:

```
VERIFY → CONSOLIDATE → APPLY → RE-VERIFY (이슈 0까지)
```

### Standardized Criteria
26개의 표준화된 검증 항목으로 일관된 품질 보장:
- SECURITY (8항목)
- CORRECTNESS (6항목)
- RELIABILITY (4항목)
- MAINTAINABILITY (4항목)
- PERFORMANCE (4항목)

### Internal Agents Only
외부 환경에 의존하지 않는 내부 에이전트로 일관된 품질:
- elenchus-verifier
- elenchus-critic
- elenchus-consolidator
- elenchus-applier

## Commands

### /elenchus:verify

개선된 cross-verify. 표준화된 26개 항목으로 검증.

```bash
/elenchus:verify src/auth/login.ts
/elenchus:verify the authentication system
```

**특징:**
- 내부 에이전트만 사용 (환경 독립적)
- 26개 항목 전체 커버리지
- 구조화된 이슈 테이블 출력
- 후속 단계(consolidate/apply) 연계

### /elenchus:consolidate

검증 결과를 우선순위화된 수정 계획으로 변환.

```bash
/elenchus:consolidate              # 이전 verify 결과 사용
```

**특징:**
- 버킷 분류 (MUST/SHOULD/NICE TO HAVE/WONT FIX)
- 우선순위 점수 계산
- 구체적인 수정 코드 제시
- 의존성 기반 실행 순서

### /elenchus:apply

통합된 수정 계획을 코드베이스에 적용.

```bash
/elenchus:apply                    # 대화형 적용
/elenchus:apply --scope=must_fix   # MUST FIX만 적용
/elenchus:apply --scope=all        # 전체 적용
/elenchus:apply --dry-run          # 시뮬레이션만
```

**특징:**
- 순차 적용 + 즉시 검증
- 실패 시 자동 롤백
- 상세한 적용 기록
- 재검증용 컨텍스트 생성

### /elenchus:complete

전체 파이프라인을 이슈 0이 될 때까지 자동 실행.

```bash
/elenchus:complete src/auth/
/elenchus:complete <target> --max-cycles=3
```

**특징:**
- VERIFY → CONSOLIDATE → APPLY → RE-VERIFY 루프
- 무한 루프 감지
- 사이클별 진행 추적
- 최종 ZERO ISSUES 보장

### /elenchus:cross-verify (Legacy)

기존 cross-verify. 하위 호환성을 위해 유지.

```bash
/elenchus:cross-verify src/auth/login.ts
```

## Pipeline Example

```bash
# 1. 검증
/elenchus:verify src/api/

# 결과: 8개 이슈 (CRITICAL: 2, HIGH: 3, MEDIUM: 2, LOW: 1)

# 2. 통합
/elenchus:consolidate

# 결과:
# - MUST FIX: 5개 (CRITICAL 2 + HIGH 3)
# - SHOULD FIX: 2개
# - WONT FIX: 1개 (LOW, 비용>효과)

# 3. 적용
/elenchus:apply --scope=must_fix

# 결과: 5개 FIX 적용 완료

# 4. 재검증
/elenchus:verify src/api/

# 결과: 0개 이슈 → PASS!
```

또는 한 번에:

```bash
/elenchus:complete src/api/
# → 자동으로 위 과정 반복하여 이슈 0 달성
```

## Architecture

```
plugins/elenchus/
├── .claude-plugin/
│   └── plugin.json
├── README.md
├── core/
│   └── verification-criteria.md    # 표준화된 26개 검증 항목
├── agents/
│   ├── elenchus-verifier.md        # 검증자 에이전트
│   ├── elenchus-critic.md          # 비평자 에이전트
│   ├── elenchus-consolidator.md    # 통합자 에이전트
│   ├── elenchus-applier.md         # 적용자 에이전트
│   └── adversarial-critic.md       # (Legacy) 기존 비평자
└── commands/
    ├── verify.md                   # 표준화된 검증
    ├── consolidate.md              # 결과 통합
    ├── apply.md                    # 수정 적용
    ├── complete.md                 # 전체 파이프라인
    └── cross-verify.md             # (Legacy) 기존 검증
```

## Verification Criteria

모든 검증은 26개 표준 항목을 따릅니다:

| Category | Items | Focus |
|----------|-------|-------|
| SECURITY | SEC-01~08 | SQL Injection, XSS, CSRF, 인증, 권한, 민감정보 |
| CORRECTNESS | COR-01~06 | 로직, 경계조건, 타입, 비동기, 에러, 상태 |
| RELIABILITY | REL-01~04 | 리소스, 재시도, 타임아웃, 종료 |
| MAINTAINABILITY | MNT-01~04 | 중복, 복잡도, 의존성, 명명 |
| PERFORMANCE | PRF-01~04 | N+1, 메모리, 알고리즘, 캐싱 |

## Issue Severity

| Severity | Definition | Action |
|----------|------------|--------|
| CRITICAL | 보안 취약점, 데이터 손실 | 즉시 수정 필수 |
| HIGH | 서비스 장애 가능 | 배포 전 수정 필수 |
| MEDIUM | 엣지케이스 버그 | 배포 전 수정 권장 |
| LOW | 코드 품질 | 시간 있을 때 |

## Session Storage (MCP Server)

MCP 서버를 함께 사용하면 세션이 `~/.claude/elenchus/sessions/`에 저장됩니다.

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

**중요:** 세션은 플러그인 설치 스코프(global/project)와 관계없이 **항상 글로벌 위치**에 저장됩니다. 이는 MCP 서버의 상태 비저장 아키텍처 때문입니다.

세션 정리:
```bash
rm -rf ~/.claude/elenchus/sessions/*
```

자세한 내용은 [MCP Server README](../../mcp-servers/elenchus/README.md#session-storage)를 참고하세요.

## Convergence Guarantee

재검증 시 이슈 0을 보장하는 방법:

1. **표준화된 기준**: 동일 기준으로 검증하여 새 이슈 발견 최소화
2. **이슈 추적**: 이전 이슈 ID로 해결 여부 추적
3. **회귀 감지**: 재발견 이슈는 REGRESSION으로 표시
4. **무한 루프 감지**: 새 이슈가 계속 발생하면 중단

## Installation

### 1. Plugin Only (Basic)

Claude Code plugins에 추가:
```
elenchus@jhlee0409-plugins
```

### 2. With MCP Server (Recommended)

MCP 서버를 함께 사용하면 상태 관리, 컨텍스트 공유, 세션 영속성이 가능합니다.

```bash
# MCP 서버 빌드
cd mcp-servers/elenchus
npm install
npm run build

# ~/.claude.json에 추가
{
  "mcpServers": {
    "elenchus": {
      "command": "node",
      "args": ["/path/to/claude-plugins/mcp-servers/elenchus/dist/index.js"]
    }
  }
}
```

자세한 내용은 [MCP Server README](../../mcp-servers/elenchus/README.md)를 참고하세요.

## License

MIT
