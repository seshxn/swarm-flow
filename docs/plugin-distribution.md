# Plugin Distribution

swarm-flow is packaged so other people can install it as an agent plugin, not only as a local development checkout.

## What Is Distributed

| Target | Public metadata | Runtime content |
| --- | --- | --- |
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | `plugins/claude-code/.claude/commands/` |
| Codex | `.codex-plugin/plugin.json`, `.codex/INSTALL.md` | `plugins/codex/skills/swarm-flow/` |

Both integrations depend on the `swarm-flow` CLI. The plugin teaches the agent how to use the CLI and `.runs/` artifacts.

The intended user experience is plain-language first. Users should not need to remember the full CLI shape for normal feature delivery. The agent integration should translate a request like "Allow admins to bulk reassign cases by region, with audit history and role checks" into:

```bash
swarm-flow status
swarm-flow start "<user request>"
```

or `swarm-flow resume` when an active run already exists.

Once a run exists, the integration should use the agent-facing control commands instead of chat memory:

```bash
swarm-flow phase
swarm-flow context pack
swarm-flow artifact add <artifact_id> <file>
swarm-flow policy check
swarm-flow complete <phase>
```

## Publishing Checklist

Before telling others to install:

1. Push the repository to GitHub.
2. Confirm `npm run verify` passes.
3. Confirm `npm link && swarm-flow doctor` works locally.
4. Confirm `.claude-plugin/marketplace.json` points at the public GitHub repo.
5. Confirm `.codex/INSTALL.md` uses the public GitHub clone URL.
6. Confirm `swarm-flow init --agent all` writes `AGENTS.md` and `CLAUDE.md` in a target project.

## Claude Code Public Install

Once the repo is public, users can install through the Claude Code plugin flow using the repository as the marketplace/source.

Recommended README snippet:

```text
/plugin marketplace add seshxn/swarm-flow
/plugin install swarm-flow@swarm-flow-marketplace
```

If their Claude Code version supports direct repository installation:

```text
/plugin install seshxn/swarm-flow
```

If direct GitHub installation is unavailable, users can clone and install locally:

```bash
git clone https://github.com/seshxn/swarm-flow.git
cd swarm-flow
npm install
npm run build
npm link
```

Then in Claude Code:

```text
/plugin install /absolute/path/to/swarm-flow
```

Primary command:

```text
/swarm Allow admins to bulk reassign cases by region, with audit history and role checks.
```

For project-level automatic behavior, run `swarm-flow init --agent claude` in the target repository so Claude Code has persistent `CLAUDE.md` guidance.

## Codex Public Install

Codex users can clone and enable the skill:

```bash
git clone https://github.com/seshxn/swarm-flow.git ~/.codex/swarm-flow
cd ~/.codex/swarm-flow
npm install
npm run build
npm link
./scripts/install-codex-skill.sh
```

Then restart Codex.

For project-level automatic behavior, run `swarm-flow init --agent codex` in the target repository so Codex has persistent `AGENTS.md` guidance.

## Scope Boundaries

The distributed plugins do not:

- run live Jira, Confluence, or GitHub writes
- auto-merge pull requests
- auto-execute hook pipelines
- replace the swarm-flow runtime

They do:

- expose commands/skills for start, resume, status, approval, and preview workflows
- expose phase skills for implementation, validation, preview writes, and repair loops
- support natural-language starts through `swarm-flow start "<request>"`
- keep `.runs/<run-id>/run.json` as the source of truth
- reinforce artifact-first delivery
