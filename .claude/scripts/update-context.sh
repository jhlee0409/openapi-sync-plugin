#!/bin/bash
# Session Context System v2 - Update Script
# Called manually to update context with current state
# Usage: echo '{"goal": "...", "progress": {...}}' | ./update-context.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$CLAUDE_DIR/session-context.json"

# Read JSON input from stdin
INPUT=$(cat)

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# If context file doesn't exist, create it
if [ ! -f "$CONTEXT_FILE" ]; then
    PROJECT_PATH=$(pwd)
    cat > "$CONTEXT_FILE" << EOF
{
  "meta": {
    "version": "2.0",
    "saved_at": "$TIMESTAMP",
    "session_id": "manual",
    "project": "$PROJECT_PATH",
    "last_trigger": "manual"
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

# Merge input with existing context
# Input can contain any subset of fields to update
jq -s --arg ts "$TIMESTAMP" '
  .[0] * .[1] |
  .meta.saved_at = $ts |
  .meta.last_trigger = "manual"
' "$CONTEXT_FILE" <(echo "$INPUT") > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"

echo "Context updated at $TIMESTAMP"
cat "$CONTEXT_FILE" | jq '.meta'

exit 0
