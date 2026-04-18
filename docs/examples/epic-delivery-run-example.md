# Epic Delivery Run Example

This example shows how a broad epic moves through managed slices without creating noisy external writes.

## Input

```text
swarm-flow epic ABC-123
```

The run records:

- scope: `epic`
- target: `ABC-123`
- flow: `epic-delivery`

## Story Map

`story-map.json` previews proposed stories before writing to Jira:

```json
{
  "mode": "preview",
  "source": {
    "type": "jira_epic",
    "id": "ABC-123"
  },
  "stories": [
    {
      "idempotencyKey": "run-abc-123:story:permissions",
      "operation": "create",
      "type": "Story",
      "summary": "Add permission checks for bulk reassignment",
      "dependsOn": [],
      "risk": "medium"
    }
  ]
}
```

## Slice Plan

`slice-plan.md` maps stories to reviewable PRs:

```text
PR 1: Permission checks
PR 2: Bulk reassignment service
PR 3: Admin UI entry point
PR 4: QA and regression coverage
```

The plan also records files, package boundaries, validation evidence, and work that must not be bundled.

## Review and QA Swarms

The review swarm produces:

- `review-report.md`
- `pr-size-assessment.md`
- `github-comments.preview.json`

The QA swarm produces:

- `qa-plan.md`
- `acceptance-matrix.md`
- `regression-risk-report.md`
- `test-gap-report.md`
- `qa-report.md`

## Selected Comments

The user can preview comments:

```bash
swarm-flow comments preview --run run-2026-04-18-abc-123
```

Then select comments:

```bash
swarm-flow comments select --run run-2026-04-18-abc-123 --ids comment-1,comment-2
```

Selection records `external-posting-selection.json` and updates run state. It does not post comments automatically.

## Delivery Package

The delivery phase packages:

- PR summary
- merge checklist
- selected external updates
- unresolved assumptions
- residual risk
- rollback notes
