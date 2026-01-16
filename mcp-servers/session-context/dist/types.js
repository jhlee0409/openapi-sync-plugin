"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT = exports.CONTEXT_LIMITS = void 0;
exports.isValidGoal = isValidGoal;
exports.isValidProgress = isValidProgress;
exports.isValidTodoItem = isValidTodoItem;
exports.isValidDecision = isValidDecision;
exports.isValidDiscovery = isValidDiscovery;
exports.isValidState = isValidState;
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
    }
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