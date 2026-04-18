# Installing swarm-flow for Codex

This repository can be used as a Codex plugin source and also exposes the `swarm-flow` skill as a native skill directory.

## Prerequisites

- Node.js 22 or newer
- Git
- npm

## Install the CLI

```bash
git clone https://github.com/seshxn/swarm-flow.git ~/.codex/swarm-flow
cd ~/.codex/swarm-flow
npm install
npm run build
npm link
```

Verify:

```bash
swarm-flow doctor
```

## Enable the Codex Skill

```bash
mkdir -p ~/.agents/skills
ln -s ~/.codex/swarm-flow/plugins/codex/skills/swarm-flow ~/.agents/skills/swarm-flow
```

Restart Codex so skill discovery refreshes.

In a target repository, add project-level default instructions:

```bash
swarm-flow init --agent codex
```

After that, a normal delivery request is enough. Codex should check for an active run and otherwise start one with:

```bash
swarm-flow start "<user request>"
```

## Plugin Metadata

Codex plugin metadata is available at:

```text
.codex-plugin/plugin.json
plugins/codex/.codex-plugin/plugin.json
.agents/plugins/marketplace.json
```

The plugin wraps the `swarm-flow` CLI. It does not perform live external writes.
