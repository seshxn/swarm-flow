import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ApprovalRecord,
  ArtifactRegistryEntry,
  ConnectorWritePreview,
  ExternalPostingSelection,
  Flow,
  HookExecution,
  RepairLoop,
  RunLogEntry,
  RunScope,
  RunTarget,
  RunState
} from "@swarm-flow/core";
import { validateFlow } from "@swarm-flow/core";
import { HookRunner } from "./hooks.js";

export type StartFeatureRunInput = {
  flow: unknown;
  title: string;
  goal: string;
  scope?: RunScope;
  target?: RunTarget;
  now?: Date;
};

export type RuntimeOptions = {
  repoRoot: string;
  store?: FileRunStore;
  artifactEvaluator?: (artifactId: string, content: string, expectation: string) => Promise<{ ok: boolean; reason?: string }>;
};

export type RegisterArtifactInput = {
  id: string;
  fileName: string;
  phaseId: string;
  mediaType: "text/markdown" | "application/json" | string;
  content: string;
  now?: Date;
};

export type ApprovePhaseInput = {
  phaseId: string;
  approvedBy: string;
  note?: string;
  now?: Date;
};

export type RecordConnectorPreviewInput = {
  connectorId: string;
  operation: "create" | "update";
  target: string;
  idempotencyKey: string;
  previewPath: string;
  now?: Date;
};

export type RecordExternalPostingSelectionInput = ExternalPostingSelection & {
  now?: Date;
};

export type TddEvidenceAttempt = {
  startedAt: string;
  completedAt: string;
  exitCode: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  relatedFiles: string[];
  valid: boolean;
};

export type TddEvidenceArtifact = {
  artifactId: string;
  testCommand: string;
  createdAt: string;
  updatedAt: string;
  red?: TddEvidenceAttempt;
  green?: TddEvidenceAttempt;
};

export type PhaseGateStage = "completion" | "entry";

export type PhaseGateEvaluationInput = {
  run: RunState;
  phaseId: string;
  stage: PhaseGateStage;
  outputArtifactIds?: Iterable<string>;
  store: FileRunStore;
};

export type PhaseGateEvaluation = {
  allowed: boolean;
  reasons: string[];
  phaseId: string;
  stage: PhaseGateStage;
  checked_conditions: string[];
  informational_conditions: string[];
};

export type ArtifactValidationInput = {
  artifactId: string;
  content: string;
  expectation?: string;
  requireCitations?: boolean;
};

export type ArtifactValidationResult = {
  artifactId: string;
  ok: boolean;
  score: number;
  findings: string[];
  expectation?: string;
};

export type EvidenceGraphNode = {
  id: string;
  type: "run" | "phase" | "artifact" | "approval" | "policy_decision" | "connector_preview" | "repair_loop";
  label: string;
  data?: Record<string, unknown>;
};

export type EvidenceGraphEdge = {
  from: string;
  to: string;
  label: string;
};

export type EvidenceGraph = {
  runId: string;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
};

export type OpenRepairLoopInput = {
  finding: string;
  owner: string;
  now?: Date;
};

export type CloseRepairLoopInput = {
  repairId: string;
  evidence: string;
  now?: Date;
};

export class FileRunStore {
  readonly runsRoot: string;

  constructor(readonly repoRoot: string) {
    this.runsRoot = join(repoRoot, ".runs");
  }

  async save(run: RunState): Promise<void> {
    await mkdir(this.runPath(run.id), { recursive: true });
    await mkdir(this.artifactsPath(run.id), { recursive: true });
    await mkdir(join(this.runPath(run.id), "context"), { recursive: true });
    await mkdir(join(this.runPath(run.id), "decisions"), { recursive: true });
    await mkdir(join(this.runPath(run.id), "logs"), { recursive: true });
    await mkdir(join(this.runPath(run.id), "outputs"), { recursive: true });
    await writeFile(join(this.runPath(run.id), "run.json"), `${JSON.stringify(run, null, 2)}\n`, "utf8");
  }

  async load(runId: string): Promise<RunState> {
    const raw = await readFile(join(this.runPath(runId), "run.json"), "utf8");
    return JSON.parse(raw) as RunState;
  }

