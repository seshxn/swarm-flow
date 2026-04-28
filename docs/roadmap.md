# Roadmap

## Milestone 1: Local-Only Orchestration

- flow engine
- artifact store
- run state
- local repo scanning
- markdown artifact generation

## Milestone 2: Skills and Hooks

- skill format
- hook runtime
- validation of required outputs
- phase entry and exit automation

## Milestone 3: External Connectors

- connector capability registry
- Jira and Confluence preview-safe backends
- GitHub PR context and comment previews
- Slack summary previews
- selected external comments
- later live MCP/plugin writes behind policy gates

## Milestone 4: Implementation and Validation Loop

- branch creation
- code changes
- lint, typecheck, and tests
- reviewer and QA pass
- standalone review-only swarm runs
- standalone QA-only swarm runs
- manageable PR size assessment

## Milestone 5: Governance

- approvals
- policies
- dry-run and audit logs
- strict modes

## Milestone 6: Evidence and Repair Orchestration

- artifact quality validation against phase expectations
- evidence graph linking runs, phases, artifacts, approvals, policy decisions, previews, and repairs
- policy explain output with remediation commands
- managed subagent dispatch lifecycle state
- first-class validation repair loops

## Milestone 7: Governed Apply and Operator UI

- approved filesystem preview apply inside the repository boundary
- live external connectors only after preview, idempotency, and explicit approval
- static local run dashboard for operators
- future hosted dashboard and richer connector-specific rollback metadata
