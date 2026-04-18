---
id: validation/repair-loop
title: Repair Loop
phase: validation
triggers:
  - validation_status is failing
  - review_report has unresolved Critical findings
  - 3+ fix attempts have failed (see systematic-debugging)
  - qa_report has unmet acceptance criteria
inputs:
  - validation_status
  - review_report
  - qa_report
outputs:
  - repair_loop artifact
---

# Purpose

Replace thrashing with a structured, time-bounded diagnosis-and-fix loop. When validation fails, the repair loop creates a durable record of what's broken, what's been tried, and when to stop and escalate — so that a second or third failure doesn't send work silently forward.

# When to use

Use when validation fails for any reason: tests failing, Critical review findings, unmet acceptance criteria, CI failures. Use when systematic-debugging has exhausted 3 hypotheses without resolution.

# When NOT to use

Do not use to defer easy fixes. If the issue is clear and fixable in one step, fix it and re-validate without opening a repair loop. Do not open a repair loop to avoid accountability — it is an escalation tool, not a bypass.

# Prerequisites

- Validation has been run (lint, typecheck, tests).
- At least one failing condition exists and is documented.

# Repair Loop Artifact Format

```markdown
# Repair Loop — <run-id> — <timestamp>

## Trigger
<What failed: test name, finding id, or unmet criterion>

## Failing Condition
<Exact error, finding, or criterion failure — cite file:line>

## Attempts Log

### Attempt 1 — <timestamp>
- Hypothesis: <what I thought was wrong>
- Change made: <file:line — what changed>
- Result: <still failing / new failure / partial fix>

### Attempt 2 — <timestamp>
...

## Current Status
OPEN | RESOLVED | ESCALATED

## Exit Condition
<What must be true for this repair loop to close>

## Escalation Note (if ESCALATED)
<What the human needs to decide or provide>
```

# Process

```
Validation fails
        ↓
Is this fixable in one step?
  yes → fix it → re-run validation → done
  no  → open repair loop artifact
        ↓
Document failing condition precisely (cite file:line)
        ↓
Apply systematic-debugging skill
        ↓
Log each attempt in the repair loop artifact
        ↓
After each attempt: re-run validation
  passes → mark RESOLVED → close repair loop
  fails  → log result → next attempt
        ↓
After 3 attempts without resolution:
  mark ESCALATED
  document architectural question
  block phase advancement
  notify human
```

# Exact steps

1. Open `repair-loop-<timestamp>.md` in the run's artifacts directory.
2. Document the failing condition exactly — error message, failing test name, or criterion — with file and line citations.
3. Apply `validation/systematic-debugging.md` for each fix attempt.
4. Log every attempt: hypothesis, change made, result.
5. After each attempt, re-run the full validation suite.
6. If validation passes: mark the loop `RESOLVED` and register the fix.
7. If 3 attempts fail without resolution: mark `ESCALATED`, document the architectural question, and block advancement until the human responds.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Just one more fix attempt." | 3+ failed attempts = architecture problem. More attempts = more drift. |
| "I'll skip the repair loop — I'll just fix it." | Undocumented fix attempts are invisible to reviewers and future agents. |
| "Escalation means failure." | Escalation means the problem is real and requires a human decision. That is correct behavior. |
| "The repair loop is overkill for a simple failure." | Simple failures close in 1 attempt and the loop serves as evidence. |

# Verification

- [ ] Failing condition is documented with file:line citation
- [ ] Each attempt is logged with hypothesis, change, and result
- [ ] Status is OPEN / RESOLVED / ESCALATED
- [ ] Exit condition is stated
- [ ] Phase advancement is blocked while loop is OPEN or ESCALATED

# Exit criteria

- Repair loop artifact exists.
- Status is `RESOLVED` (phase can advance) or `ESCALATED` (human must act).

# Failure and escalation guidance

If the loop reaches `ESCALATED`, produce a human-readable summary of: what failed, what was tried, and what architectural question needs a decision. Include the summary in the run log. Do not close the loop until the human explicitly resolves or accepts the risk.
