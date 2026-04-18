# swarm-flow

<p align="center">
  <img src="assets/swarm-flow.png" alt="swarm-flow logo and orchestration graph" width="820">
</p>

swarm-flow turns Claude Code, Codex, and other coding agents into a governed software delivery workflow.

It takes a plain-language request like "build this feature" or "review this PR" and runs it through explicit phases: intake, discovery, planning, design, implementation, validation, documentation, and delivery. Each phase has specialist agents, required artifacts, approval gates, hooks, and preview-safe connectors.

It is not a prompt pack and it is not an autonomous merge bot. swarm-flow treats AI-assisted software delivery as an artifact-driven state machine.

## Why Developers Use It

Coding agents are powerful, but serious work needs more structure than a chat thread:

- keep requirements, plans, designs, QA, and delivery notes as durable artifacts
- make agents work through scoped specialist roles instead of one giant persona
- require evidence before moving a run forward
- preview Jira, Confluence, GitHub, Slack, and CI writes before anything external changes
- resume a delivery run from `.runs/<run-id>/run.json` instead of reconstructing context
- install workflow guidance into Claude Code and Codex projects

swarm-flow is the layer between "vibe coding" and fully autonomous deployment: fast enough for solo builders, explicit enough for teams.

## Quick Start

The fastest way to try swarm-flow is to install the agent plugin, then ask your agent to start a governed run from a normal feature request.

### Claude Code

Once this repository is public, install from the Claude Code plugin marketplace:

```text
/plugin marketplace add seshxn/swarm-flow
/plugin install swarm-flow@swarm-flow-marketplace
```

Then start a run:

```text
/swarm Allow admins to bulk reassign cases by region, with audit history and role checks.
```

Local fallback:

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

### Codex

Install the Codex skill from a clone:

```bash
git clone https://github.com/seshxn/swarm-flow.git ~/.codex/swarm-flow
cd ~/.codex/swarm-flow
npm install
npm run build
npm link
./scripts/install-codex-skill.sh
```

Restart Codex, then make a normal delivery request in a target repository:

```text
Allow admins to bulk reassign cases by region, with audit history and role checks.
```

For project-level default behavior, initialize agent instructions in the target repository:

```bash
swarm-flow init --agent all
```

### CLI Development

If you are contributing to swarm-flow itself or want to inspect the runtime directly:

```bash
npm install
npm test
npm run build

node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js flows list
node packages/cli/dist/index.js skills list
```

Start a feature run:

```bash
node packages/cli/dist/index.js start "Allow admins to bulk reassign cases in batches with audit logging"
```

Inspect it:

```bash
node packages/cli/dist/index.js status
node packages/cli/dist/index.js resume
node packages/cli/dist/index.js artifacts
node packages/cli/dist/index.js preview jira
node packages/cli/dist/index.js runs list
```

## Agent Integrations

swarm-flow includes local integration bundles for Claude Code and Codex:

- [plugins/claude-code](plugins/claude-code): Claude Code slash-command prompts such as `/swarm`, `/swarm-resume`, and `/swarm-preview`.
- [plugins/codex](plugins/codex): Codex plugin manifest plus a `swarm-flow` skill designed to trigger from normal delivery requests.

Inspect them from the CLI:

```bash
swarm-flow integrations list
swarm-flow integrations show claude-code
swarm-flow integrations show codex
```

For project-level default behavior, initialize agent instructions in the target repository if you have not already:

```bash
swarm-flow init --agent all
```

After that, agents should treat non-trivial requests like "Allow admins to bulk reassign cases by region" as swarm-flow runs by default. The CLI also supports explicit overrides when needed:

```bash
swarm-flow start "Allow admins to bulk reassign cases by region, with audit history and role checks."
swarm-flow start feature --title "Bulk case reassignment" --goal "Allow admins to reassign cases by region"
```

See [docs/integrations.md](docs/integrations.md).

## Why It Exists

