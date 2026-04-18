---
id: planning/task-breakdown
title: Task Breakdown
phase: planning
triggers:
  - acceptance criteria exist
  - implementation work needs decomposition
inputs:
  - feature_brief
  - discovery_report
  - acceptance_criteria
outputs:
  - task_plan
---

# Purpose

Break accepted scope into ordered, observable implementation slices.

# When to use

Use when a feature has been clarified enough to be broken into implementation tasks.

# When NOT to use

Do not use before acceptance criteria exist. Do not use for pure research spikes.

# Prerequisites

- Acceptance criteria exist.
- Discovery report names likely affected areas.

# Exact steps

1. Read the feature brief and discovery report.
2. Extract user-visible requirements.
3. Separate functional, non-functional, migration, and validation work.
4. Group work by implementation slice.
5. Identify blockers, dependencies, owners, and validation needs.
6. Produce a task plan with sequencing and evidence expectations.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "We can start coding and refine later." | Missing planning causes rework and weak ticket quality. |
| "One big task is easier." | Large tasks reduce observability and parallelism. |

# Verification

- Every task maps to at least one acceptance criterion.
- Dependencies are explicit.
- Validation work is included, not implied.

# Exit criteria

- `task_plan` exists.
- Tasks are ordered.
- Blockers are named.
- Validation tasks are present.

# Failure and escalation guidance

Escalate when a task cannot be scoped without architecture decisions or when parallel work would create unsafe conflicts.
