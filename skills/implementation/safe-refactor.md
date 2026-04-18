---
id: implementation/safe-refactor
title: Safe Refactor
phase: implementation
inputs:
  - task_plan
  - validation_plan
outputs:
  - code_changes
  - tests_updated
---

# Purpose

Change structure while preserving behavior.

# When to use

Use for refactors where public behavior should remain unchanged.

# When NOT to use

Do not use to smuggle feature changes into a refactor.

# Prerequisites

- Existing behavior is covered by tests or captured manually.
- Refactor scope is explicit.

# Exact steps

1. Identify behavior that must not change.
2. Capture or run baseline tests.
3. Make one structural change.
4. Re-run validation.
5. Record behavior-preservation evidence.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "This cleanup is obviously safe." | Refactors break behavior through hidden coupling. |
| "We can add the feature while here." | Mixed refactor-feature changes are hard to review. |

# Verification

- Baseline and post-change validation are recorded.
- Public contracts are unchanged unless approved.

# Exit criteria

- `code_changes` exists.
- Behavior preservation evidence exists.

# Failure and escalation guidance

Escalate when behavior changes, tests are missing for critical paths, or public contracts are ambiguous.
