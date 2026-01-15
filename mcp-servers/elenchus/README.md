# Elenchus MCP Server

**English** | [한국어](./README.ko.md)

Adversarial code verification with Verifier↔Critic loop.

> **Elenchus** (ἔλεγχος): Socrates' method of refutation through questioning.

## Quick Start

```bash
# 1. Install
npm install -g @jhlee0409/elenchus-mcp

# 2. Add to ~/.claude.json
{
  "mcpServers": {
    "elenchus": { "command": "elenchus-mcp" }
  }
}

# 3. Use in Claude Code (natural language)
"Please verify src/auth for security issues"
"Check this code for bugs"
```

## How It Works

**Natural language → Claude uses Elenchus tools automatically**

```
User: "Verify src/auth for security issues"
Claude: (calls elenchus_start_session, elenchus_submit_round, etc.)
```

No slash commands needed for basic usage.

## Installation

### Option 1: npm (Recommended)

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

### Option 2: npx (No global install)

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

### Option 3: From source

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

## For Power Users: + Plugin

Want explicit workflow control with short commands?

```
# In Claude Code
/install-plugin elenchus@jhlee0409-plugins
```

| Without Plugin | With Plugin |
|----------------|-------------|
| Natural language requests | `/elenchus:verify src/auth` |
| Claude decides workflow | Explicit workflow control |
| Good for simple checks | Full 26-criteria verification |

## MCP Prompts (Slash Commands)

MCP server also provides prompts for explicit workflow:

| Command | Description |
|---------|-------------|
| `/mcp__elenchus__verify` | Run Verifier↔Critic loop |
| `/mcp__elenchus__consolidate` | Create prioritized fix plan |
| `/mcp__elenchus__apply` | Apply fixes with verification |
| `/mcp__elenchus__complete` | Full pipeline until zero issues |
| `/mcp__elenchus__cross-verify` | Adversarial cross-verification |

## Tools

### elenchus_start_session

Start a new verification session.

```typescript
{
  target: string,        // Target path to verify
  requirements: string,  // User requirements
  workingDir: string,    // Working directory
  maxRounds?: number     // Max rounds (default: 10)
}
```

### elenchus_get_context

Get current verification context.

```typescript
{
  sessionId: string
}
```

### elenchus_submit_round

Submit verification round results.

```typescript
{
  sessionId: string,
  role: 'verifier' | 'critic',
  output: string,           // Full agent output
  issuesRaised?: Issue[],   // New issues raised
  issuesResolved?: string[] // Resolved issue IDs
}
```

### elenchus_get_issues

Query session issues.

```typescript
{
  sessionId: string,
  status?: 'all' | 'unresolved' | 'critical'
}
```

### elenchus_checkpoint

Create a checkpoint.

```typescript
{
  sessionId: string
}
```

### elenchus_rollback

Rollback to previous checkpoint.

```typescript
{
  sessionId: string,
  toRound: number
}
```

### elenchus_end_session

End session and record final verdict.

```typescript
{
  sessionId: string,
  verdict: 'PASS' | 'FAIL' | 'CONDITIONAL'
}
```

## Session Storage

Sessions are stored at `~/.claude/elenchus/sessions/`:

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

### Design Decision: Global Storage

Sessions are **always stored globally** regardless of plugin installation scope.

**Reason:**
- MCP server is **stdio-based, stateless** architecture
- Each call runs as new process, must find previous session by `sessionId` only
- Global storage ensures **session ID self-sufficiency**

### Session Cleanup

Sessions are preserved as **verification audit records**. Manual cleanup:

```bash
# Delete all sessions
rm -rf ~/.claude/elenchus/sessions/*

# Delete specific sessions
rm -rf ~/.claude/elenchus/sessions/2024-01-15_*
```

## Architecture

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

## Key Features

### Layered Context

```
Layer 0 (Base): Collected at session start
  - Target files
  - Direct dependencies

Layer 1 (Discovered): Found during rounds
  - New files mentioned by agents
  - Auto-collected and added
```

### Automatic Arbiter Intervention

Server auto-detects and intervenes:
- `CONTEXT_EXPAND`: 3+ new files discovered
- `LOOP_BREAK`: Same issue repeatedly argued
- `SOFT_CORRECT`: Scope over-expansion

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
