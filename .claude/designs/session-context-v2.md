# Session Context System v2

## Overview

Conversation Compaction 시 컨텍스트 손실을 최소화하기 위한 시스템.

## Problem Statement

Claude Code에서 대화가 길어지면 "Conversation compacted"가 발생하여 이전 컨텍스트 일부가 손실됨.
이로 인해:
- 작업 진행 상황 망각
- 중요 결정사항 손실
- 발견한 코드베이스 정보 재탐색 필요

## Design Goals

1. **자동 저장**: 주기적으로 중요 컨텍스트 저장
2. **자동 복원**: 새 대화 시작 시 이전 컨텍스트 로드
3. **최소 침해**: 기존 워크플로우 방해 없음

## Architecture (Verified)

```
┌─────────────────────────────────────────────────────────┐
│           Session Context System v2 (Verified)           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SAVE TRIGGERS (저장)                                    │
│  ─────────────────────                                   │
│  1. PreCompact Hook [auto/manual]                        │
│     → 압축 직전 자동 저장                                │
│     → stdout은 컨텍스트 주입 안 됨 (저장만 가능)          │
│                                                          │
│  2. /save-context 명령어 (수동)                          │
│     → 사용자가 원할 때 저장                              │
│                                                          │
│  STORAGE (저장소)                                        │
│  ─────────────────                                       │
│  Location: .claude/session-context.json                  │
│  Backup: .claude/session-context.json.bak                │
│                                                          │
│  RESTORE TRIGGERS (복원)                                 │
│  ─────────────────────                                   │
│  1. SessionStart Hook [compact] ← **핵심**               │
│     → 압축 후 새 세션 시작 시 자동 실행                   │
│     → stdout이 Claude 컨텍스트에 자동 주입               │
│                                                          │
│  2. SessionStart Hook [startup/resume]                   │
│     → 일반 세션 시작/재개 시 실행                        │
│     → stdout이 Claude 컨텍스트에 자동 주입               │
│                                                          │
│  3. /resume 명령어 (수동)                                │
│     → 사용자가 원할 때 복원                              │
│                                                          │
│  DATA FLOW                                               │
│  ─────────                                               │
│  PreCompact → save to JSON → SessionStart[compact]       │
│            → load from JSON → stdout → Claude context    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Hook Configuration (hooks.json)

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": { "type": "auto" },
        "hooks": [{ "type": "command", "command": ".claude/scripts/save-context.sh" }]
      },
      {
        "matcher": { "type": "manual" },
        "hooks": [{ "type": "command", "command": ".claude/scripts/save-context.sh" }]
      }
    ],
    "SessionStart": [
      {
        "matcher": { "type": "compact" },
        "hooks": [{ "type": "command", "command": ".claude/scripts/load-context.sh" }]
      },
      {
        "matcher": { "type": "startup" },
        "hooks": [{ "type": "command", "command": ".claude/scripts/load-context.sh" }]
      }
    ]
  }
}
```

## Data Schema

```json
{
  "meta": {
    "version": "2.0",
    "saved_at": "2026-01-15T10:30:00Z",
    "session_id": "uuid",
    "project": "/absolute/path/to/project"
  },
  "goal": {
    "original_request": "사용자의 원래 요청",
    "current_objective": "현재 진행 중인 목표"
  },
  "progress": {
    "done": ["완료된 작업 1", "완료된 작업 2"],
    "current": ["현재 진행 중 1", "현재 진행 중 2"],
    "pending": ["대기 중 작업 1"]
  },
  "decisions": [
    {
      "what": "결정 내용",
      "why": "결정 이유",
      "rejected": ["거부된 대안 1", "거부된 대안 2"]
    }
  ],
  "discoveries": [
    {
      "file": "파일 경로",
      "insight": "발견한 내용",
      "timestamp": "발견 시각"
    }
  ],
  "state": {
    "recent_files": ["최근 파일 1", "최근 파일 2"],
    "blockers": ["현재 장애물"],
    "errors": ["최근 에러"]
  }
}
```

