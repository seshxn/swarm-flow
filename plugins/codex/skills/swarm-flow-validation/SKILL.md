---
name: swarm-flow-validation
description: Use during swarm-flow validation, review-only, or QA-only phases to produce evidence-backed review, QA, test-gap, and validation-status artifacts.
---

# swarm-flow Validation

Use this skill when proving a change is ready or when running standalone review or QA swarms.

## Process

1. Inspect the validation phase:

```bash
swarm-flow phase
swarm-flow context pack
```

2. Read the relevant validation skill cards:

```bash
swarm-flow skills inspect validation/code-review
swarm-flow skills inspect validation/test-gap-check
swarm-flow skills inspect validation/regression-check
```

3. Review acceptance criteria and implementation evidence before reading the diff.
4. Run the agreed verification commands.
5. Produce `review_report`, `qa_report`, and `validation_status` as required by the active flow.
6. Register artifacts with `swarm-flow artifact add`.
7. If validation fails, use `swarm-flow-repair-loop`.

## Rules

- Findings must cite files, artifacts, commands, or connector results.
- Passing tests alone are not review approval.
- External comments stay as previews until the user selects them.

## Exit Criteria

- Validation artifacts are registered.
- Blocking findings are resolved or explicitly escalated.
- Policy check passes before phase completion.
