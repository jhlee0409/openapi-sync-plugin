# OAS Plugin Architecture

**New to the plugin?** Start with the [Quick Start Guide](./QUICKSTART.md) for a 5-minute setup.

## Overview

The OAS (OpenAPI Sync) plugin is a **prompt-based plugin** for Claude Code. All files in this plugin are Markdown documents that Claude reads and follows as instructions.

## Execution Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXECUTION MODEL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User invokes: /oas:sync                                        │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────────┐                                            │
│   │ commands/sync.md │ ◄── Claude reads this as instructions     │
│   └────────┬────────┘                                            │
│            │                                                     │
│            │ "Use skill: cache-manager"                          │
│            ▼                                                     │
│   ┌─────────────────────────────┐                                │
│   │ skills/cache-manager/SKILL.md│ ◄── Claude reads and follows  │
│   └─────────────────────────────┘                                │
│            │                                                     │
│            │ Claude executes using available tools:              │
│            │   - Read (file reading)                             │
│            │   - Write (file creation)                           │
│            │   - Edit (file modification)                        │
│            │   - Bash (command execution)                        │
│            │   - WebFetch (HTTP requests)                        │
│            │   - Glob/Grep (file search)                         │
│            ▼                                                     │
│   ┌─────────────────┐                                            │
│   │  Task Complete  │                                            │
│   └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Types

### Commands (`commands/*.md`)

**Purpose:** Define user-facing commands that can be invoked via `/oas:<command>`.

**Structure:**
```markdown
---
description: Brief description shown in help
---

# Command Name

## Prerequisites
[What must exist before running this command]

## Execution Flow
[Step-by-step instructions Claude MUST follow]

## Output Format
[Expected output to show user]

## Flags
[Available command-line flags]
```

**Key Point:** Everything in a command file is an INSTRUCTION for Claude to follow, not documentation for humans.

### Skills (`skills/*/SKILL.md`)

**Purpose:** Reusable logic modules that commands can invoke.

**Structure:**
```markdown
---
name: skill-name
description: What this skill does
---

# Skill Name

## EXECUTION INSTRUCTIONS
[REQUIRED: Steps Claude MUST perform when this skill is invoked]

## ALGORITHMS
[REFERENCE: Logic and pseudocode for Claude to understand the approach]

## DATA STRUCTURES
[REFERENCE: JSON schemas, TypeScript interfaces for context]

## ERROR HANDLING
[REQUIRED: How to handle specific error conditions]
```

**Key Point:** Sections marked `EXECUTION INSTRUCTIONS` or `REQUIRED` are mandatory actions. Sections marked `REFERENCE` are for context only.

### Templates (`templates/*.json`)

**Purpose:** Default configuration file structures.

**Usage:** Claude copies and modifies these when initializing a new project.

## Skill Invocation Pattern

When a command says `Use skill: <skill-name>`, Claude should:

1. Read the corresponding skill file
2. Follow the EXECUTION INSTRUCTIONS section
3. Use REFERENCE sections to understand the approach
4. Apply the logic using Claude's available tools

**Example:**
```markdown
# In commands/sync.md

## Step 1: Check Cache
Use skill: cache-manager

## Step 2: Generate Code
Use skill: code-generator
```

Claude reads `skills/cache-manager/SKILL.md`, follows its instructions, then proceeds to `code-generator`.

## Tool Usage

Claude executes all operations using Claude Code's built-in tools:

| Operation | Tool | Example |
|-----------|------|---------|
| Read files | `Read` | Read openapi.json |
| Write files | `Write` | Create new API file |
| Edit files | `Edit` | Update existing code |
| Search files | `Glob`, `Grep` | Find existing API code |
| HTTP requests | `WebFetch` | Fetch remote OpenAPI spec |
| Run commands | `Bash` | Run TypeScript compiler |

## State Management

The plugin uses JSON files for state persistence:

```
.openapi-sync.json       # User configuration (committed to git)
.openapi-sync.cache.json # Spec cache (add to .gitignore)
.openapi-sync.state.json # Implementation state (add to .gitignore)
```

## Section Markers

Use these markers in skill files to indicate execution requirements:

| Marker | Meaning |
|--------|---------|
| `## EXECUTION INSTRUCTIONS` | Claude MUST follow these steps |
| `## REQUIRED:` | Mandatory action or check |
| `## REFERENCE:` | Context information only |
| `## ALGORITHM:` | Logic explanation (not literal code to run) |
| `## EXAMPLE:` | Illustrative example |
| `## ERROR HANDLING` | How to handle failures |

