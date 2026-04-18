---
id: meta/writing-skills
title: Writing Skills
phase: meta
triggers:
  - authoring a new skill file
  - enriching an existing skill file
inputs:
  - intent for the new skill
outputs:
  - skill file conforming to the content contract
---

# Purpose

Define the content contract for all swarm-flow skill files so every skill has consistent depth, predictable sections, and executable guidance rather than hollow stubs.

# When to use

Use when creating a new skill or enriching an existing one. Run the self-review checklist before committing.

# When NOT to use

Do not use for agent definition files (`agents/*.md`) — those follow a separate structure. Do not use for flow YAML files.

# Prerequisites

- You know which phase the skill belongs to.
- You have a clear trigger condition (when would an agent invoke this?).
- You have identified at least one input and one output.

# Content Contract — Required Sections

Every skill file must have all of these sections. Missing sections = the skill is not ready.

## Frontmatter

```yaml
---
id: <phase>/<slug>           # e.g. validation/code-review
title: <Title Case>
phase: <phase-id>            # intake | discovery | planning | design | implementation | validation | documentation | release | meta
triggers:
  - <condition that makes this skill relevant>
inputs:
  - <artifact or context required>
outputs:
  - <artifact produced>
---
```

## Body Sections (in order)

| Section | Purpose | Required? |
|---------|---------|-----------|
| `# Purpose` | One paragraph. Why this skill exists. | Yes |
| `# When to use` | Bullet list. Positive trigger conditions. | Yes |
| `# When NOT to use` | Bullet list. Exclusions and anti-patterns. | Yes |
| `# Prerequisites` | What must be true before this skill runs. | Yes |
| `# Process` | DOT diagram or numbered checklist with explicit gates. | Yes |
| `# Exact steps` | Numbered, concrete, actionable steps. | Yes |
| `# Anti-rationalization checks` | Table: Shortcut → Reality | Yes |
| `# Verification` | Checklist for self-review before declaring done. | Yes |
| `# Exit criteria` | Artifacts that must exist. Claims that must be true. | Yes |
| `# Failure and escalation guidance` | What to do when the skill cannot complete. | Yes |

# Process

```
1. Draft frontmatter → check all required keys present
2. Write Purpose (one paragraph, no bullet points)
3. Write When to use (bullets)
4. Write When NOT to use (bullets — often as important as When to use)
5. Write Prerequisites
6. Write Process (diagram preferred; checklist acceptable)
7. Write Exact steps (numbered, imperative, 1 action per step)
8. Write Anti-rationalization checks (table: at least 2 rows)
9. Write Verification checklist
10. Write Exit criteria (artifacts + claims)
11. Write Failure and escalation guidance
12. Run self-review checklist below
```

# Exact steps

1. Open a new file at `skills/<phase>/<slug>.md`.
2. Write frontmatter with all required keys.
3. Write `# Purpose` — one paragraph, explain the *why*, not the *what*.
4. Write `# When to use` — 2–5 concrete trigger bullets.
5. Write `# When NOT to use` — 2–4 exclusion bullets; be specific.
6. Write `# Prerequisites` — list context or artifacts the agent must have first.
7. Write `# Process` — use a DOT diagram for multi-branch flows; a numbered checklist for linear ones.
8. Write `# Exact steps` — number each step; one discrete action per step; use imperative verbs.
9. Write `# Anti-rationalization checks` — two-column table, at least 2 rows.
10. Write `# Verification` — bullets the agent can self-check before declaring the skill complete.
11. Write `# Exit criteria` — list required output artifacts and any boolean claims.
12. Write `# Failure and escalation guidance` — what to produce when the skill cannot complete normally.
13. Run the self-review checklist.

# Anti-rationalization checks

| Shortcut | Reality |
| --- | --- |
| "The steps are obvious — a brief list is fine." | Agents follow explicit steps. Vague steps produce vague output. |
| "When NOT to use is just the inverse of When to use." | Exclusions prevent misapplication in adjacent contexts that seem similar but aren't. |
| "I'll add the anti-rationalization table later." | Later never comes. Tables are what make agents stop and check rather than proceed. |
| "This skill is simple — it doesn't need a process diagram." | Simple skills still benefit from explicit gates. A checklist is fine; nothing is not. |

# Verification

- [ ] All 10 required body sections are present and non-empty
- [ ] Frontmatter has `id`, `title`, `phase`, `triggers`, `inputs`, `outputs`
- [ ] `# When NOT to use` has at least 2 bullets
- [ ] `# Anti-rationalization checks` has at least 2 rows
- [ ] `# Exact steps` uses imperative verbs and has at least 3 steps
- [ ] `# Exit criteria` names at least one output artifact

# Exit criteria

- Skill file exists at `skills/<phase>/<slug>.md`
- All 10 required sections are present
- Self-review checklist passes

# Failure and escalation guidance

If the trigger or output is unclear, write a stub with frontmatter + a `# Status: DRAFT` note and an assumptions section naming what needs clarification. Do not ship a partial skill as if it were complete — mark it explicitly as draft.

---

## Self-Review Checklist

Run this before committing any skill file:

- [ ] Frontmatter is complete (6 required keys)
- [ ] Purpose is a paragraph, not a list
- [ ] "When NOT to use" exists and is specific
- [ ] Process section shows gates, not just steps
- [ ] Exact steps are imperative and numbered
- [ ] Anti-rationalization table has ≥ 2 rows
- [ ] Exit criteria names artifacts, not just intentions
- [ ] Failure guidance says what to produce, not just "escalate"
