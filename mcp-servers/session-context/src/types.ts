export interface SessionContextMeta {
  version: string;
  saved_at: string;
  session_id: string;
  project: string;
  last_trigger: string;
}

export interface SessionContextGoal {
  original_request: string;
  current_objective: string;
}

export interface SessionContextProgress {
  done: string[];
  current: string[];
  pending: string[];
}

// TodoWrite-compatible task structure for "Task-first" differentiation
export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

// Extended task tracking with full TodoWrite compatibility
export interface SessionContextTasks {
  todos: TodoItem[];
  last_synced?: string;
}

export interface SessionContextDecision {
  what: string;
  why: string;
  rejected?: string[];
}

export interface SessionContextDiscovery {
  file: string;
  insight: string;
  timestamp?: string;
}

export interface SessionContextState {
  recent_files: string[];
  blockers: string[];
  errors: string[];
  last_tool_calls?: string[];  // Recent tool calls for context
}

export interface SessionContext {
  meta: SessionContextMeta;
  goal: SessionContextGoal;
  progress: SessionContextProgress;
  tasks?: SessionContextTasks;  // TodoWrite-compatible task list
  decisions: SessionContextDecision[];
  discoveries: SessionContextDiscovery[];
  state: SessionContextState;
}

// Context size limits to prevent unbounded growth
export const CONTEXT_LIMITS = {
  MAX_DECISIONS: 20,
  MAX_DISCOVERIES: 30,
  MAX_DONE_TASKS: 50,
  MAX_RECENT_FILES: 10,
  MAX_BLOCKERS: 10,
  MAX_ERRORS: 10,
  MAX_TOOL_CALLS: 10,
  MAX_TODOS: 30,
};

export const DEFAULT_CONTEXT: SessionContext = {
  meta: {
    version: "2.0",
    saved_at: "",
    session_id: "",
    project: "",
    last_trigger: "manual"
  },
  goal: {
    original_request: "",
    current_objective: ""
  },
  progress: {
    done: [],
    current: [],
    pending: []
  },
  decisions: [],
  discoveries: [],
  state: {
    recent_files: [],
    blockers: [],
    errors: []
  }
};
