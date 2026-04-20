export type SubagentDispatchRequest = {
  runId: string;
  phaseId: string;
  phaseDescription: string;
  phasePurpose?: string;
  agentRoles: string[];
  requiredOutputs: string[];
  contextPackPath: string;
  ownedFilesByRole?: Record<string, string[]>;
  generatedAt?: string;
  worktreeRoot?: string;
};

export type SubagentDispatchTaskPacket = {
  runId: string;
  phaseId: string;
  agentRole: string;
  roleCardPath: string;
  recommendedWorktreePath: string;
  scope: string;
  ownedFiles: string[];
  requiredOutputs: string[];
  contextPackPath: string;
  handoffInstructions: string;
};

export type SubagentDispatchManifest = {
  kind: "subagent-dispatch";
  runId: string;
  phaseId: string;
  phaseDescription: string;
  phasePurpose?: string;
  generatedAt: string;
  contextPackPath: string;
  taskPackets: SubagentDispatchTaskPacket[];
};

export type SubagentDispatchPlanner = {
  id: string;
  plan(request: SubagentDispatchRequest): Promise<SubagentDispatchManifest>;
};

export type SubagentHostLaunchRequest = {
  manifest: SubagentDispatchManifest;
  hostId: string;
};

export type SubagentHostLaunchResult = {
  ok: boolean;
  launchedPackets: string[];
  reasons: string[];
};

export type SubagentHostLaunchAdapter = {
  id: string;
  launch(request: SubagentHostLaunchRequest): Promise<SubagentHostLaunchResult>;
};

export class LocalManifestSubagentDispatchAdapter implements SubagentDispatchPlanner {
  id = "local-manifest";

  async plan(request: SubagentDispatchRequest): Promise<SubagentDispatchManifest> {
    return createLocalSubagentDispatchManifest(request);
  }
}

export function createLocalSubagentDispatchManifest(request: SubagentDispatchRequest): SubagentDispatchManifest {
  const taskPackets = uniqueRoles(request.agentRoles).map((agentRole) =>
    createTaskPacket({
      request,
      agentRole
    })
  );

  return {
    kind: "subagent-dispatch",
    runId: request.runId,
    phaseId: request.phaseId,
    phaseDescription: request.phaseDescription,
    phasePurpose: request.phasePurpose,
    generatedAt: request.generatedAt ?? new Date().toISOString(),
    contextPackPath: request.contextPackPath,
    taskPackets
  };
}

function createTaskPacket(input: {
  request: SubagentDispatchRequest;
  agentRole: string;
}): SubagentDispatchTaskPacket {
  const { request, agentRole } = input;
  const scope = request.phasePurpose ?? request.phaseDescription;
  const roleCardPath = `agents/${agentRole}.md`;
  const ownedFiles = request.ownedFilesByRole?.[agentRole] ?? [];
  const recommendedWorktreePath = `${request.worktreeRoot ?? ".worktrees"}/${request.runId}-${request.phaseId}-${agentRole}`;

  return {
    runId: request.runId,
    phaseId: request.phaseId,
    agentRole,
    roleCardPath,
    recommendedWorktreePath,
    scope,
    ownedFiles,
    requiredOutputs: request.requiredOutputs,
    contextPackPath: request.contextPackPath,
    handoffInstructions: [
      `Read ${roleCardPath} and ${request.contextPackPath} before you begin.`,
      `Work inside ${recommendedWorktreePath} and keep the task limited to ${scope}.`,
      `Own the files listed for ${agentRole}: ${ownedFiles.length ? ownedFiles.join(", ") : "none specified"}.`,
      `Return only the required outputs: ${request.requiredOutputs.join(", ") || "none"}.`
    ].join(" ")
  };
}

function uniqueRoles(agentRoles: string[]): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];

  for (const role of agentRoles) {
    if (seen.has(role)) {
      continue;
    }
    seen.add(role);
    roles.push(role);
  }

  return roles;
}
