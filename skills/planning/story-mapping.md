---
id: planning/story-mapping
title: Story Mapping
phase: story_mapping
inputs:
  - epic_brief
  - discovery_report
  - acceptance_criteria
outputs:
  - story_map
---

# Purpose

Convert an epic or broad objective into manageable delivery stories without writing external tickets prematurely.

# When to use

Use after discovery has enough evidence to split work into product-facing stories.

# When NOT to use

Do not use before the epic goal, constraints, or high-risk assumptions are understood.

# Prerequisites

- Epic brief or objective exists.
- Discovery report cites repository, ticket, documentation, command, or connector evidence.
- Acceptance criteria exist or unknown criteria are explicitly marked.

# Exact steps

1. Read the epic brief, discovery report, and acceptance criteria.
2. Separate product-facing stories from implementation slices.
3. Map each story to acceptance criteria, dependencies, labels, and risk.
4. Identify which stories can run in parallel and which are blocked.
5. Produce create-or-update intent in preview mode with idempotency keys.
6. Escalate when story boundaries are unclear or would create noisy ticket churn.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "One story is faster." | Oversized stories hide scope and produce oversized PRs. |
| "We can create tickets and fix them later." | External writes need preview, idempotency, and approval. |

# Verification

- Every story maps to criteria or a named unknown.
- Dependencies and parallel-safe stories are explicit.
- External ticket operations are previews.

# Exit criteria

- `story_map` exists.
- Proposed external operations include idempotency keys.

# Failure and escalation guidance

Escalate when the epic cannot be split without product, architecture, or policy decisions.
