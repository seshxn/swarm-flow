export type AgentAdapterRequest = {
  runId: string;
  repoRoot: string;
  agentId: string;
  phaseId: string;
  goal: string;
  requiredOutputs: string[];
  contextFiles: Record<string, string>;
};

export type AgentAdapterResult = {
  ok: boolean;
  artifacts_created: Record<string, string>;
  reasons: string[];
};

export type AgentAdapter = {
  id: string;
  invoke(request: AgentAdapterRequest): Promise<AgentAdapterResult>;
};

export * from "./evaluator.js";
export * from "./subagent-dispatch.js";
export * from "./standard.js";
