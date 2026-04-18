---
id: design/tradeoff-evaluation
title: Tradeoff Evaluation
phase: design
inputs:
  - technical_design
outputs:
  - tradeoff_matrix
---

# Purpose

Make design choices explainable by comparing viable options against delivery constraints.

# When to use

Use when there are multiple plausible approaches or when a choice affects cost, risk, reversibility, or maintainability.

# When NOT to use

Do not use to justify a decision that has already been made without evidence.

# Prerequisites

- At least two options can be named.
- Relevant constraints are known.

# Exact steps

1. Name options.
2. Compare complexity, reversibility, safety, cost, and delivery speed.
3. Identify validation impact.
4. Recommend one option.
5. State what evidence would change the recommendation.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The fastest path is best." | Fast but irreversible choices can slow delivery later. |
| "The robust path is always best." | Overbuilding can be its own delivery risk. |

# Verification

- Recommendation follows from the comparison.
- Reversibility is considered.
- The rejected options are represented fairly.

# Exit criteria

- `tradeoff_matrix` exists.

# Failure and escalation guidance

Escalate when options have materially different security, cost, or migration consequences.
