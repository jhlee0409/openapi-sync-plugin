# Elenchus Plugin

**English** | [한국어](./README.ko.md)

Adversarial verification and complete resolution pipeline inspired by Socratic elenchus method.

> **Elenchus** (ἔλεγχος): Socrates' method of refutation through questioning, exposing contradictions to arrive at truth.

## Prerequisites

**This plugin requires the Elenchus MCP server to be installed first.**

```bash
npm install -g @jhlee0409/elenchus-mcp
```

Add to `~/.claude.json`:
```json
{
  "mcpServers": {
    "elenchus": { "command": "elenchus-mcp" }
  }
}
```

> **Note:** The plugin provides short command names (`/elenchus:verify`) instead of MCP's longer names (`/mcp__elenchus__verify`). If you only need the functionality without short commands, install the MCP server only.

## Commands

### /elenchus:verify

Run standardized verification with 26 criteria items.

```bash
/elenchus:verify src/auth/login.ts
/elenchus:verify the authentication system
```

**Features:**
- Internal agents only (environment-independent)
- Full 26-criteria coverage
- Structured issue table output
- Integration with subsequent steps (consolidate/apply)

### /elenchus:consolidate

Transform verification results into prioritized fix plan.

```bash
/elenchus:consolidate              # Use previous verify results
```

**Features:**
- Bucket classification (MUST/SHOULD/NICE TO HAVE/WONT FIX)
- Priority score calculation
- Concrete fix code suggestions
- Dependency-based execution order

### /elenchus:apply

Apply consolidated fix plan to codebase.

```bash
/elenchus:apply                    # Interactive apply
/elenchus:apply --scope=must_fix   # MUST FIX only
/elenchus:apply --scope=all        # Apply all
/elenchus:apply --dry-run          # Simulation only
```

**Features:**
- Sequential apply + immediate verification
- Automatic rollback on failure
- Detailed application log
- Re-verification context generation

### /elenchus:complete

Run full pipeline automatically until zero issues.

```bash
/elenchus:complete src/auth/
/elenchus:complete <target> --max-cycles=3
```

**Features:**
- VERIFY → CONSOLIDATE → APPLY → RE-VERIFY loop
- Infinite loop detection
- Per-cycle progress tracking
- Zero issues guarantee

### /elenchus:cross-verify (Legacy)

Original cross-verify. Maintained for backward compatibility.

```bash
/elenchus:cross-verify src/auth/login.ts
```

## Pipeline Example

```bash
# 1. Verify
/elenchus:verify src/api/

# Result: 8 issues (CRITICAL: 2, HIGH: 3, MEDIUM: 2, LOW: 1)

# 2. Consolidate
/elenchus:consolidate

# Result:
# - MUST FIX: 5 (CRITICAL 2 + HIGH 3)
# - SHOULD FIX: 2
# - WONT FIX: 1 (LOW, cost > benefit)

# 3. Apply
/elenchus:apply --scope=must_fix

# Result: 5 FIXes applied

# 4. Re-verify
/elenchus:verify src/api/

# Result: 0 issues → PASS!
```

Or all at once:

```bash
/elenchus:complete src/api/
# → Automatically repeats above process until zero issues
```

## What's New in v2.0

### Complete Pipeline
Full pipeline from verification to resolution:

```
VERIFY → CONSOLIDATE → APPLY → RE-VERIFY (until zero issues)
```

### Standardized Criteria
Consistent quality with 26 standardized verification items:
- SECURITY (8 items)
- CORRECTNESS (6 items)
- RELIABILITY (4 items)
- MAINTAINABILITY (4 items)
- PERFORMANCE (4 items)

### Internal Agents Only
Consistent quality with internal agents (no external dependencies):
- elenchus-verifier
- elenchus-critic
- elenchus-consolidator
- elenchus-applier

## Architecture

```
plugins/elenchus/
├── .claude-plugin/
│   └── plugin.json
├── README.md
├── core/
│   └── verification-criteria.md    # Standardized 26 criteria
├── agents/
│   ├── elenchus-verifier.md        # Verifier agent
│   ├── elenchus-critic.md          # Critic agent
│   ├── elenchus-consolidator.md    # Consolidator agent
│   ├── elenchus-applier.md         # Applier agent
│   └── adversarial-critic.md       # (Legacy) Original critic
└── commands/
    ├── verify.md                   # Standardized verification
    ├── consolidate.md              # Result consolidation
    ├── apply.md                    # Fix application
    ├── complete.md                 # Full pipeline
    └── cross-verify.md             # (Legacy) Original verification
```

## Verification Criteria

All verifications follow 26 standard criteria:

| Category | Items | Focus |
|----------|-------|-------|
| SECURITY | SEC-01~08 | SQL Injection, XSS, CSRF, Auth, Authorization, Sensitive Data |
| CORRECTNESS | COR-01~06 | Logic, Edge Cases, Types, Async, Errors, State |
| RELIABILITY | REL-01~04 | Resources, Retry, Timeout, Shutdown |
| MAINTAINABILITY | MNT-01~04 | Duplication, Complexity, Dependencies, Naming |
| PERFORMANCE | PRF-01~04 | N+1, Memory, Algorithm, Caching |

## Issue Severity

| Severity | Definition | Action |
|----------|------------|--------|
| CRITICAL | Security vulnerabilities, data loss | Fix immediately |
| HIGH | Potential service outage | Fix before deploy |
| MEDIUM | Edge case bugs | Recommended before deploy |
| LOW | Code quality | When time permits |

## Session Storage (MCP Server)

When using with MCP server, sessions are stored at `~/.claude/elenchus/sessions/`:

```
~/.claude/elenchus/sessions/
└── 2024-01-15_src-auth_abc123/
    └── session.json
```

**Important:** Sessions are **always stored globally** regardless of plugin installation scope (global/project). This is due to MCP server's stateless architecture.

Session cleanup:
```bash
rm -rf ~/.claude/elenchus/sessions/*
```

See [MCP Server README](../../mcp-servers/elenchus/README.md#session-storage) for details.

## Convergence Guarantee

How re-verification guarantees zero issues:

1. **Standardized Criteria**: Same criteria minimizes new issue discovery
2. **Issue Tracking**: Track resolution by previous issue IDs
3. **Regression Detection**: Re-discovered issues marked as REGRESSION
4. **Infinite Loop Detection**: Stops if new issues keep appearing

## Command Comparison

| Plugin Command | MCP Command | Notes |
|----------------|-------------|-------|
| `/elenchus:verify` | `/mcp__elenchus__verify` | Same functionality |
| `/elenchus:consolidate` | `/mcp__elenchus__consolidate` | Same functionality |
| `/elenchus:apply` | `/mcp__elenchus__apply` | Same functionality |
| `/elenchus:complete` | `/mcp__elenchus__complete` | Same functionality |
| `/elenchus:cross-verify` | `/mcp__elenchus__cross-verify` | Same functionality |

## License

MIT
