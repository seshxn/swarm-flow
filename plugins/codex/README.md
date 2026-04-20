# swarm-flow for Codex

This Codex plugin contributes a `swarm-flow` skill that teaches Codex to operate through durable runs, artifacts, approvals, and previews. The skill is written to trigger on normal requests such as "build this feature", "fix this bug", or "refactor this flow" when the repository has swarm-flow installed.

## Prerequisites

```bash
cd /path/to/swarm-flow
npm install
npm run build
npm link
```

## Install Locally

This repo includes a local marketplace entry at `.agents/plugins/marketplace.json` pointing at `./plugins/codex`.

In Codex desktop/plugin environments that support local marketplaces, add or enable this repository marketplace. For direct local use, keep the plugin folder in place and restart Codex so it can discover the plugin.

For native skill discovery:

```bash
./scripts/install-codex-skill.sh
```

The script installs into `${CODEX_SKILLS_DIR}` when set, otherwise `~/.agents/skills`, which is the current Codex desktop skill discovery path.

Or from a public clone:

```bash
git clone https://github.com/seshxn/swarm-flow.git ~/.codex/swarm-flow
cd ~/.codex/swarm-flow
npm install
npm run build
npm link
./scripts/install-codex-skill.sh
```

## What It Adds

- A `swarm-flow` skill for start/resume/status/approval/preview workflows.
- Narrower phase skills for phase operation, implementation, validation, preview writes, and repair loops.
- Strict guidance that artifacts, not chat claims, advance runs.
- Explicit prohibition on live external writes.
- Plain-language run starts with `swarm-flow start "<request>"`.

The plugin wraps the CLI; it does not replace the runtime.
