# Artifact Model

Artifacts are the heart of swarm-flow.

Agents are temporary. Artifacts are durable.

## Core v0.1 Artifacts

- `feature-brief.md`
- `discovery-report.md`
- `assumptions-log.md`
- `acceptance-criteria.md`
- `technical-design.md`
- `adr.md`
- `task-plan.md`
- `jira-mapping.json`
- `review-report.md`
- `qa-report.md`
- `release-notes.md`
- `pr-summary.md`

## Artifact Registry

`run.json` tracks each artifact with:

- artifact ID
- path
- media type
- producing phase
- creation timestamp

## Advancement Rule

A phase is complete only when its required artifacts exist and pass validation.

## Path Rule

Artifacts live under `.runs/<run-id>/artifacts/`. Generated previews and delivery outputs live under `.runs/<run-id>/outputs/`.
