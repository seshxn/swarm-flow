---
id: implementation/test-first-change
title: Test-First Change
phase: implementation
inputs:
  - acceptance_criteria
  - task_plan
outputs:
  - tests_added
  - code_changes
---

# Purpose

Anchor behavior changes in failing tests before implementation.

# When to use

Use for bug fixes and feature behavior changes.

# When NOT to use

Do not use for purely mechanical formatting or generated files.

# Prerequisites

- Acceptance criteria or reproduction evidence exists.
- Test command is known.

# Exact steps

1. Write the smallest test that expresses the desired behavior.
2. Run it and confirm it fails for the expected reason.
3. Implement the minimum code to pass.
4. Run the test and relevant regression suite.
5. Record red and green evidence.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "I know the fix." | Knowing the fix does not prove the test guards it. |
| "The test is too hard." | That signals design or observability risk. |

# Verification

- The test failed before implementation.
- The same test passed after implementation.
- Relevant regression tests passed.

# Exit criteria

- `tests_added` exists.
- `code_changes` exists.
- Red-green evidence is recorded.

# Failure and escalation guidance

Escalate when the system is not testable without changing architecture or when the failing test exposes broader scope.
