#!/bin/bash
# Session Context System v2 - Save Script
# Called by PreCompact hook to save context before compression

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$CLAUDE_DIR/session-context.json"
BACKUP_FILE="$CLAUDE_DIR/session-context.json.bak"

# Read input from stdin (hook provides JSON input)
INPUT=$(cat)

# Extract session info from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
TRIGGER=$(echo "$INPUT" | jq -r '.trigger // "unknown"')

# Create backup if context file exists
if [ -f "$CONTEXT_FILE" ]; then
    cp "$CONTEXT_FILE" "$BACKUP_FILE"
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get project path (current working directory)
PROJECT_PATH=$(pwd)

# Create or update context file
# Note: Actual context (goal, progress, decisions, etc.) should be
# populated by Claude via /save-context command
# This hook ensures we have a timestamp and session info

if [ -f "$CONTEXT_FILE" ]; then
    # Update existing context with new metadata
    jq --arg ts "$TIMESTAMP" \
       --arg sid "$SESSION_ID" \
       --arg trigger "$TRIGGER" \
       '.meta.saved_at = $ts | .meta.session_id = $sid | .meta.last_trigger = $trigger' \
       "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
else
    # Create new context file with default structure
    cat > "$CONTEXT_FILE" << EOF
{
  "meta": {
    "version": "2.0",
    "saved_at": "$TIMESTAMP",
    "session_id": "$SESSION_ID",
    "project": "$PROJECT_PATH",
    "last_trigger": "$TRIGGER"
  },
  "goal": {
    "original_request": "",
    "current_objective": ""
  },
  "progress": {
    "done": [],
    "current": [],
    "pending": []
  },
  "decisions": [],
  "discoveries": [],
  "state": {
    "recent_files": [],
    "blockers": [],
    "errors": []
  }
}
EOF
fi

# Log to stderr (visible in verbose mode)
echo "[SESSION CONTEXT] Saved at $TIMESTAMP (trigger: $TRIGGER)" >&2

exit 0
