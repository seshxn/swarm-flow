---
id: documentation/changelog-draft
title: Changelog Draft
phase: documentation
inputs:
  - code_changes
  - acceptance_criteria
outputs:
  - changelog_draft
---

# Purpose

Summarize user-visible changes in a durable release-oriented format.

# When to use

Use when a change affects users, operators, API consumers, or deployment behavior.

# When NOT to use

Do not use for invisible internal cleanups unless they affect maintainers.

# Prerequisites

- Change scope is known.
- Validation status is known or pending.

# Exact steps

1. Identify user-visible changes.
2. Separate added, changed, fixed, and removed behavior.
3. Note migration or operator action.
4. Avoid leaking sensitive implementation details.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "Everyone knows what changed." | Changelogs are for future readers. |
| "Implementation detail is fine." | Users need impact, not internal noise. |

# Verification

- Changelog entries map to real changes.
- Sensitive details are excluded.

# Exit criteria

- `changelog_draft` exists.

# Failure and escalation guidance

Escalate when release communication has customer, security, or compliance implications.
