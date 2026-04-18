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

# Process

```
Read raw request
        ↓
Restate in product language (remove implementation detail)
        ↓
Extract: business goal + primary user
        ↓
Separate into: goals / non-goals / constraints / unknowns
        ↓
Identify: user-visible behavior + operational expectations
        ↓
Self-check: can the brief be read without chat history?
  yes → register feature_brief
  no  → revise until it can
```

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
| "The user's words are the brief." | Raw requests are implementation-shaped. Briefs are product-shaped. |
| "Non-goals are implicit." | Unstated non-goals become disputed scope during implementation. |

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
