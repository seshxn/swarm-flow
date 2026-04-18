# Preview: Admin Bulk Case Reassignment

This page update would document the new admin bulk reassignment workflow.

## Behavior

Admins with region-level permission can reassign open cases in a selected region to a target assignee. Each successful reassignment writes an audit event.

## Operational Notes

- Roll out behind a feature flag.
- Monitor audit event volume.
- Confirm partial failure behavior with support before broad rollout.
