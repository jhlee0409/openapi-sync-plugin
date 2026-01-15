#!/usr/bin/env node

/**
 * Elenchus MCP Server
 *
 * MCP server for the Elenchus verification system.
 * Provides state management, context sharing, and orchestration
 * for adversarial verification loops.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { tools } from './tools/index.js';
import { listSessions, getSession } from './state/session.js';

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'elenchus-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: Object.fromEntries(
          Object.entries(tool.schema.shape).map(([key, value]) => [
            key,
            {
              type: getZodType(value),
              description: (value as any)._def?.description || ''
            }
          ])
        ),
        required: Object.keys(tool.schema.shape).filter(
          key => !(tool.schema.shape as any)[key].isOptional()
        )
      }
    }))
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools[name as keyof typeof tools];
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true
    };
  }

  try {
    const parsed = tool.schema.parse(args);
    const result = await tool.handler(parsed as any);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

// =============================================================================
// Resource Handlers (Session Data)
// =============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const sessionIds = await listSessions();

  return {
    resources: sessionIds.map(id => ({
      uri: `elenchus://sessions/${id}`,
      name: `Session: ${id}`,
      mimeType: 'application/json',
      description: `Elenchus verification session ${id}`
    }))
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Parse URI
  const match = uri.match(/^elenchus:\/\/sessions\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const sessionId = match[1];
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Convert Map to object for serialization
  const serializable = {
    ...session,
    context: {
      ...session.context,
      files: Object.fromEntries(session.context.files)
    }
  };

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(serializable, null, 2)
      }
    ]
  };
});

// =============================================================================
// Helpers
// =============================================================================

function getZodType(schema: any): string {
  const typeName = schema._def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodEnum':
      return 'string';
    case 'ZodOptional':
      return getZodType(schema._def.innerType);
    case 'ZodDefault':
      return getZodType(schema._def.innerType);
    default:
      return 'string';
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Elenchus MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
