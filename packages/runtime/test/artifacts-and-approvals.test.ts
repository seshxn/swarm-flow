import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildEvidenceGraph, FileRunStore, FlowRuntime, validateArtifactContent } from "../src/index.js";

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
      agents: ["pm"],
      required_outputs: ["acceptance_criteria"],
      dependencies: ["intake"],
      approval_required: true
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

describe("artifacts and approvals", () => {
  it("registers markdown artifacts and persists the artifact file", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
    const run = await runtime.startFeatureRun({
      flow,
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    const updated = await runtime.registerArtifact(run.id, {
      id: "acceptance_criteria",
      fileName: "acceptance-criteria.md",
      phaseId: "planning",
      mediaType: "text/markdown",
      content: "# Acceptance Criteria\n\n- Admins can reassign by region.\n"
    });

    expect(updated.artifact_registry.acceptance_criteria.path).toBe("artifacts/acceptance-criteria.md");
    await expect(
      readFile(join(workspace, ".runs", run.id, "artifacts", "acceptance-criteria.md"), "utf8")
    ).resolves.toContain("Admins can reassign by region");
  });

  it("records approvals with actor, phase, timestamp, and note", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
    const run = await runtime.startFeatureRun({
      flow,
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    const approved = await runtime.approvePhase(run.id, {
      phaseId: "planning",
      approvedBy: "sesh",
      note: "Acceptance criteria are ready.",
      now: new Date("2026-04-17T13:00:00.000Z")
    });

    expect(approved.approvals.planning).toEqual({
      phase_id: "planning",
      approved_by: "sesh",
      approved_at: "2026-04-17T13:00:00.000Z",
      note: "Acceptance criteria are ready."
    });
  });

  it("records external posting selections in run state", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
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

    const updated = await runtime.recordExternalPostingSelection(run.id, {
      target: "https://github.com/org/repo/pull/123",
      selection_mode: "selected",
      selected_comment_ids: ["comment-1", "comment-2"],
      skipped_comment_ids: ["comment-3"],
      posted: [],
      now: new Date("2026-04-18T09:00:00.000Z")
    });

    expect(updated.external_posting_selections).toEqual([
      {
        target: "https://github.com/org/repo/pull/123",
        selection_mode: "selected",
        selected_comment_ids: ["comment-1", "comment-2"],
        skipped_comment_ids: ["comment-3"],
        posted: []
      }
    ]);

    const persistedRun = JSON.parse(await readFile(join(workspace, ".runs", run.id, "run.json"), "utf8"));
    expect(persistedRun.external_posting_selections[0].selected_comment_ids).toEqual(["comment-1", "comment-2"]);
  });

  it("lists persisted runs newest first", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const store = new FileRunStore(workspace);
    const runtime = new FlowRuntime({ repoRoot: workspace, store });

    await runtime.startFeatureRun({
      flow,
      title: "First run",
      goal: "First goal",
      now: new Date("2026-04-17T12:00:00.000Z")
    });
    await runtime.startFeatureRun({
      flow,
      title: "Second run",
      goal: "Second goal",
      now: new Date("2026-04-17T13:00:00.000Z")
    });

    const runs = await store.list();
    expect(runs.map((run) => run.id)).toEqual(["run-2026-04-17-second-run", "run-2026-04-17-first-run"]);
  });

  it("blocks implementation completion until tests_added has valid red and green evidence", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
    const run = await runtime.startFeatureRun({
      flow: {
        id: "feature-default",
        name: "Feature Delivery",
        phases: [
          {
            id: "implementation",
            description: "Implement the change",
            agents: ["implementer"],
            required_outputs: ["code_changes", "tests_added"]
          },
          {
            id: "validation",
            description: "Validate the change",
            agents: ["qa"],
            required_outputs: ["validation_status"],
            dependencies: ["implementation"]
          }
        ]
      },
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    await runtime.registerArtifact(run.id, {
      id: "code_changes",
      fileName: "code-changes.md",
      phaseId: "implementation",
      mediaType: "text/markdown",
      content: "# Code Changes\n\n- Updated the assignment flow.\n"
    });
    await runtime.registerArtifact(run.id, {
      id: "tests_added",
      fileName: "tdd-evidence.json",
      phaseId: "implementation",
      mediaType: "application/json",
      content: JSON.stringify(
        {
          artifactId: "tests_added",
          testCommand: "npm test packages/runtime/test/artifacts-and-approvals.test.ts",
          createdAt: "2026-04-17T12:05:00.000Z"
        },
        null,
        2
      )
    });

    await expect(runtime.completePhase(run.id, "implementation", ["code_changes", "tests_added"])).rejects.toThrow(
      "implementation requires valid red and green evidence for tests_added"
    );
  });

  it("allows test_rationale to bypass tests_added when the flow permits it", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
    const run = await runtime.startFeatureRun({
      flow: {
        id: "feature-default",
        name: "Feature Delivery",
        phases: [
          {
            id: "implementation",
            description: "Implement the change",
            agents: ["implementer"],
            required_outputs: ["code_changes", "tests_added"],
            optional_outputs: ["test_rationale"]
          },
          {
            id: "validation",
            description: "Validate the change",
            agents: ["qa"],
            required_outputs: ["validation_status"],
            dependencies: ["implementation"]
          }
        ]
      },
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    await runtime.registerArtifact(run.id, {
      id: "code_changes",
      fileName: "code-changes.md",
      phaseId: "implementation",
      mediaType: "text/markdown",
      content: "# Code Changes\n\n- Updated the assignment flow.\n"
    });
    await runtime.registerArtifact(run.id, {
      id: "test_rationale",
      fileName: "test-rationale.md",
      phaseId: "implementation",
      mediaType: "text/markdown",
      content: "# Test Rationale\n\n- Existing coverage is sufficient for this slice.\n"
    });

    const updated = await runtime.completePhase(run.id, "implementation", ["code_changes", "test_rationale"]);

    expect(updated.current_phase).toBe("validation");
    expect(updated.completed_phases).toContain("implementation");
  });

  it("validates artifact quality against expectations and citation requirements", async () => {
    const weak = validateArtifactContent({
      artifactId: "discovery_report",
      content: "# Discovery\n\nLooks good.\n",
      expectation: "Cites concrete source paths and relevant external context.",
      requireCitations: true
    });

    expect(weak.ok).toBe(false);
    expect(weak.findings).toContain("discovery_report is shorter than the minimum useful artifact length");
    expect(weak.findings).toContain("discovery_report requires at least one file, command, URL, or ticket citation");

    const strong = validateArtifactContent({
      artifactId: "discovery_report",
      content: [
        "# Discovery",
        "",
        "- Reviewed `packages/runtime/src/index.ts` for phase gates.",
        "- Ran `npm test` and captured the passing baseline.",
        "- Risk: connector writes remain preview-only until policy apply is added."
      ].join("\n"),
      expectation: "Cites concrete source paths and relevant external context.",
      requireCitations: true
    });

    expect(strong.ok).toBe(true);
    expect(strong.score).toBeGreaterThanOrEqual(90);
  });

  it("builds an evidence graph from run artifacts, policy decisions, previews, and approvals", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const runtime = new FlowRuntime({ repoRoot: workspace, store: new FileRunStore(workspace) });
    const run = await runtime.startFeatureRun({
      flow,
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    const withArtifact = await runtime.registerArtifact(run.id, {
      id: "acceptance_criteria",
      fileName: "acceptance-criteria.md",
      phaseId: "planning",
      mediaType: "text/markdown",
      content: "# Acceptance Criteria\n\n- Admins can reassign by region.\n"
    });
    const approved = await runtime.approvePhase(withArtifact.id, {
      phaseId: "planning",
      approvedBy: "sesh",
      now: new Date("2026-04-17T13:00:00.000Z")
    });

    const graph = buildEvidenceGraph(approved);

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `run:${run.id}`, type: "run" }),
        expect.objectContaining({ id: "artifact:feature_brief", type: "artifact" }),
        expect.objectContaining({ id: "artifact:acceptance_criteria", type: "artifact" }),
        expect.objectContaining({ id: "approval:planning", type: "approval" })
      ])
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { from: `run:${run.id}`, to: "artifact:feature_brief", label: "contains" },
        { from: "phase:planning", to: "artifact:acceptance_criteria", label: "produced" },
        { from: "approval:planning", to: "phase:planning", label: "approves" }
      ])
    );
  });
});
