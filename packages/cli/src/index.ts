#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { parse } from "yaml";
import { FileRunStore, FlowRuntime } from "@swarm-flow/runtime";
import { validateFlow, type RunScope, type RunTarget } from "@swarm-flow/core";

export type CliIo = {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
};

type StartOptions = {
  title?: string;
  goal?: string;
  flow?: string;
  target?: string;
};

type StartKind = "feature" | "bugfix" | "refactor" | "spike" | "incident" | "epic" | "review" | "qa";

type InitOptions = {
  agent?: "claude" | "codex" | "all";
};

type ApproveOptions = {
  run?: string;
  by?: string;
  note?: string;
};

type CommentRunOptions = {
  run?: string;
};

type CommentSelectOptions = CommentRunOptions & {
  ids: string;
};

const cliDir = dirname(fileURLToPath(import.meta.url));
const repoRootFromDist = resolve(cliDir, "../../..");

export function createProgram(io: CliIo = {}): Command {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? ((line: string) => console.log(line));
  const stderr = io.stderr ?? ((line: string) => console.error(line));
  const program = new Command();

  program
    .name("swarm-flow")
    .description("Governed, artifact-driven SDLC orchestration for AI coding agents.")
    .version("0.1.0")
    .exitOverride();

  program
    .command("init")
    .option("--agent <agent>", "write agent instructions: claude, codex, or all")
    .description("Create a local swarm-flow configuration file.")
    .action(async (options: InitOptions) => {
      const configPath = resolve(cwd, "swarm-flow.config.json");
      const config = {
        defaultFlow: "feature-default",
        defaultPolicy: "default",
        runsDirectory: ".runs",
        externalWrites: {
          previewByDefault: true
        }
      };
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      stdout("Initialized swarm-flow.config.json");
      if (options.agent) {
        await writeAgentInstructions(cwd, options.agent);
        stdout(`Initialized agent instructions for ${options.agent}`);
      }
    });

  program
    .command("start")
    .argument("<requestOrType>", "flow type or natural-language request")
    .argument("[request...]", "natural-language request when type is provided")
    .option("--title <title>", "feature title")
    .option("--goal <goal>", "delivery goal")
    .option("--flow <path>", "flow YAML path; inferred from request when omitted")
    .option("--target <target>", "target URL, ticket key, or local target for scoped runs")
    .description("Start a new persisted run from a plain-language request.")
    .action(async (requestOrType: string, requestParts: string[], options: StartOptions) => {
      const normalized = normalizeStartInput(requestOrType, requestParts, options);
      const flowPath = options.flow
        ? resolve(cwd, options.flow)
        : resolve(repoRootFromDist, defaultFlowPath(normalized.type));
      await startRun({
        cwd,
        stdout,
        flowPath,
        title: normalized.title,
        goal: normalized.goal,
        scope: normalized.type,
        target: normalized.target
      });
    });

  program
    .command("epic")
    .argument("<target>", "Jira epic key, GitHub issue, or objective")
    .description("Start an epic delivery run.")
    .action(async (target: string) => {
      await startRun({
        cwd,
        stdout,
        flowPath: resolve(repoRootFromDist, "flows/epic-delivery.yaml"),
        title: scopedTitle("epic", target),
        goal: `Deliver epic ${target}`,
        scope: "epic",
        target: parseTarget(target)
      });
    });

  program
    .command("review")
    .argument("<target>", "GitHub pull request URL")
    .description("Start a standalone PR review swarm run.")
    .action(async (target: string) => {
      await startRun({
        cwd,
        stdout,
        flowPath: resolve(repoRootFromDist, "flows/review-only.yaml"),
        title: scopedTitle("review", target),
        goal: `Review ${target}`,
        scope: "review",
        target: parseTarget(target)
      });
    });

  program
    .command("qa")
    .argument("<target>", "PR URL, Jira key, deploy preview, local URL, or test target")
    .description("Start a standalone QA swarm run.")
    .action(async (target: string) => {
      await startRun({
        cwd,
        stdout,
        flowPath: resolve(repoRootFromDist, "flows/qa-only.yaml"),
        title: scopedTitle("qa", target),
        goal: `QA ${target}`,
        scope: "qa",
        target: parseTarget(target)
      });
    });

  program
    .command("status")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Show run status.")
    .action(async (options: { run?: string }) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        stdout("No runs found.");
        return;
      }
      stdout(`${run.id}`);
      stdout(`Flow: ${run.flow_id}`);
      stdout(`Current phase: ${run.current_phase}`);
      stdout(`Completed phases: ${run.completed_phases.join(", ") || "none"}`);
      stdout(`Artifacts: ${Object.keys(run.artifact_registry).join(", ") || "none"}`);
    });

  program
    .command("resume")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Show the next actionable phase for a run.")
    .action(async (options: { run?: string }) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        stdout("No runs found.");
        return;
      }
      stdout(`Resume ${run.id} at phase ${run.current_phase}`);
      stdout(`Required outputs: ${currentPhaseOutputs(run).join(", ") || "none"}`);
    });

  program
    .command("artifacts")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("List run artifacts.")
    .action(async (options: { run?: string }) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        stdout("No runs found.");
        return;
      }
      for (const artifact of Object.values(run.artifact_registry)) {
        stdout(`${artifact.id}\t${artifact.path}\t${artifact.produced_by_phase}`);
      }
    });

  const flows = program.command("flows").description("Inspect bundled flows.");
  flows.command("list").description("List bundled flow definitions.").action(async () => {
    for (const file of await listMarkdownOrYaml(resolve(repoRootFromDist, "flows"), ".yaml")) {
      stdout(file.replace(/\.yaml$/, ""));
    }
  });
  flows
    .command("inspect")
    .argument("<id>", "flow id, for example feature-default")
    .description("Show a bundled flow summary.")
    .action(async (id: string) => {
      const flow = parse(await readFile(resolve(repoRootFromDist, "flows", `${id}.yaml`), "utf8")) as unknown;
      const result = validateFlow(flow);
      if (!result.ok) {
        throw new Error(`Invalid flow ${id}: ${result.errors.join("; ")}`);
      }
      stdout(`${result.flow.name} (${result.flow.id})`);
      if (result.flow.description) {
        stdout(result.flow.description);
      }
      for (const phase of result.flow.phases) {
        const dependencies = phase.dependencies.length > 0 ? ` after ${phase.dependencies.join(", ")}` : "";
        const approval = phase.approval_required ? " [approval]" : "";
        stdout(`- ${phase.id}${dependencies}${approval}: ${phase.required_outputs.join(", ") || "no outputs"}`);
      }
    });
  flows
    .command("validate")
    .argument("<path>", "flow YAML path")
    .description("Validate a flow definition.")
    .action(async (path: string) => {
      const flow = parse(await readFile(resolve(cwd, path), "utf8")) as unknown;
      const result = validateFlow(flow);
      if (!result.ok) {
        throw new Error(`Invalid flow: ${result.errors.join("; ")}`);
      }
      stdout(`Valid flow: ${result.flow.id}`);
    });

  const skills = program.command("skills").description("Inspect bundled skills.");
  skills.command("list").description("List bundled skill cards.").action(async () => {
    for (const file of await listNestedFiles(resolve(repoRootFromDist, "skills"), ".md")) {
      stdout(file.replace(/\.md$/, ""));
    }
  });
  skills
    .command("inspect")
    .argument("<id>", "skill id, for example planning/task-breakdown")
    .description("Show a bundled skill card.")
    .action(async (id: string) => {
      const content = await readFile(resolve(repoRootFromDist, "skills", `${id}.md`), "utf8");
      stdout(content);
    });

  const integrations = program.command("integrations").description("Inspect agent integration bundles.");
  integrations.command("list").description("List bundled agent integrations.").action(() => {
    stdout("claude-code\tplugins/claude-code\tClaude Code slash-command plugin");
    stdout("codex\tplugins/codex\tCodex skill plugin");
  });
  integrations
    .command("show")
    .argument("<id>", "integration id: claude-code or codex")
    .description("Show installation notes for an integration.")
    .action(async (id: string) => {
      const integrationPath =
        id === "claude-code"
          ? resolve(repoRootFromDist, "plugins/claude-code")
          : id === "codex"
            ? resolve(repoRootFromDist, "plugins/codex")
            : undefined;
      if (!integrationPath) {
        throw new Error(`Unknown integration ${id}. Expected claude-code or codex.`);
      }
      const readme = await readFile(resolve(integrationPath, "README.md"), "utf8");
      stdout(`${id}`);
      stdout(`Path: ${integrationPath.replace(`${repoRootFromDist}/`, "")}`);
      stdout(readme);
    });

  const runs = program.command("runs").description("Inspect persisted runs.");
  runs.command("list").description("List runs, newest first.").action(async () => {
    const store = new FileRunStore(cwd);
    const persistedRuns = await store.list();
    if (persistedRuns.length === 0) {
      stdout("No runs found.");
      return;
    }
    for (const run of persistedRuns) {
      stdout(`${run.id}\t${run.flow_id}\t${run.current_phase}\t${run.feature.title}`);
    }
  });

  const runCommand = program.command("run").description("Inspect a specific run.");
  runCommand
    .command("show")
    .argument("<id>", "run id")
    .description("Show run details.")
    .action(async (id: string) => {
      const run = await new FileRunStore(cwd).load(id);
      stdout(`${run.id}`);
      stdout(`Title: ${run.feature.title}`);
      stdout(`Goal: ${run.feature.goal}`);
      stdout(`Flow: ${run.flow_id}`);
      stdout(`Current phase: ${run.current_phase}`);
      stdout(`Completed phases: ${run.completed_phases.join(", ") || "none"}`);
      stdout(`Pending phases: ${run.pending_phases.join(", ") || "none"}`);
      stdout(`Artifacts: ${Object.keys(run.artifact_registry).join(", ") || "none"}`);
      stdout(`Approvals: ${Object.keys(run.approvals).join(", ") || "none"}`);
      stdout(`Unresolved assumptions: ${run.unresolved_assumptions.length}`);
      stdout(`Unresolved risks: ${run.unresolved_risks.length}`);
    });

  program
    .command("approve")
    .argument("<phase>", "phase id to approve")
    .option("--run <id>", "run id; defaults to most recent run")
    .option("--by <name>", "approver name", "human")
    .option("--note <note>", "approval note")
    .description("Record a human approval for a phase.")
    .action(async (phase: string, options: ApproveOptions) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        throw new Error("No runs found.");
      }
      const runtime = new FlowRuntime({ repoRoot: cwd, store });
      const updated = await runtime.approvePhase(run.id, {
        phaseId: phase,
        approvedBy: options.by ?? "human",
        note: options.note
      });
      stdout(`Approved ${phase} for ${updated.id}`);
    });

  program
    .command("preview")
    .argument("<target>", "external write target: jira, confluence, github")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Create a local external-write preview artifact.")
    .action(async (target: string, options: { run?: string }) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        throw new Error("No runs found.");
      }
      const previewDir = resolve(cwd, ".runs", run.id, "outputs", "previews");
      await mkdir(previewDir, { recursive: true });
      const previewPath = resolve(previewDir, `${target}.preview.json`);
      const idempotencyKey = `${run.id}:${target}:preview`;
      const preview = {
        runId: run.id,
        target,
        mode: "preview",
        idempotencyKey,
        createdAt: new Date().toISOString()
      };
      await writeFile(previewPath, `${JSON.stringify(preview, null, 2)}\n`, "utf8");
      await new FlowRuntime({ repoRoot: cwd, store }).recordConnectorPreview(run.id, {
        connectorId: target,
        operation: "update",
        target,
        idempotencyKey,
        previewPath: previewPath.replace(`${cwd}/`, "")
      });
      stdout(`Preview written: ${previewPath}`);
    });

  const comments = program.command("comments").description("Preview and select external comments.");
  comments
    .command("preview")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Create selectable external comment previews for a run.")
    .action(async (options: CommentRunOptions) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        throw new Error("No runs found.");
      }
      const previewDir = resolve(cwd, ".runs", run.id, "outputs", "previews");
      await mkdir(previewDir, { recursive: true });
      const connectorId = commentConnectorId(run.target?.type);
      const previewPath = resolve(previewDir, `${connectorId}-comments.preview.json`);
      const target = run.target?.value ?? run.feature.goal;
      const preview = {
        runId: run.id,
        mode: "preview",
        target,
        comments: [
          {
            id: "comment-1",
            connector_id: connectorId,
            type: "summary",
            severity: "info",
            body: `${run.flow_id} report is available in this swarm-flow run.`,
            recommended: true
          }
        ]
      };
      await writeFile(previewPath, `${JSON.stringify(preview, null, 2)}\n`, "utf8");
      stdout(`Comment preview written: ${previewPath}`);
    });

  comments
    .command("select")
    .requiredOption("--ids <ids>", "comma-separated comment ids to select")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Record selected external comments without posting them.")
    .action(async (options: CommentSelectOptions) => {
      const store = new FileRunStore(cwd);
      const run = options.run ? await store.load(options.run) : await store.latest();
      if (!run) {
        throw new Error("No runs found.");
      }
      const connectorId = commentConnectorId(run.target?.type);
      const previewPath = resolve(cwd, ".runs", run.id, "outputs", "previews", `${connectorId}-comments.preview.json`);
      const preview = JSON.parse(await readFile(previewPath, "utf8")) as {
        target: string;
        comments: Array<{ id: string }>;
      };
      const selectedIds = options.ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const skippedIds = preview.comments
        .map((comment) => comment.id)
        .filter((id) => !selectedIds.includes(id));

      await new FlowRuntime({ repoRoot: cwd, store }).recordExternalPostingSelection(run.id, {
        target: preview.target,
        selection_mode: "selected",
        selected_comment_ids: selectedIds,
        skipped_comment_ids: skippedIds,
        posted: []
      });
      stdout(`Comment selection recorded for ${run.id}`);
    });

  program
    .command("doctor")
    .description("Check local workspace prerequisites.")
    .action(() => {
      stdout("swarm-flow doctor");
      stdout(`cwd: ${cwd}`);
      stdout("node: available");
      stdout("package manager: npm");
    });

  program.configureOutput({
    writeOut: (message) => stdout(message.trimEnd()),
    writeErr: (message) => stderr(message.trimEnd())
  });

  return program;
}

