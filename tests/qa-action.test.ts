import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("QA GitHub Action metadata", () => {
  it("exposes configurable provider, Bedrock, target URL, and preview comment inputs", async () => {
    const action = parse(await readFile("actions/qa/action.yml", "utf8")) as {
      inputs: Record<string, { default?: string; required?: boolean }>;
      runs: { steps: Array<{ run?: string }> };
    };

    expect(action.inputs["target-url"]).toBeTruthy();
    expect(action.inputs["ai-provider"]).toBeTruthy();
    expect(action.inputs["ai-model"]).toBeTruthy();
    expect(action.inputs["aws-region"]).toBeTruthy();
    expect(action.inputs["aws-profile"]).toBeTruthy();
    expect(action.inputs["aws-role-to-assume"]).toBeTruthy();
    expect(action.inputs["bedrock-inference-profile-arn"]).toBeTruthy();
    expect(action.inputs["comment-mode"]?.default).toBe("preview");
    expect(action.inputs["comment-mode"]?.required).toBe(false);
    expect(action.runs.steps.some((step) => step.run?.includes("swarm-flow qa"))).toBe(true);
    expect(action.runs.steps.some((step) => step.run?.includes("comments select"))).toBe(false);
  });
});
