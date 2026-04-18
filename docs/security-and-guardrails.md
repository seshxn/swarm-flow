# Security and Guardrails

swarm-flow should be safe by default.

## Guardrails

- External writes require preview mode unless policy explicitly permits direct writes.
- Connectors must validate permissions before attempting writes.
- Tool writes must produce log entries.
- Policy decisions must be persisted.
- Approvals must include actor, timestamp, phase, and optional note.
- Risk scores above policy threshold require explicit approval.

## Threats

- hallucinated understanding
- Jira or Confluence spam
- over-automation
- poor agent coordination
- low trust from missing evidence

## Mitigations

- source collection and assumptions logs
- preview mode and idempotency keys
- approval gates
- specialist role boundaries
- artifact-first progression
