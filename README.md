# jhlee0409-plugins

**English** | [한국어](./README.ko.md)

Claude Code plugin marketplace by Jack Lee

## Installation

```bash
# Add marketplace (once)
/plugin marketplace add jhlee0409/claude-plugins

# Install plugin
/plugin install <plugin-name>@jhlee0409-plugins
```

## Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| [oas](./plugins/oas) | OpenAPI spec sync - adaptive code generator that learns your project patterns | `/plugin install oas@jhlee0409-plugins` |
| [elenchus](./plugins/elenchus) | Complete verification pipeline - adversarial verification with MCP-backed state management | `/plugin install elenchus@jhlee0409-plugins` |
| [fsdarch](./plugins/fsd-architect) | Feature-Sliced Design assistant - analyze, validate, and scaffold FSD structures | `/plugin install fsdarch@jhlee0409-plugins` |

## MCP Servers

MCP servers provide enhanced capabilities beyond what plugins can offer.

| Server | Description | Setup |
|--------|-------------|-------|
| [elenchus](./mcp-servers/elenchus) | State management for Elenchus verification - session persistence, context sharing, convergence detection | See [README](./mcp-servers/elenchus/README.md) |

### Setting up MCP Servers

```bash
# 1. Build the server
cd mcp-servers/elenchus
npm install
npm run build

# 2. Add to ~/.claude.json
{
  "mcpServers": {
    "elenchus": {
      "command": "node",
      "args": ["/path/to/claude-plugins/mcp-servers/elenchus/dist/index.js"]
    }
  }
}
```

## Architecture

```
claude-plugins/
├── plugins/              # Claude Code plugins (prompt-based)
│   ├── oas/
│   ├── elenchus/
│   └── fsd-architect/
└── mcp-servers/          # MCP servers (state management)
    └── elenchus/
```

## License

MIT
