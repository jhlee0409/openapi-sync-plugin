# Elenchus MCP Server

MCP server for the Elenchus verification system. Provides state management, context sharing, and orchestration for adversarial verification loops.

## Why MCP Server?

플러그인만으로는 한계가 있습니다:
- 서브에이전트 간 실시간 메모리 공유 불가
- 복잡한 오케스트레이션 로직 불가
- 세션 상태 관리 어려움

MCP 서버가 해결하는 것:
- **상태 관리**: 세션, 이슈, 컨텍스트를 서버가 관리
- **컨텍스트 공유**: 모든 에이전트가 동일한 컨텍스트 접근
- **영속성**: 세션 데이터 디스크에 저장, 재개 가능

## Installation

```bash
cd mcp-servers/elenchus
npm install
npm run build
```

## Claude Code Configuration

`~/.claude.json`에 추가:

```json
{
  "mcpServers": {
    "elenchus": {
      "command": "node",
      "args": ["/path/to/claude-plugins/mcp-servers/elenchus/dist/index.js"]
    }
  }
}
```

## Tools

### elenchus_start_session

새 검증 세션을 시작합니다.

```typescript
{
  target: string,        // 검증 대상 경로
  requirements: string,  // 사용자 검증 요구사항
  workingDir: string,    // 작업 디렉토리
  maxRounds?: number     // 최대 라운드 (기본 10)
}
```

**반환값:**
```typescript
{
  sessionId: string,
  status: 'initialized',
  context: {
    target: string,
    filesCollected: number,
    requirements: string
  }
}
```

### elenchus_get_context

현재 검증 컨텍스트를 가져옵니다.

```typescript
{
  sessionId: string
}
```

**반환값:**
```typescript
{
  sessionId: string,
  target: string,
  requirements: string,
  files: Array<{ path: string, layer: 'base' | 'discovered' }>,
  currentRound: number,
  issuesSummary: { total, bySeverity, byStatus }
}
```

### elenchus_submit_round

검증 라운드 결과를 제출합니다.

```typescript
{
  sessionId: string,
  role: 'verifier' | 'critic',
  output: string,           // 에이전트 출력 전체
  issuesRaised?: Issue[],   // 새로 제기된 이슈
  issuesResolved?: string[] // 해결된 이슈 ID
}
```

**반환값:**
```typescript
{
  roundNumber: number,
  role: string,
  issuesRaised: number,
  issuesResolved: number,
  contextExpanded: boolean,
  newFilesDiscovered: string[],
  convergence: ConvergenceStatus,
  intervention?: ArbiterIntervention,
  nextRole: 'verifier' | 'critic' | 'complete'
}
```

### elenchus_get_issues

세션의 이슈를 조회합니다.

```typescript
{
  sessionId: string,
  status?: 'all' | 'unresolved' | 'critical'
}
```

### elenchus_checkpoint

체크포인트를 생성합니다.

```typescript
{
  sessionId: string
}
```

### elenchus_rollback

이전 체크포인트로 롤백합니다.

```typescript
{
  sessionId: string,
  toRound: number
}
```

### elenchus_end_session

세션을 종료하고 최종 판정을 기록합니다.

```typescript
{
  sessionId: string,
  verdict: 'PASS' | 'FAIL' | 'CONDITIONAL'
}
```

## Session Storage

세션 데이터는 `~/.claude/elenchus/sessions/`에 저장됩니다:

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ELENCHUS MCP SERVER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Tools     │     │   State     │     │  Resources  │   │
│  ├─────────────┤     ├─────────────┤     ├─────────────┤   │
│  │ start       │     │ Session     │     │ Sessions    │   │
│  │ get_context │────▶│ Context     │◀────│ (URI-based) │   │
│  │ submit_round│     │ Issues      │     │             │   │
│  │ checkpoint  │     │ Checkpoints │     │             │   │
│  │ rollback    │     │             │     │             │   │
│  │ end         │     │             │     │             │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### Layered Context

```
Layer 0 (Base): 검증 시작 시 수집
  - 대상 파일
  - 직접 의존성

Layer 1 (Discovered): 라운드 중 발견
  - 에이전트가 언급한 새 파일
  - 자동 수집 후 추가
```

### Automatic Arbiter Intervention

서버가 자동으로 감지하고 개입:
- `CONTEXT_EXPAND`: 새 파일 3개 이상 발견
- `LOOP_BREAK`: 동일 이슈 반복 논쟁
- `SOFT_CORRECT`: 범위 과도 확장

### Convergence Detection

```typescript
isConverged =
  criticalUnresolved === 0 &&
  roundsWithoutNewIssues >= 2 &&
  currentRound >= 2
```

## Development

```bash
# Watch mode
npm run dev

# Inspector (MCP debugging)
npm run inspector
```

## License

MIT
