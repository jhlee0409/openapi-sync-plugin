"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_js_1 = require("./types.js");
class ContextManager {
    contextPath;
    backupPath;
    constructor(projectDir) {
        const claudeDir = path.join(projectDir, ".claude");
        this.contextPath = path.join(claudeDir, "session-context.json");
        this.backupPath = path.join(claudeDir, "session-context.json.bak");
    }
    exists() {
        return fs.existsSync(this.contextPath);
    }
    load() {
        if (!this.exists()) {
            return null;
        }
        try {
            const content = fs.readFileSync(this.contextPath, "utf-8");
            return JSON.parse(content);
        }
        catch (error) {
            // Try backup
            if (fs.existsSync(this.backupPath)) {
                try {
                    const backup = fs.readFileSync(this.backupPath, "utf-8");
                    return JSON.parse(backup);
                }
                catch {
                    return null;
                }
            }
            return null;
        }
    }
    save(context) {
        const dir = path.dirname(this.contextPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Create backup if exists
        if (this.exists()) {
            fs.copyFileSync(this.contextPath, this.backupPath);
        }
        // Apply size limits to prevent unbounded growth
        context = this.applyLimits(context);
        // Update metadata
        context.meta.saved_at = new Date().toISOString();
        context.meta.version = "2.0";
        fs.writeFileSync(this.contextPath, JSON.stringify(context, null, 2));
    }
    applyLimits(context) {
        // Keep only the most recent items within limits
        return {
            ...context,
            decisions: context.decisions.slice(-types_js_1.CONTEXT_LIMITS.MAX_DECISIONS),
            discoveries: context.discoveries.slice(-types_js_1.CONTEXT_LIMITS.MAX_DISCOVERIES),
            progress: {
                ...context.progress,
                done: context.progress.done.slice(-types_js_1.CONTEXT_LIMITS.MAX_DONE_TASKS),
            },
            state: {
                ...context.state,
                recent_files: context.state.recent_files.slice(-types_js_1.CONTEXT_LIMITS.MAX_RECENT_FILES),
                blockers: context.state.blockers.slice(-types_js_1.CONTEXT_LIMITS.MAX_BLOCKERS),
                errors: context.state.errors.slice(-types_js_1.CONTEXT_LIMITS.MAX_ERRORS),
                last_tool_calls: context.state.last_tool_calls?.slice(-types_js_1.CONTEXT_LIMITS.MAX_TOOL_CALLS),
            },
        };
    }
    update(partial) {
        const current = this.load() || { ...types_js_1.DEFAULT_CONTEXT };
        const merged = this.deepMerge(current, partial);
        this.save(merged);
        return merged;
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] === null || source[key] === undefined) {
                continue;
            }
            if (Array.isArray(source[key])) {
                result[key] = source[key];
            }
            else if (typeof source[key] === "object") {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    formatForDisplay(context) {
        const lines = ["=== SESSION CONTEXT RESTORED ===", ""];
        // Goal
        if (context.goal.original_request || context.goal.current_objective) {
            lines.push("## Goal");
            if (context.goal.original_request) {
                lines.push(`- Original request: ${context.goal.original_request}`);
            }
            if (context.goal.current_objective) {
                lines.push(`- Current objective: ${context.goal.current_objective}`);
            }
            lines.push("");
        }
        // Progress
        const { done, current, pending } = context.progress;
        if (done.length || current.length || pending.length) {
            lines.push("## Progress");
            if (done.length) {
                lines.push("Done:");
                done.forEach(item => lines.push(`- ${item}`));
            }
            if (current.length) {
                lines.push("Current:");
                current.forEach(item => lines.push(`- ${item}`));
            }
            if (pending.length) {
                lines.push("Pending:");
                pending.forEach(item => lines.push(`- ${item}`));
            }
            lines.push("");
        }
        // Decisions (last 3)
        if (context.decisions.length) {
            lines.push("## Recent Decisions");
            context.decisions.slice(-3).forEach(d => {
                lines.push(`- ${d.what}: ${d.why}`);
            });
            lines.push("");
        }
        // Discoveries (last 5)
        if (context.discoveries.length) {
            lines.push("## Recent Discoveries");
            context.discoveries.slice(-5).forEach(d => {
                lines.push(`- ${d.file}: ${d.insight}`);
            });
            lines.push("");
        }
        // Tasks (TodoWrite sync) - KEY DIFFERENTIATOR
        if (context.tasks?.todos?.length) {
            lines.push("## 📋 Saved Tasks (TodoWrite)");
            const inProgress = context.tasks.todos.filter(t => t.status === "in_progress");
            const pending = context.tasks.todos.filter(t => t.status === "pending");
            const completed = context.tasks.todos.filter(t => t.status === "completed");
            if (inProgress.length) {
                lines.push("In Progress:");
                inProgress.forEach(t => lines.push(`- 🔄 ${t.content}`));
            }
            if (pending.length) {
                lines.push("Pending:");
                pending.forEach(t => lines.push(`- ⏳ ${t.content}`));
            }
            if (completed.length) {
                lines.push(`Completed: ${completed.length} tasks`);
            }
            if (context.tasks.last_synced) {
                lines.push(`(synced at ${context.tasks.last_synced})`);
            }
            lines.push("");
        }
        // State
        if (context.state.recent_files.length || context.state.blockers.length) {
            lines.push("## State");
            if (context.state.recent_files.length) {
                lines.push(`Recent files: ${context.state.recent_files.join(", ")}`);
            }
            if (context.state.blockers.length) {
                lines.push("Blockers:");
                context.state.blockers.forEach(b => lines.push(`- ${b}`));
            }
            lines.push("");
        }
        lines.push("=== END SESSION CONTEXT ===");
        return lines.join("\n");
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=context-manager.js.map