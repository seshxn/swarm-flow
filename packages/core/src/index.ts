import { z } from "zod";

export const hookSetSchema = z
  .object({
    before: z.array(z.string()).optional(),
    after: z.array(z.string()).optional()
  })
  .strict();

export const phaseSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    purpose: z.string().optional(),
    agents: z.array(z.string().min(1)).min(1),
    optional_agents: z.array(z.string().min(1)).default([]),
    required_outputs: z.array(z.string().min(1)).default([]),
    optional_outputs: z.array(z.string().min(1)).default([]),
    dependencies: z.array(z.string().min(1)).default([]),
    transition_conditions: z.array(z.string().min(1)).default([]),
    output_expectations: z.record(z.string(), z.string()).optional(),
    risk_escalation: z.array(z.string().min(1)).default([]),
    optional: z.boolean().default(false),
    hooks: hookSetSchema.optional(),
    approval_required: z.boolean().default(false)
  })
  .strict();

export const flowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    phases: z.array(phaseSchema).min(1)
  })
  .strict();

export type HookSet = z.infer<typeof hookSetSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type Flow = z.infer<typeof flowSchema>;

export type ArtifactRegistryEntry = {
  id: string;
  path: string;
  media_type: "text/markdown" | "application/json" | string;
  created_at: string;
  produced_by_phase: string;
};

export type RunScope = "epic" | "story" | "feature" | "bugfix" | "refactor" | "spike" | "incident" | "review" | "qa";

export type RunTarget = {
  type: "jira" | "github_pr" | "github_issue" | "url" | "local" | "plain_text";
  value: string;
};

export type ExternalCommentPreview = {
  id: string;
  connector_id: "github" | "jira" | "slack" | string;
  target: string;
  type: "inline" | "summary" | "status" | "message";
  severity: "blocker" | "high" | "medium" | "low" | "nit" | "info";
  body: string;
  recommended: boolean;
  file?: string;
  line?: number;
};

export type ExternalPostingSelection = {
  target: string;
  selection_mode: "recommended" | "blockers" | "summary" | "selected" | "none";
  selected_comment_ids: string[];
  skipped_comment_ids: string[];
  posted: Array<{
    comment_id: string;
    connector_id: string;
    external_id: string;
  }>;
};

export type RunState = {
  id: string;
  repo: {
    root: string;
  };
  feature: {
    title: string;
    goal: string;
  };
  flow_id: string;
  flow_snapshot: Flow;
  current_phase: string;
  completed_phases: string[];
  pending_phases: string[];
  artifact_registry: Record<string, ArtifactRegistryEntry>;
  agent_executions: unknown[];
  hook_executions: unknown[];
  policy_decisions: PolicyDecision[];
  approvals: Record<string, ApprovalRecord>;
  tool_writes: unknown[];
  connector_write_previews: ConnectorWritePreview[];
  logs: RunLogEntry[];
  unresolved_assumptions: string[];
  unresolved_risks: string[];
  scope?: RunScope;
  target?: RunTarget;
  external_comment_previews?: ExternalCommentPreview[];
  external_posting_selections?: ExternalPostingSelection[];
  created_at: string;
  updated_at: string;
};

export type ApprovalRecord = {
  phase_id: string;
  approved_by: string;
  approved_at: string;
  note?: string;
};

export type ConnectorWritePreview = {
  connector_id: string;
  operation: "create" | "update";
  target: string;
  idempotency_key: string;
  preview_path: string;
  created_at: string;
};

export type RunLogEntry = {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
};

export type Policy = {
  id: string;
  description?: string;
  phase_entry_requires_artifacts?: Record<string, string[]>;
  approval_required_phases?: string[];
  phase_completion_requires_registered_artifacts?: boolean;
  external_writes_require_preview?: boolean;
  allowed_external_write_connectors?: string[];
  block_delivery_when_validation_failed?: boolean;
  risk_score_approval_threshold?: number;
  delivery_readiness?: {
    requires_validation_status?: "passed" | "failed" | "unknown" | string;
    requires_review_report?: boolean;
    requires_qa_report?: boolean;
    requires_release_notes?: boolean;
    requires_risk_approval_when_threshold_exceeded?: boolean;
  };
  blocked_without_approval?: string[];
  manageable_pr_policy?: ManageablePrPolicy;
  external_comment_posting?: ExternalCommentPostingPolicy;
};