function currentPhaseOutputs(run: Awaited<ReturnType<FileRunStore["load"]>>): string[] {
  return run.flow_snapshot.phases.find((phase) => phase.id === run.current_phase)?.required_outputs ?? [];
}

function normalizeStartInput(
  requestOrType: string,
  requestParts: string[],
  options: StartOptions
): { type: StartKind; title: string; goal: string; target?: RunTarget } {
  const explicitType = parseStartKind(requestOrType);
  const request = explicitType ? requestParts.join(" ").trim() : [requestOrType, ...requestParts].join(" ").trim();
  const targetValue = options.target ?? (explicitType && ["epic", "review", "qa"].includes(explicitType) ? request : undefined);
  const goal = options.goal ?? targetValue ?? request;
  const title = options.title ?? deriveTitle(goal);

  if (!goal) {
    throw new Error("Start requires a request or --goal.");
  }

  return {
    type: explicitType ?? inferStartKind(goal),
    title,
    goal,
    target: targetValue ? parseTarget(targetValue) : undefined
  };
}

function parseStartKind(value: string): StartKind | undefined {
  const normalized = value.toLowerCase();
  if (normalized === "feature") {
    return "feature";
  }
  if (normalized === "bugfix" || normalized === "bug") {
    return "bugfix";
  }
  if (normalized === "refactor") {
    return "refactor";
  }
  if (normalized === "spike" || normalized === "research") {
    return "spike";
  }
  if (normalized === "incident" || normalized === "remediation") {
    return "incident";
  }
  if (normalized === "epic") {
    return "epic";
  }
  if (normalized === "review") {
    return "review";
  }
  if (normalized === "qa") {
    return "qa";
  }
  return undefined;
}

