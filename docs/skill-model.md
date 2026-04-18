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

## Authoring Standard

Skills should read like workflow cards a disciplined team would actually use. They should not say "ensure quality" without defining evidence. Every skill needs a finish line: an artifact, verification command, approval, or explicit escalation.

## Example

See [skills/planning/task-breakdown.md](../skills/planning/task-breakdown.md).