  async list(): Promise<RunState[]> {
    try {
      const entries = await readdir(this.runsRoot, { withFileTypes: true });
      const runs = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => this.load(entry.name))
      );

      return runs.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async latest(): Promise<RunState | undefined> {
    return (await this.list())[0];
  }

  async writeArtifact(runId: string, relativePath: string, content: string): Promise<void> {
    const target = join(this.runPath(runId), relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  runPath(runId: string): string {
    return join(this.runsRoot, runId);
  }

  artifactsPath(runId: string): string {
    return join(this.runPath(runId), "artifacts");
  }
}

export async function evaluatePhaseCompletionGates(
  input: Omit<PhaseGateEvaluationInput, "stage">
): Promise<PhaseGateEvaluation> {
  return evaluatePhaseGates({
    ...input,
    stage: "completion"
  });
}

export async function evaluatePhaseEntryGates(
  input: Omit<PhaseGateEvaluationInput, "stage">
): Promise<PhaseGateEvaluation> {
  return evaluatePhaseGates({
    ...input,
    stage: "entry"
  });
}

export async function evaluatePhaseGates(input: PhaseGateEvaluationInput): Promise<PhaseGateEvaluation> {
  const phase = input.run.flow_snapshot.phases.find((candidate) => candidate.id === input.phaseId);
  if (!phase) {
    return {
      allowed: false,
      reasons: [`phase ${input.phaseId} is not present in flow ${input.run.flow_id}`],
      phaseId: input.phaseId,
      stage: input.stage,
      checked_conditions: [],
      informational_conditions: []
    };
  }

  const outputSet = new Set(input.outputArtifactIds ?? []);
  const reasons: string[] = [];
  const checkedConditions: string[] = [];
  const informationalConditions: string[] = [];

  const requiresTestRationale = phase.required_outputs.includes("tests_added");
  const allowsTestRationale =
    phase.required_outputs.includes("test_rationale") || phase.optional_outputs.includes("test_rationale");
  const testRationaleBypass =
    requiresTestRationale &&
    allowsTestRationale &&
    outputSet.has("test_rationale") &&
    Boolean(input.run.artifact_registry.test_rationale);

  if (input.stage === "completion") {
    const requiredOutputs = testRationaleBypass
      ? phase.required_outputs.filter((artifactId) => artifactId !== "tests_added")
      : phase.required_outputs;

    for (const artifactId of requiredOutputs) {
      if (!outputSet.has(artifactId)) {
        reasons.push(`missing required outputs for ${phase.id}: ${artifactId}`);
      }
      if (!input.run.artifact_registry[artifactId]) {
        reasons.push(`outputs are not registered artifacts for ${phase.id}: ${artifactId}`);
      }
    }

    if (requiresTestRationale && !testRationaleBypass) {
      const evidence = await loadTddEvidenceArtifact(input.store, input.run.id);
      if (!isValidTddEvidenceArtifact(evidence)) {
        reasons.push(`implementation requires valid red and green evidence for tests_added`);
      }
    }

    if (phase.approval_required && !input.run.approvals[phase.id]) {
      reasons.push(`${phase.id} requires approval`);
    }
  }

  const approvalConditions = phase.transition_conditions.filter((condition) => /approval/i.test(condition));
  if (approvalConditions.length > 0 && !input.run.approvals[phase.id]) {
    checkedConditions.push(...approvalConditions);
    reasons.push(`${phase.id} requires approval`);
  }

  const previewConditions = phase.transition_conditions.filter((condition) =>
    /external writes? are previewed|preview(?:ed)? before write|preview only/i.test(condition)
  );
  if (previewConditions.length > 0) {
    checkedConditions.push(...previewConditions);
    if (input.run.connector_write_previews.length === 0) {
      reasons.push(`${phase.id} requires at least one external write preview`);
    }
  }

  const validationConditions = phase.transition_conditions.filter((condition) =>
    /validation_status.*passing|validation passed|validation_status is passing/i.test(condition)
  );
  if (validationConditions.length > 0) {
    checkedConditions.push(...validationConditions);
    const validationStatus = await readValidationStatus(input.store, input.run);
    if (!validationStatus.isPassing) {
      reasons.push(`${phase.id} requires validation to be passing`);
    }
  }

  const blockerConditions = phase.transition_conditions.filter((condition) => /assumption|risk/i.test(condition));
  if (blockerConditions.length > 0 || phase.id === "delivery") {
    checkedConditions.push(...blockerConditions);
    if (input.run.unresolved_assumptions.length > 0) {
      reasons.push(`${phase.id} has unresolved assumptions`);
    }
    if (input.run.unresolved_risks.length > 0) {
      reasons.push(`${phase.id} has unresolved risks`);
    }
  }

  if (checkedConditions.length === 0) {
    informationalConditions.push(...phase.transition_conditions);
  }

  return {
    allowed: reasons.length === 0,
    reasons: [...new Set(reasons)],
    phaseId: phase.id,
    stage: input.stage,
    checked_conditions: [...new Set(checkedConditions)],
    informational_conditions: [...new Set(informationalConditions)]
  };
}

export class FlowRuntime {
  private readonly store: FileRunStore;
  private readonly hooks: HookRunner;

  constructor(private readonly options: RuntimeOptions) {
    this.store = options.store ?? new FileRunStore(options.repoRoot);
    this.hooks = new HookRunner({ repoRoot: options.repoRoot, store: this.store });
  }

  async startFeatureRun(input: StartFeatureRunInput): Promise<RunState> {
    const validation = validateFlow(input.flow);
    if (!validation.ok) {
      throw new Error(`invalid flow: ${validation.errors.join("; ")}`);
    }

    const flow = validation.flow;
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const runId = `run-${dateStamp(now)}-${slugify(input.title)}`;
    const firstPhase = flow.phases[0];
    // Keep the first auto artifact aligned with the first declared phase output for compatibility.
    const initialArtifactId = firstPhase.required_outputs[0] ?? "feature_brief";
    const initialArtifactPath = `artifacts/${artifactIdToFileName(initialArtifactId)}`;
    const initialArtifact = renderInitialArtifact({
      artifactId: initialArtifactId,
      title: input.title,
      goal: input.goal,
      flow,
      createdAt: timestamp
    });
    const artifact = artifactEntry(initialArtifactId, initialArtifactPath, timestamp, firstPhase.id);

    const run: RunState = {
      id: runId,
      repo: {
        root: this.options.repoRoot
      },
      feature: {
        title: input.title,
        goal: input.goal
      },
      flow_id: flow.id,
      flow_snapshot: flow,
      current_phase: firstPhase.id,
      completed_phases: [],
      pending_phases: flow.phases.slice(1).map((phase) => phase.id),
      artifact_registry: {
        [initialArtifactId]: artifact
      },
      agent_executions: [],
      hook_executions: [],
      policy_decisions: [],
      approvals: {},
      tool_writes: [],
      connector_write_previews: [],
      logs: [
        logEntry(timestamp, "info", "Run started", {
          title: input.title,
          flow_id: flow.id
        })
      ],
      unresolved_assumptions: [],
      unresolved_risks: [],
      scope: input.scope,
      target: input.target,
      external_comment_previews: [],
      external_posting_selections: [],
      repair_loops: [],
      agent_dispatches: [],
      created_at: timestamp,
      updated_at: timestamp
    };

    await this.store.save(run);
    await this.store.writeArtifact(run.id, initialArtifactPath, initialArtifact);

    // execute before hooks for the first phase
    if (firstPhase.hooks?.before) {
      assertHooksPassed(await this.hooks.executeHooks(run.id, "before_phase", firstPhase.hooks.before, firstPhase.id));
    }
    
    return await this.store.load(run.id);
  }

  async registerArtifact(runId: string, input: RegisterArtifactInput): Promise<RunState> {
    const run = await this.store.load(runId);

    const currentPhase = run.flow_snapshot.phases.find((p) => p.id === input.phaseId);
    if (!currentPhase) {
      throw new Error(`Phase ${input.phaseId} not found in flow`);
    }

    if (this.options.artifactEvaluator && currentPhase.output_expectations?.[input.id]) {
      const expectation = currentPhase.output_expectations[input.id];
      const evalResult = await this.options.artifactEvaluator(input.id, input.content, expectation);
      if (!evalResult.ok) {
         throw new Error(`Semantic expectation failed for artifact ${input.id}: ${evalResult.reason}`);
      }
    }

    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const relativePath = `artifacts/${input.fileName}`;
    const artifact: ArtifactRegistryEntry = {
      id: input.id,
      path: relativePath,
      media_type: input.mediaType,
      created_at: timestamp,
      produced_by_phase: input.phaseId
    };
    const updated: RunState = {
      ...run,
      artifact_registry: {
        ...run.artifact_registry,
        [input.id]: artifact
      },
      logs: [
        ...run.logs,
        logEntry(timestamp, "info", "Artifact registered", {
          artifact_id: input.id,
          path: relativePath,
          phase_id: input.phaseId
        })
      ],
      updated_at: timestamp
    };

    await this.store.writeArtifact(runId, relativePath, input.content);
    await this.store.save(updated);
    return updated;
  }

  async approvePhase(runId: string, input: ApprovePhaseInput): Promise<RunState> {
    const run = await this.store.load(runId);
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const approval: ApprovalRecord = {
      phase_id: input.phaseId,
      approved_by: input.approvedBy,
      approved_at: timestamp,
      ...(input.note ? { note: input.note } : {})
    };
    const updated: RunState = {
      ...run,
      approvals: {
        ...run.approvals,
        [input.phaseId]: approval
      },
      logs: [
        ...run.logs,
        logEntry(timestamp, "info", "Phase approved", {
          phase_id: input.phaseId,
          approved_by: input.approvedBy
        })
      ],
      updated_at: timestamp
    };

    await this.store.save(updated);
    return updated;
  }

  async recordConnectorPreview(runId: string, input: RecordConnectorPreviewInput): Promise<RunState> {
    const run = await this.store.load(runId);
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const preview: ConnectorWritePreview = {
      connector_id: input.connectorId,
      operation: input.operation,
      target: input.target,
      idempotency_key: input.idempotencyKey,
      preview_path: input.previewPath,
      created_at: timestamp
    };
    const updated: RunState = {
      ...run,
      connector_write_previews: [...run.connector_write_previews, preview],
      logs: [
        ...run.logs,
        logEntry(timestamp, "info", "Connector write preview recorded", {
          connector_id: input.connectorId,
          target: input.target,
          preview_path: input.previewPath
        })
      ],
      updated_at: timestamp
    };

    await this.store.save(updated);
    return updated;
  }

  async recordExternalPostingSelection(
    runId: string,
    input: RecordExternalPostingSelectionInput
  ): Promise<RunState> {
    const run = await this.store.load(runId);
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const { now: _now, ...selection } = input;
    const updated: RunState = {
      ...run,
      external_posting_selections: [...(run.external_posting_selections ?? []), selection],
      logs: [
        ...run.logs,
        logEntry(timestamp, "info", "External posting selection recorded", {
          target: selection.target,
          selection_mode: selection.selection_mode,
          selected_comment_ids: selection.selected_comment_ids
        })
      ],
      updated_at: timestamp
    };

    await this.store.save(updated);
    return updated;
  }

  async openRepairLoop(runId: string, input: OpenRepairLoopInput): Promise<RunState> {
    const run = await this.store.load(runId);
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const nextNumber = (run.repair_loops ?? []).length + 1;
    const repair: RepairLoop = {
      id: `repair-${nextNumber}`,
      status: "open",
      finding: input.finding,
      owner: input.owner,
      opened_at: timestamp
    };
    const updated: RunState = {
      ...run,
      repair_loops: [...(run.repair_loops ?? []), repair],
      logs: [
        ...run.logs,
        logEntry(timestamp, "warn", "Repair loop opened", {
          repair_id: repair.id,
          owner: repair.owner
        })
      ],
      updated_at: timestamp
    };

    await this.store.save(updated);
    return updated;
  }

  async closeRepairLoop(runId: string, input: CloseRepairLoopInput): Promise<RunState> {
    const run = await this.store.load(runId);
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const loops = run.repair_loops ?? [];
    const target = loops.find((loop) => loop.id === input.repairId);
    if (!target) {
      throw new Error(`Repair loop ${input.repairId} not found`);
    }

    const updatedLoops = loops.map((loop) =>
      loop.id === input.repairId
        ? {
            ...loop,
            status: "closed" as const,
            closed_at: timestamp,
            closing_evidence: input.evidence
          }
        : loop
    );
    const updated: RunState = {
      ...run,
      repair_loops: updatedLoops,
      logs: [
        ...run.logs,
        logEntry(timestamp, "info", "Repair loop closed", {
          repair_id: input.repairId
        })
      ],
      updated_at: timestamp
    };

    await this.store.save(updated);
    return updated;
  }

  async completePhase(runId: string, phaseId: string, outputArtifactIds: string[]): Promise<RunState> {
    const run = await this.store.load(runId);
    const phase = run.flow_snapshot.phases.find((candidate) => candidate.id === run.current_phase);
    if (!phase) {
      throw new Error(`current phase ${run.current_phase} is not present in flow ${run.flow_id}`);
    }
    if (phase.id !== phaseId) {
      throw new Error(`cannot complete phase ${phaseId}; current phase is ${phase.id}`);
    }

    const completionGate = await evaluatePhaseCompletionGates({
      run,
      phaseId: phase.id,
      outputArtifactIds,
      store: this.store
    });
    if (!completionGate.allowed) {
      throw new Error(completionGate.reasons.join("; "));
    }

    const completed = [...new Set([...run.completed_phases, phase.id])];
    const nextPhase = run.flow_snapshot.phases.find((candidate) => {
      if (completed.includes(candidate.id)) {
        return false;
      }
      return candidate.dependencies.every((dependency) => completed.includes(dependency));
    });

    // execute after hooks before committing the phase transition so failed gates keep the run in place
    if (phase.hooks?.after) {
      assertHooksPassed(await this.hooks.executeHooks(run.id, "after_phase", phase.hooks.after, phase.id));
    }

    if (nextPhase) {
      const nextPhaseGate = await evaluatePhaseEntryGates({
        run: {
          ...run,
          completed_phases: completed
        },
        phaseId: nextPhase.id,
        store: this.store
      });
      if (!nextPhaseGate.allowed) {
        throw new Error(nextPhaseGate.reasons.join("; "));
      }
    }

    // execute entry hooks before moving into the next phase
    if (nextPhase?.hooks?.before) {
      assertHooksPassed(await this.hooks.executeHooks(run.id, "before_phase", nextPhase.hooks.before, nextPhase.id));
    }

    const runWithHookResults = await this.store.load(runId);
    const updated: RunState = {
      ...runWithHookResults,
      completed_phases: completed,
      current_phase: nextPhase?.id ?? phase.id,
      pending_phases: run.flow_snapshot.phases
        .filter((candidate) => !completed.includes(candidate.id) && candidate.id !== nextPhase?.id)
        .map((candidate) => candidate.id),
      logs: [
        ...runWithHookResults.logs,
        logEntry(new Date().toISOString(), "info", "Phase completed", {
          phase_id: phase.id,
          next_phase_id: nextPhase?.id
        })
      ],
      updated_at: new Date().toISOString()
    };

    await this.store.save(updated);
    return updated;
  }
}

export function validateArtifactContent(input: ArtifactValidationInput): ArtifactValidationResult {
  const findings: string[] = [];
  let score = 100;
  const trimmed = input.content.trim();

  if (trimmed.length < 120) {
    findings.push(`${input.artifactId} is shorter than the minimum useful artifact length`);
    score -= 35;
  }

  if (!/^#\s+/m.test(trimmed)) {
    findings.push(`${input.artifactId} should start with a markdown heading`);
    score -= 15;
  }

  if (input.expectation) {
    const expectationTerms = input.expectation
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((term) => term.length > 4);
    const content = trimmed.toLowerCase();
    const matched = expectationTerms.filter((term) => content.includes(term));
    if (expectationTerms.length > 0 && matched.length === 0 && !hasCitation(trimmed)) {
      findings.push(`${input.artifactId} does not address its output expectation`);
      score -= 20;
    }
  }

  if (input.requireCitations && !hasCitation(trimmed)) {
    findings.push(`${input.artifactId} requires at least one file, command, URL, or ticket citation`);
    score -= 30;
  }

  return {
    artifactId: input.artifactId,
    ok: findings.length === 0,
    score: Math.max(0, score),
    findings,
    ...(input.expectation ? { expectation: input.expectation } : {})
  };
}

export function buildEvidenceGraph(run: RunState): EvidenceGraph {
  const nodes: EvidenceGraphNode[] = [
    {
      id: `run:${run.id}`,
      type: "run",
      label: run.feature.title,
      data: {
        flow_id: run.flow_id,
        current_phase: run.current_phase
      }
    }
  ];
  const edges: EvidenceGraphEdge[] = [];

  for (const phase of run.flow_snapshot.phases) {
    nodes.push({
      id: `phase:${phase.id}`,
      type: "phase",
      label: phase.description,
      data: {
        required_outputs: phase.required_outputs
      }
    });
    edges.push({ from: `run:${run.id}`, to: `phase:${phase.id}`, label: "has_phase" });
  }

  for (const artifact of Object.values(run.artifact_registry)) {
    nodes.push({
      id: `artifact:${artifact.id}`,
      type: "artifact",
      label: artifact.id,
      data: {
        path: artifact.path,
        media_type: artifact.media_type
      }
    });
    edges.push({ from: `run:${run.id}`, to: `artifact:${artifact.id}`, label: "contains" });
    edges.push({ from: `phase:${artifact.produced_by_phase}`, to: `artifact:${artifact.id}`, label: "produced" });
  }

  for (const [phaseId, approval] of Object.entries(run.approvals)) {
    nodes.push({
      id: `approval:${phaseId}`,
      type: "approval",
      label: `Approval for ${phaseId}`,
      data: {
        approved_by: approval.approved_by,
        approved_at: approval.approved_at
      }
    });
    edges.push({ from: `approval:${phaseId}`, to: `phase:${phaseId}`, label: "approves" });
  }

  run.policy_decisions.forEach((decision, index) => {
    nodes.push({
      id: `policy:${index + 1}`,
      type: "policy_decision",
      label: decision.allowed ? "Policy allowed" : "Policy blocked",
      data: {
        reasons: decision.reasons
      }
    });
    edges.push({ from: `run:${run.id}`, to: `policy:${index + 1}`, label: "records" });
  });

  run.connector_write_previews.forEach((preview, index) => {
    nodes.push({
      id: `preview:${index + 1}`,
      type: "connector_preview",
      label: `${preview.connector_id} ${preview.operation}`,
      data: {
        target: preview.target,
        preview_path: preview.preview_path
      }
    });
    edges.push({ from: `run:${run.id}`, to: `preview:${index + 1}`, label: "previews" });
  });

  (run.repair_loops ?? []).forEach((repair) => {
    nodes.push({
      id: `repair:${repair.id}`,
      type: "repair_loop",
      label: repair.finding,
      data: {
        status: repair.status,
        owner: repair.owner
      }
    });
    edges.push({ from: `run:${run.id}`, to: `repair:${repair.id}`, label: "tracks" });
  });

  return { runId: run.id, nodes, edges };
}

function hasCitation(content: string): boolean {
  return /`[^`]+\.(ts|tsx|js|jsx|md|json|yaml|yml)`/.test(content) ||
    /`(?:npm|node|git|swarm-flow|rtk)\s+[^`]+`/.test(content) ||
    /https?:\/\//.test(content) ||
    /\b[A-Z][A-Z0-9]+-\d+\b/.test(content);
}

function assertHooksPassed(results: HookExecution[]): void {
  const failed = results.find((result) => result.status === "failed");
  if (failed) {
    const suffix = failed.error ? `: ${failed.error}` : "";
    throw new Error(`hook ${failed.id} failed${suffix}`);
  }
}

function logEntry(at: string, level: RunLogEntry["level"], message: string, data?: unknown): RunLogEntry {
  return {
    at,
    level,
    message,
    ...(data === undefined ? {} : { data })
  };
}

function artifactEntry(
  id: string,
  path: string,
  createdAt: string,
  producedByPhase: string
): ArtifactRegistryEntry {
  return {
    id,
    path,
    media_type: "text/markdown",
    created_at: createdAt,
    produced_by_phase: producedByPhase
  };
}

function renderInitialArtifact(input: {
  artifactId: string;
  title: string;
  goal: string;
  flow: Flow;
  createdAt: string;
}): string {
  return `# ${artifactTitle(input.artifactId)}

## Title
${input.title}

## Goal
${input.goal}

## Flow
${input.flow.name} (${input.flow.id})

## Created At
${input.createdAt}

## Initial Assumptions
- Local repository context should be collected before planning.
- External writes require preview and policy evaluation.
`;
}

function artifactIdToFileName(artifactId: string): string {
  return `${artifactId.replace(/_/g, "-")}.md`;
}

function artifactTitle(artifactId: string): string {
  return artifactId
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

async function readValidationStatus(
  store: FileRunStore,
  run: RunState
): Promise<{ isPassing: boolean }> {
  const artifact = run.artifact_registry.validation_status;
  if (!artifact) {
    return { isPassing: false };
  }

  try {
    const raw = await readFile(join(store.runPath(run.id), artifact.path), "utf8");
    const content = raw.toLowerCase();
    if (/repair loop is opened|repair loop opened/.test(content)) {
      return { isPassing: true };
    }
    if (/\bpassed\b|\bpassing\b/.test(content) && !/\bfailed\b|\bfailing\b/.test(content)) {
      return { isPassing: true };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        const values = ["status", "validation_status", "state", "result", "outcome"].flatMap((key) => {
          const value = (parsed as Record<string, unknown>)[key];
          return typeof value === "string" ? [value.toLowerCase()] : [];
        });
        if (
          values.some((value) => /repair loop is opened|repair loop opened/.test(value)) ||
          (values.some((value) => /\bpassed\b|\bpassing\b/.test(value)) &&
            !values.some((value) => /\bfailed\b|\bfailing\b/.test(value)))
        ) {
          return { isPassing: true };
        }
      }
    } catch {
      // Non-JSON validation status artifacts are valid.
    }
  } catch {
    return { isPassing: false };
  }

  return { isPassing: false };
}

export async function loadTddEvidenceArtifact(
  store: FileRunStore,
  runId: string,
  artifactId = "tests_added"
): Promise<TddEvidenceArtifact | undefined> {
  const run = await store.load(runId);
  const artifact = run.artifact_registry[artifactId];
  if (!artifact || artifact.media_type !== "application/json") {
    return undefined;
  }

  try {
    const raw = await readFile(join(store.runPath(runId), artifact.path), "utf8");
    return JSON.parse(raw) as TddEvidenceArtifact;
  } catch {
    return undefined;
  }
}

function isValidTddEvidenceArtifact(value: TddEvidenceArtifact | undefined): boolean {
  if (!value || value.artifactId !== "tests_added" || typeof value.testCommand !== "string") {
    return false;
  }

  return isValidTddAttempt(value.red) && isValidTddAttempt(value.green) && value.red.valid && value.green.valid;
}

function isValidTddAttempt(value: TddEvidenceAttempt | undefined): value is TddEvidenceAttempt {
  return Boolean(
    value &&
      typeof value.startedAt === "string" &&
      typeof value.completedAt === "string" &&
      typeof value.exitCode === "number" &&
      typeof value.stdoutSnippet === "string" &&
      typeof value.stderrSnippet === "string" &&
      Array.isArray(value.relatedFiles) &&
      value.relatedFiles.every((entry) => typeof entry === "string") &&
      typeof value.valid === "boolean"
  );
}

function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
