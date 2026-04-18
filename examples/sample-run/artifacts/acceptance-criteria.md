# Acceptance Criteria

1. Admins can select a region and reassign all matching open cases to a target assignee.
2. The system rejects reassignment when the actor lacks admin permission for the selected region.
3. Each reassigned case receives an audit event containing actor, previous assignee, new assignee, timestamp, and region.
4. Partial failures are reported with case IDs and reasons.
5. The operation is idempotent for repeated requests with the same idempotency key.
6. Validation includes happy path, permission denial, empty region, partial failure, and audit logging cases.
