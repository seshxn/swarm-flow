import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileRunStore, FlowRuntime } from "../src/index.js";

const flow = {
  id: "feature-default",
  name: "Feature Delivery",
  phases: [
    {
      id: "intake",
      description: "Normalize request",
      agents: ["pm"],
      required_outputs: ["feature_brief"]
    },
    {
      id: "planning",
      description: "Plan delivery",
      agents: ["pm", "architect"],
      required_outputs: ["acceptance_criteria", "task_plan"],
      dependencies: ["intake"]
    }
  ]
};

let workspace: string | undefined;

afterEach(async () => {
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
    workspace = undefined;
  }
});

describe("FlowRuntime", () => {
  it("starts a run with durable run state and a feature brief artifact", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({
      repoRoot: workspace,
      store: new FileRunStore(workspace)
    });

    const run = await runtime.startFeatureRun({
      flow,
      title: "Bulk case reassignment by region",
      goal: "Allow admins to reassign cases in batches with audit logging",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    expect(run.current_phase).toBe("intake");
    expect(run.artifact_registry.feature_brief.path).toBe("artifacts/feature-brief.md");

    const persistedRun = JSON.parse(await readFile(join(workspace, ".runs", run.id, "run.json"), "utf8"));
    expect(persistedRun.flow_id).toBe("feature-default");

    const featureBrief = await readFile(join(workspace, ".runs", run.id, "artifacts", "feature-brief.md"), "utf8");
    expect(featureBrief).toContain("Bulk case reassignment by region");
    expect(featureBrief).toContain("Allow admins to reassign cases");
  });

  it("starts a standalone review run with target metadata", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({
      repoRoot: workspace,
      store: new FileRunStore(workspace)
    });

    const run = await runtime.startFeatureRun({
      flow,
      title: "Review PR 123",
      goal: "Review https://github.com/org/repo/pull/123",
      scope: "review",
      target: {
        type: "github_pr",
        value: "https://github.com/org/repo/pull/123"
      },
      now: new Date("2026-04-18T08:00:00.000Z")
    });

    expect(run.scope).toBe("review");
    expect(run.target).toEqual({
      type: "github_pr",
      value: "https://github.com/org/repo/pull/123"
    });

    const persistedRun = JSON.parse(await readFile(join(workspace, ".runs", run.id, "run.json"), "utf8"));
    expect(persistedRun.scope).toBe("review");
    expect(persistedRun.target.type).toBe("github_pr");
  });

  it("does not advance a phase until required outputs exist", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({
      repoRoot: workspace,
      store: new FileRunStore(workspace)
    });
    const run = await runtime.startFeatureRun({
      flow,
      title: "Feature",
      goal: "Goal",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    await expect(runtime.completePhase(run.id, "intake", [])).rejects.toThrow("missing required outputs");

    const advanced = await runtime.completePhase(run.id, "intake", ["feature_brief"]);
    expect(advanced.completed_phases).toEqual(["intake"]);
    expect(advanced.current_phase).toBe("planning");
  });

  it("does not advance when named outputs are not registered artifacts", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({
      repoRoot: workspace,
      store: new FileRunStore(workspace)
    });
    const run = await runtime.startFeatureRun({
      flow,
      title: "Feature",
      goal: "Goal",
      now: new Date("2026-04-17T12:00:00.000Z")
    });
    const planning = await runtime.completePhase(run.id, "intake", ["feature_brief"]);

    await expect(runtime.completePhase(planning.id, "planning", ["acceptance_criteria", "task_plan"])).rejects.toThrow(
      "outputs are not registered artifacts"
    );
  });

  it("does not advance when an exit hook fails", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    await mkdir(join(workspace, "hooks", "after-phase"), { recursive: true });
    await writeFile(
      join(workspace, "hooks", "after-phase", "fail-validation.yaml"),
      [
        "id: fail-validation",
        "trigger: after_phase",
        "description: fail validation",
        "conditions: []",
        "actions:",
        "  - command:node -e \"process.exit(7)\""
      ].join("\n"),
      "utf8"
    );

    const gatedFlow = {
      id: "feature-default",
      name: "Feature Delivery",
      phases: [
        {
          id: "intake",
          description: "Normalize request",
          agents: ["pm"],
          required_outputs: ["feature_brief"],
          hooks: {
            after: ["fail_validation"]
          }
        },
        {
          id: "planning",
          description: "Plan delivery",
          agents: ["pm"],
          required_outputs: ["acceptance_criteria"],
          dependencies: ["intake"]
        }
      ]
    };
    const runtime = new FlowRuntime({
      repoRoot: workspace,
      store: new FileRunStore(workspace)
    });
    const run = await runtime.startFeatureRun({
      flow: gatedFlow,
      title: "Feature",
      goal: "Goal",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    await expect(runtime.completePhase(run.id, "intake", ["feature_brief"])).rejects.toThrow(
      "hook fail_validation failed"
    );

    const persisted = await new FileRunStore(workspace).load(run.id);
    expect(persisted.completed_phases).toEqual([]);
    expect(persisted.current_phase).toBe("intake");
    expect(persisted.hook_executions[0]).toMatchObject({
      id: "fail_validation",
      trigger: "after_phase",
      phase: "intake",
      status: "failed"
    });
  });
});
