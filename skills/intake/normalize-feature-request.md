---
id: intake/normalize-feature-request
title: Normalize Feature Request
phase: intake
triggers:
  - feature idea is provided
inputs:
  - raw_request
outputs:
  - feature_brief
---

# Purpose

Convert a vague or implementation-shaped request into a feature brief that can safely drive discovery and planning.

# When to use

Use at the start of a feature run when the user provides a goal, request, or rough idea.

# When NOT to use

Do not use for incident remediation, pure research spikes, or bug reports that first require reproduction.

# Prerequisites

- A target repository is known.
- The requester has provided at least a rough desired outcome.

# Exact steps

1. Restate the request in product language.
2. Extract the business goal and primary user.
3. Separate goals, non-goals, constraints, and unknowns.
4. Identify user-visible behavior and operational expectations.
5. Produce `feature-brief.md` with scope and assumptions.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The request is obvious." | Obvious requests still hide role, data, and rollout assumptions. |
| "Planning will clarify this." | Planning without a brief creates weak criteria and noisy tickets. |

# Verification

- The brief has title, goal, users, scope, non-goals, constraints, and unknowns.
- Any inferred claim is marked as an assumption.
- The brief can be read without the chat history.

# Exit criteria

- `feature_brief` exists.
- Unknowns are named.
- Non-goals are explicit.

# Failure and escalation guidance

If the goal cannot be stated without guessing, produce an assumptions log and block planning until a human accepts or resolves the ambiguity.
