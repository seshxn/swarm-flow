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

  it("collects browser artifacts and writes an accessibility report when configured", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "swarm-flow-qa-"));
    await writeFile(
      join(workspace, "fake-test.mjs"),
      [
        "import { mkdir, writeFile } from 'node:fs/promises';",
        "await mkdir('test-results/spec', { recursive: true });",
        "await mkdir('playwright-report', { recursive: true });",
        "await mkdir('.runs/run-qa-pr-123/artifacts', { recursive: true });",
        "await writeFile('test-results/spec/trace.zip', 'trace');",
        "await writeFile('test-results/spec/screenshot.png', 'screenshot');",
        "await writeFile('test-results/spec/video.webm', 'video');",
        "await writeFile('playwright-report/results.json', '{\"ok\":true}');",
        "await writeFile('playwright-report/index.html', '<html></html>');",
        "process.exit(0);"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      join(workspace, "fake-accessibility.mjs"),
      [
        "import { mkdir, writeFile } from 'node:fs/promises';",
        "await mkdir('test-results/accessibility', { recursive: true });",
        "await writeFile('test-results/accessibility/results.json', '{\"a11y\":true}');",
        "await writeFile('test-results/accessibility/report.html', '<html>a11y</html>');",
        "console.log('Accessibility checks passed');"
      ].join("\n"),
      "utf8"
    );

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
      outputDirectory: join(workspace, ".runs", "run-qa-pr-123", "artifacts"),
      config: {
        backend: "playwright",
        mode: "execute",
        commentMode: "preview",
        target: {
          environment: "staging"
        },
        browser: {
          name: "chromium",
          headless: true,
          timeoutMs: 30_000,
          retries: 2,
          screenshot: "failures",
          trace: "retain-on-failure",
          video: "off"
        },
        test: {
          command: "node fake-test.mjs",
          directory: "tests",
          generatedDirectory: "tests/swarm-flow"
        },
        artifacts: {
          directories: ["test-results", "playwright-report", ".runs/run-qa-pr-123/artifacts"]
        },
        accessibility: {
          command: "node fake-accessibility.mjs"
        },
        ai: {
          provider: "openai",
          model: "gpt-5.4-mini"
        }
      }
    });

    expect(result.success).toBe(true);
    expect(result.artifacts.browserArtifacts).toBeTruthy();
    expect(result.artifacts.accessibilityReport).toBeTruthy();

    const browserArtifacts = JSON.parse(await readFile(result.artifacts.browserArtifacts ?? "", "utf8"));
    expect(browserArtifacts.artifacts.trace).toContain("test-results/spec/trace.zip");
    expect(browserArtifacts.artifacts.screenshot).toContain("test-results/spec/screenshot.png");
    expect(browserArtifacts.artifacts.video).toContain("test-results/spec/video.webm");
    expect(browserArtifacts.artifacts.json).toEqual(
      expect.arrayContaining([
        "playwright-report/results.json",
        "test-results/accessibility/results.json"
      ])
    );
    expect(browserArtifacts.artifacts.html).toEqual(
      expect.arrayContaining(["playwright-report/index.html", "test-results/accessibility/report.html"])
    );
    expect(browserArtifacts.artifacts.accessibility).toContain(
      ".runs/run-qa-pr-123/artifacts/accessibility-report.md"
    );

    await expect(readFile(result.artifacts.accessibilityReport ?? "", "utf8")).resolves.toContain(
      "Accessibility Report"
    );
    await expect(readFile(result.artifacts.qaReport, "utf8")).resolves.toContain("[browser-artifacts.json]");
    await expect(readFile(result.artifacts.testGapReport, "utf8")).resolves.toContain("[accessibility-report.md]");
    await expect(readFile(result.artifacts.validationStatus, "utf8")).resolves.toContain("Accessibility:");
  });
});
