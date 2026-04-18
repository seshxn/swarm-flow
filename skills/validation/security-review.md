---
id: validation/security-review
title: Security Review
phase: validation
triggers:
  - code changes handle user input, authentication, or external data
  - new API endpoints or integrations are added
  - security-auditor agent is invoked
  - design phase identifies security risk
inputs:
  - code_changes
  - technical_design
  - dependency_map
outputs:
  - security_review
---

# Purpose

Identify exploitable vulnerabilities before delivery. Theoretical risks are low-value. Focus on what an attacker could actually do with the code as written.

# When to use

Use when code touches: user input handling, authentication, authorization, session management, external APIs, file uploads, database queries, secrets/credentials, or third-party integrations.

# When NOT to use

Do not use for pure internal refactors with no user-facing or data-handling changes. Do not report Info-level findings as blockers.

# Prerequisites

- Code changes are available.
- Technical design exists.
- Dependency map names external integrations.

# OWASP Top 10 Checklist

| Category | Check |
|----------|-------|
| **A01 Broken Access Control** | Is authz checked on every protected endpoint? Can users access other users' data? |
| **A02 Cryptographic Failures** | Are secrets in env vars? Is sensitive data encrypted in transit and at rest? |
| **A03 Injection** | Is user input parameterized or sanitized? SQL, NoSQL, OS command, LDAP injection? |
| **A04 Insecure Design** | Does the design assume trust where trust shouldn't exist? |
| **A05 Security Misconfiguration** | Are security headers set? CORS restricted? Error messages generic? |
| **A06 Vulnerable Components** | Do dependencies have known CVEs? (`npm audit`, `pip audit`) |
| **A07 Auth Failures** | Passwords hashed (bcrypt/argon2)? Sessions httpOnly/secure/sameSite? Rate limiting? |
| **A08 Software Integrity Failures** | Are third-party scripts loaded with integrity hashes? |
| **A09 Logging Failures** | Are security events logged? Are secrets excluded from logs? |
| **A10 SSRF** | Can user-supplied URLs trigger server-side requests to internal services? |

# Process

```
Read code changes + technical design + dependency map
        ↓
Check each OWASP Top 10 category
        ↓
For each finding: assign severity (Critical/High/Medium/Low/Info)
        ↓
Critical/High findings? → document exploitation scenario
        ↓
Audit dependencies for known CVEs
        ↓
Note positive security practices
        ↓
Write security_review artifact with finding table
```

# Exact steps

1. Read code changes focusing on input handling, auth, data storage, and external calls.
2. Work through the OWASP Top 10 checklist above — check each category.
3. For every finding: cite the exact file and line; assign severity; describe exploitation scenario for Critical/High.
4. Run dependency audit (`npm audit` or equivalent) and note any CVEs.
5. Note at least one security practice done well.
6. Write the security_review artifact using the output template below.

# Output Template

```markdown
## Security Audit Report

### Summary
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]
- Info: [count]

### Findings

#### [CRITICAL] [Title]
- **Location:** file:line
- **Description:** What the vulnerability is
- **Impact:** What an attacker could do
- **Exploitation scenario:** How it could be exploited
- **Recommendation:** Specific fix with example

...

### Positive Observations
- [Security practices done well]
```

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "This is internal — not a risk." | Internal tools still have injection, authz, and audit risks. |
| "Input is validated on the frontend." | Server-side validation is always required. Frontend validation is UX, not security. |
| "The dependency is widely used." | Widely used dependencies still have CVEs. Check. |
| "No Critical findings, so it's fine." | Medium findings unaddressed become Critical ones over time. |

# Verification

- [ ] All 10 OWASP categories checked
- [ ] Every finding has file:line citation and severity
- [ ] Critical/High findings have exploitation scenarios
- [ ] Dependency audit was run
- [ ] At least one positive observation included

# Exit criteria

- `security_review` artifact exists.
- All findings are categorized by severity.
- Critical findings are either resolved or escalated.

# Failure and escalation guidance

If a Critical finding cannot be resolved without an architectural change, escalate to the architect immediately and block delivery. Do not ship Critical findings under any circumstances without explicit human sign-off and a documented mitigation plan.
