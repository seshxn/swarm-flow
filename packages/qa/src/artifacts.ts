import { readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
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

export type BrowserArtifactManifest = {
  runId: string;
  workingDirectory: string;
  outputDirectory: string;
  directories: string[];
  mainCommand: {
    command: string;
    execution: CommandExecution;
  };
  accessibilityCommand?: {
    command: string;
    execution: CommandExecution;
  };
  accessibilityReport?: string;
  artifacts: {
    trace: string[];
    screenshot: string[];
    video: string[];
    json: string[];
    html: string[];
    accessibility: string[];
  };
};

export async function collectBrowserArtifacts(input: {
  artifactDirectories: string[];
  runId: string;
  workingDirectory: string;
  outputDirectory: string;
  mainCommand: { command: string; execution: CommandExecution };
  accessibilityCommand?: { command: string; execution: CommandExecution };
}): Promise<BrowserArtifactManifest> {
  const directories = resolveArtifactDirectories(input.artifactDirectories, input.runId).map((directory) =>
    resolve(input.workingDirectory, directory)
  );
  const discovered = await scanArtifactDirectories(directories, input.workingDirectory);
  const accessibilityReport = input.accessibilityCommand ? relative(input.workingDirectory, join(input.outputDirectory, "accessibility-report.md")) : undefined;

  return {
    runId: input.runId,
    workingDirectory: input.workingDirectory,
    outputDirectory: input.outputDirectory,
    directories: resolveArtifactDirectories(input.artifactDirectories, input.runId),
    mainCommand: input.mainCommand,
    accessibilityCommand: input.accessibilityCommand,
    accessibilityReport,
    artifacts: {
      trace: discovered.trace,
      screenshot: discovered.screenshot,
      video: discovered.video,
      json: discovered.json,
      html: discovered.html,
      accessibility: [
        ...discovered.accessibility,
        ...(accessibilityReport ? [accessibilityReport] : [])
      ]
    }
  };
}

export function renderBrowserArtifactsManifest(input: BrowserArtifactManifest): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

export function renderAccessibilityReport(input: {
  request: QaExecutionRequest;
  execution: CommandExecution;
  command: string;
}): string {
  return [
    "# Accessibility Report",
    "",
    `Run: ${input.request.runId}`,
    `Command: ${input.command}`,
    `Result: ${describeCommandStatus(input.execution.exitCode)}`,
    "",
    "## Output",
    "",
    "```text",
    "STDOUT:",
    input.execution.stdout.trimEnd() || "[no stdout]",
    "",
    "STDERR:",
    input.execution.stderr.trimEnd() || "[no stderr]",
    "```",
    ""
  ].join("\n");
}

export function renderQaContext(input: QaContextInput): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

export function renderQaReport(input: {
  request: QaExecutionRequest;
  success: boolean;
  execution: CommandExecution;
  browserArtifacts: BrowserArtifactManifest;
}): string {
  const accessibilityLine = input.browserArtifacts.accessibilityCommand
    ? `Accessibility command: ${describeCommandStatus(input.browserArtifacts.accessibilityCommand.execution.exitCode)}`
    : "Accessibility command: not configured";
  const accessibilityReportLine = input.browserArtifacts.accessibilityReport
    ? `Accessibility report: [accessibility-report.md](./accessibility-report.md)`
    : "Accessibility report: not configured";

  return [
    "# Playwright QA Report",
    "",
    `Run: ${input.request.runId}`,
    `Target: ${input.request.target.value}`,
    `Backend: ${input.request.backend}`,
    `Mode: ${input.request.mode}`,
    `Result: ${input.success ? "passed" : "failed"}`,
    `Exit code: ${input.execution.exitCode}`,
    `Browser artifacts: [browser-artifacts.json](./browser-artifacts.json)`,
    accessibilityLine,
    accessibilityReportLine,
    ""
  ].join("\n");
}

export function renderTestGapReport(input: {
  request: QaExecutionRequest;
  success: boolean;
  browserArtifacts: BrowserArtifactManifest;
}): string {
  const accessibilityLine = input.browserArtifacts.accessibilityCommand
    ? `Accessibility command: ${describeCommandStatus(input.browserArtifacts.accessibilityCommand.execution.exitCode)}`
    : "Accessibility command: not configured";

  return [
    "# Test Gap Report",
    "",
    `Run: ${input.request.runId}`,
    `Status: ${input.success ? "No blocking gaps detected by configured command." : "Review failed command output."}`,
    `Browser artifacts: [browser-artifacts.json](./browser-artifacts.json)`,
    accessibilityLine,
    input.browserArtifacts.accessibilityReport
      ? `Accessibility report: [accessibility-report.md](./accessibility-report.md)`
      : "Accessibility report: not configured",
    ""
  ].join("\n");
}

export function renderValidationStatus(input: {
  request: QaExecutionRequest;
  success: boolean;
  execution: CommandExecution;
  browserArtifacts: BrowserArtifactManifest;
}): string {
  const accessibilityLine = input.browserArtifacts.accessibilityCommand
    ? `Accessibility: ${describeCommandStatus(input.browserArtifacts.accessibilityCommand.execution.exitCode)}`
    : "Accessibility: not configured";

  return [
    "# Validation Status",
    "",
    `Run: ${input.request.runId}`,
    `Status: ${input.success ? "passed" : "failed"}`,
    `Exit code: ${input.execution.exitCode}`,
    `Browser artifacts: [browser-artifacts.json](./browser-artifacts.json)`,
    accessibilityLine,
    input.browserArtifacts.accessibilityReport
      ? `Accessibility report: [accessibility-report.md](./accessibility-report.md)`
      : "Accessibility report: not configured",
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

function describeCommandStatus(exitCode: number): string {
  return exitCode === 0 ? "passed" : `failed (exit ${exitCode})`;
}

function resolveArtifactDirectories(directories: string[], runId: string): string[] {
  return directories.map((directory) => directory.replace(/<run-id>/g, runId));
}

async function scanArtifactDirectories(
  directories: string[],
  workingDirectory: string
): Promise<BrowserArtifactManifest["artifacts"]> {
  const trace = new Set<string>();
  const screenshot = new Set<string>();
  const video = new Set<string>();
  const json = new Set<string>();
  const html = new Set<string>();
  const accessibility = new Set<string>();

  for (const directory of directories) {
    try {
      for (const file of await walkFiles(directory)) {
        const relativePath = relative(workingDirectory, file);
        const kinds = classifyArtifact(relativePath);
        for (const kind of kinds) {
          switch (kind) {
            case "trace":
              trace.add(relativePath);
              break;
            case "screenshot":
              screenshot.add(relativePath);
              break;
            case "video":
              video.add(relativePath);
              break;
            case "json":
              json.add(relativePath);
              break;
            case "html":
              html.add(relativePath);
              break;
            case "accessibility":
              accessibility.add(relativePath);
              break;
          }
        }
      }
    } catch (error) {
      if (!isMissingDirectory(error)) {
        throw error;
      }
    }
  }

  return {
    trace: [...trace].sort(),
    screenshot: [...screenshot].sort(),
    video: [...video].sort(),
    json: [...json].sort(),
    html: [...html].sort(),
    accessibility: [...accessibility].sort()
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function classifyArtifact(relativePath: string): Array<"trace" | "screenshot" | "video" | "json" | "html" | "accessibility"> {
  const lower = relativePath.toLowerCase();
  const kinds: Array<"trace" | "screenshot" | "video" | "json" | "html" | "accessibility"> = [];

  if (lower.includes("accessibility") || lower.endsWith("/report.md") || lower.endsWith("/accessibility.md")) {
    kinds.push("accessibility");
  }
  switch (extname(lower)) {
    case ".zip":
      kinds.push("trace");
      break;
    case ".png":
    case ".jpg":
    case ".jpeg":
      kinds.push("screenshot");
      break;
    case ".webm":
    case ".mp4":
      kinds.push("video");
      break;
    case ".json":
      kinds.push("json");
      break;
    case ".html":
    case ".htm":
      kinds.push("html");
      break;
  }

  return kinds;
}

function isMissingDirectory(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
