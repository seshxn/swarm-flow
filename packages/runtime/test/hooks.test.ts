import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HookRunner } from "../src/hooks.js";
import { FileRunStore } from "../src/index.js";

describe("HookRunner", () => {
  let tmpRoot: string;
  let store: FileRunStore;
  let runner: HookRunner;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "swarm-flow-hooks-test-"));
    await mkdir(join(tmpRoot, ".runs"), { recursive: true });
    await mkdir(join(tmpRoot, "hooks", "after-phase"), { recursive: true });

    store = new FileRunStore(tmpRoot);
    runner = new HookRunner({ repoRoot: tmpRoot, store });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("handles missing hook gracefully", async () => {
    await store.save({
      id: "run-1",
      repo: { root: tmpRoot },
      feature: { title: "Test", goal: "Test" },
      flow_id: "test",
      flow_snapshot: {} as any,
      current_phase: "start",
      completed_phases: [],
      pending_phases: [],
      artifact_registry: {},
      agent_executions: [],
      hook_executions: [],
      policy_decisions: [],
      approvals: {},
      tool_writes: [],
      connector_write_previews: [],
      external_comment_previews: [],
      external_posting_selections: [],
      logs: [],
      unresolved_assumptions: [],
      unresolved_risks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await runner.executeHooks("run-1", "after_phase", ["non-existent"], "start");

    const state = await store.load("run-1");
    expect(state.hook_executions).toHaveLength(1);
    expect(state.hook_executions[0].status).toBe("failed");
    expect(state.hook_executions[0].error).toBe("Hook definition not found");
  });

  it("executes valid hook commands", async () => {
    const runId = "run-2";
    await store.save({
      id: runId,
      repo: { root: tmpRoot },
      feature: { title: "Test", goal: "Test" },
      flow_id: "test",
      flow_snapshot: {} as any,
      current_phase: "start",
      completed_phases: [],
      pending_phases: [],
      artifact_registry: {},
      agent_executions: [],
      hook_executions: [],
      policy_decisions: [],
      approvals: {},
      tool_writes: [],
      connector_write_previews: [],
      external_comment_previews: [],
      external_posting_selections: [],
      logs: [],
      unresolved_assumptions: [],
      unresolved_risks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Write a dummy hook definition file
    const hookYaml = `
id: my-test-hook
trigger: after_phase
phase: start
description: test hook
conditions: []
actions:
  - command:echo_hook-test > test-hook-output.txt
`;
    await writeFile(join(tmpRoot, "hooks", "after-phase", "my-test-hook.yaml"), hookYaml, "utf8");

    await runner.executeHooks(runId, "after_phase", ["my-test-hook"], "start");

    const state = await store.load(runId);
    expect(state.hook_executions).toHaveLength(1);
    expect(state.hook_executions[0].status).toBe("completed");
  });

  it("resolves bundled hook ids across hyphenated files and underscored flow references", async () => {
    const runId = "run-2b";
    await store.save({
      id: runId,
      repo: { root: tmpRoot },
      feature: { title: "Test", goal: "Test" },
      flow_id: "test",
      flow_snapshot: {} as any,
      current_phase: "start",
      completed_phases: [],
      pending_phases: [],
      artifact_registry: {},
      agent_executions: [],
      hook_executions: [],
      policy_decisions: [],
      approvals: {},
      tool_writes: [],
      connector_write_previews: [],
      external_comment_previews: [],
      external_posting_selections: [],
      logs: [],
      unresolved_assumptions: [],
      unresolved_risks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const hookYaml = `
id: persist-artifacts
trigger: after_phase
description: persist artifacts
conditions: []
actions:
  - log:event
safety:
  external_writes: preview_only
  retry_safe: true
`;
    await writeFile(join(tmpRoot, "hooks", "after-phase", "persist-artifacts.yaml"), hookYaml, "utf8");

    const results = await runner.executeHooks(runId, "after_phase", ["persist_artifacts"], "start");

    const state = await store.load(runId);
    expect(results).toEqual([
      expect.objectContaining({
        id: "persist_artifacts",
        status: "completed"
      })
    ]);
    expect(state.hook_executions).toHaveLength(1);
    expect(state.hook_executions[0].status).toBe("completed");
  });

  it("skips hook when conditions are not met", async () => {
    const runId = "run-3";
    await store.save({
      id: runId,
      repo: { root: tmpRoot },
      feature: { title: "Test", goal: "Test" },
      flow_id: "test",
      flow_snapshot: {} as any,
      current_phase: "start",
      completed_phases: [],
      pending_phases: [],
      artifact_registry: {}, // no artifacts
      agent_executions: [],
      hook_executions: [],
      policy_decisions: [],
      approvals: {},
      tool_writes: [],
      connector_write_previews: [],
      external_comment_previews: [],
      external_posting_selections: [],
      logs: [],
      unresolved_assumptions: [],
      unresolved_risks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const hookYaml = `
id: my-conditional-hook
trigger: after_phase
phase: start
description: conditional hook
conditions:
  - artifact_exists:some_missing_artifact
actions:
  - log:should-not-run
`;
    await writeFile(join(tmpRoot, "hooks", "after-phase", "my-conditional-hook.yaml"), hookYaml, "utf8");

    await runner.executeHooks(runId, "after_phase", ["my-conditional-hook"], "start");

    const state = await store.load(runId);
    // Condition not met -> hook is skipped entirely without error
    expect(state.hook_executions).toHaveLength(0);
  });
});
