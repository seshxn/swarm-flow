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

## Managed Slice Artifacts

Epic, review-only, and QA-only runs add artifacts that keep large AI-assisted delivery work reviewable:

- `story-map.json`
- `slice-plan.md`
- `pr-size-assessment.md`
- `qa-plan.md`
- `acceptance-matrix.md`
- `exploratory-qa-report.md`
- `regression-risk-report.md`
- `test-gap-report.md`
- `browser-artifacts.json`
- `accessibility-report.md`
- `github-comments.preview.json`
- `jira-comments.preview.json`
- `slack-update.preview.md`
- `external-posting-selection.json`
- `qa-swarm-report.md`
- `review-swarm-report.md`
- `delivery-package.md`

These artifacts do not replace human judgment. They make scope, risk, proposed comments, selected comments, and residual gaps inspectable.

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
