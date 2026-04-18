# Agent Model

Agents are specialist role cards. They are not broad personalities and they should not silently change roles.

## Required Fields

Each agent definition should include:

- purpose
- typical phases
- inputs
- outputs
- preferred tools
- prohibited actions
- escalation conditions
- collaboration expectations

## Role Boundaries

The boundary is deliberate. A scout gathers context, a PM clarifies scope, an architect designs, an implementer changes code, a reviewer critiques, QA validates, docs updates durable knowledge, and release packages delivery.

If synthesis is needed, the flow should include a synthesis step or a phase with multiple agents. One agent should not silently become another role.

## Example

```text
scout -> discovery_report
pm + architect -> acceptance_criteria and task_plan
architect -> technical_design and adr
implementer -> code_changes and tests_added
reviewer + qa -> review_report and qa_report
release -> pr_summary and merge_checklist
```
