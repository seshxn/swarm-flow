import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateArtifactSemantics } from "../src/evaluator.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("evaluateArtifactSemantics", () => {
  it("does not call remote LLM providers unless semantic validation is explicitly enabled", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.SWARM_FLOW_ENABLE_REMOTE_SEMANTIC_VALIDATION;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ text: "FAIL: should not be called" }]
        })
      )
    );

    const result = await evaluateArtifactSemantics(
      "feature_brief",
      "private artifact content",
      "Includes goal and scope."
    );

    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
