---
id: discovery/assumptions-log
title: Assumptions Log
phase: discovery
triggers:
  - discovery phase begins
  - an inferred claim is made that is not directly verified
inputs:
  - feature_brief
  - discovery_report
outputs:
  - assumptions_log
---

# Purpose

Separate verified facts from inferred claims so that planning is never silently built on guesses. Unverified assumptions that reach implementation become the hardest bugs to trace.

# When to use

Use during discovery whenever a claim is made that is not directly sourced from a file, command output, ticket, or explicit statement. Use as a living document — add to it as new assumptions emerge in planning or design.

# When NOT to use

Do not use to defer decisions that can be verified now. If a file exists, read it. Do not log "I assume the file exists" when you can check.

# Prerequisites

- Discovery is underway.
- At least one inferred claim has been made.

# Output Format

```markdown
## Facts (verified by direct evidence)

| Fact | Source |
|------|--------|
| <statement> | <file path, command, or ticket> |

## Inferred (not directly verified — treat as assumptions)

| Assumption | Risk | Resolution Needed |
|------------|------|-------------------|
| <statement> | Low / Medium / High | <what would resolve it> |

## Unresolved Questions (high-risk)

Numbered list of questions that must be answered before planning can proceed safely.
```

# Risk Labelling

| Risk | Criteria |
|------|----------|
| **High** | If wrong, scope, architecture, or acceptance criteria change fundamentally |
| **Medium** | If wrong, implementation approach changes but scope stays the same |
| **Low** | If wrong, a minor adjustment is needed; no rework required |

# Process

```
Start discovery
        ↓
Every time a claim is made:
  Can I cite a source for this?
    yes → move to Facts table
    no  → move to Inferred table with risk label
        ↓
After discovery is complete:
  List high-risk unresolved questions
        ↓
Block planning for any high-risk unresolved question
  until accepted by human or resolved by evidence
        ↓
Register assumptions_log artifact
```

# Exact steps

1. Create the log with three sections: Facts, Inferred, Unresolved Questions.
2. For every claim in the discovery report: decide — fact (citable source) or inferred (no direct source).
3. Assign a risk label (Low / Medium / High) to each inferred entry.
4. List all high-risk unresolved questions in the third section.
5. For any high-risk question: note what evidence or decision would resolve it.
6. Register the log as the `assumptions_log` artifact.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "This is obviously true — I don't need to verify it." | Obvious claims that turn out wrong cause the most expensive rework. |
| "I'll note it in the discovery report." | Discovery reports mix facts and inferences. The assumptions log separates them. |
| "Low-risk assumptions don't need logging." | Low-risk assumptions still need logging — they become evidence of diligence. |
| "Planning will surface any false assumptions." | Planning built on false assumptions produces criteria that can never be met. |

# Verification

- [ ] Every claim in the discovery report is classified as fact or inferred
- [ ] Every inferred claim has a risk label
- [ ] High-risk unresolved questions are listed separately
- [ ] The log can be read without the chat history

# Exit criteria

- `assumptions_log` artifact exists.
- Facts are sourced.
- Inferred claims are labelled.
- High-risk questions are named.

# Failure and escalation guidance

If a high-risk assumption cannot be resolved before planning begins, produce a blocking assumption artifact and require the human to accept or resolve it explicitly. Do not silently absorb high-risk assumptions into the plan.
