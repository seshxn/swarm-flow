---
id: planning/slice-planning
title: Slice Planning
phase: slice_planning
inputs:
  - story_map
  - dependency_map
  - technical_design
outputs:
  - slice_plan
  - pr_size_assessment
---

# Purpose

Plan PR-sized implementation slices before code changes begin.

# When to use

Use after stories are mapped and before implementation starts.

# When NOT to use

Do not use for pure documentation changes or tiny fixes where policy does not require slice planning.

# Prerequisites

- Story map exists.
- Likely affected files, packages, or systems are known.
- Risky technical decisions are documented or explicitly unresolved.

# Exact steps

1. Read `story_map`, `dependency_map`, and `technical_design` when present.
2. Propose reviewable implementation slices.
3. Map each story to one or more slices.
4. Record expected files, packages, and ownership boundaries per slice.
5. Mark what must not be bundled together.
6. Add required validation evidence for each slice.
7. Produce or update `pr_size_assessment`.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The implementer can split later." | Split decisions belong before code creates coupling. |
| "One PR is easier." | Large PRs slow QA and review and hide risk. |

# Verification

- Every slice maps to a story or explicit foundation work.
- Every slice has validation evidence.
- Oversize risks are flagged before implementation.

# Exit criteria

- `slice_plan` exists.
- `pr_size_assessment` has no unapproved blockers.

# Failure and escalation guidance

Escalate when safe slicing requires architecture changes or conflicts with ownership boundaries.
