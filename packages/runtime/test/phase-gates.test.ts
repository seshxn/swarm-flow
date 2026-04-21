import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  evaluatePhaseCompletionGates,
  evaluatePhaseEntryGates,
  FileRunStore,
  FlowRuntime
} from "../src/index.js";

const validationFlow = {
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
      id: "validation",
      description: "Validate the change",
      agents: ["qa"],
      required_outputs: ["validation_status"],
      transition_conditions: ["validation_status is passing or repair loop is opened"]
    }
  ]
};

const deliveryFlow = {
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
      id: "validation",
      description: "Validate the change",
      agents: ["qa"],
      required_outputs: ["validation_status"],
      dependencies: ["intake"]
    },
    {
      id: "delivery",
      description: "Prepare delivery",
      agents: ["release"],
      required_outputs: ["pr_summary", "merge_checklist"],
      dependencies: ["validation"],
      approval_required: true,
      transition_conditions: [
        "validation_status is passing or repair loop is opened",
        "required approvals are recorded",
        "external writes are previewed"
      ]
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

describe("phase gates", () => {
  it("blocks validation completion until validation_status indicates passing", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const store = new FileRunStore(workspace);
    const runtime = new FlowRuntime({ repoRoot: workspace, store });
    const run = await runtime.startFeatureRun({
      flow: validationFlow,
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    const failing = await runtime.registerArtifact(run.id, {
      id: "validation_status",
      fileName: "validation-status.md",
      phaseId: "validation",
      mediaType: "text/markdown",
      content: "# Validation\n\n- failing\n"
    });

    await expect(
      evaluatePhaseCompletionGates({
        run: failing,
        phaseId: "validation",
        outputArtifactIds: ["validation_status"],
        store
      })
    ).resolves.toMatchObject({
      allowed: false,
      reasons: ["validation requires validation to be passing"]
    });

    const passing = await runtime.registerArtifact(run.id, {
      id: "validation_status",
      fileName: "validation-status.md",
      phaseId: "validation",
      mediaType: "text/markdown",
      content: "# Validation\n\n- passed\n"
    });

    await expect(
      evaluatePhaseCompletionGates({
        run: passing,
        phaseId: "validation",
        outputArtifactIds: ["validation_status"],
        store
      })
    ).resolves.toMatchObject({
      allowed: true
    });
  });

  it("reports delivery entry gates for validation, approval, preview, and blockers", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-"));
    const store = new FileRunStore(workspace);
    const runtime = new FlowRuntime({ repoRoot: workspace, store });
    const run = await runtime.startFeatureRun({
      flow: deliveryFlow,
      title: "Bulk case reassignment",
      goal: "Reassign cases by region",
      now: new Date("2026-04-17T12:00:00.000Z")
    });

    const withValidation = await runtime.registerArtifact(run.id, {
      id: "validation_status",
      fileName: "validation-status.md",
      phaseId: "validation",
      mediaType: "text/markdown",
      content: "# Validation\n\n- passed\n"
    });

    const blocked = await evaluatePhaseEntryGates({
      run: {
        ...withValidation,
        approvals: {},
        connector_write_previews: [],
        unresolved_assumptions: ["missing rollout signoff"],
        unresolved_risks: ["rollback needs follow-up"]
      },
      phaseId: "delivery",
      store
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toEqual(
      expect.arrayContaining([
        "delivery requires approval",
        "delivery requires at least one external write preview",
        "delivery has unresolved assumptions",
        "delivery has unresolved risks"
      ])
    );

    const ready = await evaluatePhaseEntryGates({
      run: {
        ...withValidation,
        approvals: {
          delivery: {
            phase_id: "delivery",
            approved_by: "sesh",
            approved_at: "2026-04-17T13:00:00.000Z"
          }
        },
        connector_write_previews: [
          {
            connector_id: "jira",
            operation: "update",
            target: "https://jira.example.com/browse/ABC-123",
            idempotency_key: "delivery-preview",
            preview_path: "runs/run-2026-04-17-bulk-case-reassignment/preview.json",
            created_at: "2026-04-17T12:30:00.000Z"
          }
        ],
        unresolved_assumptions: [],
        unresolved_risks: []
      },
      phaseId: "delivery",
      store
    });

    expect(ready.allowed).toBe(true);
  });
});
