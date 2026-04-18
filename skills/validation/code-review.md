---
id: validation/code-review
title: Code Review
phase: validation
inputs:
  - code_changes
  - acceptance_criteria
outputs:
  - review_report
---

# Purpose

Assess correctness, maintainability, regression risk, and readiness for delivery.

# When to use

Use after implementation and before delivery.

# When NOT to use

Do not use as a substitute for tests or QA.

# Prerequisites

- Code changes are available.
- Acceptance criteria and design artifacts are available.

# Exact steps

1. Review correctness against acceptance criteria.
2. Review maintainability and integration risk.
3. Check tests and validation evidence.
4. Record findings by severity and location.
5. Identify residual risk.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "It looks fine." | Review needs evidence and specific findings. |
| "Tests passed so review is done." | Tests do not cover maintainability or design drift. |

# Verification

- Findings cite files, artifacts, or commands.
- Blocking issues are explicit.
- Residual risk is stated.

# Exit criteria

- `review_report` exists.
- Blocking findings are resolved or approved.

# Failure and escalation guidance

Escalate when correctness is uncertain, validation is missing, or risk exceeds policy.
