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

// Heuristic-based usage tracking for proactive context management
export interface UsageMetrics {
  tool_calls: number;           // Number of MCP tool invocations
  files_read: number;           // Files accessed
  files_modified: number;       // Files changed
  discoveries_count: number;    // Code discoveries made
  decisions_count: number;      // Decisions recorded
  todos_count: number;          // Active todos
  session_start: string;        // When tracking started
  last_updated: string;         // Last metric update
}

export interface UsageStatus {
  metrics: UsageMetrics;
  estimated_load: "low" | "medium" | "high" | "critical";
  load_score: number;           // 0-100
  recommendation: string;
  should_compact: boolean;
}

// Weights for heuristic calculation
export const USAGE_WEIGHTS = {
  TOOL_CALL: 1,
  FILE_READ: 2,
  FILE_MODIFIED: 5,
  DISCOVERY: 3,
  DECISION: 2,
  TODO: 1,
};

// Thresholds for load levels
export const LOAD_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 85,
  CRITICAL: 100,
};

export interface SessionContext {
  meta: SessionContextMeta;
  goal: SessionContextGoal;
  progress: SessionContextProgress;
  tasks?: SessionContextTasks;  // TodoWrite-compatible task list
  decisions: SessionContextDecision[];
  discoveries: SessionContextDiscovery[];
  state: SessionContextState;
  usage?: UsageMetrics;         // Heuristic usage tracking
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

export const DEFAULT_USAGE_METRICS: UsageMetrics = {
  tool_calls: 0,
  files_read: 0,
  files_modified: 0,
  discoveries_count: 0,
  decisions_count: 0,
  todos_count: 0,
  session_start: "",
  last_updated: "",
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
  tasks: {
    todos: [],
    last_synced: undefined
  },
  decisions: [],
  discoveries: [],
  state: {
    recent_files: [],
    blockers: [],
    errors: []
  },
  usage: { ...DEFAULT_USAGE_METRICS }
};

// Runtime validation helpers
export function isValidGoal(obj: unknown): obj is SessionContextGoal {
  if (typeof obj !== 'object' || obj === null) return false;
  const goal = obj as Record<string, unknown>;
  return (
    (typeof goal.original_request === 'string' || goal.original_request === undefined) &&
    (typeof goal.current_objective === 'string' || goal.current_objective === undefined)
  );
}

export function isValidProgress(obj: unknown): obj is SessionContextProgress {
  if (typeof obj !== 'object' || obj === null) return false;
  const progress = obj as Record<string, unknown>;
  return (
    (Array.isArray(progress.done) && progress.done.every(i => typeof i === 'string')) &&
    (Array.isArray(progress.current) && progress.current.every(i => typeof i === 'string')) &&
    (Array.isArray(progress.pending) && progress.pending.every(i => typeof i === 'string'))
  );
}

export function isValidTodoItem(obj: unknown): obj is TodoItem {
  if (typeof obj !== 'object' || obj === null) return false;
  const item = obj as Record<string, unknown>;
  return (
    typeof item.content === 'string' &&
    (item.status === 'pending' || item.status === 'in_progress' || item.status === 'completed') &&
    typeof item.activeForm === 'string'
  );
}

export function isValidDecision(obj: unknown): obj is SessionContextDecision {
  if (typeof obj !== 'object' || obj === null) return false;
  const decision = obj as Record<string, unknown>;
  return (
    typeof decision.what === 'string' &&
    typeof decision.why === 'string'
  );
}

export function isValidDiscovery(obj: unknown): obj is SessionContextDiscovery {
  if (typeof obj !== 'object' || obj === null) return false;
  const discovery = obj as Record<string, unknown>;
  return (
    typeof discovery.file === 'string' &&
    typeof discovery.insight === 'string'
  );
}

export function isValidState(obj: unknown): obj is SessionContextState {
  if (typeof obj !== 'object' || obj === null) return false;
  const state = obj as Record<string, unknown>;
  return (
    Array.isArray(state.recent_files) &&
    Array.isArray(state.blockers) &&
    Array.isArray(state.errors)
  );
}
