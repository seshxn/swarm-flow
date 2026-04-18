import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
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

  it("accepts optional agents and outputs without making them required", () => {
    const result = validateFlow({
      id: "feature-default",
      name: "Feature Delivery",
      phases: [
        {
          id: "validation",
          description: "Review and test the change",
          agents: ["reviewer", "qa"],
          optional_agents: ["security-auditor"],
          required_outputs: ["review_report", "qa_report"],
          optional_outputs: ["security_review"]
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.flow?.phases[0]?.optional_agents).toEqual(["security-auditor"]);
    expect(result.flow?.phases[0]?.optional_outputs).toEqual(["security_review"]);
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

  it("validates epic delivery and standalone swarm flows", async () => {
    const flowIds = ["epic-delivery", "review-only", "qa-only"];

    for (const flowId of flowIds) {
      const flow = parse(await readFile(resolve(process.cwd(), "flows", `${flowId}.yaml`), "utf8")) as unknown;
      const result = validateFlow(flow);

      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.flow?.id).toBe(flowId);
    }
  });
});
