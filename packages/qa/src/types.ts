import type { RunTarget } from "@swarm-flow/core";
import type { NormalizedQaConfig } from "./config.js";

export type QaBackendId = "playwright";
export type QaMode = "suggest" | "execute" | "full";

export type QaExecutionRequest = {
  runId: string;
  target: RunTarget;
  backend: QaBackendId;
  targetUrl?: string;
  mode: QaMode;
  config?: NormalizedQaConfig;
  testCommand?: string;
  workingDirectory: string;
  outputDirectory: string;
};

export type QaExecutionResult = {
  success: boolean;
  backend: QaBackendId;
  command?: string;
  exitCode?: number;
  startedAt: string;
  completedAt: string;
  artifacts: {
    qaContext: string;
    qaReport: string;
    testGapReport: string;
    validationStatus: string;
    browserArtifacts?: string;
    accessibilityReport?: string;
    githubCommentsPreview?: string;
    playwrightResults?: string;
  };
  errors: string[];
};

export type QaBackend = {
  id: QaBackendId;
  execute(request: QaExecutionRequest): Promise<QaExecutionResult>;
};
