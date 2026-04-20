import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ApprovalRecord,
  ArtifactRegistryEntry,
  ConnectorWritePreview,
  ExternalPostingSelection,
  Flow,
  HookExecution,
  Phase,
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
    const initialArtifactId = firstPhase.required_outputs[0] ?? "intake_brief";
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

  async completePhase(runId: string, phaseId: string, outputArtifactIds: string[]): Promise<RunState> {
    const run = await this.store.load(runId);
    const phase = run.flow_snapshot.phases.find((candidate) => candidate.id === run.current_phase);
    if (!phase) {
      throw new Error(`current phase ${run.current_phase} is not present in flow ${run.flow_id}`);
    }
    if (phase.id !== phaseId) {
      throw new Error(`cannot complete phase ${phaseId}; current phase is ${phase.id}`);
    }

    const outputSet = new Set(outputArtifactIds);
    const bypassTddEvidence = canBypassTddEvidence(phase, outputSet, run.artifact_registry);
    if (requiresTddEvidence(phase) && !bypassTddEvidence) {
      const evidence = await loadTddEvidenceArtifact(this.store, run.id);
      if (!isValidTddEvidenceArtifact(evidence)) {
        throw new Error(`implementation requires valid red and green evidence for tests_added`);
      }
    }

    const requiredOutputs = bypassTddEvidence
      ? phase.required_outputs.filter((artifactId) => artifactId !== "tests_added")
      : phase.required_outputs;
    const missing = requiredOutputs.filter((artifactId) => !outputSet.has(artifactId));
    if (missing.length > 0) {
      throw new Error(`missing required outputs for ${phase.id}: ${missing.join(", ")}`);
    }
    const unregistered = requiredOutputs.filter((artifactId) => !run.artifact_registry[artifactId]);
    if (unregistered.length > 0) {
      throw new Error(`outputs are not registered artifacts for ${phase.id}: ${unregistered.join(", ")}`);
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

function requiresTddEvidence(phase: Pick<Phase, "required_outputs">): boolean {
  return phase.required_outputs.includes("tests_added");
}

function canBypassTddEvidence(
  phase: Pick<Phase, "required_outputs" | "optional_outputs">,
  outputArtifactIds: Set<string>,
  artifactRegistry: RunState["artifact_registry"]
): boolean {
  const testRationaleAllowed =
    phase.required_outputs.includes("test_rationale") || phase.optional_outputs.includes("test_rationale");
  return testRationaleAllowed && outputArtifactIds.has("test_rationale") && Boolean(artifactRegistry.test_rationale);
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
