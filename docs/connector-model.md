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
- Slack
- CI
- local filesystem

## Backend Capabilities

MCPs and agent plugins are connector backends, not the workflow authority. For example, an Atlassian MCP can back Jira and Confluence access, a GitHub plugin or CLI can back GitHub access, and a Slack MCP can back Slack access.

The connector contract stays the same regardless of backend. The first capability registry should be static and preview-safe: it can report available backend kinds such as `atlassian_mcp`, `github_plugin`, `gh_cli`, `slack_mcp`, and `preview`, but live backend probing and writes must still preserve preview mode, idempotency keys, rollback metadata, policy decisions, and audit logs.
