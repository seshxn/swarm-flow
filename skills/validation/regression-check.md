---
id: validation/regression-check
title: Regression Check
phase: validation
inputs:
  - code_changes
  - validation_plan
outputs:
  - validation_status
---

# Purpose

Prove the change did not break known behavior.

# When to use

Use after implementation for feature, bugfix, refactor, and incident flows.

# When NOT to use

Do not use when no behavior changed and documentation-only validation is sufficient.

# Prerequisites

- Validation commands are known.
- Code changes are complete enough to test.

# Exact steps

1. Run targeted tests for changed behavior.
2. Run broader regression tests appropriate to risk.
3. Run typecheck and lint when available.
4. Record failures with command output.
5. Set validation status.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Only targeted tests are needed." | Shared code changes need broader regression evidence. |
| "A flaky failure can be ignored." | Flakiness is a validation risk until explained. |

# Verification

- Commands, exit codes, and summaries are recorded.
- Failed commands trigger repair loop.

# Exit criteria

- `validation_status` exists.
- Regression evidence exists.

# Failure and escalation guidance

Escalate when validation cannot run, failures are unexplained, or test infrastructure is unreliable.
