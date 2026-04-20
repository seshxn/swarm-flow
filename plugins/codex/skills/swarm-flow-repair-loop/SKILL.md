---
name: swarm-flow-repair-loop
description: Use when swarm-flow validation fails, review reports have blockers, tests fail repeatedly, or a phase needs a documented repair loop.
---

# swarm-flow Repair Loop

Use this skill when the run cannot safely advance because validation, review, QA, or policy gates failed.

## Process

1. Inspect the failing state:

```bash
swarm-flow status
swarm-flow artifacts
swarm-flow context pack
```

2. Read the debugging and repair skill cards:

```bash
swarm-flow skills inspect validation/systematic-debugging
swarm-flow skills inspect validation/repair-loop
```

3. Document the failure, reproduction evidence, root-cause hypothesis, attempted fixes, and next decision.
4. Register the repair-loop artifact:

```bash
swarm-flow artifact add repair_loop <file>
```

5. Do not complete the phase until the repair evidence shows the blocker is resolved or escalated.

## Rules

- No fourth blind fix after repeated failed hypotheses.
- Fix root cause, not symptoms.
- Preserve failing and passing evidence.

## Exit Criteria

- Repair-loop artifact is registered.
- Root cause and verification evidence are documented.
- The original blocker is resolved or explicitly escalated to the user.
