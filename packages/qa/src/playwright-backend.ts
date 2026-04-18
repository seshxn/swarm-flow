import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  renderGithubCommentsPreview,
  renderQaContext,
  renderQaReport,
  renderTestGapReport,
  renderValidationStatus
} from "./artifacts.js";
import type { QaBackend, QaExecutionResult } from "./types.js";

export function createPlaywrightQaBackend(): QaBackend {
  return {
    id: "playwright",
    async execute(request) {
      const startedAt = new Date().toISOString();
      await mkdir(request.outputDirectory, { recursive: true });
      const command = request.testCommand ?? "npx playwright test --reporter=json";
      const execution = await runCommand(command, request.workingDirectory);
      const completedAt = new Date().toISOString();
      const success = execution.exitCode === 0;

      const qaContext = join(request.outputDirectory, "qa-context.json");
      const qaReport = join(request.outputDirectory, "qa-report.md");
      const testGapReport = join(request.outputDirectory, "test-gap-report.md");
      const validationStatus = join(request.outputDirectory, "validation-status.md");
      const githubCommentsPreview = join(request.outputDirectory, "github-comments.preview.json");

      await writeFile(qaContext, renderQaContext(request), "utf8");
      await writeFile(qaReport, renderQaReport({ request, success, execution }), "utf8");
      await writeFile(testGapReport, renderTestGapReport({ request, success }), "utf8");
      await writeFile(validationStatus, renderValidationStatus({ request, success, execution }), "utf8");
      await writeFile(githubCommentsPreview, renderGithubCommentsPreview({ request, success }), "utf8");

      return {
        success,
        backend: "playwright",
        command,
        exitCode: execution.exitCode,
        startedAt,
        completedAt,
        artifacts: {
          qaContext,
          qaReport,
          testGapReport,
          validationStatus,
          githubCommentsPreview
        },
        errors: success ? [] : [execution.stderr || "Playwright command failed"]
      } satisfies QaExecutionResult;
    }
  };
}

function runCommand(command: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ exitCode: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
