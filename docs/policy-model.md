# Policy Model

Policies decide whether a run may continue or write to external systems.

## Goals

- prevent unsafe autonomy
- force human approval at key transitions
- stop noisy writes
- ensure validation exists before delivery
- make exceptions visible

## Default Gates

- Cannot create Jira issues before planning outputs exist.
- Cannot update Confluence before design is generated.
- Cannot enter implementation without approved acceptance criteria.
- Cannot enter delivery if validation failed.
- Cannot merge if risk score is above threshold without approval.
- Cannot write to external tools without preview unless explicitly allowed.

## Approval Points

Default approval checkpoints:

- after discovery
- after planning
- after design
- before delivery or merge

## Decision Shape

Policy checks return a decision with `allowed` and `reasons`. Callers should persist the decision in `run.json` so blocked transitions are explainable later.
