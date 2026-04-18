---
description: Start a governed swarm-flow feature run from a natural-language request
argument-hint: "<plain-language request>"
---

Use the local `swarm-flow` CLI to start a feature run from the user's words.

Run:

```bash
swarm-flow start "<plain-language request>"
```

Only use `--title`, `--goal`, or `--flow` when the user explicitly wants to override the inferred values or select a specific flow file.

After the run starts:

1. Read `.runs/<run-id>/run.json`.
2. Summarize current phase, required outputs, and next approval gate.
3. Do not treat chat text as completion. Required outputs must become registered artifacts.
4. Keep external writes in preview mode.
