---
id: validation/code-review
title: Code Review
phase: validation
triggers:
  - implementation is complete
  - code changes are ready for review before delivery
inputs:
  - code_changes
  - acceptance_criteria
  - technical_design
outputs:
  - review_report
---

# Purpose

Assess correctness, maintainability, regression risk, and readiness for delivery across five axes so that every finding is evidence-backed and actionable.

# When to use

Use after implementation and before delivery. Use when reviewing code written by any agent or human.

# When NOT to use

Do not use as a substitute for tests or QA. Do not approve code you have not read.

# Prerequisites

- Code changes are available.
- Acceptance criteria and design artifacts are available.
- Test evidence exists or absence is noted.

# Five-Axis Review Framework

Evaluate every change across all five dimensions:

| Axis | Key Questions |
|------|--------------|
| **Correctness** | Does it do what the criteria say? Are edge cases handled? Do tests verify behavior? |
| **Readability** | Can another agent or human understand this without explanation? Are names consistent? |
| **Architecture** | Does this follow existing patterns? Are module boundaries maintained? |
| **Security** | Is input validated at boundaries? Are secrets kept out of code and logs? Is authz checked? |
| **Performance** | Any N+1 patterns? Unbounded loops? Missing pagination? |

# Process

```
Read acceptance criteria + design
        ↓
Review tests first (reveals intent and coverage)
        ↓
Review code against each of the 5 axes
        ↓
Categorize findings: Critical / Important / Suggestion
        ↓
Critical findings? → block delivery, list required fixes
Important findings? → list before merge
Suggestions? → note, don't block
        ↓
Write review_report with verdict
```

# Exact steps

1. Read acceptance criteria and technical design before reading code.
2. Read tests first — they reveal expected behavior and coverage gaps.
3. Review code against each of the 5 axes in the framework above.
4. Categorize each finding: **Critical** (must fix, blocks merge), **Important** (should fix), **Suggestion** (optional).
5. For every Critical and Important finding, cite the file and line and give a specific fix recommendation.
6. Note at least one thing done well.
7. State `APPROVE` or `REQUEST CHANGES` as the verdict.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "It looks fine." | Review needs evidence and specific findings, not confidence. |
| "Tests passed so review is done." | Tests do not cover readability, architecture drift, or security. |
| "I'll just check the diff." | The diff needs context from the design and acceptance criteria. |
| "No Critical findings, so it's good to go." | Important findings unaddressed become future Critical ones. |

# Output Template

```markdown
## Review Summary

**Verdict:** APPROVE | REQUEST CHANGES

**Overview:** [1–2 sentences]

### Critical Issues
- [file:line] — [description and fix]

### Important Issues
- [file:line] — [description and fix]

### Suggestions
- [file:line] — [description]

### What's Done Well
- [specific positive observation]

### Verification
- Tests reviewed: yes/no
- Security checked: yes/no
```

# Verification

- Findings cite files, artifacts, or commands.
- Every Critical and Important finding has a fix recommendation.
- Verdict is explicit.
- Residual risk is stated.

# Exit criteria

- `review_report` exists.
- Verdict is `APPROVE` or `REQUEST CHANGES`.
- Blocking findings are resolved or escalated.

# Failure and escalation guidance

Escalate when correctness is uncertain, validation is missing, risk exceeds policy, or a finding requires product or architecture decisions beyond the reviewer's scope.
