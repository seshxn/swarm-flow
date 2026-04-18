---
description: Record a human approval for a swarm-flow phase
argument-hint: "<phase>"
---

Use this only when the user explicitly approves a phase.

Run:

```bash
swarm-flow approve "<phase>" --by human
```

Then show the updated approval record from `.runs/<run-id>/run.json`.

Never approve on behalf of the user.
