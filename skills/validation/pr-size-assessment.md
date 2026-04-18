---
id: validation/pr-size-assessment
title: PR Size Assessment
phase: validation
inputs:
  - slice_plan
  - code_changes
outputs:
  - pr_size_assessment
---

# Purpose

Assess whether a PR is reviewable and safe to validate.

# When to use

Use before or during review when a PR may be large, cross-cutting, or risky.

# When NOT to use

Do not use as a substitute for correctness, QA, or security review.

# Prerequisites

- Code changes or proposed slice boundaries are available.
- Manageable PR policy is known or default policy applies.

# Exact steps

1. Count changed files, changed lines, touched packages, migrations, and domains.
2. Identify unrelated concerns bundled into the PR.
3. Check whether migration, behavior, UI, and validation changes are mixed.
4. Compare findings against `manageable_pr_policy`.
5. Block, warn, or allow according to policy.
6. Recommend concrete split points when the PR is too large.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Reviewers can handle it." | Review quality drops as PR size and concern count grow. |
| "Tests pass so size is fine." | Passing tests do not make a PR reviewable. |

# Verification

- Assessment cites diff metrics or connector results.
- Oversize blockers are explicit.
- Split recommendations are concrete.

# Exit criteria

- `pr_size_assessment` exists.

# Failure and escalation guidance

Escalate when the PR exceeds hard policy limits without approval.
