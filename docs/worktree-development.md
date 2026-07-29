# Worktree Development Standard

Use git worktrees to run parallel swarm-flow slices safely.

## Why worktrees

- parallel implementation without branch checkout thrash
- isolated feature slices with clean PR boundaries
- safer multi-agent or multi-terminal development

## Naming conventions

- branch: `feat/<ticket>-<area>-<slug>`
  - example: `feat/SF-142-governance-worktree-standard`
- worktree directory: `<ticket>-<area>`
  - example: `SF-142-governance`

Keep ticket and area in both branch and directory for automation and traceability.

## Recommended layout

- main repo: `~/Documents/GitHub/swarm-flow`
- worktrees root: `~/Documents/GitHub/.worktrees/swarm-flow/`

## Create a new slice worktree

From the main repo:

```bash
mkdir -p ../.worktrees/swarm-flow
git fetch origin
git worktree add ../.worktrees/swarm-flow/SF-142-governance -b feat/SF-142-governance-worktree-standard main
```

## Worktree isolation guidance

Inside each worktree, isolate caches and local runtime state when running tools in parallel:

```bash
export XDG_CACHE_HOME="$PWD/.cache"
export npm_config_cache="$PWD/.npm-cache"
```

If running local services/tests needing ports, use a unique port range per worktree.

## Per-worktree workflow

1. Bootstrap dependencies.
2. Implement one focused slice.
3. Run verification:

```bash
npm test
npm run typecheck
npm run build
```

4. Commit with semantic commits.
5. Push branch and open a PR to `main`.

## Cleanup after merge

From main repo:

```bash
git worktree remove ../.worktrees/swarm-flow/SF-142-governance
git branch -d feat/SF-142-governance-worktree-standard
git worktree prune
```

## Guardrails

- one branch must not be checked out in multiple worktrees
- avoid direct pushes to protected branches
- keep PRs small and evidence-backed
- if a slice changes governance/approvals/connectors, include risk notes in PR
