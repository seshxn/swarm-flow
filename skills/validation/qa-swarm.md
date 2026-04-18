---
id: validation/qa-swarm
title: QA Swarm
phase: qa_swarm
inputs:
  - acceptance_criteria
  - qa_context
  - code_changes
outputs:
  - qa_plan
  - acceptance_matrix
  - exploratory_qa_report
  - regression_risk_report
  - test_gap_report
  - qa_report
---

# Purpose

Run multi-lens QA validation that helps human QA focus on evidence, gaps, and risk.

# When to use

Use during full delivery validation or standalone QA runs for PRs, tickets, deploy previews, local URLs, or test targets.

# When NOT to use

Do not use to change product scope or replace explicit acceptance criteria.

# Prerequisites

- QA target or code changes are available.
- Acceptance criteria exist or inferred scope is marked as an assumption.

# Exact steps

1. Map explicit acceptance criteria to validation evidence.
2. Mark inferred scope when criteria are missing.
3. Identify regression risks from changed files, dependencies, and prior behavior.
4. Exercise exploratory paths and edge cases.
5. Validate permissions and role boundaries when relevant.
6. Validate accessibility and browser behavior when relevant.
7. Identify test gaps and rank them by risk.
8. Produce previewed external comments or updates without posting automatically.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Manual QA happened." | Evidence must be recorded to count. |
| "No acceptance criteria, no QA." | Infer scope and mark assumptions instead of claiming certainty. |

# Verification

- QA evidence maps to criteria or inferred scope.
- High-risk gaps block delivery or require approval.
- External updates are previews until selected.

# Exit criteria

- `qa_report` exists.
- `test_gap_report` exists.
- `validation_status` records pass, fail, or residual risk.

# Failure and escalation guidance

Escalate when the target cannot be tested, evidence is inconclusive, or high-risk gaps remain.
