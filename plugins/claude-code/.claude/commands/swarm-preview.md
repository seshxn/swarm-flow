---
description: Create a safe external-write preview
argument-hint: "jira|confluence|github"
---

Create a preview for the requested target:

```bash
swarm-flow preview "<target>"
```

Then read the generated file under `.runs/<run-id>/outputs/previews/` and summarize what would be written.

Do not perform live external writes from this command.
