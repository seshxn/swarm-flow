---
name: swarm-flow-preview-writes
description: Use when preparing Jira, Confluence, GitHub, Slack, filesystem, or other external write previews from a swarm-flow run.
---

# swarm-flow Preview Writes

Use this skill to keep all external coordination preview-first and auditable.

## Process

1. Confirm the active run:

```bash
swarm-flow status
```

2. Create a connector preview:

```bash
swarm-flow preview <target>
```

3. For review or QA comments, create selectable comment previews:

```bash
swarm-flow comments preview
```

4. Record user-selected comments without posting:

```bash
swarm-flow comments select --ids <comment_ids>
```

5. Re-check policy:

```bash
swarm-flow policy check
```

## Rules

- Never perform live external writes from this skill.
- Every preview needs an idempotency key and a connector preview record.
- User selection is not the same as live posting.

## Exit Criteria

- Preview artifacts exist under `.runs/<run-id>/outputs/previews/`.
- `run.json` records the connector preview or external posting selection.
- No live Jira, Confluence, GitHub, or Slack write occurred.
