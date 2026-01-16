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
| [fsdarch](./plugins/fsd-architect) | Feature-Sliced Design assistant - analyze, validate, and scaffold FSD structures | `/plugin install fsdarch@jhlee0409-plugins` |

## MCP Servers

MCP servers provide enhanced capabilities beyond what plugins can offer.

| Server | Description | Setup |
|--------|-------------|-------|
| [elenchus](./mcp-servers/elenchus) | State management for Elenchus verification - session persistence, context sharing, convergence detection | See [README](./mcp-servers/elenchus/README.md) |

## License

MIT
