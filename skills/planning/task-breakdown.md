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

# Process

```
Read feature brief + discovery report + acceptance criteria
        ↓
Extract user-visible requirements
        ↓
Separate work types: functional / non-functional / migration / validation
        ↓
Group into slices — each slice must be independently testable
        ↓
For each slice: name blockers, dependencies, owner, validation evidence
        ↓
Order slices (dependencies first)
        ↓
Verify: every task maps to ≥1 acceptance criterion
  gap found? → add task or mark criterion as out-of-scope
        ↓
Register task_plan artifact
```

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
| "We can start coding and refine later." | Missing planning causes rework, drift, and weak ticket quality. |
| "One big task is easier to track." | Large tasks reduce observability, parallelism, and review quality. |
| "Validation tasks will happen naturally." | Validation tasks omitted from the plan are omitted from the work. |
| "2–5 minutes per step is too granular." | Fine granularity is what makes agent execution reliable and reviewable. |

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
