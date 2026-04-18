---
id: implementation/git-workflow
title: Git Workflow
phase: implementation
triggers:
  - implementation phase begins
  - code changes are about to be committed
  - a branch needs to be prepared for delivery
inputs:
  - run id
  - task_plan
outputs:
  - committed code on a named branch ready for PR
---

# Purpose

Keep implementation history clean, reviewable, and reversible. Each commit is a save point. Each branch is a sandbox. With agents generating code at speed, disciplined version control is the mechanism that keeps changes manageable.

# When to use

Use at the start of implementation to set up the branch, and before each commit. Use when preparing a branch for delivery.

# When NOT to use

Do not use to batch all changes into a single commit. Do not force-push to main or shared branches.

# Prerequisites

- A clean working directory (or staged changes with intent known).
- A run ID from `run.json`.

# Branch Naming

```
swarm/<run-id-slug>/<short-description>

Example:
swarm/gaps-2026-04-18/add-meta-skills
```

Use the run ID slug so branches are traceable to their originating run.

# Process

```
Start of implementation
        ↓
Create branch: swarm/<run-id-slug>/<description>
        ↓
For each task slice:
  implement → test → commit
        ↓
Commit message format:
  <type>(<scope>): <what changed>
  Types: feat | fix | refactor | docs | chore
        ↓
Before delivery:
  rebase on main if needed
  run full test suite
  verify no debug/temp code remains
        ↓
Branch is ready for PR
```

# Exact steps

1. Create a branch named `swarm/<run-id-slug>/<short-description>` before any code changes.
2. For each task slice: implement, run tests, then commit — do not batch multiple slices into one commit.
3. Write commit messages in format: `<type>(<scope>): <what changed>`. One sentence, imperative mood.
4. Never commit: secrets, debug logs, commented-out code blocks, or temp files.
5. Before delivery: rebase on main if the branch is stale; resolve conflicts explicitly.
6. Run the full test suite from a clean state before opening a PR.
7. Verify no `TODO`, `FIXME`, `console.log`, or temp scaffolding remains in committed files.

# Commit Message Types

| Type | When |
|------|------|
| `feat` | New capability added |
| `fix` | Bug corrected |
| `refactor` | Behavior unchanged, structure improved |
| `docs` | Documentation only |
| `chore` | Tooling, config, dependencies |

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "I'll commit everything at the end." | Large commits are unreviable and unrevertable at slice granularity. |
| "The branch name doesn't matter." | Untraceable branches become orphaned work. |
| "I'll clean up the commits before the PR." | Clean-as-you-go produces better history than post-hoc squashing. |
| "One more change before I commit." | Unbounded accumulation is how commits become 40-file diffs. |

# Verification

- [ ] Branch name follows `swarm/<run-id-slug>/...` convention
- [ ] Each committed slice is independently testable
- [ ] Commit messages use type prefix
- [ ] No secrets, debug code, or temp files in commits
- [ ] Full test suite passes from clean state

# Exit criteria

- Branch exists with commits per slice.
- Commit messages are descriptive.
- Branch is rebased on main.
- Tests are green.

# Failure and escalation guidance

If a conflict cannot be resolved without changing scope, produce an implementation blocker artifact naming the conflict and affected acceptance criteria. Do not silently merge or discard changes.