function inferStartKind(goal: string): StartKind {
  if (/\b(incident|outage|sev|remediate|remediation|production down)\b/i.test(goal)) {
    return "incident";
  }
  if (/\b(spike|research|investigate|explore|evaluate|prototype)\b/i.test(goal)) {
    return "spike";
  }
  if (/\b(refactor|cleanup|restructure|migrate|modernize)\b/i.test(goal)) {
    return "refactor";
  }
  if (/\b(fix|bug|broken|failing|failure|regression|error|defect)\b/i.test(goal)) {
    return "bugfix";
  }
  return "feature";
}

function defaultFlowPath(type: StartKind): string {
  const flowsByType: Record<StartKind, string> = {
    feature: "flows/feature-default.yaml",
    bugfix: "flows/bugfix-fastlane.yaml",
    refactor: "flows/refactor-guided.yaml",
    spike: "flows/spike-research.yaml",
    incident: "flows/incident-remediation.yaml",
    epic: "flows/epic-delivery.yaml",
    review: "flows/review-only.yaml",
    qa: "flows/qa-only.yaml"
  };
  return flowsByType[type];
}

async function startRun(input: {
  cwd: string;
  stdout: (line: string) => void;
  flowPath: string;
  title: string;
  goal: string;
  scope: RunScope;
  target?: RunTarget;
}): Promise<void> {
  const flow = parse(await readFile(input.flowPath, "utf8")) as unknown;
  const runtime = new FlowRuntime({
    repoRoot: input.cwd,
    store: new FileRunStore(input.cwd)
  });
  const run = await runtime.startFeatureRun({
    flow,
    title: input.title,
    goal: input.goal,
    scope: input.scope,
    target: input.target
  });

  input.stdout(`Started ${run.id}`);
  input.stdout(`Current phase: ${run.current_phase}`);
  input.stdout(`Run state: .runs/${run.id}/run.json`);
}

