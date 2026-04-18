---
id: validation/review-swarm
title: Review Swarm
phase: review_swarm
inputs:
  - code_changes
  - acceptance_criteria
  - technical_design
  - test_evidence
outputs:
  - review_report
  - pr_size_assessment
  - github_comments_preview
---

# Purpose

Run a multi-lens code review that produces evidence-backed findings and previewed comments.

# When to use

Use during full delivery validation or standalone PR review runs.

# When NOT to use

Do not use to approve the reviewer's own implementation or replace tests and QA.

# Prerequisites

- Diff or code changes are available.
- Acceptance criteria, test evidence, or explicit assumptions are available.

# Exact steps

1. Review correctness against acceptance criteria.
2. Review test coverage and validation gaps.
3. Review architecture and package boundaries.
4. Review security and privacy when the diff touches sensitive paths.
5. Review performance and reliability when the diff touches hot paths or async behavior.
6. Review migration and data safety when schemas or persistence change.
7. Assess PR size and reviewability.
8. Deduplicate findings and assign severity.
9. Produce GitHub comment previews without posting automatically.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "No findings means approved." | Approval is a human or policy decision. |
| "Post all comments." | External comments require preview and user selection. |

# Verification

- Findings cite files, lines, artifacts, commands, or connector results.
- Large PR findings are blockers when policy requires.
- Comment previews are selectable and not posted automatically.

# Exit criteria

- `review_report` exists.
- `pr_size_assessment` exists.
- `github_comments_preview` exists when the target is GitHub.

# Failure and escalation guidance

Escalate when correctness is uncertain, evidence is missing, or policy blocks reviewability.