## Anti-Patterns

### DON'T: Include executable code

```typescript
// DON'T: This looks like code to execute
const result = await fetch(url);
const data = await result.json();
```

### DO: Describe the action

```markdown
1. Fetch the OpenAPI spec from the URL using WebFetch tool
2. Parse the JSON response
3. Validate the structure has required fields
```

### DON'T: Ambiguous instructions

```markdown
You might want to check the cache first.
```

### DO: Clear directives

```markdown
REQUIRED: Before fetching, check if cache exists and is valid.
```

---

## Edge Cases

For handling edge cases (circular references, large specs, network errors, etc.), see [EDGE-CASES.md](./EDGE-CASES.md).

Key edge case categories:
- **Spec Format**: Swagger 2.0 conversion, YAML/JSON, encoding
- **Schema**: Circular references, allOf/oneOf/anyOf, unresolved refs
- **Network**: Timeouts, retries, redirects, SSL issues
- **Performance**: Large specs, memory management
- **File System**: Permissions, paths, existing files
- **Code Generation**: Reserved keywords, invalid identifiers

---

## Error Handling

For standardized error codes and troubleshooting, see [ERROR-CODES.md](./ERROR-CODES.md).

Error code ranges:
- **E1xx**: Network errors (connection, timeout, SSL)
- **E2xx**: Parse errors (JSON, YAML, OpenAPI validation)
- **E3xx**: File system errors (read, write, permissions)
- **E4xx**: Code generation errors (patterns, templates)
- **E5xx**: Configuration errors (config file, settings)
- **E6xx**: Cache errors (read, write, validation)

---

## Security

For security best practices and guidelines, see [SECURITY.md](./SECURITY.md).

Key security areas:
- **URL Validation**: SSRF prevention, protocol/IP restrictions
- **Code Injection**: String escaping, identifier sanitization
- **Sensitive Data**: API keys, credentials, cache file security
- **SSL/TLS**: Certificate verification, minimum TLS version
- **File System**: Path traversal prevention, permission checks
- **Generated Code**: Safe patterns, no eval/dynamic code

---

## Testing

For testing strategy and scenarios, see [TESTING.md](./TESTING.md).

Key testing areas:
- **Command Tests**: Each command with various inputs and flags
- **Skill Tests**: Each skill with edge cases
- **Error Scenarios**: All error codes and recovery
- **Integration Tests**: Full workflow verification
- **Regression Checklist**: Pre-release verification

---

## Migration

For handling breaking changes and version migrations, see [MIGRATION.md](./MIGRATION.md).

Key migration areas:
- **Breaking Changes**: Severity levels, detection, migration strategies
- **Deprecation Handling**: Identifying deprecated elements, timelines
- **Compatibility Strategies**: Backward compatibility, version coexistence
- **Migration Workflow**: Step-by-step process for spec updates
- **Common Scenarios**: Endpoint removed, field added, type changed

---

## Performance

For performance optimization strategies, see [PERFORMANCE.md](./PERFORMANCE.md).

Key performance areas:
- **Smart Caching**: ETag/Last-Modified validation, conditional requests
- **Network Optimization**: HEAD requests, retry strategy, timeouts
- **Large Spec Handling**: Batch processing, tag filtering, memory management
- **Incremental Sync**: Change detection, dependency tracking
- **Mode Comparison**: Smart vs force vs offline performance

---

## Examples

For complete code examples and real-world scenarios, see [EXAMPLES.md](./EXAMPLES.md).

Key example categories:
- **Quick Start**: Full workflow from init to sync
- **OpenAPI Spec**: Sample spec for testing
- **Pattern Detection**: How patterns are recognized from existing code
- **Generated Code**: Complete type, API, and hook examples
- **Structure Examples**: Common patterns (FSD, Feature-based, Flat) - any structure supported via sample learning

---

## Extensibility

For customizing the plugin to your project's needs, see [EXTENSIBILITY.md](./EXTENSIBILITY.md).

Key extensibility areas:
- **Configuration Reference**: All .openapi-sync.json options
- **Sample Files**: Custom template usage
- **Tag Mapping**: Rename or merge OpenAPI tags
- **Ignore Patterns**: Exclude specific endpoints
- **Output Customization**: File structure and naming
- **Advanced Scenarios**: Monorepo, multiple specs, CI/CD
