export type AgentAdapterRequest = {
  agentId: string;
  phaseId: string;
  artifacts: Record<string, string>;
};

export type AgentAdapterResult = {
  agentId: string;
  phaseId: string;
  outputs: Record<string, string>;
  evidence: string[];
};

export type AgentAdapter = {
  invoke(request: AgentAdapterRequest): Promise<AgentAdapterResult>;
};
