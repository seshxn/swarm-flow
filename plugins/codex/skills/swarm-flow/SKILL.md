---
name: swarm-flow
description: Use when the user asks to build, fix, refactor, research, remediate, resume, inspect, approve, or preview software delivery work in a repository with swarm-flow installed.
---

# swarm-flow

Use this skill to coordinate Codex work through the local `swarm-flow` CLI and `.runs/` workspace. The goal is seamless default behavior: when a non-trivial delivery request arrives, Codex should route it through a governed run unless the user explicitly asks not to.

## Prerequisites

The repository containing `swarm-flow` must be installed and built:

```bash
npm install
npm run build
npm link
```

The target project must have access to the `swarm-flow` command.

## Default Entry

When the user asks to build, fix, refactor, research, or remediate software work:

1. Check whether a run already exists.

```bash
swarm-flow status
```

2. If a run exists, resume it.

```bash
swarm-flow resume
swarm-flow artifacts
```

3. If no run exists, start one from the user's plain-language request.

```bash
swarm-flow start "<user request>"
```

Then read `.runs/<run-id>/run.json`.

## Resume A Run

Run:

```bash
swarm-flow resume
swarm-flow status
swarm-flow artifacts
```

Continue from `current_phase` and use the flow's `required_outputs` as the checklist.

## Working Rules

1. A phase advances because required artifacts are registered and meaningful, not because Codex says it is done.
2. Write durable artifacts under `.runs/<run-id>/artifacts/`.
3. Keep assumptions and risks explicit.
4. Do not approve phases unless the user explicitly asks you to record approval.
5. Use `swarm-flow preview <target>` for Jira, Confluence, or GitHub write previews.
6. Do not perform live external writes from this skill.
7. If validation fails, create or update a repair-loop artifact before continuing.

## Useful Commands

```bash
swarm-flow flows list
swarm-flow flows inspect feature-default
swarm-flow skills list
swarm-flow skills inspect planning/task-breakdown
swarm-flow runs list
swarm-flow run show <run-id>
swarm-flow approve <phase> --by human
swarm-flow preview jira
swarm-flow doctor
```

## Exit Criteria

Before claiming progress:

- `run.json` reflects the current phase and artifacts.
- Required artifacts exist and contain real evidence.
- Any external write has a preview artifact and connector preview record.
- Required approvals are recorded only after explicit user approval.
