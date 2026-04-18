---
id: documentation/docs-sync
title: Docs Sync
phase: documentation
inputs:
  - technical_design
  - code_changes
outputs:
  - docs_update_report
---

# Purpose

Keep durable documentation aligned with shipped behavior.

# When to use

Use when behavior changes user, operator, developer, or release documentation.

# When NOT to use

Do not use for internal-only refactors that do not change public behavior or architecture.

# Prerequisites

- Code changes are known.
- Design or ADR exists for architecture changes.

# Process

```
Read code changes + technical design + ADR
        ↓
Identify affected doc categories:
  user-facing / operator / developer / architecture / release notes
        ↓
For each affected doc:
  update in-repo OR draft Confluence preview
        ↓
For each skipped doc: record rationale explicitly
        ↓
Link each doc update to shipped behavior (not aspirational plans)
        ↓
Register docs_update_report
```

# Exact steps

1. Identify affected docs.
2. Update repository docs or draft external previews.
3. Record skipped docs with rationale.
4. Link docs updates to shipped behavior.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The PR description is enough." | PR text disappears from day-to-day product use and agent context. |
| "Docs can happen later." | Later docs lose decision context and often never get written. |
| "Nothing changed externally." | Operator, developer, and architecture docs often need updates for internal changes. |
| "I'll skip docs for this one." | Skipped docs must be recorded as intentionally skipped — silence is not an option. |

# Verification

- Docs reflect implemented behavior.
- External docs are previewed, not directly written.

# Exit criteria

- `docs_update_report` exists.

# Failure and escalation guidance

Escalate when documentation ownership, audience, or publication approval is unclear.
