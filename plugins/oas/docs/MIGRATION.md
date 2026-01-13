# Migration Guide

Guide for handling OpenAPI spec version changes and breaking changes.

---

## Breaking Change Categories

### Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **Critical** | Immediate code failure | Must fix before deploy |
| 🟠 **Breaking** | Runtime errors possible | Fix within sprint |
| 🟡 **Deprecated** | Works but will break | Plan migration |
| 🟢 **Compatible** | No code changes needed | Optional update |

### Change Types

#### Endpoint Changes

| Change | Severity | Detection | Migration |
|--------|----------|-----------|-----------|
| Endpoint removed | 🔴 Critical | `/oas:diff --breaking-only` | Remove code or add fallback |
| Endpoint path changed | 🔴 Critical | `/oas:diff` | Update all references |
| HTTP method changed | 🔴 Critical | `/oas:diff` | Update API calls |
| New required parameter | 🟠 Breaking | `/oas:diff` | Add parameter to calls |
| Endpoint deprecated | 🟡 Deprecated | `/oas:lint --spec` | Plan migration to replacement |
| New endpoint added | 🟢 Compatible | `/oas:diff` | Optional: implement |

#### Schema Changes

| Change | Severity | Detection | Migration |
|--------|----------|-----------|-----------|
| Required field added | 🔴 Critical | `/oas:diff --breaking-only` | Update type + provide value |
| Field removed | 🟠 Breaking | `/oas:diff` | Remove from code |
| Field type changed | 🟠 Breaking | `/oas:validate` | Update type definitions |
| Enum value removed | 🟠 Breaking | `/oas:diff` | Update validation logic |
| Field made optional | 🟢 Compatible | `/oas:diff` | Optional: add null handling |
| New optional field | 🟢 Compatible | `/oas:diff` | Optional: use new field |
| New enum value | 🟢 Compatible | `/oas:diff` | Optional: handle new value |

#### Parameter Changes

| Change | Severity | Detection | Migration |
|--------|----------|-----------|-----------|
| Required param added | 🔴 Critical | `/oas:diff --breaking-only` | Add to all API calls |
| Param removed | 🟠 Breaking | `/oas:diff` | Remove from calls |
| Param type changed | 🟠 Breaking | `/oas:validate` | Update type + calls |
| Param made optional | 🟢 Compatible | `/oas:diff` | No action needed |

---

## Migration Workflow

### Step 1: Detect Changes

```bash
# Check for any changes
/oas:diff --remote

# Focus on breaking changes only
/oas:diff --breaking-only

# Check specific domain
/oas:diff --tag=users --breaking-only
```

**Output analysis:**
```
Breaking Changes Detected:

🔴 REMOVED: DELETE /api/v1/users/{id}/sessions
   Impact: src/entities/user/api/user-api.ts:45

🔴 REQUIRED FIELD ADDED: CreateProjectRequest.organizationId
   Impact: src/entities/project/api/project-api.ts:23

🟠 TYPE CHANGED: User.status (string → enum)
   Impact: src/entities/user/model/types.ts:8
```

### Step 2: Prioritize Changes

Order of migration:

1. **🔴 Critical changes first** - These will cause immediate failures
2. **🟠 Breaking changes second** - May cause runtime errors
3. **🟡 Deprecations** - Plan for future sprints
4. **🟢 Compatible changes** - Optional updates

### Step 3: Update Code

For each change, choose a migration strategy:

#### Strategy A: Direct Update

Best for: Small changes, greenfield projects

```bash
# Regenerate affected code
/oas:sync --tag=affected-domain

# Validate all changes
/oas:validate
```

#### Strategy B: Gradual Migration

Best for: Large changes, production systems

```
1. Create compatibility layer
2. Update consumers incrementally
3. Remove compatibility layer
```

#### Strategy C: Feature Flag

Best for: Uncertain timelines, A/B testing

```
1. Add feature flag for new API version
2. Implement both old and new paths
3. Migrate users gradually
4. Remove old path after full migration
```

### Step 4: Validate

```bash
# Ensure code matches spec
/oas:validate --strict

# Check for any remaining issues
/oas:lint
```

---

## Deprecation Handling

### Identifying Deprecated Elements

```bash
# Check for deprecations in spec
/oas:lint --spec

# Look for deprecated markers in diff
/oas:diff --verbose
```

**Deprecated markers in OpenAPI:**

```yaml
# Endpoint deprecation
/api/v1/legacy/users:
  get:
    deprecated: true
    x-sunset-date: "2024-12-31"

# Schema deprecation
User:
  properties:
    legacyId:
      type: string
      deprecated: true
      description: "Use 'id' instead"
```

### Deprecation Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| Announcement | - | Deprecation appears in spec |
| Grace Period | 1-3 sprints | Both old and new work |
| Warning | 1 sprint | Log warnings for old usage |
| Removal | - | Old endpoint/field removed |

### Handling Deprecated Code

```
When deprecated element detected:

1. CHECK: Is replacement available in spec?
   → Yes: Plan migration to replacement
   → No: Contact API team for guidance

2. ADD: Deprecation comment in code
   // @deprecated Use newEndpoint() instead. Removal: 2024-12-31

3. CREATE: Migration task in backlog
   - Estimated effort
   - Deadline (sunset date - 1 sprint buffer)
   - Dependencies

4. UPDATE: Gradually migrate consumers
   - Update one consumer at a time
   - Verify each migration
   - Remove old code when all migrated
```

