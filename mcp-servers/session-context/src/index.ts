#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ContextManager } from "./context-manager.js";
import {
  SessionContext,
  DEFAULT_CONTEXT,
  TodoItem,
  CONTEXT_LIMITS,
  isValidGoal,
  isValidProgress,
  isValidDecision,
  isValidDiscovery,
  isValidState,
  isValidTodoItem
} from "./types.js";

const server = new Server(
  {
    name: "session-context-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Get project directory from environment or current directory
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const contextManager = new ContextManager(projectDir);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_session_context",
        description:
          "Save the current session context to preserve it across conversation compactions. Call this before important work might be lost.",
        inputSchema: {
          type: "object",
          properties: {
            goal: {
              type: "object",
              description: "Current goal information",
              properties: {
                original_request: { type: "string" },
                current_objective: { type: "string" },
              },
            },
            progress: {
              type: "object",
              description: "Task progress tracking",
              properties: {
                done: { type: "array", items: { type: "string" } },
                current: { type: "array", items: { type: "string" } },
                pending: { type: "array", items: { type: "string" } },
              },
            },
            decisions: {
              type: "array",
              description: "Important decisions made",
              items: {
                type: "object",
                properties: {
                  what: { type: "string" },
                  why: { type: "string" },
                  rejected: { type: "array", items: { type: "string" } },
                },
              },
            },
            discoveries: {
              type: "array",
              description: "Important discoveries about the codebase",
              items: {
                type: "object",
                properties: {
                  file: { type: "string" },
                  insight: { type: "string" },
                },
              },
            },
            state: {
              type: "object",
              description: "Current working state",
              properties: {
                recent_files: { type: "array", items: { type: "string" } },
                blockers: { type: "array", items: { type: "string" } },
                errors: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      {
        name: "load_session_context",
        description:
          "Load the previously saved session context. Use this to restore context after a conversation compaction or when resuming work.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Output format (default: markdown)",
            },
          },
        },
      },
      {
        name: "update_session_context",
        description:
          "Update specific fields in the session context without overwriting everything.",
        inputSchema: {
          type: "object",
          properties: {
            add_done: {
              type: "array",
              items: { type: "string" },
              description: "Tasks to add to done list",
            },
            set_current: {
              type: "array",
              items: { type: "string" },
              description: "Set current tasks (replaces existing)",
            },
            add_pending: {
              type: "array",
              items: { type: "string" },
              description: "Tasks to add to pending list",
            },
            add_decision: {
              type: "object",
              properties: {
                what: { type: "string" },
                why: { type: "string" },
              },
              description: "Add a new decision",
            },
            add_discovery: {
              type: "object",
              properties: {
                file: { type: "string" },
                insight: { type: "string" },
              },
              description: "Add a new discovery",
            },
            set_objective: {
              type: "string",
              description: "Update current objective",
            },
            add_blocker: {
              type: "string",
              description: "Add a blocker",
            },
            remove_blocker: {
              type: "string",
              description: "Remove a blocker",
            },
            add_tool_calls: {
              type: "array",
              items: { type: "string" },
              description: "Add recent tool calls for context",
            },
          },
        },
      },
      {
        name: "clear_session_context",
        description:
          "Clear the session context. Use when starting fresh on a new task.",
        inputSchema: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean",
              description: "Must be true to confirm clearing",
            },
          },
          required: ["confirm"],
        },
      },
      {
        name: "sync_todos",
        description:
          "Sync your current TodoWrite list to session context. Call this to preserve your todo list across compactions. This is the KEY differentiator - 'Task-first' context preservation.",
        inputSchema: {
          type: "object",
          properties: {
            todos: {
              type: "array",
              description: "Current todo list from TodoWrite (copy the entire todos array)",
              items: {
                type: "object",
                properties: {
                  content: { type: "string", description: "Task description" },
                  status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed"],
                    description: "Task status"
                  },
                  activeForm: { type: "string", description: "Active form of the task" },
                },
                required: ["content", "status", "activeForm"],
              },
            },
          },
          required: ["todos"],
        },
      },
      {
        name: "resume_tasks",
        description:
          "Get the saved todo list to resume where you left off. Returns TodoWrite-compatible format that you can use to restore your task list. Use this after compaction to continue your work seamlessly.",
        inputSchema: {
          type: "object",
          properties: {
            auto_restore: {
              type: "boolean",
              description: "If true, returns instructions to call TodoWrite with the saved todos",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "save_session_context": {
      const context: Partial<SessionContext> = {
        meta: {
          ...DEFAULT_CONTEXT.meta,
          session_id: `manual-${Date.now()}`,
          project: projectDir,
          last_trigger: "manual",
        },
      };

      // Validate and set fields with runtime type checking
      if (args?.goal) {
        if (!isValidGoal(args.goal)) {
          return {
            content: [{ type: "text", text: "Error: Invalid goal format" }],
            isError: true,
          };
        }
        context.goal = args.goal;
      }
      if (args?.progress) {
        if (!isValidProgress(args.progress)) {
          return {
            content: [{ type: "text", text: "Error: Invalid progress format" }],
            isError: true,
          };
        }
        context.progress = args.progress;
      }
      if (args?.decisions) {
        if (!Array.isArray(args.decisions) || !args.decisions.every(isValidDecision)) {
          return {
            content: [{ type: "text", text: "Error: Invalid decisions format" }],
            isError: true,
          };
        }
        context.decisions = args.decisions;
      }
      if (args?.discoveries) {
        if (!Array.isArray(args.discoveries) || !args.discoveries.every(isValidDiscovery)) {
          return {
            content: [{ type: "text", text: "Error: Invalid discoveries format" }],
            isError: true,
          };
        }
        context.discoveries = args.discoveries;
      }
      if (args?.state) {
        if (!isValidState(args.state)) {
          return {
            content: [{ type: "text", text: "Error: Invalid state format" }],
            isError: true,
          };
        }
        context.state = args.state;
      }

      const saved = contextManager.update(context);
      return {
        content: [
          {
            type: "text",
            text: `Session context saved at ${saved.meta.saved_at}`,
          },
        ],
      };
    }

    case "load_session_context": {
      const context = contextManager.load();
      if (!context) {
        return {
          content: [
            {
              type: "text",
              text: "No session context found. Start fresh or use save_session_context to create one.",
            },
          ],
        };
      }

      const format = (args?.format as string) || "markdown";
      const output =
        format === "json"
          ? JSON.stringify(context, null, 2)
          : contextManager.formatForDisplay(context);

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    }

    case "update_session_context": {
      const current = contextManager.load() || { ...DEFAULT_CONTEXT };

      if (args?.add_done) {
        current.progress.done.push(...(args.add_done as string[]));
      }
      if (args?.set_current) {
        current.progress.current = args.set_current as string[];
      }
      if (args?.add_pending) {
        current.progress.pending.push(...(args.add_pending as string[]));
      }
      if (args?.add_decision) {
        current.decisions.push(args.add_decision as SessionContext["decisions"][0]);
      }
      if (args?.add_discovery) {
        const discovery = args.add_discovery as SessionContext["discoveries"][0];
        discovery.timestamp = new Date().toISOString();
        current.discoveries.push(discovery);
      }
      if (args?.set_objective) {
        current.goal.current_objective = args.set_objective as string;
      }
      if (args?.add_blocker) {
        current.state.blockers.push(args.add_blocker as string);
      }
      if (args?.remove_blocker) {
        const toRemove = args.remove_blocker as string;
        current.state.blockers = current.state.blockers.filter(b => b !== toRemove);
      }
      if (args?.add_tool_calls) {
        if (!current.state.last_tool_calls) {
          current.state.last_tool_calls = [];
        }
        current.state.last_tool_calls.push(...(args.add_tool_calls as string[]));
      }

      contextManager.save(current);
      return {
        content: [
          {
            type: "text",
            text: `Session context updated at ${current.meta.saved_at}`,
          },
        ],
      };
    }

    case "clear_session_context": {
      if (!args?.confirm) {
        return {
          content: [
            {
              type: "text",
              text: "Confirmation required. Set confirm: true to clear the session context.",
            },
          ],
        };
      }

      const fresh: SessionContext = {
        ...DEFAULT_CONTEXT,
        meta: {
          ...DEFAULT_CONTEXT.meta,
          saved_at: new Date().toISOString(),
          session_id: `fresh-${Date.now()}`,
          project: projectDir,
          last_trigger: "clear",
        },
      };

      contextManager.save(fresh);
      return {
        content: [
          {
            type: "text",
            text: "Session context cleared.",
          },
        ],
      };
    }

    case "sync_todos": {
      const todos = args?.todos;
      if (!todos || !Array.isArray(todos)) {
        return {
          content: [
            {
              type: "text",
              text: "Error: todos array is required. Pass your current TodoWrite list.",
            },
          ],
          isError: true,
        };
      }

      // Validate each todo item
      if (!todos.every(isValidTodoItem)) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Invalid todo item format. Each item must have content, status, and activeForm.",
            },
          ],
          isError: true,
        };
      }

      const validTodos = todos as TodoItem[];
      const current = contextManager.load() || { ...DEFAULT_CONTEXT };

      // Apply limit to prevent unbounded growth
      const limitedTodos = validTodos.slice(-CONTEXT_LIMITS.MAX_TODOS);

      current.tasks = {
        todos: limitedTodos,
        last_synced: new Date().toISOString(),
      };

      contextManager.save(current);

      const pendingCount = limitedTodos.filter(t => t.status === "pending").length;
      const inProgressCount = limitedTodos.filter(t => t.status === "in_progress").length;
      const completedCount = limitedTodos.filter(t => t.status === "completed").length;

      return {
        content: [
          {
            type: "text",
            text: `✅ Synced ${limitedTodos.length} todos (${completedCount} completed, ${inProgressCount} in progress, ${pendingCount} pending)`,
          },
        ],
      };
    }

    case "resume_tasks": {
      const context = contextManager.load();

      if (!context?.tasks?.todos || context.tasks.todos.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No saved todos found. Use sync_todos to save your current task list first.",
            },
          ],
        };
      }

      const { todos, last_synced } = context.tasks;
      const autoRestore = args?.auto_restore as boolean;

      // Filter out completed tasks for resumption
      const activeTodos = todos.filter(t => t.status !== "completed");
      const completedTodos = todos.filter(t => t.status === "completed");

      if (autoRestore) {
        // Return TodoWrite-ready format with instructions
        return {
          content: [
            {
              type: "text",
              text: `## 🔄 Resume Tasks (saved at ${last_synced})

### Active Tasks to Restore
To restore your task list, call TodoWrite with this todos array:

\`\`\`json
${JSON.stringify(todos, null, 2)}
\`\`\`

### Summary
- **Completed**: ${completedTodos.length} tasks
- **In Progress**: ${activeTodos.filter(t => t.status === "in_progress").length} tasks
- **Pending**: ${activeTodos.filter(t => t.status === "pending").length} tasks

### Next Step
Call TodoWrite with the todos array above to restore your task list and continue where you left off.`,
            },
          ],
        };
      }

      // Simple summary format
      let output = `## 📋 Saved Tasks (from ${last_synced})\n\n`;

      const inProgress = todos.filter(t => t.status === "in_progress");
      const pending = todos.filter(t => t.status === "pending");

      if (inProgress.length > 0) {
        output += "### 🔄 In Progress\n";
        inProgress.forEach(t => {
          output += `- ${t.content}\n`;
        });
        output += "\n";
      }

      if (pending.length > 0) {
        output += "### ⏳ Pending\n";
        pending.forEach(t => {
          output += `- ${t.content}\n`;
        });
        output += "\n";
      }

      if (completedTodos.length > 0) {
        output += `### ✅ Completed (${completedTodos.length} tasks)\n`;
        completedTodos.slice(-5).forEach(t => {
          output += `- ${t.content}\n`;
        });
        if (completedTodos.length > 5) {
          output += `- ... and ${completedTodos.length - 5} more\n`;
        }
      }

      output += "\n---\n*Use `resume_tasks` with `auto_restore: true` for TodoWrite-ready format.*";

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// MCP Resources - expose context as readable resource
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "session-context://current",
        name: "Current Session Context",
        description: "The current session context with goal, progress, decisions, and discoveries",
        mimeType: "application/json",
      },
      {
        uri: "session-context://summary",
        name: "Session Context Summary",
        description: "A markdown summary of the current session context",
        mimeType: "text/markdown",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const context = contextManager.load();

  if (uri === "session-context://current") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: context ? JSON.stringify(context, null, 2) : "{}",
        },
      ],
    };
  }

  if (uri === "session-context://summary") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: context ? contextManager.formatForDisplay(context) : "No session context available.",
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Session Context MCP server running (v2.0)");
}

main().catch(console.error);
