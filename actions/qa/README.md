# swarm-flow QA Action

Runs `swarm-flow qa` with the Playwright QA backend and uploads the resulting `.runs` directory as a GitHub Actions artifact.

The action writes `github-comments.preview.json` for review, but it does not post PR comments automatically. Posting remains a later policy-governed connector operation after a user selection.

## Example

```yaml
name: swarm-flow QA

on:
  pull_request:

jobs:
  qa:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - uses: ./actions/qa
        with:
          target: ${{ github.event.pull_request.html_url }}
          target-url: ${{ secrets.STAGING_URL }}
          ai-provider: bedrock
          ai-model: anthropic.claude-3-5-sonnet-20241022-v2:0
          aws-region: ${{ secrets.AWS_REGION }}
          aws-role-to-assume: ${{ secrets.AWS_BEDROCK_ROLE_ARN }}
          bedrock-inference-profile-arn: ${{ secrets.BEDROCK_INFERENCE_PROFILE_ARN }}
          test-command: npx playwright test --reporter=json
          accessibility-command: npm run qa:accessibility
          artifact-directories: test-results,playwright-report,.runs/<run-id>/artifacts
          comment-mode: preview
```

## Artifacts

The action uploads `.runs` and expects the QA backend to write:

- `qa-context.json`
- `browser-artifacts.json`
- `qa-report.md`
- `test-gap-report.md`
- `validation-status.md`
- `accessibility-report.md` when `accessibility-command` is set
- `github-comments.preview.json`

## Configuration

Use `swarm-flow.qa.yaml` for repository defaults, then override with action inputs for PR-specific URLs, provider selection, model choice, Bedrock role/profile settings, Playwright execution options, the optional accessibility command, and the artifact directory scan list.
