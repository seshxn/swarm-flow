import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPlaywrightQaBackend } from "../src/index.js";

describe("Playwright QA backend", () => {
  it("runs a configured test command and writes normalized artifacts", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "swarm-flow-qa-"));
    await writeFile(join(workspace, "fake-test.mjs"), "process.exit(0);\n", "utf8");

    const backend = createPlaywrightQaBackend();
    const result = await backend.execute({
      runId: "run-qa-pr-123",
      target: {
        type: "github_pr",
        value: "https://github.com/org/repo/pull/123"
      },
      backend: "playwright",
      targetUrl: "https://staging.example.com",
      mode: "execute",
      testCommand: "node fake-test.mjs",
      workingDirectory: workspace,
      outputDirectory: join(workspace, ".runs", "run-qa-pr-123", "artifacts")
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    await expect(readFile(result.artifacts.qaReport, "utf8")).resolves.toContain("Playwright QA Report");
    await expect(readFile(result.artifacts.validationStatus, "utf8")).resolves.toContain("passed");
  });
});
