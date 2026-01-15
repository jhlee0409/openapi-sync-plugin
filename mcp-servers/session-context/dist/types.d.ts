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
export interface TodoItem {
    content: string;
    status: "pending" | "in_progress" | "completed";
    activeForm: string;
}
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
    last_tool_calls?: string[];
}
export interface SessionContext {
    meta: SessionContextMeta;
    goal: SessionContextGoal;
    progress: SessionContextProgress;
    tasks?: SessionContextTasks;
    decisions: SessionContextDecision[];
    discoveries: SessionContextDiscovery[];
    state: SessionContextState;
}
export declare const CONTEXT_LIMITS: {
    MAX_DECISIONS: number;
    MAX_DISCOVERIES: number;
    MAX_DONE_TASKS: number;
    MAX_RECENT_FILES: number;
    MAX_BLOCKERS: number;
    MAX_ERRORS: number;
    MAX_TOOL_CALLS: number;
    MAX_TODOS: number;
};
export declare const DEFAULT_CONTEXT: SessionContext;
//# sourceMappingURL=types.d.ts.map