---
id: validation/test-gap-check
title: Test Gap Check
phase: validation
inputs:
  - acceptance_criteria
  - code_changes
outputs:
  - test_gap_report
---

# Purpose

Identify important acceptance criteria or risks that lack validation evidence.

# When to use

Use before delivery when tests are sparse, changes are risky, or criteria include edge cases.

# When NOT to use

Do not use to demand exhaustive coverage for a low-risk docs-only change.

# Prerequisites

- Acceptance criteria exist.
- Validation evidence exists or attempted validation is recorded.

# Exact steps

1. Map criteria to tests or manual checks.
2. Identify uncovered criteria.
3. Rank gaps by risk.
4. Recommend tests or explicit approvals.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Coverage percentage is enough." | Coverage can miss the business-critical path. |
| "Manual testing happened." | Manual evidence must be recorded to count. |

# Verification

- Every criterion is mapped or flagged.
- High-risk gaps block delivery or require approval.

# Exit criteria

- `test_gap_report` exists.

# Failure and escalation guidance

Escalate when high-risk behavior cannot be validated before delivery.
