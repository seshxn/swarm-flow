---
description: Resume the latest swarm-flow run from durable state
---

Run:

```bash
swarm-flow resume
swarm-flow status
swarm-flow artifacts
```

Then read the latest `.runs/<run-id>/run.json` and continue from `current_phase`.

Rules:

1. Use the flow's required outputs as the phase checklist.
2. Create or update artifacts under `.runs/<run-id>/artifacts/`.
3. Do not skip approval-required phases.
4. If validation fails, open or update a repair-loop artifact instead of pushing forward.
