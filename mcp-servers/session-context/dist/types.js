"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT = exports.DEFAULT_USAGE_METRICS = exports.CONTEXT_LIMITS = exports.LOAD_THRESHOLDS = exports.USAGE_WEIGHTS = void 0;
exports.isValidGoal = isValidGoal;
exports.isValidProgress = isValidProgress;
exports.isValidTodoItem = isValidTodoItem;
exports.isValidDecision = isValidDecision;
exports.isValidDiscovery = isValidDiscovery;
exports.isValidState = isValidState;
// Weights for heuristic calculation
exports.USAGE_WEIGHTS = {
    TOOL_CALL: 1,
    FILE_READ: 2,
    FILE_MODIFIED: 5,
    DISCOVERY: 3,
    DECISION: 2,
    TODO: 1,
};
// Thresholds for load levels
exports.LOAD_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 85,
    CRITICAL: 100,
};
// Context size limits to prevent unbounded growth
exports.CONTEXT_LIMITS = {
    MAX_DECISIONS: 20,
    MAX_DISCOVERIES: 30,
    MAX_DONE_TASKS: 50,
    MAX_RECENT_FILES: 10,
    MAX_BLOCKERS: 10,
    MAX_ERRORS: 10,
    MAX_TOOL_CALLS: 10,
    MAX_TODOS: 30,
};
exports.DEFAULT_USAGE_METRICS = {
    tool_calls: 0,
    files_read: 0,
    files_modified: 0,
    discoveries_count: 0,
    decisions_count: 0,
    todos_count: 0,
    session_start: "",
    last_updated: "",
};
exports.DEFAULT_CONTEXT = {
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
    usage: { ...exports.DEFAULT_USAGE_METRICS }
};
// Runtime validation helpers
function isValidGoal(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const goal = obj;
    return ((typeof goal.original_request === 'string' || goal.original_request === undefined) &&
        (typeof goal.current_objective === 'string' || goal.current_objective === undefined));
}
function isValidProgress(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const progress = obj;
    return ((Array.isArray(progress.done) && progress.done.every(i => typeof i === 'string')) &&
        (Array.isArray(progress.current) && progress.current.every(i => typeof i === 'string')) &&
        (Array.isArray(progress.pending) && progress.pending.every(i => typeof i === 'string')));
}
function isValidTodoItem(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const item = obj;
    return (typeof item.content === 'string' &&
        (item.status === 'pending' || item.status === 'in_progress' || item.status === 'completed') &&
        typeof item.activeForm === 'string');
}
function isValidDecision(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const decision = obj;
    return (typeof decision.what === 'string' &&
        typeof decision.why === 'string');
}
function isValidDiscovery(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const discovery = obj;
    return (typeof discovery.file === 'string' &&
        typeof discovery.insight === 'string');
}
function isValidState(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const state = obj;
    return (Array.isArray(state.recent_files) &&
        Array.isArray(state.blockers) &&
        Array.isArray(state.errors));
}
//# sourceMappingURL=types.js.map