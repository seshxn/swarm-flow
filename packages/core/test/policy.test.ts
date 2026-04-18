import { describe, expect, it } from "vitest";
import { evaluateExternalWrite, evaluatePhaseEntry } from "../src/index.js";

describe("policy evaluation", () => {
  it("blocks implementation until acceptance criteria are approved", () => {
    const decision = evaluatePhaseEntry({
      policy: {
        id: "default",
        phase_entry_requires_artifacts: {
          implementation: ["acceptance_criteria"]
        },
        approval_required_phases: ["implementation"]
      },
      phaseId: "implementation",
      artifacts: new Set(["technical_design"]),
      approvals: new Set()
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual([
      "implementation requires artifact acceptance_criteria",
      "implementation requires approval"
    ]);
  });

  it("allows an external write only when preview mode or explicit writes are enabled", () => {
    expect(
      evaluateExternalWrite({
        policy: { id: "default", external_writes_require_preview: true },
        connectorId: "jira",
        preview: false
      }).allowed
    ).toBe(false);

    expect(
      evaluateExternalWrite({
        policy: { id: "default", external_writes_require_preview: true },
        connectorId: "jira",
        preview: true
      }).allowed
    ).toBe(true);
  });
});