function parseTarget(value: string): RunTarget {
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/i.test(value)) {
    return { type: "github_pr", value };
  }
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/i.test(value)) {
    return { type: "github_issue", value };
  }
  if (/^https?:\/\//i.test(value)) {
    return { type: "url", value };
  }
  if (/^[A-Z][A-Z0-9]+-\d+$/.test(value)) {
    return { type: "jira", value };
  }
  return { type: "plain_text", value };
}

function scopedTitle(scope: Extract<RunScope, "epic" | "review" | "qa">, target: string): string {
  if (scope === "review") {
    const prNumber = target.match(/\/pull\/(\d+)/i)?.[1];
    return prNumber ? `Review PR ${prNumber}` : deriveTitle(`Review ${target}`);
  }
  if (scope === "qa") {
    return deriveTitle(`QA ${target}`);
  }
  return deriveTitle(`Epic ${target}`);
}

function commentConnectorId(targetType?: RunTarget["type"]): "github" | "jira" | "slack" {
  if (targetType === "github_pr" || targetType === "github_issue") {
    return "github";
  }
  if (targetType === "jira") {
    return "jira";
  }
  return "github";
}

function deriveTitle(goal: string): string {
  const cleaned = goal
    .replace(/^build\s+/i, "")
    .replace(/^create\s+/i, "")
    .replace(/^implement\s+/i, "")
    .trim();
  const [beforeComma] = cleaned.split(",");
  const candidate = beforeComma.trim().replace(/[.!?]$/g, "");
  if (candidate.length <= 80) {
    return sentenceCase(candidate);
  }
  return sentenceCase(`${candidate.slice(0, 77).replace(/\s+\S*$/, "")}...`);
}

