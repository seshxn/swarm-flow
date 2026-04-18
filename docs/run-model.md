# Run Model

A run is one execution of a flow for a specific piece of work.

## Run Workspace

```text
.runs/
  run-2026-04-17-bulk-reassign/
    run.json
    context/
    artifacts/
    decisions/
    logs/
    outputs/
```

## `run.json`

The run state tracks:

- run id
- repository root
- feature title and goal
- flow id and flow snapshot
- current phase
- completed phases
- artifact registry
- agent executions
- hook executions
- policy decisions
- approvals
- tool writes
- connector write previews
- logs
- unresolved assumptions

## Resumability

Resuming a run means reading `run.json`, inspecting the current phase, checking required outputs, and continuing from the next valid transition. The system should never depend on chat history to know what happened.
