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
- run scope
- target URL, ticket, PR, local target, or plain text target
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
- external comment previews
- external posting selections
- logs
- unresolved assumptions

## Run Scopes

Runs can represent different levels of work:

- `epic` for full epic-to-delivery orchestration
- `story`, `feature`, `bugfix`, `refactor`, `spike`, and `incident` for focused delivery
- `review` for standalone PR review swarms
- `qa` for standalone QA swarms

The `target` field records the external or local object being worked on, such as a Jira key, GitHub PR URL, deploy preview URL, local URL, or plain text objective.

## Comment Preview Lifecycle

Review and QA runs can create comment previews under `.runs/<run-id>/outputs/previews/`. Selecting comments records `external_posting_selection` in `run.json`.

No comment is posted automatically. A later connector write must use the selected IDs, policy decision, idempotency key, and audit log entry.

## GitHub Action QA Evidence

The first-party QA Action writes run artifacts under `.runs/<run-id>/artifacts/` and uploads `.runs` as a GitHub Actions artifact. The expected QA artifact names are:

- `qa-context.json`
- `qa-report.md`
- `test-gap-report.md`
- `validation-status.md`
- `github-comments.preview.json`

Parent `epic` runs may import or link these artifacts during `qa_swarm`, but they still apply swarm-flow policy before progressing to delivery.

## Resumability

Resuming a run means reading `run.json`, inspecting the current phase, checking required outputs, and continuing from the next valid transition. The system should never depend on chat history to know what happened.
