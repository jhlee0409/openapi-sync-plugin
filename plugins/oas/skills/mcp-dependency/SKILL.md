---
name: mcp-dependency
description: Check and install OpenAPI Sync MCP server dependency
---

# MCP Dependency Check

Ensures the OpenAPI Sync MCP server is installed before running OAS commands.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, Claude MUST perform these steps:

### Step 1: Check MCP Availability

**Test if MCP tools are available:**

Try to access the `oas_parse` MCP tool with a minimal request:
- If the tool exists and responds → MCP is installed, proceed
- If tool not found or connection error → MCP not installed, go to Step 2

**Quick check method:**
```
Call: mcp__oas__oas_status with { "project_dir": "." }
```

- Success (any response) → MCP installed
- Error "Unknown tool" or "MCP not found" → Not installed

### Step 2: MCP Not Installed - Notify and Offer Installation

**Display installation prompt:**

```
+----------------------------------------------------------+
|  OpenAPI Sync MCP Required                               |
+----------------------------------------------------------+

The OAS plugin requires the OpenAPI Sync MCP server.

Installation options:

1. npm (Recommended)
   npm install -g @jhlee0409/openapi-sync-mcp

2. Manual
   Download from: https://github.com/jhlee0409/openapi-sync-mcp/releases

Would you like me to install it now via npm? [Y/n]
```

### Step 3: Auto-Install (if user confirms)

**If user confirms installation:**

```bash
npm install -g @jhlee0409/openapi-sync-mcp
```

**Post-install configuration:**

After npm install, the MCP server needs to be added to Claude's config.

```
MCP server installed!

To complete setup, add to your Claude config:

~/.claude.json (or project .mcp.json):
{
  "mcpServers": {
    "oas": {
      "command": "openapi-sync-mcp",
      "args": []
    }
  }
}

Then restart Claude Code.
```

### Step 4: Verify Installation

**After installation, verify:**

```
Call: mcp__oas__oas_status with { "project_dir": "." }
```

- Success → Continue to original command
- Failure → Show troubleshooting guide

### Step 5: Troubleshooting (if verification fails)

```
MCP verification failed. Troubleshooting:

1. Check binary is in PATH:
   which openapi-sync-mcp

2. Check Claude config:
   cat ~/.claude.json | grep -A5 "oas"

3. Restart Claude Code after config change

4. Manual test:
   openapi-sync-mcp --help

Still having issues?
https://github.com/jhlee0409/openapi-sync-mcp/issues
```

---

## INTEGRATION WITH COMMANDS

Each `/oas:*` command MUST invoke this skill at the start:

```markdown
## EXECUTION INSTRUCTIONS

When this command is invoked:

### Step 0: MCP Dependency Check
**Invoke skill: mcp-dependency**
- If MCP not available, skill will handle installation
- Only proceed to Step 1 after MCP is confirmed available

### Step 1: ... (original first step)
```

---

## SKIP CONDITIONS

Skip MCP check if:
- User explicitly says "skip mcp check"
- Environment variable `OAS_SKIP_MCP_CHECK=1` is set
- Previous command in same session already verified MCP

---

## ERROR MESSAGES

| Scenario | Message |
|----------|---------|
| MCP not installed | "OpenAPI Sync MCP server is not installed." |
| Install failed | "Failed to install MCP server: {error}" |
| Config missing | "MCP installed but not configured in Claude." |
| Binary not found | "MCP binary not found in PATH." |

---

## OUTPUT

**On success:**
```
MCP server verified (ready)
```

**On installation:**
```
MCP server installed and configured (ready)
```

**On failure:**
```
MCP server unavailable
Please install manually: npm install -g @jhlee0409/openapi-sync-mcp
```