function sentenceCase(value: string): string {
  if (!value) {
    return "Feature delivery";
  }
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

async function writeAgentInstructions(cwd: string, agent: InitOptions["agent"]): Promise<void> {
  const codexInstructions = renderAgentInstructionTemplate("Codex");
  const claudeInstructions = renderAgentInstructionTemplate("Claude Code");

  if (agent === "codex" || agent === "all") {
    await writeFile(resolve(cwd, "AGENTS.md"), codexInstructions, "utf8");
  }
  if (agent === "claude" || agent === "all") {
    await writeFile(resolve(cwd, "CLAUDE.md"), claudeInstructions, "utf8");
  }
}

function renderAgentInstructionTemplate(agentName: string): string {
  return `# ${agentName} swarm-flow Instructions

This repository uses swarm-flow for governed, artifact-driven software delivery.

## Default Behavior

When the user asks to build, fix, refactor, research, or remediate non-trivial software work:

1. Check for an active run with \`swarm-flow status\`.
2. If a run exists, resume it with \`swarm-flow resume\` and read \`.runs/<run-id>/run.json\`.
3. If no run exists, start one from the user's plain-language request:

\`\`\`bash
swarm-flow start "<user request>"
\`\`\`

4. Continue from \`current_phase\`.
5. Treat \`required_outputs\` as the phase checklist.
6. Create durable artifacts under \`.runs/<run-id>/artifacts/\`.
7. Keep external writes in preview mode with \`swarm-flow preview <target>\`.
8. Never record approvals unless the user explicitly approves.

## Source Of Truth

Chat is not source of truth. \`.runs/<run-id>/run.json\` and registered artifacts are source of truth.

## Safety

Do not auto-merge, auto-deploy, or perform live Jira, Confluence, or GitHub writes.
`;
}

async function listMarkdownOrYaml(root: string, extension: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name)
    .sort();
}

async function listNestedFiles(root: string, extension: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      for (const nested of await listMarkdownOrYaml(path, extension)) {
        results.push(`${basename(path)}/${nested}`);
      }
    }
  }

  return results.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createProgram()
    .parseAsync()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
