---
id: planning/edge-case-enumeration
title: Edge Case Enumeration
phase: planning
inputs:
  - acceptance_criteria
outputs:
  - edge_case_list
---

# Purpose

Expose boundary, permission, state, and failure cases before implementation hides them.

# When to use

Use when behavior has roles, bulk operations, state transitions, external systems, or user-visible failure modes.

# When NOT to use

Do not use for pure documentation changes with no behavior.

# Prerequisites

- Acceptance criteria exist.
- Primary user flows are known.

# Exact steps

1. Enumerate boundary values.
2. Enumerate permission and role cases.
3. Enumerate empty, partial, duplicate, and failed external states.
4. Identify concurrency and retry cases where relevant.
5. Add validation expectations for each important case.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The happy path is enough for v0.1." | Most production bugs live off the happy path. |
| "Edge cases can be QA's job later." | QA needs planned coverage, not surprise scope. |

# Verification

- Edge cases are not hidden inside general criteria.
- Each high-risk case has validation evidence.
- Permission cases include allowed and denied actions.

# Exit criteria

- `edge_case_list` exists.
- High-risk edge cases feed into task plan or QA plan.

# Failure and escalation guidance

Escalate when an edge case changes product scope or requires policy decisions.
