---
id: discovery/repo-context-mapping
title: Repo Context Mapping
phase: discovery
inputs:
  - feature_brief
outputs:
  - discovery_report
  - dependency_map
---

# Purpose

Ground planning in the actual repository structure, tooling, contracts, and likely affected modules.

# When to use

Use before planning implementation work in an unfamiliar or partially known repository.

# When NOT to use

Do not use as a replacement for design. This skill gathers evidence; it does not choose architecture.

# Prerequisites

- Feature brief exists.
- Repository files are readable.

# Process

```
Read feature brief
        ↓
Inspect project structure (top-level, then targeted)
        ↓
Identify: package manager, build tool, test command, CI config
        ↓
Map modules likely affected by the request
        ↓
Record public interfaces and integration boundaries
        ↓
Every claim must cite a file path or command output
        ↓
Open questions → copy to assumptions log
        ↓
Register discovery_report + dependency_map
```

# Exact steps

1. Inspect top-level project structure.
2. Identify package managers, build tools, test commands, and CI hints.
3. Map likely modules affected by the request.
4. Record public interfaces and integration boundaries.
5. Produce a discovery report with cited files and commands.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "I know this stack." | This repository may use nonstandard conventions. Read the actual files. |
| "Search results are enough." | Discovery needs cited files and interpretation, not result counts. |
| "I'll note assumptions in the design." | Assumptions belong in the assumptions log, not deferred to design. |
| "The dependency map is obvious." | Obvious maps are still required — they catch surprises and drive planning. |

# Verification

- The report cites files or command output.
- The dependency map names likely affected modules.
- Open questions are copied to the assumptions log.

# Exit criteria

- `discovery_report` exists.
- `dependency_map` exists.

# Failure and escalation guidance

Escalate when repository access fails, key files are missing, or ownership boundaries are unclear.
