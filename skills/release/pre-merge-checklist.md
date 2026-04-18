---
id: release/pre-merge-checklist
title: Pre-Merge Checklist
phase: delivery
inputs:
  - validation_status
  - review_report
  - qa_report
outputs:
  - merge_checklist
---

# Purpose

Confirm delivery readiness before a PR is marked ready to merge.

# When to use

Use before opening, updating, or marking a PR ready for merge.

# When NOT to use

Do not use to bypass failed validation or missing approval.

# Prerequisites

- Review report exists.
- QA report exists.
- Validation status exists.

# Exact steps

1. Confirm validation passed.
2. Confirm required approvals exist.
3. Confirm release notes are drafted.
4. Confirm rollback notes exist for risky changes.
5. List unresolved assumptions.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The maintainer can check it." | The flow should package evidence before handoff. |
| "One failing check is unrelated." | Failed checks must be explained or repaired. |

# Verification

- Every gate is pass, approved, or explicitly blocked.
- Merge readiness cites review and QA artifacts.

# Exit criteria

- `merge_checklist` exists.
- No required gate is unresolved.

# Failure and escalation guidance

Escalate when validation failed, approvals are missing, or rollback is unclear.
