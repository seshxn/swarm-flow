---
id: release/release-note-draft
title: Release Note Draft
phase: delivery
inputs:
  - changelog_draft
  - qa_report
outputs:
  - release_notes_draft
---

# Purpose

Prepare concise release notes grounded in shipped behavior and validation evidence.

# When to use

Use during delivery when a change should be communicated beyond code review.

# When NOT to use

Do not use for private refactors with no operational impact.

# Prerequisites

- Changelog draft or change summary exists.
- Validation evidence exists.

# Exact steps

1. Summarize the change in user language.
2. Note operational or migration actions.
3. Include risk or rollout notes when relevant.
4. Remove sensitive details.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The PR title is enough." | Release notes need context and impact. |
| "Mention every code detail." | Release notes should be useful, not exhaustive. |

# Verification

- Notes match shipped behavior.
- Risk and rollout notes align with validation.

# Exit criteria

- `release_notes_draft` exists.

# Failure and escalation guidance

Escalate when release notes need legal, security, or customer-review input.
