# Contributing

swarm-flow is early, and the most useful contributions are the ones that strengthen governed, artifact-driven delivery without turning the project into a prompt dump.

## Good Contribution Lanes

- **Flows**: add or improve YAML phase graphs for feature delivery, bugfixes, PR review, QA, documentation, release, or incident work.
- **Skills**: add reusable workflow cards that explain how a phase should be executed well.
- **Agents**: refine bounded role cards for scout, PM, architect, implementer, reviewer, QA, docs, and release responsibilities.
- **Hooks**: define transition automation that records evidence and keeps runs resumable.
- **Policies**: add approval gates, risk checks, and explainable decisions.
- **Connectors**: add preview-safe contracts and adapters for external systems.
- **Examples**: contribute realistic sample runs with acceptance criteria, design notes, QA reports, and connector previews.
- **Integrations**: test the Claude Code and Codex bundles against real repositories and report friction.

## Design Rules

- Keep flows, policies, artifacts, hooks, connectors, and role cards as separate concepts.
- Preserve artifact-driven progression. Runs should advance through registered outputs, not chat claims.
- Keep external writes preview-first, idempotent, and policy-gated.
- Prefer small package boundaries over broad cross-cutting modules.
- Be honest about unsupported capability. Preview connectors should not pretend to be live clients.

## Before Opening a PR

Run the repository verification commands:

```bash
npm test
npm run typecheck
npm run build
```

For behavior changes in `packages/core`, `packages/runtime`, `packages/connectors`, or `packages/cli`, add focused tests before implementation changes.

## Useful PR Shapes

- one new flow with a matching example run
- one connector preview contract plus tests
- one CLI workflow improvement with docs
- one role card or skill improvement with a short rationale
- one documentation pass that makes installation or contribution easier

If the change affects governance, approvals, connector writes, or run progression, include a short risk note in the PR description.
