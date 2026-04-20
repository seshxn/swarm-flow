# Skill Model

Skills define how a phase should be executed well. They are process modules, not agents.

## Required Sections

Each skill should include:

- when to use
- when not to use
- prerequisites
- inputs
- exact steps
- rationalization checks
- verification commands
- exit criteria
- failure handling

## Design Rule

A skill should make shortcuts harder. It should explain what evidence is required before the run can advance.

Swarms are still governed skill executions. A review swarm or QA swarm may use multiple lenses, but it must produce artifacts with cited evidence; it is not free-form chat consensus and it does not bypass role boundaries, previews, or policy gates.

## Authoring Standard

Skills should read like workflow cards a disciplined team would actually use. They should not say "ensure quality" without defining evidence. Every skill needs a finish line: an artifact, verification command, approval, or explicit escalation.

Run the bundled skill quality gate before publishing skill changes:

```bash
swarm-flow skills lint
```

The linter checks frontmatter and required workflow sections so skill cards remain executable rather than becoming reference prose.

## Example

See [skills/planning/task-breakdown.md](../skills/planning/task-breakdown.md).
