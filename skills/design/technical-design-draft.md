---
id: design/technical-design-draft
title: Technical Design Draft
phase: design
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

# Verification

- Design maps to acceptance criteria.
- Tradeoffs are explicit.
- Validation and rollback are included.

# Exit criteria

- `technical_design` exists.
- Implementation risks are named.

# Failure and escalation guidance

Escalate when the design changes scope, introduces a risky dependency, or conflicts with policy.
