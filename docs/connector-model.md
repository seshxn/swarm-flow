# Connector Model

Connectors let swarm-flow read from and write to external tools.

## Contract

Every connector should expose:

- `read()`
- `search()`
- `create()`
- `update()`
- `preview_write()`
- `validate_permissions()`

## Write Safety

All writes should support:

- dry run
- preview mode
- idempotency key
- rollback metadata
- write log entry

In v0.1, starter connectors are preview-first implementations. They make the integration contract concrete without writing to live Jira, Confluence, GitHub, or CI systems.

## First Connectors

- Git
- GitHub
- Jira
- Confluence
- CI
- local filesystem
