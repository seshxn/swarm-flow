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

# Process

```
Write smallest failing test
        ↓
Run test → confirm it fails for the expected reason
  fails for wrong reason → revise test
        ↓
Implement minimum code to pass
        ↓
Run test → confirm it passes
        ↓
Run full regression suite
  regressions? → fix before proceeding
        ↓
Record red and green evidence → register artifacts
```

# Exact steps

1. Write the smallest test that expresses the desired behavior — one assertion, one scenario.
2. Run it and confirm it fails **for the expected reason** (not a syntax error or import failure).
3. Implement the minimum code to make the test pass — no extra scope.
4. Run the test again and confirm it is green.
5. Run the full relevant regression suite.
6. Record red (before) and green (after) command output as evidence.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "I know the fix." | Knowing the fix does not prove the test guards it. Write the test first. |
| "The test is too hard to write." | That signals design or observability risk — escalate, don't skip. |
| "I'll write the test after to confirm." | A test written after the code always passes. It proves nothing. |
| "No test framework exists." | A one-off script that demonstrates failure and success is sufficient evidence. |

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
