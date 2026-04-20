import { describe, expect, it } from "vitest";
import { createLocalSubagentDispatchManifest } from "../src/index.js";

describe("createLocalSubagentDispatchManifest", () => {
  it("builds one task packet per specialist agent with role-card paths and worktree recommendations", () => {
    const manifest = createLocalSubagentDispatchManifest({
      runId: "run-123",
      phaseId: "planning",
      phaseDescription: "Define scope and acceptance criteria",
      phasePurpose: "Convert evidence into testable scope and implementable slices.",
      agentRoles: ["pm", "architect", "security-auditor"],
      requiredOutputs: ["acceptance_criteria", "task_plan"],
      contextPackPath: ".runs/run-123/context/current-phase-context.md",
      ownedFilesByRole: {
        pm: ["docs/feature-brief.md"],
        architect: ["packages/cli/src/index.ts"],
        "security-auditor": ["packages/cli/src/index.ts"]
      }
    });

    expect(manifest.kind).toBe("subagent-dispatch");
    expect(manifest.runId).toBe("run-123");
    expect(manifest.phaseId).toBe("planning");
    expect(manifest.contextPackPath).toBe(".runs/run-123/context/current-phase-context.md");
    expect(manifest.taskPackets).toHaveLength(3);
    expect(manifest.taskPackets.map((packet) => packet.agentRole)).toEqual([
      "pm",
      "architect",
      "security-auditor"
    ]);
    expect(manifest.taskPackets[0]).toMatchObject({
      agentRole: "pm",
      roleCardPath: "agents/pm.md",
      recommendedWorktreePath: ".worktrees/run-123-planning-pm",
      ownedFiles: ["docs/feature-brief.md"],
      scope: "Convert evidence into testable scope and implementable slices."
    });
    expect(manifest.taskPackets[1]).toMatchObject({
      agentRole: "architect",
      roleCardPath: "agents/architect.md",
      recommendedWorktreePath: ".worktrees/run-123-planning-architect",
      ownedFiles: ["packages/cli/src/index.ts"],
      requiredOutputs: ["acceptance_criteria", "task_plan"]
    });
    expect(manifest.taskPackets[2]).toMatchObject({
      agentRole: "security-auditor",
      roleCardPath: "agents/security-auditor.md",
      recommendedWorktreePath: ".worktrees/run-123-planning-security-auditor"
    });
  });
});
