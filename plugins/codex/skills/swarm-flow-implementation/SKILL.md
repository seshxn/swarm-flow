---
name: swarm-flow-implementation
description: Use during swarm-flow implementation phases to make scoped code changes with test evidence and durable implementation artifacts.
---

# swarm-flow Implementation

Use this skill when the active phase is `implementation`, `fix_plan`, or another code-producing phase.

## Process

1. Load the phase contract and context pack:

```bash
swarm-flow phase
swarm-flow context pack
```

2. Read the relevant swarm-flow implementation skill:

```bash
swarm-flow skills inspect implementation/test-first-change
swarm-flow skills inspect implementation/incremental-slice-delivery
```

3. Write or identify the failing test before implementation.
4. Make the smallest code change that satisfies the current slice.
5. Run the focused test, then the relevant regression command.
6. Record `tests_added` and `code_changes` as artifacts. For `tests_added`, capture red/green evidence through the CLI and keep the generated JSON artifact:

```bash
swarm-flow tdd red --artifact tests_added --command "<failing test command>"
swarm-flow tdd green --artifact tests_added --command "<passing test command>"
swarm-flow tdd status
swarm-flow artifact add tests_added <file>
swarm-flow artifact add code_changes <file>
```

## Rules

- Keep implementation mapped to `task_plan` and `acceptance_criteria`.
- Do not broaden scope during implementation.
- `tests_added` is not complete until valid red and green evidence exists, unless the flow explicitly allows a `test_rationale` artifact.
- If validation fails repeatedly, move into the repair-loop workflow instead of guessing.

## Exit Criteria

- Test evidence exists.
- Code changes are summarized with file paths and commands.
- Required artifacts are registered before completion.
