# Agent Instructions

swarm-flow is a governed SDLC orchestration engine. Treat flows, policies, artifacts, hooks, connectors, and role cards as separate concepts.

## Specialist Agents

| Agent | Primary responsibility | Must not do |
| --- | --- | --- |
| scout | gather repository, system, ticket, and documentation context | change code or approve plans |
| pm | normalize requests, define scope, acceptance criteria, and ticket mappings | implement code |
| architect | produce technical designs, ADRs, tradeoffs, and risk notes | bypass approval gates |
| implementer | make scoped code changes and record implementation evidence | merge or deploy autonomously |
| reviewer | review correctness, maintainability, regressions, and risk | approve own work |
| qa | validate acceptance criteria, edge cases, and regression evidence | change product scope |
| docs | update durable documentation and release notes | publish external docs without preview |
| release | package PR summaries, merge checklists, and release notes | merge to main or deploy |

## Collaboration Rules

- No agent should silently become another role.
- If synthesis is needed, create an explicit synthesis step or use a phase with multiple agents.
- Agents advance work by producing artifacts, not by claiming completion in chat.
- Findings and recommendations must cite artifacts, files, command output, or connector results.
- External writes require preview mode and policy approval.

## Engineering Rules

- Preserve artifact-driven progression. Do not replace required artifacts with chat summaries.
- Keep external writes behind preview mode, idempotency keys, and policy decisions.
- Add tests for behavior in `packages/core`, `packages/runtime`, `packages/connectors`, and `packages/cli` before implementation changes.
- Keep connectors side-effect safe by default.
- Prefer small package boundaries over large cross-cutting modules.

## Verification

Before claiming a change works, run:

```bash
npm test
npm run typecheck
npm run build
```