export type PolicyDecision = {
  allowed: boolean;
  reasons: string[];
};

export type ManageablePrPolicy = {
  max_changed_files_warn?: number;
  max_changed_files_block?: number;
  max_changed_lines_warn?: number;
  max_changed_lines_block?: number;
  max_packages_warn?: number;
  max_packages_block?: number;
  block_mixed_migration_and_behavior_change?: boolean;
  block_unrelated_concerns?: boolean;
  require_slice_plan_before_implementation?: boolean;
  allow_override_with_approval?: boolean;
};

export type PrSizeInput = {
  changedFiles: number;
  changedLines: number;
  packagesTouched: number;
  includesMigration?: boolean;
  includesBehaviorChange?: boolean;
  unrelatedConcerns?: string[];
  hasSlicePlan?: boolean;
  hasApproval?: boolean;
};

export type PrSizeDecision = PolicyDecision & {
  level: "allow" | "warn" | "block";
};

export type ExternalCommentPostingPolicy = {
  default_mode: "preview";
  require_user_selection: boolean;
  allow_auto_post: boolean;
};

export type ExternalCommentPostingEvaluation = {
  policy: ExternalCommentPostingPolicy;
  hasUserSelection: boolean;
  autoPostRequested: boolean;
};

export type PhaseEntryEvaluation = {
  policy: Policy;
  phaseId: string;
  artifacts: Set<string>;
  approvals: Set<string>;
  validationStatus?: "passed" | "failed" | "unknown";
  riskScore?: number;
};

export type ExternalWriteEvaluation = {
  policy: Policy;
  connectorId: string;
  preview: boolean;
};

export type ValidationResult =
  | {
      ok: true;
      flow: Flow;
      errors: [];
    }
  | {
      ok: false;
      errors: string[];
    };

export function validateFlow(candidate: unknown): ValidationResult {
  const parsed = flowSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "flow"}: ${issue.message}`)
    };
  }

  const flow = parsed.data;
  const errors: string[] = [];
  const phaseIds = new Set<string>();

  for (const phase of flow.phases) {
    if (phaseIds.has(phase.id)) {
      errors.push(`duplicate phase id ${phase.id}`);
    }
    phaseIds.add(phase.id);
  }

  for (const phase of flow.phases) {
    for (const dependency of phase.dependencies) {
      if (!phaseIds.has(dependency)) {
        errors.push(`phase ${phase.id} has unknown dependency ${dependency}`);
      }
    }
  }

  const cycle = findDependencyCycle(flow.phases);
  if (cycle) {
    errors.push(`phase dependency cycle detected: ${cycle.join(" -> ")}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, flow, errors: [] };
}

