# swarm-flow for Claude Code

This plugin adds Claude Code slash-command prompts that make Claude operate through `swarm-flow` runs instead of loose chat state. The primary command is `/swarm`, which accepts the user's normal delivery request and lets the CLI infer the run title and goal.

## Prerequisites

Build and expose the CLI:

```bash
cd /path/to/swarm-flow
npm install
npm run build
npm link
```

## Public Install

Once the repository is public:

```text
/plugin marketplace add seshxn/swarm-flow
/plugin install swarm-flow@swarm-flow-marketplace
```

If direct repository install is supported:

```text
/plugin install seshxn/swarm-flow
```

## Local Install

Use Claude Code's local plugin support with this directory:

```text
/plugin install /path/to/swarm-flow
```

Root-level Claude plugin metadata lives in `.claude-plugin/`.

## Commands

- `/swarm`: default entrypoint. Start or resume from a plain-language request.
- `/swarm-start`: start a governed feature run from a plain-language request.
- `/swarm-resume`: inspect current run state and continue phase-by-phase.
- `/swarm-status`: summarize the current run.
- `/swarm-artifacts`: list durable artifacts.
- `/swarm-approve`: record a human approval.
- `/swarm-preview`: create an external-write preview.

The commands intentionally do not auto-merge, auto-deploy, or write to live Jira/Confluence/GitHub.

For project-level default behavior, run:

```bash
swarm-flow init --agent claude
```

That writes `CLAUDE.md` instructions telling Claude to use swarm-flow automatically for non-trivial delivery work.
