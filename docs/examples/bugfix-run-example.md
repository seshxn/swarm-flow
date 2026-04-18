# Bugfix Run Example

```bash
swarm-flow start "Retry failed webhook delivery without duplicating deliveries" \
  --flow flows/bugfix-fastlane.yaml
```

The bugfix fastlane keeps discovery and design lightweight, but still requires evidence:

- reproduction notes
- root cause summary
- regression test
- fix plan
- validation report
