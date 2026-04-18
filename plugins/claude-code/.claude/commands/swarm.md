---
description: Start or resume a governed swarm-flow run from a plain-language request
argument-hint: "[plain-language delivery request]"
---

Use this as the default swarm-flow entrypoint.

If a run already exists:

```bash
swarm-flow status
swarm-flow resume
swarm-flow artifacts
```

Read the latest `.runs/<run-id>/run.json`, continue from `current_phase`, and use the flow's `required_outputs` as the phase checklist.

If no run exists and the user supplied a request, start a feature run directly from the user's words:

```bash
swarm-flow start "<plain-language request>"
```

If no run exists and no request was supplied, ask for the feature, bug, refactor, research question, or incident to run through swarm-flow.

Rules:

1. Do not require separate title and goal arguments unless the user wants to override them.
2. Treat `.runs/<run-id>/run.json` and registered artifacts as source of truth.
3. Write durable artifacts under `.runs/<run-id>/artifacts/`.
4. Keep Jira, Confluence, GitHub, and other external writes in preview mode.
5. Never record approvals unless the user explicitly approves a named phase.
6. If validation fails, open or update a repair-loop artifact instead of pushing forward.
