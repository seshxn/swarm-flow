# Discovery Report

## Sources Reviewed

- `src/cases/` for case assignment workflows.
- `src/auth/roles.ts` for admin role checks.
- `src/audit/` for audit event conventions.
- Existing ticket `OPS-184` describing manual reassignment pain.

## Relevant System Context

Case assignment currently happens one case at a time. Region is already stored on each case, and admin role checks exist for single-case reassignment. Audit events are written for individual assignment changes.

## Likely Affected Areas

- case search and filtering by region
- reassignment service
- authorization checks
- audit event writer
- admin UI bulk action
- validation and regression tests

## Evidence

The existing single-case flow is a useful implementation reference, but bulk operations need explicit partial-failure and audit-volume handling.
