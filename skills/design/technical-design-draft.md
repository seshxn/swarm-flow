---
id: design/technical-design-draft
title: Technical Design Draft
phase: design
triggers:
  - design phase begins
  - implementation needs architecture, data flow, or integration direction
inputs:
  - acceptance_criteria
  - task_plan
  - discovery_report
outputs:
  - technical_design
---

# Purpose

Choose and document the implementation approach before code changes begin.

# When to use

Use after planning when implementation needs architecture, data flow, integration, or rollout direction.

# When NOT to use

Do not use for trivial text-only changes with no behavioral or integration risk.

# Prerequisites

- Acceptance criteria exist.
- Task plan exists.
- Discovery evidence is available.

> **HARD-GATE:** Do not advance to implementation until the human has explicitly approved the technical design. Chat confirmation does not count. Approval must be recorded in `run.json` via `swarm-flow approve design`.

# Process

```
Read acceptance criteria + task plan + discovery report
        ↓
Summarize chosen approach (1 paragraph)
        ↓
Name affected modules and interfaces
        ↓
Describe data flow and state changes
        ↓
Enumerate alternatives considered + why rejected
        ↓
Define validation strategy
        ↓
Define rollback posture
        ↓
Self-check: does design map to every acceptance criterion?
  yes → register artifact → await approval
  no  → revise
```

# Exact steps

1. Summarize the chosen approach.
2. Name affected modules and interfaces.
3. Describe data flow and state changes.
4. Capture alternatives considered.
5. Define validation strategy and rollback notes.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The code will be self-explanatory." | Reviewers need decision context before reading code. |
| "There is only one way." | Tradeoffs still exist, including doing less. |
| "Rollback is straightforward." | Rollback assumptions must be stated explicitly, not assumed. |
| "Implementation will resolve this." | Unresolved design questions become unreviewed implementation decisions. |

# Verification

- Design maps to acceptance criteria.
- Tradeoffs are explicit.
- Validation and rollback are included.

# Exit criteria

- `technical_design` exists.
- Implementation risks are named.

# Failure and escalation guidance

Escalate when the design changes scope, introduces a risky dependency, or conflicts with policy.
