---
id: intake/extract-business-goal
title: Extract Business Goal
phase: intake
inputs:
  - raw_request
outputs:
  - business_goal
---

# Purpose

Translate implementation asks into outcome language so the flow optimizes for value, not just activity.

# When to use

Use when a request names a solution before explaining the user or business problem.

# When NOT to use

Do not use when the run is a narrow technical chore with a clearly accepted goal and no product impact.

# Prerequisites

- A requester has described a change, pain, or desired capability.

# Exact steps

1. Identify the stakeholder.
2. Identify the current pain, risk, or opportunity.
3. Convert solution language into outcome language.
4. Capture success signals where possible.
5. Feed the goal back into the feature brief.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The implementation is the goal." | Implementation is a means; delivery needs the reason. |
| "Metrics are unavailable." | Qualitative success signals are still better than none. |

# Verification

- The goal can be understood without implementation details.
- The goal explains value, not only functionality.
- Success signals are either present or explicitly unavailable.

# Exit criteria

- `business_goal` exists.
- The feature brief references the goal.

# Failure and escalation guidance

Escalate when stakeholders disagree on the goal or the requested implementation does not serve the stated outcome.
