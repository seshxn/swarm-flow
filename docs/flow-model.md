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
