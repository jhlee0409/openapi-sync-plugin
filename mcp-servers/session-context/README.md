# session-context-mcp

> **"Pick up where you left off. Every time."**

Task-first context preservation for Claude Code. Never lose your todo list to compaction again.

## Problem

When Claude Code runs "Conversation compacted", important context from earlier in the conversation is summarized or lost. This includes:
- Current task objectives
- Progress tracking
- Important decisions made
- Discoveries about the codebase
- **Your TodoWrite task list** ← This is the critical one!

## Solution

`session-context-mcp` automatically saves your conversation context before compaction and restores it afterward using Claude Code's hook system.

---

## 🏆 Why This Tool? (Unique Advantage)

### The Only Tool That Preserves Your Todo List

**TodoWrite is Claude's internal state** — no external tool can access it directly.

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│   TodoWrite (Claude's internal tool)                │
│   ┌─────────────────────────────────┐               │
│   │ □ Implement feature X           │               │
│   │ ■ Write tests        ← YOU ARE  │               │
│   │ □ Update docs          HERE     │               │
│   └─────────────────────────────────┘               │
│                    │                                 │
│                    │ Can other tools access this?   │
│                    ▼                                 │
│   ┌────────────────┬────────────────┐               │
│   │ c0ntextKeeper  │ Memory Keeper  │               │
│   │      ❌        │       ❌       │               │
│   │  (hooks only)  │  (SQLite DB)   │               │
│   └────────────────┴────────────────┘               │
│                    │                                 │
│                    ▼                                 │
│   ┌─────────────────────────────────┐               │
│   │    session-context-mcp          │               │
│   │            ✅                    │               │
│   │   Claude explicitly syncs it!   │               │
│   └─────────────────────────────────┘               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Competitor Comparison

| Feature | c0ntextKeeper | Memory Keeper | **session-context-mcp** |
|---------|---------------|---------------|-------------------------|
| Conversation archive | ✅ | ✅ | ✅ |
| Long-term memory | ❌ | ✅ | ❌ |
| **TodoWrite sync** | ❌ | ❌ | **✅ UNIQUE** |
| Task resumption | ❌ | ❌ | **✅ UNIQUE** |

### Why Can't Others Do This?

1. **Hooks** can only capture stdin data, not Claude's internal state
2. **MCP servers** run as separate processes with no access to Claude internals
3. **Only way**: Claude must **explicitly** copy its TodoWrite state

**session-context-mcp provides `sync_todos` and `resume_tasks`** — the only way to preserve and restore your exact task list across compactions.

---

## Installation

```bash
# Install globally
npm install -g session-context-mcp

# Initialize in your project
cd /path/to/your/project
npx session-context-mcp init
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│            Session Context Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [During conversation]                                   │
│       │                                                  │
│       ▼                                                  │
│  [PreCompact Hook] ──▶ save-context.sh                  │
│       │                 └──▶ .claude/session-context.json│
│       ▼                                                  │
│  [Conversation Compacted]                                │
│       │                                                  │
│       ▼                                                  │
│  [SessionStart Hook] ──▶ load-context.sh                │
│       │                 └──▶ stdout ──▶ Claude context  │
│       ▼                                                  │
│  [Context Restored!]                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Files Created

After running `init`, the following files are created:

```
.claude/
├── scripts/
│   ├── save-context.sh    # Saves context before compaction
│   └── load-context.sh    # Restores context on session start
├── hooks.json             # Hook configuration
└── session-context.json   # Context data (created on first save)
```

## Recommended Usage Pattern

For best results, Claude should update the context during the conversation:

```
1. At task start:
   → save_session_context with goal.original_request

2. After completing subtasks:
   → update_session_context with add_done

3. When making decisions:
   → update_session_context with add_decision

4. When discovering insights:
   → update_session_context with add_discovery

5. Before long operations:
   → update_session_context with set_current
```

**Important:** The PreCompact hook only updates metadata (timestamp). For accurate context restoration, Claude must actively use `update_session_context` during the conversation.

## 🎯 Key Feature: Task Continuity

The **killer feature** that sets session-context-mcp apart: **TodoWrite integration**.

### sync_todos (NEW)

Sync your current todo list before compaction:

```
Use sync_todos with your current TodoWrite list:
{
  "todos": [
    { "content": "Implement feature X", "status": "in_progress", "activeForm": "Implementing feature X" },
    { "content": "Write tests", "status": "pending", "activeForm": "Writing tests" }
  ]
}
```

### resume_tasks (NEW)

After compaction, resume exactly where you left off:

```
Use resume_tasks to get your saved todo list.
Use resume_tasks with auto_restore: true to get TodoWrite-ready format.
```

### Workflow Example

```
┌─────────────────────────────────────────────┐
│  BEFORE COMPACTION                          │
│                                             │
│  Claude: sync_todos with current todos      │
│          └── Saves: [✓A, →B, ○C, ○D]       │
│                                             │
├─────────────────────────────────────────────┤
│  [COMPACTION HAPPENS]                       │
├─────────────────────────────────────────────┤
│  AFTER COMPACTION                           │
│                                             │
│  Claude: resume_tasks                       │
│          └── Returns: [✓A, →B, ○C, ○D]     │
│  Claude: TodoWrite with restored todos      │
│          └── Continues from task B!         │
└─────────────────────────────────────────────┘
```

---

## MCP Tools

In addition to automatic hook-based save/restore, you can use MCP tools for manual control:

### save_session_context

Save the current session context manually.

```
Use save_session_context with:
- goal: { original_request, current_objective }
- progress: { done: [], current: [], pending: [] }
- decisions: [{ what, why, rejected? }]
- discoveries: [{ file, insight }]
- state: { recent_files: [], blockers: [], errors: [] }
```

### load_session_context

Load saved context. Returns formatted markdown or JSON.

### update_session_context

Update specific fields without overwriting everything:
- `add_done`: Add completed tasks
- `set_current`: Set current tasks
- `add_pending`: Add pending tasks
- `add_decision`: Add a new decision
- `add_discovery`: Add a new discovery
- `set_objective`: Update current objective
- `add_blocker` / `remove_blocker`: Manage blockers

### clear_session_context

Start fresh with a clean context.

## MCP Server Configuration

To use the MCP tools, add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "session-context": {
      "command": "npx",
      "args": ["session-context-mcp"]
    }
  }
}
```

## Context Schema

```json
{
  "meta": {
    "version": "2.0",
    "saved_at": "ISO timestamp",
    "session_id": "unique id",
    "project": "/path/to/project",
    "last_trigger": "auto|manual|compact"
  },
  "goal": {
    "original_request": "What the user originally asked for",
    "current_objective": "What we're currently working on"
  },
  "progress": {
    "done": ["Completed tasks"],
    "current": ["In-progress tasks"],
    "pending": ["Upcoming tasks"]
  },
  "decisions": [
    {
      "what": "Decision made",
      "why": "Reasoning",
      "rejected": ["Alternatives considered"]
    }
  ],
  "discoveries": [
    {
      "file": "path/to/file",
      "insight": "What was discovered"
    }
  ],
  "state": {
    "recent_files": ["Recently accessed files"],
    "blockers": ["Current blockers"],
    "errors": ["Recent errors"]
  }
}
```

## 🔌 Composability

session-context-mcp is designed to work alongside other MCP servers without conflicts.

### Works With

| MCP Server | Compatibility | Notes |
|------------|---------------|-------|
| c0ntextKeeper | ✅ Compatible | Different hooks, no conflict |
| MCP Memory Keeper | ✅ Compatible | Complementary features |
| Other MCP servers | ✅ Compatible | Unique tool names |

### Why It Works

1. **Unique Tool Names**: All tools are prefixed with session context semantics
2. **Minimal Hook Usage**: Only PreCompact, SessionStart, Stop hooks
3. **No Global State**: Each project has its own `.claude/session-context.json`
4. **Standard MCP Protocol**: Follows MCP spec strictly

### Multi-Server Configuration

```json
{
  "mcpServers": {
    "session-context": {
      "command": "npx",
      "args": ["session-context-mcp"]
    },
    "memory-keeper": {
      "command": "npx",
      "args": ["mcp-memory-keeper"]
    }
  }
}
```

Both servers will work independently without interference.

---

## Requirements

- Node.js >= 18
- `jq` command-line tool (for shell scripts)
- Claude Code with hooks support

## CLI Commands

```bash
# Initialize in current project
npx session-context-mcp init

# Check configuration status
npx session-context-mcp status

# Show help
npx session-context-mcp help
```

## Troubleshooting

### hooks.json already exists

If you have an existing `hooks.json`, the init command will show the required configuration for manual merging.

### Context not restoring

1. Check that scripts are executable: `ls -la .claude/scripts/`
2. Verify hooks.json is valid JSON
3. Check if jq is installed: `which jq`

### Context too old

Context older than 24 hours is automatically skipped to avoid restoring stale information.

## License

MIT
