# Risk Report

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Unauthorized cross-region reassignment | high | medium | Region-scoped authorization tests and review gate. |
| Audit event volume spike | medium | medium | Batch limits and monitoring notes. |
| Partial failure confusion | medium | high | Explicit response contract and QA coverage. |
| Regressing single-case reassignment | high | low | Regression tests for existing path. |
