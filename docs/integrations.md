# Agent Integrations

swarm-flow ships plugin bundles for Claude Code and Codex.

These integrations are intentionally thin. They teach the agent how to use the `swarm-flow` CLI and `.runs/` artifacts; they do not bypass policies, perform live external writes, or replace the runtime.

## Shared Setup

From the swarm-flow repository:

```bash
npm install
npm run build
npm link
```

Verify:

```bash
swarm-flow doctor
```

For default project behavior, write agent instructions into the target repository:

```bash
swarm-flow init --agent all
```

This creates `AGENTS.md` for Codex and `CLAUDE.md` for Claude Code. Those files tell the agent to check for an active run and otherwise start one from the user's plain-language request:

```bash
swarm-flow start "<user request>"
```

## Claude Code

Public plugin metadata:

```text
.claude-plugin/plugin.json
.claude-plugin/marketplace.json
```

Implementation directory:

```text
plugins/claude-code/
```

Once the repository is public, users can install with:

```text
/plugin marketplace add seshxn/swarm-flow
/plugin install swarm-flow@swarm-flow-marketplace
```

Install with Claude Code local plugin support:

```text
/plugin install /absolute/path/to/swarm-flow
```

Available commands:

- `/swarm`
- `/swarm-start`
- `/swarm-resume`
- `/swarm-status`
- `/swarm-artifacts`
- `/swarm-approve`
- `/swarm-preview`

The commands are prompts that call the CLI and then inspect `.runs/<run-id>/run.json`. `/swarm` is the primary entrypoint: it starts or resumes a run from a normal request instead of requiring separate title and goal flags.

## Codex

Public plugin metadata:

```text
.codex-plugin/plugin.json
.codex/INSTALL.md
```

Implementation directory:

```text
plugins/codex/
```

Local marketplace entry:

```text
.agents/plugins/marketplace.json
```

The Codex plugin contributes a `swarm-flow` skill. Its trigger text is intentionally broad enough for normal requests like "build this feature", "fix this bug", "refactor this module", or "research this spike" when swarm-flow is installed.

Install the skill from a clone:

```bash
git clone https://github.com/seshxn/swarm-flow.git ~/.codex/swarm-flow
cd ~/.codex/swarm-flow
npm install
npm run build
npm link
./scripts/install-codex-skill.sh
```

Restart Codex afterward.

Once installed, a request like this is enough:

```text
Allow admins to bulk reassign cases by region, with audit history and role checks.
```

Codex should check `swarm-flow status`, resume an active run if present, or start a new run with `swarm-flow start "<request>"`.

## Distribution

See [plugin-distribution.md](plugin-distribution.md) for the publishing checklist and public install paths.

## Safety Boundaries

- External writes stay in preview mode.
- Human approval must be explicit.
- Artifacts are durable source of truth.
- Hooks are represented as specs; automatic hook execution is future work.
