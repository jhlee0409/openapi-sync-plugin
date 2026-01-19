---
description: (Alias) Use /oas:init instead - scaffolding is now integrated
---

# OpenAPI Scaffold (Deprecated)

**This command has been merged into `/oas:init`.**

## Use Instead

```bash
# Auto-detect existing code OR scaffold from template
/oas:init

# Force scaffold mode (skip sample detection)
/oas:init --scaffold

# Use specific template
/oas:init --template=react-query-fsd
```

## Why Merged?

Whether you have existing code or start fresh, the goal is the same:
1. Create `.openapi-sync.json` config
2. Have sample code for future `/oas:sync` operations

Now `/oas:init` handles both:
- **Existing code found** → Learn patterns from it
- **No code found** → Scaffold from best practice template

The result is identical: a configured project ready for `/oas:sync`.

## EXECUTION INSTRUCTIONS

When `/oas:scaffold` is invoked, Claude MUST:

1. Inform user: "Scaffold has been merged into /oas:init"
2. Ask: "Would you like me to run /oas:init --scaffold instead?"
3. If yes, proceed with `/oas:init --scaffold`
