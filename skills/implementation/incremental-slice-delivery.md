---
id: implementation/incremental-slice-delivery
title: Incremental Slice Delivery
phase: implementation
inputs:
  - task_plan
  - technical_design
outputs:
  - code_changes
  - tests_added
---

# Purpose

Deliver implementation in small, verifiable slices that preserve reviewability and rollback options.

# When to use

Use for implementation work that can be split into independently testable changes.

# When NOT to use

Do not use when discovery or design is missing, or when the requested action is a one-file documentation update.

# Prerequisites

- Task plan exists.
- Technical design exists when required by policy.
- Validation commands are known.

# Exact steps

1. Select the smallest useful slice.
2. Write or update tests before implementation where behavior changes.
3. Implement the minimum change.
4. Run targeted validation for the slice.
5. Record changed files, commands, and evidence.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "It is faster to batch everything." | Large changes hide regressions and slow review. |
| "Tests can come after." | Tests written after code often prove implementation, not behavior. |

# Verification

- Changed files map to a task.
- Tests or explicit test rationale exist.
- Validation command output is recorded.

# Exit criteria

- `code_changes` exists.
- `tests_added` or test rationale exists.
- Slice evidence is attached to the run.

# Failure and escalation guidance

Escalate when the slice reveals missing requirements, unsafe data changes, or a need to redesign.