## Implementation Plan

### Phase 1: Hook 동작 검증 (선행 조건)

```bash
# 테스트 1: stdout이 컨텍스트에 주입되는지 확인
# .claude/hooks.json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": "echo '[SESSION] Test context injection'"
      }
    ]
  }
}
```

예상 동작:
- Hook stdout이 "[SESSION] Test context injection" 출력
- 이 텍스트가 Claude의 transcript에 표시됨
- 검증 방법: 대화 시작 후 이 텍스트가 보이는지 확인

### Phase 2: 저장 스크립트 구현

```bash
#!/bin/bash
# .claude/scripts/save-context.sh

CONTEXT_FILE=".claude/session-context.json"
BACKUP_FILE=".claude/session-context.json.bak"

# 백업 생성
if [ -f "$CONTEXT_FILE" ]; then
  cp "$CONTEXT_FILE" "$BACKUP_FILE"
fi

# 현재 시간
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# JSON 생성 (jq 사용)
# 실제 구현에서는 Claude가 이 스크립트를 호출할 때
# 환경변수나 stdin으로 데이터 전달
```

### Phase 3: 복원 스크립트 구현

```bash
#!/bin/bash
# .claude/scripts/load-context.sh

CONTEXT_FILE=".claude/session-context.json"

if [ -f "$CONTEXT_FILE" ]; then
  cat "$CONTEXT_FILE"
else
  echo '{"status": "no_previous_session"}'
fi
```

### Phase 4: Hook 설정

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": ".claude/scripts/load-context.sh",
        "condition": "first_prompt"
      }
    ],
    "PreCompact": [
      {
        "command": ".claude/scripts/save-context.sh"
      }
    ]
  }
}
```

## Confirmed Facts (검증 완료)

### 1. stdout 컨텍스트 주입: **확인됨**
> "Exit code 0: Success... except for UserPromptSubmit and SessionStart, where stdout is added to the context."

- **UserPromptSubmit**: stdout이 자동으로 Claude 컨텍스트에 추가됨
- **SessionStart**: stdout이 자동으로 Claude 컨텍스트에 추가됨
- JSON 형식도 지원: `hookSpecificOutput.additionalContext`

### 2. PreCompact Hook: **존재 확인됨**
> "PreCompact: Runs before Claude Code is about to run a compact operation."

- Matchers: `manual` (수동), `auto` (자동)
- **주의**: blocking 불가능 - 압축을 막을 수는 없고 로깅만 가능
- 저장은 가능하지만 사용자 개입은 불가

### 3. SessionStart Hook: **더 나은 대안 발견**
- Matchers: `startup`, `resume`, `clear`, `compact`
- `compact` matcher: 압축 후 새 세션 시작 시 실행
- **stdout이 컨텍스트에 주입됨** - 복원에 최적!

## Open Questions (미해결)

1. **SessionStart compact matcher 동작**: 압축 직후 자동 실행되는지 확인 필요

## Alternatives Considered

### Alt 1: Serena MCP Memory 사용
- 장점: 이미 구현되어 있음
- 단점: Hook에서 MCP 직접 호출 불가

### Alt 2: CLAUDE.md 동적 수정
- 장점: 항상 로드됨
- 단점: 현재 대화에 즉시 반영 안됨

### Alt 3: 순수 파일 기반
- 장점: 단순함, Hook에서 접근 가능
- 단점: 복원 시 명시적 명령 필요

**선택: Alt 3 (순수 파일 기반)** - Hook 제약 내에서 가장 실현 가능

## Success Criteria

- [ ] Hook stdout이 transcript에 표시됨
- [ ] PreCompact hook이 압축 전 실행됨
- [ ] session-context.json이 정상 저장됨
- [ ] /resume 명령으로 컨텍스트 복원 가능
- [ ] 압축 후에도 핵심 정보 유지

## Version History

- v2.0 (2026-01-15): 초기 설계 문서 작성
