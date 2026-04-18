---
id: design/adr-creation
title: ADR Creation
phase: design
inputs:
  - technical_design
outputs:
  - adr
---

# Purpose

Record durable architecture decisions and their consequences.

# When to use

Use when a design decision changes architecture, dependencies, external integrations, data contracts, or team conventions.

# When NOT to use

Do not create an ADR for a reversible implementation detail that is already clear in the task plan.

# Prerequisites

- Technical design exists.
- Alternatives have been considered.

# Exact steps

1. State context.
2. State the decision.
3. List alternatives considered.
4. Record consequences and tradeoffs.
5. Link validation and rollout evidence.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The design doc is enough." | ADRs preserve decisions after the run is over. |
| "Only benefits matter." | Consequences must include costs and constraints. |

# Verification

- The ADR names one decision.
- Consequences include tradeoffs.
- The decision is linked to evidence.

# Exit criteria

- `adr` exists.

# Failure and escalation guidance

Escalate when the decision needs stakeholder approval or creates irreversible migration pressure.
