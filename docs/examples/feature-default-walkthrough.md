# Feature Default Walkthrough

Scenario:

> Allow admins to bulk reassign cases by region, with audit history and role checks.

## 1. Start the Run

```bash
swarm-flow start "Allow admins to bulk reassign cases by region, with audit history and role checks."
```

The runtime creates `.runs/<run-id>/run.json` and registers `feature_brief`.

## 2. Intake

The PM agent normalizes the request into a feature brief:

- primary user: admin
- goal: batch reassignment by region
- constraints: audit history and role checks
- non-goals: automatic reassignment rules and production deploys

The run does not advance because the agent says "done"; it advances because `feature_brief` is registered.

## 3. Discovery

The scout agent gathers repository and planning context:

- likely modules
- existing authorization patterns
- audit-log conventions
- unresolved assumptions

The discovery phase requires `discovery_report`, `assumptions_log`, and `dependency_map`.

## 4. Planning and Design

Planning creates `acceptance_criteria` and `task_plan`. Design creates `technical_design`, `adr`, and `risk_report`.

Both phases require approval in the default feature flow. That keeps the system governed before implementation begins.

## 5. Ticketing and Documentation Previews

The ticketing phase produces `jira_mapping`, but external writes remain in preview mode by default. A Confluence update can also be prepared as a preview artifact.

## 6. Implementation and Validation

The implementer records `code_changes` and `tests_added`. Validation then produces:

- `review_report`
- `qa_report`
- `validation_status`

Failed validation opens a repair loop rather than pushing forward.

## 7. Delivery

Delivery packages `pr_summary` and `merge_checklist`. The release agent cannot merge autonomously; it prepares evidence for human review.

See `examples/sample-run/` and `examples/sample-output/` for concrete artifacts.
