import { describe, expect, it } from "vitest";
import { validateFlow } from "../src/index.js";

describe("validateFlow", () => {
  it("accepts a deterministic flow with dependency-ordered phases", () => {
    const result = validateFlow({
      id: "feature-default",
      name: "Feature Delivery",
      description: "Standard governed flow",
      phases: [
        {
          id: "intake",
          description: "Normalize request",
          agents: ["pm"],
          required_outputs: ["feature_brief"]
        },
        {
          id: "planning",
          description: "Plan delivery",
          agents: ["pm", "architect"],
          required_outputs: ["acceptance_criteria", "task_plan"],
          dependencies: ["intake"],
          approval_required: true
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.flow?.phases.map((phase) => phase.id)).toEqual(["intake", "planning"]);
  });

  it("rejects flows with unknown phase dependencies", () => {
    const result = validateFlow({
      id: "broken",
      name: "Broken Flow",
      phases: [
        {
          id: "planning",
          description: "Plan delivery",
          agents: ["pm"],
          required_outputs: ["task_plan"],
          dependencies: ["discovery"]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("unknown dependency");
  });

  it("rejects cyclic phase dependencies", () => {
    const result = validateFlow({
      id: "cycle",
      name: "Cyclic Flow",
      phases: [
        {
          id: "a",
          description: "A",
          agents: ["pm"],
          required_outputs: ["a"],
          dependencies: ["b"]
        },
        {
          id: "b",
          description: "B",
          agents: ["pm"],
          required_outputs: ["b"],
          dependencies: ["a"]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("cycle");
  });
});
