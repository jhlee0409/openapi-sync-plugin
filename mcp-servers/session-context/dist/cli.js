#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SAVE_SCRIPT = `#!/bin/bash
# Session Context System v2 - Save Script
# Called by PreCompact hook to save context before compression

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$CLAUDE_DIR/session-context.json"
BACKUP_FILE="$CLAUDE_DIR/session-context.json.bak"

# Read input from stdin (hook provides JSON input)
INPUT=$(cat)

# Extract session info from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRIGGER=$(echo "$INPUT" | jq -r '.trigger // "unknown"')

# Create backup if context file exists
if [ -f "$CONTEXT_FILE" ]; then
    cp "$CONTEXT_FILE" "$BACKUP_FILE"
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get project path
PROJECT_PATH=$(pwd)

if [ -f "$CONTEXT_FILE" ]; then
    # Update existing context with new metadata
    jq --arg ts "$TIMESTAMP" \\
       --arg sid "$SESSION_ID" \\
       --arg trigger "$TRIGGER" \\
       '.meta.saved_at = $ts | .meta.session_id = $sid | .meta.last_trigger = $trigger' \\
       "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
else
    # Create new context file
    cat > "$CONTEXT_FILE" << EOF
{
  "meta": {
    "version": "2.0",
    "saved_at": "$TIMESTAMP",
    "session_id": "$SESSION_ID",
    "project": "$PROJECT_PATH",
    "last_trigger": "$TRIGGER"
  },
  "goal": { "original_request": "", "current_objective": "" },
  "progress": { "done": [], "current": [], "pending": [] },
  "decisions": [],
  "discoveries": [],
  "state": { "recent_files": [], "blockers": [], "errors": [] }
}
EOF
fi

echo "[SESSION CONTEXT] Saved at $TIMESTAMP (trigger: $TRIGGER)" >&2
exit 0
`;
const LOAD_SCRIPT = `#!/bin/bash
# Session Context System v2 - Load Script
# Called by SessionStart hook to restore context
# stdout is automatically injected into Claude's context

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$CLAUDE_DIR/session-context.json"

# Read input from stdin
INPUT=$(cat)

if [ ! -f "$CONTEXT_FILE" ]; then
    exit 0
fi

# Check if context is recent (within 24 hours)
SAVED_AT=$(jq -r '.meta.saved_at // ""' "$CONTEXT_FILE")
if [ -n "$SAVED_AT" ]; then
    # Cross-platform date handling
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SAVED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$SAVED_AT" +%s 2>/dev/null || echo "0")
    else
        SAVED_EPOCH=$(date -d "$SAVED_AT" +%s 2>/dev/null || echo "0")
    fi
    NOW_EPOCH=$(date +%s)
    AGE_HOURS=$(( (NOW_EPOCH - SAVED_EPOCH) / 3600 ))

    if [ "$AGE_HOURS" -gt 24 ]; then
        exit 0
    fi
fi

# Format and output (stdout goes to Claude's context)
echo "=== SESSION CONTEXT RESTORED ==="
echo ""

# Goal
ORIGINAL=$(jq -r '.goal.original_request // ""' "$CONTEXT_FILE")
OBJECTIVE=$(jq -r '.goal.current_objective // ""' "$CONTEXT_FILE")
if [ -n "$ORIGINAL" ] || [ -n "$OBJECTIVE" ]; then
    echo "## Goal"
    [ -n "$ORIGINAL" ] && echo "- Original request: $ORIGINAL"
    [ -n "$OBJECTIVE" ] && echo "- Current objective: $OBJECTIVE"
    echo ""
fi

# Progress
DONE=$(jq -r '.progress.done | if length > 0 then map("- " + .) | join("\\n") else empty end' "$CONTEXT_FILE")
CURRENT=$(jq -r '.progress.current | if length > 0 then map("- " + .) | join("\\n") else empty end' "$CONTEXT_FILE")
PENDING=$(jq -r '.progress.pending | if length > 0 then map("- " + .) | join("\\n") else empty end' "$CONTEXT_FILE")
if [ -n "$DONE" ] || [ -n "$CURRENT" ] || [ -n "$PENDING" ]; then
    echo "## Progress"
    [ -n "$DONE" ] && echo "Done:" && echo -e "$DONE"
    [ -n "$CURRENT" ] && echo "Current:" && echo -e "$CURRENT"
    [ -n "$PENDING" ] && echo "Pending:" && echo -e "$PENDING"
    echo ""
