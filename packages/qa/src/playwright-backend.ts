import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  collectBrowserArtifacts,
  renderAccessibilityReport,
  renderBrowserArtifactsManifest,
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
      const execution = await runCommand(command, request.workingDirectory, request.config?.browser.timeoutMs);
      let accessibilityExecution: { exitCode: number; stdout: string; stderr: string } | undefined;
      if (request.config?.accessibility.command) {
        if (execution.exitCode === 0) {
          accessibilityExecution = await runCommand(
            request.config.accessibility.command,
            request.workingDirectory,
            request.config.browser.timeoutMs
          );
        } else {
          accessibilityExecution = {
            exitCode: 1,
            stdout: "",
            stderr: "Accessibility command did not run because the main QA command failed."
          };
        }
      }
      const completedAt = new Date().toISOString();
      const success = execution.exitCode === 0 && (!request.config?.accessibility.command || accessibilityExecution?.exitCode === 0);

      const browserArtifacts = await collectBrowserArtifacts({
        artifactDirectories: request.config?.artifacts.directories ?? [
          "test-results",
          "playwright-report",
          ".runs/<run-id>/artifacts"
        ],
        runId: request.runId,
        workingDirectory: request.workingDirectory,
        outputDirectory: request.outputDirectory,
        mainCommand: {
          command,
          execution
        },
        accessibilityCommand: request.config?.accessibility.command && accessibilityExecution
          ? {
              command: request.config.accessibility.command,
              execution: accessibilityExecution
            }
          : undefined
      });

      const qaContext = join(request.outputDirectory, "qa-context.json");
      const qaReport = join(request.outputDirectory, "qa-report.md");
      const testGapReport = join(request.outputDirectory, "test-gap-report.md");
      const validationStatus = join(request.outputDirectory, "validation-status.md");
      const githubCommentsPreview = join(request.outputDirectory, "github-comments.preview.json");
      const browserArtifactsPath = join(request.outputDirectory, "browser-artifacts.json");
      const accessibilityReport = join(request.outputDirectory, "accessibility-report.md");

      await writeFile(qaContext, renderQaContext(request), "utf8");
      await writeFile(browserArtifactsPath, renderBrowserArtifactsManifest(browserArtifacts), "utf8");
      if (request.config?.accessibility.command) {
        await writeFile(
          accessibilityReport,
          renderAccessibilityReport({
            request,
            execution: accessibilityExecution ?? {
              exitCode: 1,
              stdout: "",
              stderr: "Accessibility command did not run."
            },
            command: request.config.accessibility.command
          }),
          "utf8"
        );
      }
      await writeFile(
        qaReport,
        renderQaReport({ request, success, execution, browserArtifacts }),
        "utf8"
      );
      await writeFile(
        testGapReport,
        renderTestGapReport({ request, success, browserArtifacts }),
        "utf8"
      );
      await writeFile(
        validationStatus,
        renderValidationStatus({ request, success, execution, browserArtifacts }),
        "utf8"
      );
      await writeFile(githubCommentsPreview, renderGithubCommentsPreview({ request, success }), "utf8");

      return {
        success,
        backend: "playwright",
        command,
        exitCode: success ? 0 : (execution.exitCode !== 0 ? execution.exitCode : accessibilityExecution?.exitCode ?? 1),
        startedAt,
        completedAt,
        artifacts: {
          qaContext,
          qaReport,
          testGapReport,
          validationStatus,
          browserArtifacts: browserArtifactsPath,
          accessibilityReport: request.config?.accessibility.command ? accessibilityReport : undefined,
          githubCommentsPreview
        },
        errors: success
          ? []
          : [
              execution.exitCode !== 0
                ? execution.stderr || "Playwright command failed"
                : accessibilityExecution?.stderr || "Accessibility command failed"
            ]
      } satisfies QaExecutionResult;
    }
  };
}

const maxBufferedOutput = 16_384;
const defaultCommandTimeoutMs = 30_000;

function runCommand(
  command: string,
  cwd: string,
  timeoutMs = defaultCommandTimeoutMs
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    function finish(exitCode: number, finalStderr = stderr): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr: finalStderr });
    }

    child.stdout?.on("data", (chunk) => {
      stdout = appendBounded(stdout, String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendBounded(stderr, String(chunk));
    });
    child.on("error", (error) => {
      finish(1, appendBounded(stderr, error.message));
    });
    child.on("close", (code) => {
      if (timedOut) {
        finish(124, appendBounded(stderr, `Command timed out after ${timeoutMs}ms: ${command}`));
        return;
      }
      finish(code ?? 1);
    });
  });
}

function appendBounded(existing: string, chunk: string): string {
  const next = existing + chunk;
  if (next.length <= maxBufferedOutput) {
    return next;
  }
  return next.slice(next.length - maxBufferedOutput);
}
