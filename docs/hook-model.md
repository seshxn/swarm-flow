# Hook Model

Hooks define automation that fires around meaningful transitions.

## Hook Types

- `before_run`
- `after_run`
- `before_phase`
- `after_phase`
- `before_tool_write`
- `after_tool_write`
- `on_validation_failure`
- `on_pr_open`
- `on_ci_failure`
- `on_merge`

## Design Goals

Hooks should make the flow feel alive without making it chaotic. They should be explicit, logged, policy-aware, and safe to retry.

## Starter Hook Layout

- `hooks/before-run/`: load repository metadata and baseline context.
- `hooks/before-phase/`: gather phase-specific context.
- `hooks/after-phase/`: persist and validate artifacts.
- `hooks/validation-failure/`: open repair loops.
- `hooks/pr-events/`: draft or update PR materials.
- `hooks/ci-events/`: collect CI evidence and trigger repair.
- `hooks/after-run/`: package release and follow-up artifacts.

## Example

```yaml
id: sync-jira-after-ticketing
trigger: after_phase
phase: ticketing
conditions:
  - artifact_exists:jira_mapping
actions:
  - connector:jira.create_or_update
  - artifact:write sync_report
  - log:event
```