fi

# Decisions (last 3)
DECISIONS=$(jq -r '.decisions | if length > 0 then .[-3:] | map("- " + .what + ": " + .why) | join("\\n") else empty end' "$CONTEXT_FILE")
if [ -n "$DECISIONS" ]; then
    echo "## Recent Decisions"
    echo -e "$DECISIONS"
    echo ""
fi

# Discoveries (last 5)
DISCOVERIES=$(jq -r '.discoveries | if length > 0 then .[-5:] | map("- " + .file + ": " + .insight) | join("\\n") else empty end' "$CONTEXT_FILE")
if [ -n "$DISCOVERIES" ]; then
    echo "## Recent Discoveries"
    echo -e "$DISCOVERIES"
    echo ""
fi

# State
RECENT_FILES=$(jq -r '.state.recent_files | if length > 0 then join(", ") else empty end' "$CONTEXT_FILE")
BLOCKERS=$(jq -r '.state.blockers | if length > 0 then map("- " + .) | join("\\n") else empty end' "$CONTEXT_FILE")
if [ -n "$RECENT_FILES" ] || [ -n "$BLOCKERS" ]; then
    echo "## State"
    [ -n "$RECENT_FILES" ] && echo "Recent files: $RECENT_FILES"
    [ -n "$BLOCKERS" ] && echo "Blockers:" && echo -e "$BLOCKERS"
    echo ""
fi

echo "=== END SESSION CONTEXT ==="
exit 0
`;
const HOOKS_CONFIG = {
    hooks: {
        PreCompact: [
            {
                matcher: { type: "auto" },
                hooks: [{ type: "command", command: ".claude/scripts/save-context.sh" }],
            },
            {
                matcher: { type: "manual" },
                hooks: [{ type: "command", command: ".claude/scripts/save-context.sh" }],
            },
        ],
        SessionStart: [
            {
                matcher: { type: "compact" },
                hooks: [{ type: "command", command: ".claude/scripts/load-context.sh" }],
            },
            {
                matcher: { type: "startup" },
                hooks: [{ type: "command", command: ".claude/scripts/load-context.sh" }],
            },
            {
                matcher: { type: "resume" },
                hooks: [{ type: "command", command: ".claude/scripts/load-context.sh" }],
            },
        ],
        Stop: [
            {
                matcher: {},
                hooks: [{ type: "command", command: ".claude/scripts/save-context.sh" }],
            },
        ],
    },
};
function printUsage() {
    console.log(`
session-context-mcp - Preserve conversation context across Claude Code compactions

Usage:
  session-context-mcp init     Initialize session context in current project
  session-context-mcp status   Check current configuration status
  session-context-mcp help     Show this help message

