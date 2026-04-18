---
id: discovery/dependency-map
title: Dependency Map
phase: discovery
triggers:
  - discovery phase begins
  - modules affected by the request need to be identified
inputs:
  - feature_brief
  - discovery_report
outputs:
  - dependency_map
---

# Purpose

Name the modules, services, and external dependencies that the request will touch so that planning, design, and validation are scoped correctly. Surprises in the dependency map are planning failures.

# When to use

Use during discovery for any request that touches more than one file or module. Use when external dependencies, shared libraries, or integration boundaries are involved.

# When NOT to use

Do not use for single-file text changes with no behavioral impact. Do not guess — if a dependency is uncertain, mark it as probable and add it to the assumptions log.

# Prerequisites

- Feature brief exists.
- Repository structure has been explored (see `repo-context-mapping.md`).

# Output Format

```markdown
## Affected Modules

| Module / Path | Change Type | Risk |
|---------------|-------------|------|
| <path or service name> | new / modified / deleted / read-only | Low / Medium / High |

## External Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| <name> | library / service / API / connector | <version, usage context> |

## Integration Boundaries

| Boundary | Direction | Notes |
|----------|-----------|-------|
| <module A> → <module B> | inbound / outbound / bidirectional | <what crosses this boundary> |

## Breaking Dependency Assessment

Statement: are any existing consumers of touched modules likely to break?
Answer: yes / no / unknown — with evidence.
```

# Process

```
Read feature brief + repo-context-mapping output
        ↓
List directly affected modules (files the request will change)
        ↓
List indirectly affected modules (consumers of changed interfaces)
        ↓
List external dependencies (libraries, services, APIs)
        ↓
Map integration boundaries (what talks to what)
        ↓
Assess: will any existing consumers break?
        ↓
Mark uncertain dependencies as "probable" → add to assumptions log
        ↓
Register dependency_map artifact
```

# Exact steps

1. List every module or file the request will directly modify.
2. For each modified module: identify its consumers (who calls it or imports it).
3. List external dependencies: libraries, services, APIs, connectors.
4. Map integration boundaries — specify direction and what crosses each boundary.
5. For each dependency: assign risk (Low / Medium / High) based on change scope.
6. State whether any existing consumers are likely to break and cite evidence.
7. For uncertain dependencies: add them to the assumptions log.
8. Register as `dependency_map`.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The affected modules are obvious." | Obvious maps are still required — they catch surprises and drive planning. |
| "No external dependencies for this change." | Implicit dependencies (build tools, CI, shared types) still count. |
| "I'll discover missing dependencies during implementation." | Dependencies discovered during implementation cause scope drift and rework. |
| "It won't break anything." | "Won't break anything" is a claim that requires evidence, not assertion. |

# Verification

- [ ] Every directly affected module is listed
- [ ] Consumers of changed interfaces are identified
- [ ] External dependencies are named
- [ ] Breaking dependency assessment is stated
- [ ] Uncertain entries are in the assumptions log

# Exit criteria

- `dependency_map` artifact exists.
- All affected modules are named.
- Breaking dependency assessment is explicit.

# Failure and escalation guidance

If the dependency map reveals that the request touches a shared library, authentication system, or external service without clear ownership, escalate to the architect before planning begins.
