# Modernization Plan: swarm-flow vNext

This plan upgrades swarm-flow from a strong local orchestration base into a production-grade, worktree-first, governed agentic delivery engine.

## Outcomes

- clearer planner -> implementer -> verifier -> reviewer execution model
- stronger artifact contracts between phases
- safer external-write controls with explicit risk tiers and approvals
- reproducible engineering standards for CI, security, releases, and docs
- scalable parallel delivery using git worktrees

## Guiding Principles

- Artifact contracts over chat claims.
- Preview-first external writes with policy gates.
- Human approvals for high-risk transitions and irreversible actions.
- Verifier loops over optimistic execution.
- Worktree-per-slice for parallel changes.

## Priority Epics

### Epic 1: Agentic execution architecture

- Add explicit phase loop model: planner -> implementer -> verifier -> reviewer.
- Define schema-enforced handoff contracts for phase artifacts.
- Add bounded repair loops when validators fail.
- Track run-level cost and latency budgets.
- Record durable observability events per decision and phase transition.

Acceptance:
- run progression cannot skip required artifacts
- verifier failures create explicit repair/exception artifacts
- phase history includes validator and policy outcomes

### Epic 2: Governance and safety hardening

- Introduce risk tiers for connector actions.
- Require policy + approval for high-risk write transitions.
- Enforce richer preview metadata (target, rationale, idempotency key, actor).
- Add auditable exception workflow for policy overrides.

Acceptance:
- high-risk transitions fail closed without approvals
- previews include required metadata and are persisted

### Epic 3: Worktree-first delivery standard

- Standardize worktree naming, branch naming, and lifecycle.
- Document per-worktree isolation for caches, ports, and env.
- Map worktree slices to independent PRs targeting main.

Acceptance:
- contributors can run multiple parallel slices without collisions
- branch/worktree naming is deterministic and automation-friendly

### Epic 4: CI/security/supply-chain baseline

- Harden CI with deterministic installs and concurrency cancellation.
- Add dedicated security workflow (dependency audit + code scanning baseline).
- Generate SBOM artifacts from CI.
- Prepare release hygiene (semantic commits + changelog/release pipeline).

Acceptance:
- CI remains green while enforcing stricter baseline checks
- security and SBOM workflows run on PRs/main and keep artifacts

### Epic 5: Contributor and review quality bar

- Enforce semantic commit conventions.
- Add PR evidence requirements (tests, risks, artifacts touched).
- Add CODEOWNERS for critical ownership boundaries.
- Add ADR expectation for major architecture changes.

Acceptance:
- every non-trivial PR includes risk + evidence notes
- ownership and review routing are explicit

## Rollout Strategy

1) Introduce docs + templates + ownership files first.
2) Introduce CI/security/SBOM workflows in separate PR.
3) Roll in runtime/core behavior upgrades in small, test-backed slices.
4) Enable stricter protections (rulesets, required checks) after baseline stability.

## Worktree Delivery Pattern

For parallel improvements, use one worktree per slice:

- `feat/<ticket>-<area>-<slug>` branch naming
- one active branch per worktree
- one PR per worktree slice
- prune/remove worktrees after merge

See `docs/worktree-development.md` for full procedure.

## Verification Standard

Before merge, run:

```bash
npm test
npm run typecheck
npm run build
```

For behavior changes in `packages/core`, `packages/runtime`, `packages/connectors`, and `packages/cli`, add tests before implementation changes.
