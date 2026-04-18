import { describe, expect, it } from "vitest";
import {
  evaluateExternalCommentPosting,
  evaluateExternalWrite,
  evaluatePhaseEntry,
  evaluatePrSize,
  type ManageablePrPolicy,
  type PrSizeInput
} from "../src/index.js";

describe("policy evaluation", () => {
  it("blocks implementation until acceptance criteria are approved", () => {
    const decision = evaluatePhaseEntry({
      policy: {
        id: "default",
        phase_entry_requires_artifacts: {
          implementation: ["acceptance_criteria"]
        },
        approval_required_phases: ["implementation"]
      },
      phaseId: "implementation",
      artifacts: new Set(["technical_design"]),
      approvals: new Set()
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual([
      "implementation requires artifact acceptance_criteria",
      "implementation requires approval"
    ]);
  });

  it("allows an external write only when preview mode or explicit writes are enabled", () => {
    expect(
      evaluateExternalWrite({
        policy: { id: "default", external_writes_require_preview: true },
        connectorId: "jira",
        preview: false
      }).allowed
    ).toBe(false);

    expect(
      evaluateExternalWrite({
        policy: { id: "default", external_writes_require_preview: true },
        connectorId: "jira",
        preview: true
      }).allowed
    ).toBe(true);
  });

  it("blocks oversized PRs when they exceed hard policy limits", () => {
    const policy: ManageablePrPolicy = {
      max_changed_files_warn: 20,
      max_changed_files_block: 40,
      max_changed_lines_warn: 400,
      max_changed_lines_block: 1200,
      max_packages_warn: 2,
      max_packages_block: 4,
      block_mixed_migration_and_behavior_change: true,
      block_unrelated_concerns: true,
      require_slice_plan_before_implementation: true,
      allow_override_with_approval: true
    };
    const input: PrSizeInput = {
      changedFiles: 44,
      changedLines: 1300,
      packagesTouched: 5,
      includesMigration: true,
      includesBehaviorChange: true,
      unrelatedConcerns: ["schema migration", "UI rewrite"],
      hasSlicePlan: false,
      hasApproval: false
    };

    expect(evaluatePrSize({ policy, input })).toEqual({
      allowed: false,
      level: "block",
      reasons: [
        "PR changes 44 files, exceeding block limit 40",
        "PR changes 1300 lines, exceeding block limit 1200",
        "PR touches 5 packages, exceeding block limit 4",
        "PR mixes migration and behavior change",
        "PR bundles unrelated concerns: schema migration, UI rewrite",
        "implementation requires slice_plan"
      ]
    });
  });

  it("requires user selection before external comments can be posted", () => {
    expect(
      evaluateExternalCommentPosting({
        policy: {
          default_mode: "preview",
          require_user_selection: true,
          allow_auto_post: false
        },
        hasUserSelection: false,
        autoPostRequested: false
      })
    ).toEqual({
      allowed: false,
      reasons: ["external comments require user selection"]
    });

    expect(
      evaluateExternalCommentPosting({
        policy: {
          default_mode: "preview",
          require_user_selection: true,
          allow_auto_post: false
        },
        hasUserSelection: true,
        autoPostRequested: false
      }).allowed
    ).toBe(true);
  });
});