For MCP server mode, configure in ~/.claude.json:
{
  "mcpServers": {
    "session-context": {
      "command": "npx",
      "args": ["session-context-mcp"]
    }
  }
}
`);
}
function initProject(projectDir) {
    const claudeDir = path.join(projectDir, ".claude");
    const scriptsDir = path.join(claudeDir, "scripts");
    const hooksFile = path.join(claudeDir, "hooks.json");
    console.log("Initializing Session Context System...\n");
    // Create directories
    if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
        console.log("✓ Created .claude/scripts/");
    }
    // Write save script
    const saveScriptPath = path.join(scriptsDir, "save-context.sh");
    fs.writeFileSync(saveScriptPath, SAVE_SCRIPT);
    fs.chmodSync(saveScriptPath, 0o755);
    console.log("✓ Created save-context.sh");
    // Write load script
    const loadScriptPath = path.join(scriptsDir, "load-context.sh");
    fs.writeFileSync(loadScriptPath, LOAD_SCRIPT);
    fs.chmodSync(loadScriptPath, 0o755);
    console.log("✓ Created load-context.sh");
    // Handle hooks.json
    if (fs.existsSync(hooksFile)) {
        console.log("\n⚠ hooks.json already exists.");
        console.log("  Please manually merge the following configuration:\n");
        console.log(JSON.stringify(HOOKS_CONFIG, null, 2));
        console.log("\n  Or backup and overwrite with: session-context-mcp init --force");
    }
    else {
        fs.writeFileSync(hooksFile, JSON.stringify(HOOKS_CONFIG, null, 2));
        console.log("✓ Created hooks.json");
    }
    console.log("\n✅ Session Context System initialized!");
    console.log("\nHow it works:");
    console.log("  • PreCompact hook saves context before compression");
    console.log("  • SessionStart hook restores context automatically");
    console.log("  • Use MCP tools for manual save/load/update");
    console.log("\nMCP tools available:");
    console.log("  • save_session_context - Save current context");
    console.log("  • load_session_context - Load saved context");
    console.log("  • update_session_context - Update specific fields");
    console.log("  • clear_session_context - Start fresh");
}
function checkStatus(projectDir) {
    const claudeDir = path.join(projectDir, ".claude");
    const scriptsDir = path.join(claudeDir, "scripts");
    const hooksFile = path.join(claudeDir, "hooks.json");
    const contextFile = path.join(claudeDir, "session-context.json");
    console.log("Session Context System Status\n");
    // Check scripts
    const saveExists = fs.existsSync(path.join(scriptsDir, "save-context.sh"));
    const loadExists = fs.existsSync(path.join(scriptsDir, "load-context.sh"));
    console.log(`Scripts:`);
    console.log(`  save-context.sh: ${saveExists ? "✓" : "✗"}`);
    console.log(`  load-context.sh: ${loadExists ? "✓" : "✗"}`);
    // Check hooks
    const hooksExists = fs.existsSync(hooksFile);
    console.log(`\nHooks:`);
    console.log(`  hooks.json: ${hooksExists ? "✓" : "✗"}`);
    if (hooksExists) {
        try {
            const hooks = JSON.parse(fs.readFileSync(hooksFile, "utf-8"));
            const hasPreCompact = !!hooks.hooks?.PreCompact;
            const hasSessionStart = !!hooks.hooks?.SessionStart;
            console.log(`  PreCompact hook: ${hasPreCompact ? "✓" : "✗"}`);
            console.log(`  SessionStart hook: ${hasSessionStart ? "✓" : "✗"}`);
        }
        catch {
            console.log(`  (invalid JSON)`);
        }
    }
    // Check context
    console.log(`\nContext:`);
    if (fs.existsSync(contextFile)) {
        try {
            const context = JSON.parse(fs.readFileSync(contextFile, "utf-8"));
            console.log(`  session-context.json: ✓`);
            console.log(`  Last saved: ${context.meta?.saved_at || "unknown"}`);
            console.log(`  Trigger: ${context.meta?.last_trigger || "unknown"}`);
        }
        catch {
            console.log(`  session-context.json: ✗ (invalid JSON)`);
        }
    }
    else {
        console.log(`  session-context.json: (not created yet)`);
    }
    // Overall status
    const isConfigured = saveExists && loadExists && hooksExists;
    console.log(`\nOverall: ${isConfigured ? "✅ Configured" : "⚠ Not fully configured"}`);
    if (!isConfigured) {
        console.log(`Run 'npx session-context-mcp init' to set up.`);
    }
}
// Main
const args = process.argv.slice(2);
const command = args[0];
const projectDir = process.cwd();
switch (command) {
    case "init":
        initProject(projectDir);
        break;
    case "status":
        checkStatus(projectDir);
        break;
    case "help":
    case "--help":
    case "-h":
        printUsage();
        break;
    case undefined:
        // No command - run as MCP server
        import("./index.js");
        break;
    default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
}
//# sourceMappingURL=cli.js.map