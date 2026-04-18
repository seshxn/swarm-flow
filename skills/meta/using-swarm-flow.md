---
id: meta/using-swarm-flow
title: Using swarm-flow
phase: meta
triggers:
  - agent enters any phase
  - agent is about to act within a run
inputs:
  - current phase from run.json
outputs:
  - skill invocation decision
---

# Purpose

Govern how agents discover and invoke phase skills within a swarm-flow run. Prevents agents from acting from intent alone — every meaningful phase action should be preceded by a skill check.

# When to use

Use at the start of every phase entry. Use when uncertain whether a skill applies. Use before any action that produces an artifact.

# When NOT to use

Do not invoke for trivial single-file reads or status checks. Do not invoke recursively (this skill does not require invoking itself).

# Prerequisites

- `run.json` is readable and `current_phase` is known.

# The 1% Rule

> If there is even a 1% chance a skill might apply to what you are doing, you MUST check it.

This is not optional. Acting from memory or general knowledge instead of an explicit skill is the primary source of inconsistent agent output.

# Phase → Skill Map

| Phase | Skills to check |
|-------|----------------|
| `intake` | `intake/normalize-feature-request`, `intake/extract-business-goal`, `intake/identify-unknowns` |
| `discovery` | `discovery/repo-context-mapping`, `discovery/risk-scan`, `discovery/assumptions-log`, `discovery/dependency-map` |
| `planning` | `planning/acceptance-criteria-writing`, `planning/task-breakdown`, `planning/edge-case-enumeration` |
| `design` | `design/technical-design-draft`, `design/adr-creation`, `design/tradeoff-evaluation` |
| `implementation` | `implementation/incremental-slice-delivery`, `implementation/test-first-change`, `implementation/safe-refactor`, `implementation/git-workflow` |
| `validation` | `validation/code-review`, `validation/regression-check`, `validation/test-gap-check`, `validation/systematic-debugging`, `validation/repair-loop`, `validation/security-review` |
| `documentation` | `documentation/docs-sync`, `documentation/changelog-draft` |
| `release` | `release/pre-merge-checklist`, `release/release-note-draft` |

# Process

```
Agent enters phase
      ↓
Look up phase in skill map above
      ↓
Does any listed skill match what I'm about to do? (1% rule)
      ↓ yes                    ↓ no
Read skill file         Proceed with action
      ↓                        ↓
Follow skill exactly    Document why no skill applied
      ↓
Produce required artifact
      ↓
Check exit criteria
```

# Exact steps

1. Read `current_phase` from `run.json`.
2. Look up the phase in the Phase → Skill Map above.
3. Before taking any action, ask: does any listed skill apply to what I'm about to do?
4. If yes (even 1% likely): read the full skill file and follow it.
5. If no: proceed, but be explicit — note in your output why no skill was needed.
6. After completing the skill, verify exit criteria are met before advancing.

# Anti-rationalization checks

| Thought | Reality |
| --- | --- |
| "I know this phase well — I don't need to check the skill." | Skills evolve. Read the current version. Memory is not authoritative. |
| "This is a simple action — skill invocation is overkill." | Simple actions are where undisciplined shortcuts accumulate. Check first. |
| "I'll check the skill after I start." | Skills change how you start, not just how you finish. Check before acting. |
| "The skill seems redundant given the task description." | Task descriptions say WHAT. Skills say HOW. They are not redundant. |
| "I need more context before I can check for a skill." | Skills tell you how to gather context. Check before gathering. |

# Verification

- [ ] `current_phase` was read from `run.json`, not assumed
- [ ] Phase skill map was consulted
- [ ] Every applicable skill was invoked before action
- [ ] Output artifact exists and is registered

# Exit criteria

- Agent acted only after checking the skill map
- If a skill was found: the skill's exit criteria are met
- If no skill was found: the decision is noted in output

# Failure and escalation guidance

If the current phase has no matching skills (e.g., a new phase was added to the flow but skills haven't been written yet), produce a `skill-gap.md` artifact naming the missing skill and blocking forward progress until it is authored. Do not proceed through a phase with no skill coverage without recording the gap.

---

## Session Start Orientation

When entering a run mid-session (e.g., after a restart):

1. Read `.runs/<run-id>/run.json` — confirm `current_phase` and `completed_phases`
2. Read the `artifact_registry` — know what outputs already exist
3. Read `artifacts/<current-phase>-*.md` if any exist — understand what work was done
4. Check `unresolved_assumptions` — flag anything high-risk before proceeding
5. Then consult the skill map for the current phase
