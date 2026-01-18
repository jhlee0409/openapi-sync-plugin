# Show HN: openapi-sync – Sample-Based OpenAPI Code Generator

I built a Claude Code plugin that generates API client code from OpenAPI specs by learning from your existing code, not hardcoded templates.

## The Problem

Tools like Orval and openapi-typescript-codegen generate code in *their* style. Even with configuration options, the output often looks "foreign" compared to your hand-written code.

## My Approach

Point the plugin at your spec and just one existing API file. It learns your patterns (HTTP client, React Query setup, folder structure, naming conventions) and generates new endpoints in the same style.

```
"Show me one API file, I'll generate 100 more like it"
```

## Usage

```bash
/plugin install oas@jhlee0409-plugins

/oas:init https://api.example.com/openapi.json
/oas:sync
```

## Features

- **Pattern Learning**: Auto-detects your HTTP client, data fetching library, project structure, naming conventions
- **Diff-Based Sync**: Only processes changed endpoints
- **Project-Standard Linting**: Finds inconsistencies based on your majority patterns, not external rules
- **Breaking Change Detection**: Flags breaking changes in spec updates

Note: All processing happens locally within Claude Code's context. No code is sent to external servers.

## Looking for Feedback

- Does sample-based learning actually solve the template problem?
- What patterns should it detect that it doesn't?
- Is the CLI intuitive?

GitHub: https://github.com/jhlee0409/claude-plugins
Plugin docs: https://github.com/jhlee0409/claude-plugins/tree/main/plugins/oas

If you find this useful, a ⭐ on the repo would be appreciated!
