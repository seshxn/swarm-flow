# Flow Model

A flow is the canonical SDLC graph for a delivery pattern.

## Goals

Flows must be:

- deterministic
- resumable
- inspectable
- policy-aware
- artifact-driven

## Shape

```yaml
id: feature-default
name: Feature Delivery
description: Standard governed flow for taking a feature from idea to shipped change.
phases:
  - id: intake
    description: Normalize the feature request
    agents: [pm]
    required_outputs: [feature_brief]
    hooks:
      before: [load_project_context]
      after: [persist_artifacts]
```

## Rules

- Phase IDs must be unique.
- Dependencies must reference known phases.
- Cycles are invalid.
- Required outputs are artifact IDs, not prose promises.
- Approval requirements belong on the phase and are enforced by policy.

## Transition Semantics

A phase can be completed only when each `required_outputs` entry is present in the run artifact registry and any phase-specific policy gate allows progress. The next phase is the first incomplete phase whose dependencies are all complete.

## Bundled Flow Families

`feature-default`, `bugfix-fastlane`, `refactor-guided`, `spike-research`, and `incident-remediation` cover focused delivery patterns.

`epic-delivery` is the umbrella flow for broad work. It maps an epic or objective to stories, plans PR-sized slices, validates implementation with QA and review swarms, previews external sync, and packages delivery evidence.

`review-only` runs the code review swarm against a GitHub PR without requiring a full epic run. It still produces `review_report`, `pr_size_assessment`, `github_comments_preview`, and `external_posting_selection`.

`qa-only` runs the QA swarm against a PR, ticket, deploy preview, local URL, or test target. It produces QA evidence and test-gap artifacts without changing product scope.

The standalone review and QA flows are reusable capabilities. Full epic delivery can call them as validation phases, while developers can invoke them directly when they only need review or QA support.
