# Repository Audit

This audit records the second-phase hardening pass that moved swarm-flow from an initial draft toward a publishable v0.1 foundation.

## Strengths Found

- The repo already had the core product lane: governed SDLC orchestration rather than generic prompting.
- The package split was directionally right: `core`, `runtime`, `cli`, `connectors`, `adapters`, and `sdk`.
- The initial flow, skill, hook, agent, policy, and schema folders made the architecture visible.
- Tests already covered flow validation, policy checks, run persistence, artifacts, connectors, and CLI basics.

## Critical Gaps Addressed

- Phase completion could advance based on named outputs alone. It now requires registered artifacts.
- Run state did not track pending phases or unresolved risks. Both are now explicit.
- CLI list commands existed, but inspect/show workflows were missing. The CLI now includes flow inspection, flow validation, skill inspection, run listing, and run detail views.
- Connector previews were written as files but not recorded in run state. They are now tracked in `connector_write_previews`.
- Flows were readable but lacked transition semantics. The feature flow now includes phase purpose, transition conditions, output expectations, and risk escalation markers.
- Demo artifacts were too thin. The sample run now contains realistic planning, design, validation, delivery, and external preview artifacts.

## Known v0.1 Limits

- Jira, Confluence, GitHub, and CI connectors are preview-safe starter implementations, not live API clients.
- The runtime persists state locally. The headless `auto` command now receives a current-phase context pack, but full autonomous agent execution is still early.
- Policies are implemented as core evaluators and YAML packs. Agent-facing CLI transitions now evaluate configured policy gates, but richer policy reporting is still future work.
- Implementation work is prepared through artifacts and examples; swarm-flow is not yet an autonomous coding engine.

These limits are intentional. The project should earn trust through inspectable local orchestration before expanding into live external writes or long-running autonomous execution.
