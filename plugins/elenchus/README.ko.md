# Elenchus 플러그인

[English](./README.md) | **한국어**

소크라테스의 엘렝코스 방법론에서 영감을 받은 적대적 검증 및 완전 해결 파이프라인.

> **Elenchus** (ἔλεγχος): 질문을 통한 논박의 소크라테스 방법론. 모순을 드러내 진실에 도달.

## 사전 요구사항

**이 플러그인은 Elenchus MCP 서버가 먼저 설치되어 있어야 합니다.**

```bash
npm install -g @jhlee0409/elenchus-mcp
```

`~/.claude.json`에 추가:
```json
{
  "mcpServers": {
    "elenchus": { "command": "elenchus-mcp" }
  }
}
```

> **참고:** 플러그인은 MCP의 긴 커맨드명(`/mcp__elenchus__verify`) 대신 짧은 커맨드명(`/elenchus:verify`)을 제공합니다. 짧은 커맨드 없이 기능만 필요하다면 MCP 서버만 설치하세요.

## 커맨드

### /elenchus:verify

26개 기준 항목으로 표준화된 검증 실행.

```bash
/elenchus:verify src/auth/login.ts
/elenchus:verify the authentication system
```

**특징:**
- 내부 에이전트만 사용 (환경 독립적)
- 26개 기준 전체 커버리지
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
- 이슈 제로 보장

### /elenchus:cross-verify (레거시)

기존 cross-verify. 하위 호환성을 위해 유지.

```bash
/elenchus:cross-verify src/auth/login.ts
```

## 파이프라인 예시

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

## v2.0의 새로운 기능

### 완전 파이프라인
검증에서 해결까지 전체 파이프라인:

```
VERIFY → CONSOLIDATE → APPLY → RE-VERIFY (이슈 0까지)
```

### 표준화된 기준
26개 표준화된 검증 항목으로 일관된 품질:
- SECURITY (8항목)
- CORRECTNESS (6항목)
- RELIABILITY (4항목)
- MAINTAINABILITY (4항목)
- PERFORMANCE (4항목)

### 내부 에이전트만 사용
외부 의존성 없는 내부 에이전트로 일관된 품질:
- elenchus-verifier
- elenchus-critic
- elenchus-consolidator
- elenchus-applier

## 아키텍처

```
plugins/elenchus/
├── .claude-plugin/
│   └── plugin.json
├── README.md
├── core/
│   └── verification-criteria.md    # 표준화된 26개 검증 기준
├── agents/
│   ├── elenchus-verifier.md        # 검증자 에이전트
│   ├── elenchus-critic.md          # 비평자 에이전트
│   ├── elenchus-consolidator.md    # 통합자 에이전트
│   ├── elenchus-applier.md         # 적용자 에이전트
│   └── adversarial-critic.md       # (레거시) 기존 비평자
└── commands/
    ├── verify.md                   # 표준화된 검증
    ├── consolidate.md              # 결과 통합
    ├── apply.md                    # 수정 적용
    ├── complete.md                 # 전체 파이프라인
    └── cross-verify.md             # (레거시) 기존 검증
```

## 검증 기준

모든 검증은 26개 표준 기준을 따릅니다:

| 카테고리 | 항목 | 초점 |
|----------|------|------|
| SECURITY | SEC-01~08 | SQL Injection, XSS, CSRF, 인증, 권한, 민감정보 |
| CORRECTNESS | COR-01~06 | 로직, 경계조건, 타입, 비동기, 에러, 상태 |
| RELIABILITY | REL-01~04 | 리소스, 재시도, 타임아웃, 종료 |
| MAINTAINABILITY | MNT-01~04 | 중복, 복잡도, 의존성, 명명 |
| PERFORMANCE | PRF-01~04 | N+1, 메모리, 알고리즘, 캐싱 |

## 이슈 심각도

| 심각도 | 정의 | 조치 |
|--------|------|------|
| CRITICAL | 보안 취약점, 데이터 손실 | 즉시 수정 필수 |
| HIGH | 서비스 장애 가능 | 배포 전 수정 필수 |
| MEDIUM | 엣지케이스 버그 | 배포 전 수정 권장 |
| LOW | 코드 품질 | 시간 있을 때 |

## 세션 저장소 (MCP 서버)

MCP 서버와 함께 사용하면 세션이 `~/.claude/elenchus/sessions/`에 저장됩니다:

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

**중요:** 세션은 플러그인 설치 범위(global/project)와 관계없이 **항상 글로벌에 저장**됩니다. MCP 서버의 상태 비저장 아키텍처 때문입니다.

세션 정리:
```bash
rm -rf ~/.claude/elenchus/sessions/*
```

자세한 내용은 [MCP Server README](../../mcp-servers/elenchus/README.ko.md#세션-저장소)를 참고하세요.

## 수렴 보장

재검증 시 이슈 0을 보장하는 방법:

1. **표준화된 기준**: 동일 기준으로 검증하여 새 이슈 발견 최소화
2. **이슈 추적**: 이전 이슈 ID로 해결 여부 추적
3. **회귀 감지**: 재발견 이슈는 REGRESSION으로 표시
4. **무한 루프 감지**: 새 이슈가 계속 발생하면 중단

## 커맨드 비교

| 플러그인 커맨드 | MCP 커맨드 | 비고 |
|----------------|------------|------|
| `/elenchus:verify` | `/mcp__elenchus__verify` | 동일 기능 |
| `/elenchus:consolidate` | `/mcp__elenchus__consolidate` | 동일 기능 |
| `/elenchus:apply` | `/mcp__elenchus__apply` | 동일 기능 |
| `/elenchus:complete` | `/mcp__elenchus__complete` | 동일 기능 |
| `/elenchus:cross-verify` | `/mcp__elenchus__cross-verify` | 동일 기능 |

## 라이선스

MIT
