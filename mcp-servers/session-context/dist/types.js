"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT = exports.CONTEXT_LIMITS = void 0;
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
    decisions: [],
    discoveries: [],
    state: {
        recent_files: [],
        blockers: [],
        errors: []
    }
};
//# sourceMappingURL=types.js.map