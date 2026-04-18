---
id: validation/systematic-debugging
title: Systematic Debugging
phase: validation
triggers:
  - a test fails
  - unexpected runtime behavior is observed
  - a bug is reported
  - implementation produces wrong output
inputs:
  - failing test output or reproduction steps
  - code_changes
outputs:
  - repair_loop artifact or confirmed fix with test evidence
---

# Purpose

Find root cause before attempting fixes. Random fixes waste time and create new bugs. Symptom fixes are failure.

# When to use

Use for any technical issue: test failures, unexpected behavior, build failures, integration errors, wrong output. Use especially under time pressure — emergencies make guessing tempting, systematic is faster.

# When NOT to use

Do not use for known, already-diagnosed issues where root cause is confirmed. Do not skip this skill because the fix "seems obvious."

# Prerequisites

- A failing test, error message, or reproduction steps exist.
- The failing scenario can be triggered reliably (or evidence of flakiness is documented).

# The Iron Law

> NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

If you have not completed Phase 1, you cannot propose fixes.

# Process

```
Phase 1: Root Cause Investigation
        ↓
Read error message completely — don't skim
        ↓
Reproduce consistently
        ↓
Check recent changes (git diff, last commits)
        ↓
Multi-component? → add diagnostic instrumentation at each boundary
        ↓
Trace data flow backward from failure to origin
        ↓
State root cause hypothesis: "X is failing because Y"
        ↓
Phase 2: Pattern Analysis
        ↓
Find working examples of similar behavior in codebase
        ↓
Compare: what's different?
        ↓
Phase 3: Hypothesis Testing
        ↓
Smallest possible change to test hypothesis
        ↓
Did it work?
  yes → Phase 4
  no  → new hypothesis → Phase 3 again
        ↓
3+ failed hypotheses? → STOP → question architecture
        ↓
Phase 4: Implementation
        ↓
Write failing test (see test-first-change skill)
        ↓
Fix root cause — one change
        ↓
Verify: test passes, regressions clean
```

# Exact steps

1. Read the error message or failure output completely — stack traces, line numbers, error codes.
2. Reproduce the failure consistently. If not reproducible, gather more data before proceeding.
3. Check recent changes: `git diff`, last few commits, new dependencies, config changes.
4. For multi-component failures: add logging at each component boundary; run once to gather evidence; identify the failing boundary.
5. Trace the failure backward — where does the bad value originate? Keep tracing up until you reach the source.
6. State your root cause hypothesis explicitly: "I believe X is failing because Y."
7. Find working examples of similar behavior in the codebase and compare them to the broken case.
8. Make the smallest possible change to test your hypothesis — one variable at a time.
9. If it works: proceed to Phase 4. If not: form a new hypothesis and return to step 6.
10. After 3 failed hypotheses: stop fixing and question the architecture — discuss with the human before proceeding.
11. Write a failing test that reproduces the root cause (see `implementation/test-first-change.md`).
12. Implement the fix at the root cause location.
13. Confirm: test passes, regression suite clean.

# Anti-rationalization checks

| Thought | Reality |
| --- | --- |
| "Quick fix for now, investigate later." | Quick fixes that skip root cause create worse bugs later. |
| "Just try changing X and see." | Guessing without hypothesis is thrashing, not debugging. |
| "It's probably X, let me fix that." | "Probably" is not root cause. Complete Phase 1 first. |
| "I've already tried 2 things, one more." | 3+ failed fixes = architectural problem. Stop. Question fundamentals. |
| "Each fix reveals a new problem elsewhere." | That is the signal for architectural misfit, not more fixes. |
| "I don't fully understand it but this might work." | If you don't understand it, you cannot predict whether it works. |

# Verification

- [ ] Root cause was stated as a hypothesis before any fix was attempted
- [ ] A failing test exists that reproduces the root cause
- [ ] The fix was applied at the root cause, not the symptom
- [ ] The test is now green
- [ ] Regression suite is clean

# Exit criteria

- Root cause is documented.
- Fix is applied and test-verified.
- No new test failures introduced.

# Failure and escalation guidance

If 3+ hypotheses fail: produce a `repair-loop` artifact (see `validation/repair-loop.md`) naming the observed pattern, failed approaches, and the architectural question. Do not attempt a 4th fix. Block the phase and escalate to the human.