Most agent tooling optimizes for generating code. Real engineering teams need more than code generation:

- intake that preserves intent and non-goals
- discovery that cites actual sources
- planning with acceptance criteria and task slices
- design decisions with tradeoffs and risk notes
- validation evidence before delivery
- previewed external writes before Jira, Confluence, or GitHub changes
- resumable state that survives beyond a chat transcript

swarm-flow is built for that lane: SDLC orchestration for AI-assisted delivery.

## What Makes It Different

| Principle | What it means in swarm-flow |
| --- | --- |
| Flows over prompts | Delivery follows explicit YAML phase graphs. |
| Artifacts over chat logs | Runs advance through durable markdown and JSON outputs. |
| Specialists over generalists | Agents have bounded role cards and required outputs. |
| Evidence over confidence | Review, QA, validation, and assumptions are first-class artifacts. |
| Governance over autonomy | Policies and approvals block risky transitions. |
| Resumability over one-shot runs | `.runs/<run-id>/run.json` tracks state. |
| Preview before external writes | Jira, Confluence, and GitHub operations start as auditable previews. |

## Current Status

v0.1 is a CLI-first local orchestration foundation. It includes:

- typed flow validation
- file-backed run state
- artifact registration
- phase transition checks
- approval recording
- connector preview recording
- preview-safe connector contracts
- CLI inspection commands
- docs, flows, skills, hooks, policies, schemas, and examples

Live Jira, Confluence, GitHub, and CI writes are intentionally not enabled yet. Starter connectors are safe preview implementations that define the contract for future live adapters.

## Core Concepts

- **Flow**: SDLC template that defines phases, dependencies, required outputs, hooks, and approvals.
- **Phase**: bounded step such as intake, discovery, planning, design, implementation, validation, documentation, or delivery.
- **Run**: one execution of a flow for a specific piece of work.
- **Artifact**: durable markdown or JSON output that records work and enables progression.
- **Skill**: reusable workflow card that defines how a phase should be executed well.
- **Hook**: automation triggered around meaningful transitions.
- **Agent**: specialist role with inputs, outputs, tools, boundaries, and escalation rules.
- **Connector**: safe interface to external tools.
- **Policy**: guardrail pack that decides whether a transition or write is allowed.

## CLI Commands

| Command | Purpose |
| --- | --- |
| `swarm-flow init` | Create local config. |
| `swarm-flow start "<request>"` | Start a feature run from a plain-language request. |
| `swarm-flow epic <target>` | Start an epic delivery run from a Jira key, GitHub issue, or objective. |
| `swarm-flow review <github-pr-url>` | Start a standalone PR review swarm run. |
| `swarm-flow qa <target>` | Start a standalone QA swarm run from a PR, ticket, URL, or test target. |
| `swarm-flow status` | Show current run status. |
| `swarm-flow resume` | Show next actionable phase and required outputs. |
| `swarm-flow artifacts` | List registered artifacts. |
| `swarm-flow flows list` | List bundled flows. |
| `swarm-flow flows inspect <id>` | Show a flow summary. |
| `swarm-flow flows validate <path>` | Validate a flow file. |
| `swarm-flow skills list` | List bundled skills. |
| `swarm-flow skills inspect <id>` | Print a skill card. |
| `swarm-flow integrations list` | List Claude Code and Codex integration bundles. |
| `swarm-flow integrations show <id>` | Show integration install notes. |
| `swarm-flow approve <phase>` | Record a human approval. |
| `swarm-flow preview <target>` | Write and record an external-write preview. |
| `swarm-flow comments preview` | Write selectable external comment previews for a run. |
| `swarm-flow comments select --ids <ids>` | Record selected external comments without posting them. |
| `swarm-flow runs list` | List persisted runs. |
| `swarm-flow run show <id>` | Show one run in detail. |
| `swarm-flow doctor` | Check local environment basics. |

Review and QA swarms produce local artifacts and preview external comments. GitHub, Jira, and Slack comments are selected by the user before posting; they are not posted automatically.

