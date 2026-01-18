#!/bin/bash
# Session Context System v2 - Load Script
# Called by SessionStart hook to restore context after compression
# stdout is automatically injected into Claude's context

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$CLAUDE_DIR/session-context.json"

# Read input from stdin (hook provides JSON input)
INPUT=$(cat)

# Extract trigger type
TRIGGER=$(echo "$INPUT" | jq -r '.trigger // "unknown"')

# Check if context file exists
if [ ! -f "$CONTEXT_FILE" ]; then
    # No previous context - silent exit
    exit 0
fi

# Check if context is recent (within 24 hours)
SAVED_AT=$(jq -r '.meta.saved_at // ""' "$CONTEXT_FILE")
if [ -n "$SAVED_AT" ]; then
    SAVED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$SAVED_AT" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    AGE_HOURS=$(( (NOW_EPOCH - SAVED_EPOCH) / 3600 ))

    if [ "$AGE_HOURS" -gt 24 ]; then
        # Context too old - skip
        exit 0
    fi
fi

# Format context for Claude (stdout will be injected into context)
echo "=== SESSION CONTEXT RESTORED ==="
echo ""

# Goal
ORIGINAL_REQUEST=$(jq -r '.goal.original_request // ""' "$CONTEXT_FILE")
CURRENT_OBJECTIVE=$(jq -r '.goal.current_objective // ""' "$CONTEXT_FILE")

if [ -n "$ORIGINAL_REQUEST" ] || [ -n "$CURRENT_OBJECTIVE" ]; then
    echo "## Goal"
    [ -n "$ORIGINAL_REQUEST" ] && echo "- Original request: $ORIGINAL_REQUEST"
    [ -n "$CURRENT_OBJECTIVE" ] && echo "- Current objective: $CURRENT_OBJECTIVE"
    echo ""
fi

# Progress
DONE=$(jq -r '.progress.done | if length > 0 then map("- " + .) | join("\n") else empty end' "$CONTEXT_FILE")
CURRENT=$(jq -r '.progress.current | if length > 0 then map("- " + .) | join("\n") else empty end' "$CONTEXT_FILE")
PENDING=$(jq -r '.progress.pending | if length > 0 then map("- " + .) | join("\n") else empty end' "$CONTEXT_FILE")

if [ -n "$DONE" ] || [ -n "$CURRENT" ] || [ -n "$PENDING" ]; then
    echo "## Progress"
    [ -n "$DONE" ] && echo "Done:" && echo "$DONE"
    [ -n "$CURRENT" ] && echo "Current:" && echo "$CURRENT"
    [ -n "$PENDING" ] && echo "Pending:" && echo "$PENDING"
    echo ""
fi

# Decisions (last 3)
DECISIONS=$(jq -r '.decisions | if length > 0 then .[-3:] | map("- \(.what): \(.why)") | join("\n") else empty end' "$CONTEXT_FILE")

if [ -n "$DECISIONS" ]; then
    echo "## Recent Decisions"
    echo "$DECISIONS"
    echo ""
fi

# Discoveries (last 5)
DISCOVERIES=$(jq -r '.discoveries | if length > 0 then .[-5:] | map("- \(.file): \(.insight)") | join("\n") else empty end' "$CONTEXT_FILE")

if [ -n "$DISCOVERIES" ]; then
    echo "## Recent Discoveries"
    echo "$DISCOVERIES"
    echo ""
fi

# State
RECENT_FILES=$(jq -r '.state.recent_files | if length > 0 then join(", ") else empty end' "$CONTEXT_FILE")
BLOCKERS=$(jq -r '.state.blockers | if length > 0 then map("- " + .) | join("\n") else empty end' "$CONTEXT_FILE")

if [ -n "$RECENT_FILES" ] || [ -n "$BLOCKERS" ]; then
    echo "## State"
    [ -n "$RECENT_FILES" ] && echo "Recent files: $RECENT_FILES"
    [ -n "$BLOCKERS" ] && echo "Blockers:" && echo "$BLOCKERS"
    echo ""
fi

echo "=== END SESSION CONTEXT ==="

exit 0
