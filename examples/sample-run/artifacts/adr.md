# ADR: Reuse Single-Case Reassignment Logic for Bulk Reassignment

## Context

Bulk reassignment needs audit history and role checks. Existing single-case reassignment already enforces those concerns.

## Decision

Implement bulk reassignment as an orchestrator over the existing single-case reassignment service rather than introducing a direct bulk update path.

## Alternatives

- Direct bulk update in the database.
- Background job with a new assignment pipeline.

## Consequences

- Positive: reuses proven authorization and audit behavior.
- Positive: easier regression testing against existing behavior.
- Negative: large batches may be slower.
- Negative: partial failure handling must be explicit.
