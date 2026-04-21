# Launch Plan

swarm-flow should launch as a preview-first SDLC orchestration layer, not as an autonomous merge or deployment system.

## Readiness Goals

- Installation instructions work for local CLI, Claude Code, and Codex users.
- Sample runs demonstrate artifact-driven progression from request to delivery package.
- Preview-safe connector behavior is documented clearly.
- Hook execution, policy gates, and approval records are visible in run state.
- Verification commands pass before publishing release notes or marketplace updates.

## Launch Checklist

- Run `npm test`, `npm run typecheck`, and `npm run build`.
- Validate plugin metadata for Claude Code and Codex.
- Validate public JSON Schemas against bundled examples.
- Confirm README examples match the current CLI.
- Publish with clear limits around live external writes and autonomous execution.

## Post-Launch Feedback

Prioritize issues that include `.runs/<run-id>/run.json`, registered artifacts, command output, and connector previews. That evidence keeps launch feedback aligned with the product's artifact-first model.
