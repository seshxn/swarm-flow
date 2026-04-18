# Technical Design

## Approach

Add a bulk reassignment service that composes existing case search, authorization, reassignment, and audit components. Keep the single-case reassignment path intact and reuse its audit event shape.

## Data Flow

1. Admin submits region, target assignee, and idempotency key.
2. API validates actor permissions for the region.
3. Service queries eligible open cases.
4. Each case is reassigned in a bounded batch.
5. Audit events are written per successful reassignment.
6. Response reports successes and failures.

## Tradeoffs

- Reusing single-case logic reduces risk but may be slower for very large batches.
- A dedicated bulk SQL update would be faster but would bypass existing audit behavior.

## Validation

- Unit tests for authorization and idempotency.
- Integration tests for partial failure and audit events.
- Regression tests for single-case reassignment.

## Rollback

Feature flag the bulk endpoint and UI action. Disable the flag if audit volume or partial failure behavior is unsafe.
