import type { QaExecutionRequest } from "./types.js";

export type QaContextInput = {
  runId: string;
  target: unknown;
  backend: string;
  targetUrl?: string;
  mode: string;
};

export type CommandExecution = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export function renderQaContext(input: QaContextInput): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

export function renderQaReport(input: {
  request: QaExecutionRequest;
  success: boolean;
  execution: CommandExecution;
}): string {
  return [
    "# Playwright QA Report",
    "",
    `Run: ${input.request.runId}`,
    `Target: ${input.request.target.value}`,
    `Backend: ${input.request.backend}`,
    `Mode: ${input.request.mode}`,
    `Result: ${input.success ? "passed" : "failed"}`,
    `Exit code: ${input.execution.exitCode}`,
    ""
  ].join("\n");
}

export function renderTestGapReport(input: { request: QaExecutionRequest; success: boolean }): string {
  return [
    "# Test Gap Report",
    "",
    `Run: ${input.request.runId}`,
    `Status: ${input.success ? "No blocking gaps detected by configured command." : "Review failed command output."}`,
    ""
  ].join("\n");
}

export function renderValidationStatus(input: {
  request: QaExecutionRequest;
  success: boolean;
  execution: CommandExecution;
}): string {
  return [
    "# Validation Status",
    "",
    `Run: ${input.request.runId}`,
    `Status: ${input.success ? "passed" : "failed"}`,
    `Exit code: ${input.execution.exitCode}`,
    ""
  ].join("\n");
}

export function renderGithubCommentsPreview(input: { request: QaExecutionRequest; success: boolean }): string {
  return `${JSON.stringify(
    {
      runId: input.request.runId,
      mode: "preview",
      target: input.request.target.value,
      comments: [
        {
          id: "qa-summary",
          connector_id: "github",
          type: "summary",
          severity: input.success ? "info" : "high",
          body: input.success
            ? "QA evidence is available in the swarm-flow run artifacts."
            : "QA validation failed. Review the swarm-flow QA artifacts before merging.",
          recommended: true
        }
      ]
    },
    null,
    2
  )}\n`;
}
