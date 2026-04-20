---
name: swarm-flow-phase
description: Use when operating the current swarm-flow phase, checking phase requirements, registering artifacts, validating policy, or advancing to the next phase.
---

# swarm-flow Phase Work

Use this skill to keep Codex aligned to the active swarm-flow run state instead of chat memory.

## Process

1. Inspect the active phase:

```bash
swarm-flow phase
swarm-flow resume
swarm-flow artifacts
```

2. Pack current context before producing or reviewing phase artifacts:

```bash
swarm-flow context pack
```

3. Register each completed artifact:

```bash
swarm-flow artifact add <artifact_id> <file>
```

4. Check policy before completion:

```bash
swarm-flow policy check
```

5. Complete the phase only after required artifacts are registered and any required approval is explicit:

```bash
swarm-flow complete <phase>
```

## Rules

- Do not advance based on a chat summary.
- Do not invent missing artifacts.
- Do not record approvals unless the user explicitly approves the named phase.
- If a gate blocks progress, write or update the relevant artifact rather than bypassing the gate.

## Exit Criteria

- The current phase and required outputs were inspected.
- Required outputs are registered in `run.json`.
- Policy passes or blocking reasons are reported.
- The phase advances only through `swarm-flow complete`.