## Example Flow

The default feature flow moves through:

```text
intake -> discovery -> planning -> design -> ticketing -> implementation -> validation -> documentation -> delivery
```

Each phase defines agents, dependencies, required outputs, transition conditions, and approval requirements. For example, implementation cannot be completed by naming outputs in a command; required outputs must be registered artifacts in the run state.

See [flows/feature-default.yaml](flows/feature-default.yaml) and [docs/examples/feature-default-walkthrough.md](docs/examples/feature-default-walkthrough.md).

## Sample Run

The sample scenario is:

> Allow admins to bulk reassign cases by region, with audit history and role checks.

See:

- [examples/sample-run/run.json](examples/sample-run/run.json)
- [examples/sample-run/artifacts/acceptance-criteria.md](examples/sample-run/artifacts/acceptance-criteria.md)
- [examples/sample-run/artifacts/technical-design.md](examples/sample-run/artifacts/technical-design.md)
- [examples/sample-run/artifacts/qa-report.md](examples/sample-run/artifacts/qa-report.md)
- [examples/sample-run/outputs/previews/jira.preview.json](examples/sample-run/outputs/previews/jira.preview.json)
- [examples/sample-run/outputs/previews/confluence.preview.md](examples/sample-run/outputs/previews/confluence.preview.md)

## Architecture

```mermaid
flowchart LR
  CLI["CLI"] --> Runtime["Runtime"]
  Runtime --> Core["Core domain model"]
  Runtime --> Store[".runs store"]
  Runtime --> Artifacts["Artifact registry"]
  Runtime --> Policies["Policy decisions"]
  Runtime --> Hooks["Hook events"]
  Runtime --> Connectors["Connector previews"]
  Agents["Specialist agents"] --> Skills["Skills"]
  Skills --> Artifacts
```

Package responsibilities:

- `@swarm-flow/core`: domain schemas, flow validation, policy evaluation.
- `@swarm-flow/runtime`: run store, artifacts, approvals, transitions, connector preview records.
- `@swarm-flow/cli`: command-line UX.
- `@swarm-flow/connectors`: preview-safe connector contracts and starter implementations.
- `@swarm-flow/adapters`: agent adapter contracts.
- `@swarm-flow/sdk`: public re-exports.

## Repository Layout

```text
docs/          concept documentation and walkthroughs
assets/        project images and launch media
flows/         governed SDLC flow definitions
skills/        reusable process cards by phase
hooks/         transition automation specs
agents/        specialist role cards
policies/      approval and safety gate packs
schemas/       public JSON Schemas
packages/      TypeScript implementation packages
examples/      sample run, config, and outputs
tests/         test documentation
```

## Trust and Safety Stance

swarm-flow defaults to governed behavior:

- external writes are preview-first
- approvals are explicit records
- policy decisions are explainable
- run state is inspectable on disk
- assumptions and risks are tracked separately
- validation failures should open repair loops, not continue blindly

The project is deliberately honest about unsupported capability. Preview connectors are not live API clients. Full live integrations should be added only when they preserve dry-run, preview, idempotency, rollback metadata, and audit logging.

## Launch and Community

If you want to help shape the project, the best places to start are:

- try a local run and open an issue with the artifact trail it produced
- contribute a flow, skill, hook, policy, or preview-safe connector
- test the Claude Code and Codex integration bundles in a real repository
- help tighten the launch plan in [docs/launch-plan.md](docs/launch-plan.md)

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution lanes and verification expectations.

## Roadmap

Near-term milestones:

1. Load policy packs directly in runtime transitions.
2. Execute hook pipelines with persisted hook results.
3. Add real Git and filesystem connector behavior.
4. Add opt-in Jira, Confluence, GitHub, and CI live adapters.
5. Add richer artifact validation and schema checks.
6. Add agent adapter examples for popular coding-agent environments.

See [docs/roadmap.md](docs/roadmap.md).
