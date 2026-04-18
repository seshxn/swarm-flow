import { describe, expect, it } from "vitest";
import { renderQaContext } from "../src/index.js";

describe("QA artifacts", () => {
  it("renders QA context as stable JSON", () => {
    expect(
      JSON.parse(
        renderQaContext({
          runId: "run-qa-pr-123",
          target: {
            type: "github_pr",
            value: "https://github.com/org/repo/pull/123"
          },
          backend: "playwright",
          targetUrl: "https://staging.example.com",
          mode: "execute"
        })
      )
    ).toEqual({
      runId: "run-qa-pr-123",
      target: {
        type: "github_pr",
        value: "https://github.com/org/repo/pull/123"
      },
      backend: "playwright",
      targetUrl: "https://staging.example.com",
      mode: "execute"
    });
  });
});
