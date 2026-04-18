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

# Process

```
Collect: review_report + qa_report + validation_status
        ↓
Check each gate: pass / fail / approved-exception
        ↓
Any failed gate? → block and explain; do not merge
        ↓
Confirm rollback posture for risky changes
        ↓
List unresolved assumptions from run.json
        ↓
Register merge_checklist with gate status table
```

# Checklist Gates

| Gate | Required | Notes |
|------|----------|-------|
| Validation passed | Yes | Must cite command output |
| Review: no unresolved Critical/Important findings | Yes | Or approved exception recorded |
| QA: criteria mapped to evidence | Yes | |
| Approvals recorded in run.json | Yes | For approval-required phases |
| Release notes drafted | Yes | |
| Rollback posture stated | Yes | For any risky or irreversible change |
| Unresolved assumptions listed | Yes | Empty list is acceptable |
| External writes previewed | Yes | No direct writes without preview |

# Exact steps

1. Confirm validation passed.
2. Confirm required approvals exist.
3. Confirm release notes are drafted.
4. Confirm rollback notes exist for risky changes.
5. List unresolved assumptions.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The maintainer can check it." | The flow must package evidence before handoff — not delegate it. |
| "One failing check is unrelated." | Every failed check must be explained or repaired, not ignored. |
| "Rollback is obvious." | Unstated rollback posture = no rollback plan. State it explicitly. |
| "Approvals were given verbally." | Only approvals recorded in run.json count — chat is not durable. |

# Verification

- Every gate is pass, approved, or explicitly blocked.
- Merge readiness cites review and QA artifacts.

# Exit criteria

- `merge_checklist` exists.
- No required gate is unresolved.

# Failure and escalation guidance

Escalate when validation failed, approvals are missing, or rollback is unclear.
