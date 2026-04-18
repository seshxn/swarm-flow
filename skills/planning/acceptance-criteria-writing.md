---
id: planning/acceptance-criteria-writing
title: Acceptance Criteria Writing
phase: planning
inputs:
  - feature_brief
  - discovery_report
outputs:
  - acceptance_criteria
---

# Purpose

Define testable delivery criteria before implementation begins.

# When to use

Use after intake and discovery produce enough evidence to define done.

# When NOT to use

Do not use before unresolved high-risk assumptions are accepted or resolved.

# Prerequisites

- Feature brief exists.
- Discovery report exists.
- Blocking assumptions are resolved or explicitly accepted.

# Exact steps

1. Extract user-visible behavior.
2. Define positive, negative, permission, and failure cases.
3. Include non-functional expectations such as auditability, performance, or accessibility when relevant.
4. Map each criterion to expected validation evidence.
5. Mark out-of-scope behavior as non-goals.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Tests will define done." | Tests need criteria to target. |
| "The PR can explain it later." | Implementation needs criteria before code changes. |

# Verification

- Every criterion is testable.
- Edge cases and permissions are explicit.
- Criteria map to the feature goal.

# Exit criteria

- `acceptance_criteria` exists.
- Each criterion maps to validation evidence.

# Failure and escalation guidance

Escalate when criteria conflict, require product decisions, or depend on unresolved compliance/security requirements.
