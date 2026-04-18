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
- Cannot post external comments without user selection by default.
- Cannot advance oversized PRs when manageable PR policy marks them blocked.

## Approval Points

Default approval checkpoints:

- after discovery
- after planning
- after design
- before delivery or merge

## Decision Shape

Policy checks return a decision with `allowed` and `reasons`. Callers should persist the decision in `run.json` so blocked transitions are explainable later.

## Manageable PR Policy

`manageable_pr_policy` keeps AI-assisted work reviewable. It can warn or block based on changed files, changed lines, packages touched, mixed migrations and behavior changes, unrelated concerns, and missing `slice_plan` artifacts.

Default posture should be conservative:

- warn when a PR is getting hard to review
- block when a PR exceeds hard limits
- allow an explicit approval override when policy permits it
- require concrete split recommendations for oversized work

## External Comment Posting Policy

`external_comment_posting` defaults to preview-first behavior:

```yaml
external_comment_posting:
  default_mode: preview
  require_user_selection: true
  allow_auto_post: false
```

Review and QA swarms may propose GitHub, Jira, or Slack comments, but the user chooses which comments to post. Skipped comments remain in artifacts for audit.