---

## Compatibility Strategies

### Backward Compatibility Layer

When API changes but you need to support old behavior temporarily:

```typescript
// compatibility.ts
// Wraps new API to maintain old interface

export function legacyGetUser(id: string): Promise<LegacyUser> {
  // Call new API
  const user = await getUser(id);

  // Transform to old format
  return {
    ...user,
    legacyId: user.id, // Old field name
    status: user.status.toString(), // Was string, now enum
  };
}
```

### Version Coexistence

When supporting multiple API versions:

```
src/
├── api/
│   ├── v1/          # Old version (deprecated)
│   │   └── user-api.ts
│   ├── v2/          # Current version
│   │   └── user-api.ts
│   └── index.ts     # Exports current version
```

### Type Evolution

When types change over time:

```typescript
// types.ts

// Old type (deprecated)
/** @deprecated Use User instead */
export interface LegacyUser {
  legacyId: string;
  status: string;
}

// New type
export interface User {
  id: string;
  status: UserStatus;
}

// Migration helper
export function migrateUser(legacy: LegacyUser): User {
  return {
    id: legacy.legacyId,
    status: legacy.status as UserStatus,
  };
}
```

---

## Common Migration Scenarios

### Scenario 1: Endpoint Removed

**Detection:**
```
/oas:diff shows: REMOVED DELETE /api/v1/users/{id}/sessions
```

**Migration Steps:**
1. Find all usages: `grep -r "deleteUserSession" src/`
2. Options:
   - Remove functionality if no longer needed
   - Replace with alternative endpoint if available
   - Keep as-is if backend still supports (temporary)
3. Update tests
4. Remove unused types

### Scenario 2: Required Field Added

**Detection:**
```
/oas:validate shows: Required field missing CreateProjectRequest.organizationId
```

**Migration Steps:**
1. Update type definition to include new field
2. Find all places that create this request
3. Add field value (from context, user input, or default)
4. Update tests with new field
5. Validate: `/oas:validate`

### Scenario 3: Enum Values Changed

**Detection:**
```
/oas:diff shows: ENUM CHANGED User.status: ['active', 'inactive'] → ['active', 'inactive', 'pending', 'suspended']
```

**Migration Steps:**
1. Add new enum values to type
2. Check switch/if statements for exhaustiveness
3. Add handling for new values (UI, logic)
4. Update tests for new cases
5. Validate: `/oas:validate`

### Scenario 4: Response Structure Changed

**Detection:**
```
/oas:diff shows: SCHEMA CHANGED GetUsersResponse
  - users: User[]
  + data: { users: User[], pagination: Pagination }
```

**Migration Steps:**
1. Update response type
2. Update all usages: `response.users` → `response.data.users`
3. Add pagination handling if needed
4. Update tests
5. Validate: `/oas:validate`

---

## Migration Checklist

Before deploying after API spec update:

### Pre-Migration

- [ ] Run `/oas:diff --remote` to see all changes
- [ ] Run `/oas:diff --breaking-only` to identify critical issues
- [ ] Create migration plan with priorities
- [ ] Estimate effort for each change

### During Migration

- [ ] Update types first (`/oas:sync --only-types`)
- [ ] Fix 🔴 Critical changes
- [ ] Fix 🟠 Breaking changes
- [ ] Update tests for changed behavior
- [ ] Run `/oas:validate` after each major change

### Post-Migration

- [ ] Run `/oas:validate --strict` - must pass
- [ ] Run `/oas:lint` - address warnings
- [ ] Run full test suite
- [ ] Review deprecated items for future planning
- [ ] Document any compatibility layers added
- [ ] Update changelog

---

## Troubleshooting

### "Too many breaking changes"

If spec update has many breaking changes:

1. Check if you're on correct spec version
2. Consider incremental migration (tag by tag)
3. Request phased rollout from API team
4. Use compatibility layer for gradual migration

### "Unknown field in spec"

If spec has fields your code doesn't recognize:

1. These are likely new optional fields (🟢 Compatible)
2. Run `/oas:sync` to regenerate types
3. Decide whether to use new fields

### "Code works but validation fails"

If code runs but `/oas:validate` shows errors:

1. Check if using cached spec: `/oas:status --check-remote`
2. Run `/oas:sync --force` to get latest
3. Type might be compatible but named differently

### "Can't find replacement for deprecated endpoint"

If deprecated endpoint has no obvious replacement:

1. Check spec for `x-replaced-by` extension
2. Check API documentation
3. Contact API team for migration guidance

---

## Configuration

### Ignoring Specific Changes

In `.openapi-sync.json`:

```json
{
  "migration": {
    "ignorePaths": [
      "/api/v1/legacy/*"
    ],
    "ignoreDeprecations": false,
    "breakingChangeLevel": "error"
  }
}
```

### Deprecation Alerts

```json
{
  "migration": {
    "deprecationWarnings": true,
    "sunsetAlertDays": 30
  }
}
```

> **Note:** These are optional configurations. Default behavior detects all changes.
