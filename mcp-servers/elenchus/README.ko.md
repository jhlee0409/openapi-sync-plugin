# Elenchus MCP Server

[English](./README.md) | **한국어**

Verifier↔Critic 루프를 통한 적대적 코드 검증.

> **Elenchus** (ἔλεγχος): 질문을 통한 논박의 소크라테스 방법론.

## 빠른 시작

```bash
# 1. 설치
npm install -g @jhlee0409/elenchus-mcp

# 2. ~/.claude.json에 추가
{
  "mcpServers": {
    "elenchus": { "command": "elenchus-mcp" }
  }
}

# 3. Claude Code에서 사용 (자연어)
"src/auth 보안 이슈 검증해줘"
"이 코드 버그 확인해줘"
```

## 작동 방식

**자연어 → Claude가 Elenchus 도구를 자동으로 사용**

```
사용자: "src/auth 보안 이슈 검증해줘"
Claude: (elenchus_start_session, elenchus_submit_round 등 호출)
```

기본 사용 시 슬래시 커맨드 불필요.

## 설치

### 옵션 1: npm (권장)

```bash
npm install -g @jhlee0409/elenchus-mcp
```

```json
{
  "mcpServers": {
    "elenchus": { "command": "elenchus-mcp" }
  }
}
```

### 옵션 2: npx (글로벌 설치 없이)

```json
{
  "mcpServers": {
    "elenchus": {
      "command": "npx",
      "args": ["-y", "@jhlee0409/elenchus-mcp"]
    }
  }
}
```

### 옵션 3: 소스에서 빌드

```bash
git clone https://github.com/jhlee0409/claude-plugins.git
cd claude-plugins/mcp-servers/elenchus
npm install && npm run build
```

```json
{
  "mcpServers": {
    "elenchus": {
      "command": "node",
      "args": ["/path/to/mcp-servers/elenchus/dist/index.js"]
    }
  }
}
```

## 파워 유저: + 플러그인

명시적인 워크플로우 제어와 짧은 커맨드를 원한다면:

```
# Claude Code에서
/install-plugin elenchus@jhlee0409-plugins
```

| 플러그인 없이 | 플러그인 포함 |
|--------------|--------------|
| 자연어 요청 | `/elenchus:verify src/auth` |
| Claude가 워크플로우 결정 | 명시적 워크플로우 제어 |
| 간단한 검증에 적합 | 26개 기준 전체 검증 |

## MCP 프롬프트 (슬래시 커맨드)

MCP 서버는 명시적 워크플로우를 위한 프롬프트도 제공합니다:

| 커맨드 | 설명 |
|--------|------|
| `/mcp__elenchus__verify` | Verifier↔Critic 루프 실행 |
| `/mcp__elenchus__consolidate` | 우선순위화된 수정 계획 생성 |
| `/mcp__elenchus__apply` | 검증과 함께 수정 적용 |
| `/mcp__elenchus__complete` | 이슈 0까지 전체 파이프라인 |
| `/mcp__elenchus__cross-verify` | 적대적 교차 검증 |

## 도구

### elenchus_start_session

새 검증 세션 시작.

```typescript
{
  target: string,        // 검증 대상 경로
  requirements: string,  // 사용자 요구사항
  workingDir: string,    // 작업 디렉토리
  maxRounds?: number     // 최대 라운드 (기본: 10)
}
```

### elenchus_get_context

현재 검증 컨텍스트 조회.

```typescript
{
  sessionId: string
}
```

### elenchus_submit_round

검증 라운드 결과 제출.

```typescript
{
  sessionId: string,
  role: 'verifier' | 'critic',
  output: string,           // 전체 에이전트 출력
  issuesRaised?: Issue[],   // 발견된 새 이슈
  issuesResolved?: string[] // 해결된 이슈 ID
}
```

### elenchus_get_issues

세션 이슈 조회.

```typescript
{
  sessionId: string,
  status?: 'all' | 'unresolved' | 'critical'
}
```

### elenchus_checkpoint

체크포인트 생성.

```typescript
{
  sessionId: string
}
```

### elenchus_rollback

이전 체크포인트로 롤백.

```typescript
{
  sessionId: string,
  toRound: number
}
```

### elenchus_end_session

세션 종료 및 최종 판정 기록.

```typescript
{
  sessionId: string,
  verdict: 'PASS' | 'FAIL' | 'CONDITIONAL'
}
```

## 세션 저장소

세션은 `~/.claude/elenchus/sessions/`에 저장됩니다:

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

### 설계 결정: 글로벌 저장소

세션은 플러그인 설치 범위와 관계없이 **항상 글로벌에 저장**됩니다.

**이유:**
- MCP 서버는 **stdio 기반, 상태 비저장** 아키텍처
- 각 호출은 새 프로세스로 실행되며, `sessionId`만으로 이전 세션을 찾아야 함
- 글로벌 저장소로 **세션 ID 자족성** 보장

### 세션 정리

세션은 **검증 감사 기록**으로 보존됩니다. 수동 정리:

```bash
# 모든 세션 삭제
rm -rf ~/.claude/elenchus/sessions/*

# 특정 세션 삭제
rm -rf ~/.claude/elenchus/sessions/2024-01-15_*
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ELENCHUS MCP SERVER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Tools     │  │   State     │  │  Resources  │  │  Prompts  │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ start       │  │ Session     │  │ Sessions    │  │ verify    │  │
│  │ get_context │─▶│ Context     │◀─│ (URI-based) │  │ consolidate│ │
│  │ submit_round│  │ Issues      │  │             │  │ apply     │  │
│  │ checkpoint  │  │ Checkpoints │  │             │  │ complete  │  │
│  │ rollback    │  │             │  │             │  │ cross-    │  │
│  │ end         │  │             │  │             │  │  verify   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 주요 기능

### 계층화된 컨텍스트

```
Layer 0 (기본): 세션 시작 시 수집
  - 대상 파일
  - 직접 의존성

Layer 1 (발견): 라운드 중 발견
  - 에이전트가 언급한 새 파일
  - 자동 수집 및 추가
```

### 자동 중재자 개입

서버가 자동으로 감지하고 개입:
- `CONTEXT_EXPAND`: 3개 이상의 새 파일 발견
- `LOOP_BREAK`: 동일 이슈 반복 논쟁
- `SOFT_CORRECT`: 범위 과잉 확장

### 수렴 감지

```typescript
isConverged =
  criticalUnresolved === 0 &&
  roundsWithoutNewIssues >= 2 &&
  currentRound >= 2
```

## 개발

```bash
# Watch 모드
npm run dev

# Inspector (MCP 디버깅)
npm run inspector
```

## 라이선스

MIT
