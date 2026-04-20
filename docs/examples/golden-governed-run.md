# Golden Governed Run

This example shows the intended agent-facing control loop for a local swarm-flow run. The important property is that every phase move is backed by registered artifacts and policy checks, not chat claims.

## 1. Start Or Resume

```bash
swarm-flow status
swarm-flow start "Allow admins to bulk reassign cases by region, with audit history and role checks."
swarm-flow phase
swarm-flow context pack
```

The context pack is written to:

```text
.runs/<run-id>/context/current-phase-context.md
```

It includes the current phase, required outputs, transition conditions, matching skill cards, registered artifacts, assumptions, risks, and safety reminders.

## 2. Produce And Register Artifacts

The intake phase requires `feature_brief`. The agent writes the durable artifact, then registers it:

```bash
swarm-flow artifact add feature_brief .runs/<run-id>/artifacts/feature-brief.md
swarm-flow artifacts
```

Registered artifacts are now visible in `.runs/<run-id>/run.json`.

## 3. Check Policy And Complete The Phase

Before phase completion:

```bash
swarm-flow policy check
swarm-flow complete intake
```

If the next phase requires approval or missing artifacts, `complete` fails with the blocking reasons. The agent should not bypass this. It should produce the missing artifact, request explicit approval, or open a repair loop.

## 4. Approval-Gated Phases

When a phase requires human approval:

```bash
swarm-flow approve planning --by human --note "Scope and acceptance criteria approved."
swarm-flow complete discovery
```

Approvals are stored in `run.json`. A chat statement is not an approval record.

## 5. Preview External Writes

Ticketing, documentation sync, review comments, and QA comments remain preview-first:

```bash
swarm-flow preview jira
swarm-flow comments preview
swarm-flow comments select --ids comment-1
```

The run records connector previews and selected comment IDs. It does not post live external writes.

## 6. Validation Failure

If tests, QA, review, or policy fails:

```bash
swarm-flow skills inspect validation/systematic-debugging
swarm-flow skills inspect validation/repair-loop
swarm-flow artifact add repair_loop .runs/<run-id>/artifacts/repair-loop.md
```

The run stays in the failing phase until the repair evidence is registered and gates pass.

## 7. Delivery

Delivery packages the run evidence:

```bash
swarm-flow artifact add pr_summary .runs/<run-id>/artifacts/pr-summary.md
swarm-flow artifact add merge_checklist .runs/<run-id>/artifacts/merge-checklist.md
swarm-flow policy check
swarm-flow complete delivery
```

The release agent prepares merge evidence. It does not merge, deploy, or write to external tools without explicit user approval and a policy path that allows it.
