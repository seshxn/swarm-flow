---
id: intake/identify-unknowns
title: Identify Unknowns
phase: intake
inputs:
  - raw_request
outputs:
  - assumptions_log
---

# Purpose

Make uncertainty visible before it becomes accidental scope or unsafe implementation.

# When to use

Use whenever the run depends on missing product, technical, operational, security, or rollout context.

# When NOT to use

Do not use as a substitute for discovery when repository evidence is required.

# Prerequisites

- A raw request or draft feature brief exists.

# Exact steps

1. Separate known facts from inferred claims.
2. Mark each unknown as product, technical, data, operational, security, compliance, or rollout.
3. Assign impact and likelihood.
4. Decide whether the unknown blocks progress, needs approval, or can be tracked.
5. Record how the unknown can be resolved.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "We can assume the usual behavior." | "Usual" is not evidence and often differs across teams. |
| "This is too small to matter." | Small assumptions cause large delivery surprises. |

# Verification

- No assumption is phrased as a fact.
- Each high-risk unknown has an owner or blocking status.
- The assumptions log is referenced by the next phase.

# Exit criteria

- `assumptions_log` exists.
- High-risk unknowns are visible before planning.

# Failure and escalation guidance

Escalate when an unknown affects permissions, data loss, compliance, customer-visible behavior, or release safety.
