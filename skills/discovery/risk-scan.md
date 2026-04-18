---
id: discovery/risk-scan
title: Risk Scan
phase: discovery
inputs:
  - discovery_report
outputs:
  - risk_report
---

# Purpose

Identify delivery risks early enough for planning, policy, and validation to respond.

# When to use

Use when discovery reveals cross-module changes, external writes, permissions, data migrations, or user-visible behavior changes.

# When NOT to use

Do not use to block harmless documentation-only changes unless the docs publish externally.

# Prerequisites

- Discovery report exists.
- Known assumptions are recorded.

# Severity Rubric

| Severity | Criteria |
|----------|---------|
| **Critical** | Data loss, auth bypass, irreversible production state change |
| **High** | Significant user-visible breakage, security exposure with conditions |
| **Medium** | Limited impact, requires specific access or sequence to trigger |
| **Low** | Defense-in-depth improvement, theoretical risk only |

# Process

```
Read discovery report
        ↓
Check each risk category: correctness / security / data / operational / rollout
        ↓
For each identified risk: rate impact + likelihood
        ↓
Define mitigation for each medium+ risk
        ↓
Define validation evidence for each high+ risk
        ↓
Flag policy approvals required
        ↓
Register risk_report
```

# Exact steps

1. Identify correctness, security, data, operational, and rollout risks.
2. Rate impact and likelihood.
3. Define mitigation for each material risk.
4. Define validation evidence for each high risk.
5. Flag policy approvals required by threshold.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The tests will catch it." | Tests only catch risks they explicitly cover. Uncovered risks don't disappear. |
| "This is internal." | Internal tools still create data, permission, and audit risks. |
| "No risks found." | No risks found means the scan was incomplete. State Low risks explicitly. |
| "Mitigation can be defined later." | Unmitigated risks reach validation with no plan — they block delivery. |

# Verification

- Every high risk has mitigation.
- Validation tasks cover named risks.
- Risk threshold effects are explicit.

# Exit criteria

- `risk_report` exists.
- High-risk items have validation or approval paths.

# Failure and escalation guidance

Escalate when the run touches authentication, authorization, irreversible data changes, or external writes without clear ownership.
