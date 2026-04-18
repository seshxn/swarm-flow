# PR Summary

## Change

Adds governed bulk case reassignment by region for admins, preserving role checks and audit history.

## Evidence

- Acceptance criteria define permissions, audit events, partial failure, and idempotency.
- Technical design reuses existing single-case reassignment behavior.
- QA plan maps criteria to validation evidence.

## Risk

Main risks are cross-region authorization and audit volume. Both require validation before merge.
