# Dependency Map

```text
Admin UI bulk action
  -> case search API
  -> reassignment service
    -> role/region authorization
    -> case repository
    -> audit event writer
  -> notification/reporting surface
```

## External Dependencies

- Jira preview for delivery tasks.
- Confluence preview for operational documentation.
- CI validation before PR readiness.