export function evaluatePhaseEntry(input: PhaseEntryEvaluation): PolicyDecision {
  const reasons: string[] = [];
  const requiredArtifacts = input.policy.phase_entry_requires_artifacts?.[input.phaseId] ?? [];

  for (const artifactId of requiredArtifacts) {
    if (!input.artifacts.has(artifactId)) {
      reasons.push(`${input.phaseId} requires artifact ${artifactId}`);
    }
  }

  if (input.policy.approval_required_phases?.includes(input.phaseId) && !input.approvals.has(input.phaseId)) {
    reasons.push(`${input.phaseId} requires approval`);
  }

  if (
    input.phaseId === "delivery" &&
    input.policy.block_delivery_when_validation_failed &&
    input.validationStatus === "failed"
  ) {
    reasons.push("delivery is blocked because validation failed");
  }

  if (
    typeof input.policy.risk_score_approval_threshold === "number" &&
    typeof input.riskScore === "number" &&
    input.riskScore > input.policy.risk_score_approval_threshold &&
    !input.approvals.has(`${input.phaseId}:risk`)
  ) {
    reasons.push(`${input.phaseId} risk score ${input.riskScore} requires approval`);
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

export function evaluateExternalWrite(input: ExternalWriteEvaluation): PolicyDecision {
  const reasons: string[] = [];

  if (
    input.policy.allowed_external_write_connectors &&
    !input.policy.allowed_external_write_connectors.includes(input.connectorId)
  ) {
    reasons.push(`${input.connectorId} writes are not allowed by policy ${input.policy.id}`);
  }

  if (input.policy.external_writes_require_preview && !input.preview) {
    reasons.push(`${input.connectorId} writes require preview mode`);
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

export function evaluatePrSize(input: { policy: ManageablePrPolicy; input: PrSizeInput }): PrSizeDecision {
  const reasons: string[] = [];
  let hasWarning = false;
  let hasBlocker = false;
  const metrics = input.input;
  const policy = input.policy;

  function warnIf(condition: boolean, reason: string): void {
    if (condition && !hasBlocker && !hasWarning) {
      hasWarning = true;
      reasons.push(reason);
    }
  }

  function blockIf(condition: boolean, reason: string): void {
    if (condition) {
      hasBlocker = true;
      reasons.push(reason);
    }
  }

  blockIf(
    typeof policy.max_changed_files_block === "number" && metrics.changedFiles > policy.max_changed_files_block,
    `PR changes ${metrics.changedFiles} files, exceeding block limit ${policy.max_changed_files_block}`
  );
  blockIf(
    typeof policy.max_changed_lines_block === "number" && metrics.changedLines > policy.max_changed_lines_block,
    `PR changes ${metrics.changedLines} lines, exceeding block limit ${policy.max_changed_lines_block}`
  );
  blockIf(
    typeof policy.max_packages_block === "number" && metrics.packagesTouched > policy.max_packages_block,
    `PR touches ${metrics.packagesTouched} packages, exceeding block limit ${policy.max_packages_block}`
  );
  blockIf(
    Boolean(
      policy.block_mixed_migration_and_behavior_change && metrics.includesMigration && metrics.includesBehaviorChange
    ),
    "PR mixes migration and behavior change"
  );
  blockIf(
    Boolean(policy.block_unrelated_concerns && metrics.unrelatedConcerns?.length),
    `PR bundles unrelated concerns: ${metrics.unrelatedConcerns?.join(", ")}`
  );
  blockIf(
    Boolean(policy.require_slice_plan_before_implementation && !metrics.hasSlicePlan),
    "implementation requires slice_plan"
  );

  warnIf(
    typeof policy.max_changed_files_warn === "number" && metrics.changedFiles > policy.max_changed_files_warn,
    `PR changes ${metrics.changedFiles} files, exceeding warn limit ${policy.max_changed_files_warn}`
  );
  warnIf(
    typeof policy.max_changed_lines_warn === "number" && metrics.changedLines > policy.max_changed_lines_warn,
    `PR changes ${metrics.changedLines} lines, exceeding warn limit ${policy.max_changed_lines_warn}`
  );
  warnIf(
    typeof policy.max_packages_warn === "number" && metrics.packagesTouched > policy.max_packages_warn,
    `PR touches ${metrics.packagesTouched} packages, exceeding warn limit ${policy.max_packages_warn}`
  );

  if (hasBlocker && policy.allow_override_with_approval && metrics.hasApproval) {
    return { allowed: true, level: "warn", reasons };
  }

  const level: PrSizeDecision["level"] = hasBlocker ? "block" : hasWarning ? "warn" : "allow";

  return {
    allowed: !hasBlocker,
    level,
    reasons
  };
}

export function evaluateExternalCommentPosting(input: ExternalCommentPostingEvaluation): PolicyDecision {
  const reasons: string[] = [];

  if (input.autoPostRequested && !input.policy.allow_auto_post) {
    reasons.push("external comments cannot be posted automatically");
  }

  if (input.policy.require_user_selection && !input.hasUserSelection) {
    reasons.push("external comments require user selection");
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

function findDependencyCycle(phases: Phase[]): string[] | undefined {
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function visit(phaseId: string): string[] | undefined {
    if (visiting.has(phaseId)) {
      return [...path.slice(path.indexOf(phaseId)), phaseId];
    }

    if (visited.has(phaseId)) {
      return undefined;
    }

    const phase = phaseById.get(phaseId);
    if (!phase) {
      return undefined;
    }

    visiting.add(phaseId);
    path.push(phaseId);

    for (const dependency of phase.dependencies) {
      const cycle = visit(dependency);
      if (cycle) {
        return cycle;
      }
    }

    path.pop();
    visiting.delete(phaseId);
    visited.add(phaseId);

    return undefined;
  }

  for (const phase of phases) {
    const cycle = visit(phase.id);
    if (cycle) {
      return cycle;
    }
  }

  return undefined;
}
