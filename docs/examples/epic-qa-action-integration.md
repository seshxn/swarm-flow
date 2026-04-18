# Epic QA Action Integration

This example shows where the first-party QA Action feeds into an `epic-delivery` run.

```text
epic-delivery
  -> implementation
      -> slice_to_pr_map.json
      -> code_changes
      -> tests_added
  -> qa_swarm
      -> collect existing GitHub Action QA artifact
      -> dispatch missing QA run later
      -> normalize qa_report, test_gap_report, and validation_status
      -> write github-comments.preview.json without posting comments
  -> review_swarm
  -> status_sync
      -> user selects external updates to post
```

## Artifact Handoff

The QA Action writes governed evidence into `.runs/<run-id>/artifacts/`. Parent epic runs can consume those artifacts without treating the GitHub Action as the source of truth.

Required artifacts:

- `qa-context.json`
- `qa-report.md`
- `test-gap-report.md`
- `validation-status.md`
- `github-comments.preview.json`

Optional artifacts:

- Playwright JSON output
- screenshots
- traces
- videos
- evidence manifest

## Parent Epic Contract

During `qa_swarm`, the parent run should:

1. Read `slice_to_pr_map.json` from implementation planning.
2. For each PR slice, check whether a matching QA Action artifact exists.
3. Import or link `qa-context.json`, `qa-report.md`, `test-gap-report.md`, and `validation-status.md`.
4. Mark missing deploy targets as blockers or assumptions.
5. Register normalized QA artifacts in the parent run.
6. Leave `github-comments.preview.json` in preview mode until `status_sync` records a selected posting decision.

The parent run should not infer success from a completed GitHub Action alone. It should read `validation-status.md` and apply policy gates before delivery.
