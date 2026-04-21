#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { parse } from "yaml";
import { FileRunStore, FlowRuntime, type TddEvidenceArtifact } from "@swarm-flow/runtime";
import {
  createPlaywrightQaBackend,
  normalizeQaConfig,
  redactQaConfig,
  type NormalizeQaConfigInput,
  type QaBackendId
} from "@swarm-flow/qa";
import { evaluatePhaseEntry, validateFlow, type Policy, type RunScope, type RunState, type RunTarget } from "@swarm-flow/core";
import { StandardAgentAdapter } from "@swarm-flow/adapters";

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

type ArtifactAddOptions = {
  run?: string;
  phase?: string;
  mediaType?: string;
};

type CompleteOptions = {
  run?: string;
  outputs?: string;
  policy?: string;
};

type PolicyCheckOptions = {
  run?: string;
  policy?: string;
};

type ContextPackOptions = {
  run?: string;
  output?: string;
};

type TddEvidenceOptions = {
  run?: string;
  artifact: string;
  command: string;
  files?: string;
};

type TddStatusOptions = {
  run?: string;
  artifact?: string;
};

type QaOptions = {
  backend?: QaBackendId;
  configFile?: string;
  targetUrl?: string;
  loginUrl?: string;
  apiUrl?: string;
  previewUrl?: string;
  healthcheckUrl?: string;
  testCommand?: string;
  accessibilityCommand?: string;
  artifactDirectories?: string;
  mode?: "suggest" | "execute" | "full";
  commentMode?: "preview" | "summary";
  environment?: string;
  aiProvider?: "openai" | "azure_openai" | "anthropic" | "bedrock" | "google" | "ollama" | "openai_compatible";
  aiModel?: string;
  aiBaseUrl?: string;
  awsRegion?: string;
  awsProfile?: string;
  awsRoleToAssume?: string;
  awsExternalId?: string;
  bedrockModelId?: string;
  bedrockInferenceProfileId?: string;
  bedrockInferenceProfileArn?: string;
  browser?: "chromium" | "firefox" | "webkit";
  headless?: string;
  timeoutMs?: string;
  retries?: string;
  screenshot?: "off" | "failures" | "always";
  trace?: "off" | "retain-on-failure" | "on";
  video?: "off" | "retain-on-failure" | "on";
  usernameEnv?: string;
  passwordEnv?: string;
  totpSecretEnv?: string;
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
    .command("apply")
    .argument("<connector>", "Connector ID (e.g. filesystem, git, github)")
    .argument("<preview_file>", "Path to the preview JSON payload")
    .description("Validate a connector preview file; live apply is disabled in v0.1")
    .action(async (connector: string, previewFile: string) => {
      const store = new FileRunStore(cwd);
      const run = await store.latest();
      if (!run) {
        throw new Error("No active run found. This command requires a run context.");
      }

      const rawPreview = await readFile(resolve(cwd, previewFile), "utf8");
      const previewPayload = JSON.parse(rawPreview);
      const reasons = validateApplyPreview(run, connector, previewPayload);
      const message = [
        "Live connector apply is not supported in v0.1. Keep writes in preview mode and record user selections instead.",
        ...reasons
      ].join(" ");
      run.policy_decisions = [
        ...run.policy_decisions,
        {
          allowed: false,
          reasons: [message]
        }
      ];
      await store.save(run);
      throw new Error(message);
    });

  program
    .command("auto")
    .description("Execute an autonomous agent loop for the current phase")
    .action(async () => {
      const store = new FileRunStore(cwd);
      let run = await store.latest();
      if (!run) {
        throw new Error("No active run found. This command requires a run context.");
      }

      const phaseId = run.current_phase;
      const phase = run.flow_snapshot.phases.find(p => p.id === phaseId);
      if (!phase) {
         throw new Error(`Current phase ${phaseId} not found in flow definition`);
      }
      
      const runtime = new FlowRuntime({ 
        repoRoot: cwd, 
        store
      });

      stdout(`Executing headless agent loop for phase: ${phaseId}...`);
      
      const adapter = new StandardAgentAdapter();
      const contextPack = await renderContextPack(run);
      const result = await adapter.invoke({
        runId: run.id,
        repoRoot: cwd,
        agentId: phase.agents[0] || "primary",
        phaseId,
        goal: run.feature.goal,
        requiredOutputs: phase.required_outputs,
        contextFiles: {
          "current-phase-context.md": contextPack
        }
      });

      if (!result.ok) {
         throw new Error(`Agent execution failed: ${result.reasons.join(", ")}`);
      }

      for (const [artifactId, content] of Object.entries(result.artifacts_created)) {
         stdout(`Registering artifact: ${artifactId}`);
         const mediaType = artifactId.endsWith('.json') ? 'application/json' : 'text/markdown';
         run = await runtime.registerArtifact(run.id, {
           id: artifactId,
           fileName: `${artifactId}.md`,
           mediaType,
           content,
           phaseId
         });
      }
      
      stdout(`\u2705 Auto-execution complete for phase ${phaseId}.`);
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
    .option("--backend <backend>", "QA backend to execute, for example playwright")
    .option("--config-file <path>", "QA config file path")
    .option("--target-url <url>", "application URL to test")
    .option("--login-url <url>", "login URL when different from target URL")
    .option("--api-url <url>", "API URL used by tests")
    .option("--preview-url <url>", "deploy preview URL")
    .option("--healthcheck-url <url>", "URL to check before QA execution")
    .option("--test-command <command>", "test command to run for the QA backend")
    .option("--accessibility-command <command>", "accessibility command to run for the QA backend")
    .option("--artifact-directories <paths>", "comma-separated artifact directories to scan")
    .option("--mode <mode>", "QA mode: suggest, execute, or full")
    .option("--comment-mode <mode>", "comment behavior: preview or summary")
    .option("--environment <name>", "environment profile name")
    .option("--ai-provider <provider>", "AI provider for generated QA work")
    .option("--ai-model <model>", "AI model for the selected provider")
    .option("--ai-base-url <url>", "base URL for compatible providers")
    .option("--aws-region <region>", "AWS region for Bedrock")
    .option("--aws-profile <profile>", "AWS profile for Bedrock")
    .option("--aws-role-to-assume <arn>", "AWS role ARN to assume for Bedrock")
    .option("--aws-external-id <id>", "AWS external id for role assumption")
    .option("--bedrock-model-id <id>", "Bedrock model id")
    .option("--bedrock-inference-profile-id <id>", "Bedrock inference profile id")
    .option("--bedrock-inference-profile-arn <arn>", "Bedrock inference profile ARN")
    .option("--browser <browser>", "browser to run: chromium, firefox, or webkit")
    .option("--headless <value>", "true or false")
    .option("--timeout-ms <ms>", "browser/test timeout in milliseconds")
    .option("--retries <count>", "test retry count")
    .option("--screenshot <mode>", "off, failures, or always")
    .option("--trace <mode>", "off, retain-on-failure, or on")
    .option("--video <mode>", "off, retain-on-failure, or on")
    .option("--username-env <name>", "env var containing test username")
    .option("--password-env <name>", "env var containing test password")
    .option("--totp-secret-env <name>", "env var containing test TOTP secret")
    .description("Start a standalone QA swarm run.")
    .action(async (target: string, options: QaOptions) => {
      const parsedTarget = parseTarget(target);
      const run = await startRun({
        cwd,
        stdout,
        flowPath: resolve(repoRootFromDist, "flows/qa-only.yaml"),
        title: scopedTitle("qa", target),
        goal: `QA ${target}`,
        scope: "qa",
        target: parsedTarget
      });

      if (!options.backend) {
        return;
      }
      if (options.backend !== "playwright") {
        throw new Error(`Unsupported QA backend ${options.backend}. Expected playwright.`);
      }

      const config = normalizeQaConfig({
        fileConfig: await readQaConfigFile(cwd, options.configFile),
        env: process.env,
        cliFlags: {
          targetUrl: options.targetUrl,
          loginUrl: options.loginUrl,
          apiUrl: options.apiUrl,
          previewUrl: options.previewUrl,
          healthcheckUrl: options.healthcheckUrl,
          testCommand: options.testCommand,
          accessibilityCommand: options.accessibilityCommand,
          artifactDirectories: options.artifactDirectories,
          mode: options.mode,
          commentMode: options.commentMode,
          environment: options.environment,
          aiProvider: options.aiProvider,
          aiModel: options.aiModel,
          aiBaseUrl: options.aiBaseUrl,
          awsRegion: options.awsRegion,
          awsProfile: options.awsProfile,
          awsRoleToAssumeArn: options.awsRoleToAssume,
          awsExternalId: options.awsExternalId,
          bedrockModelId: options.bedrockModelId,
          bedrockInferenceProfileId: options.bedrockInferenceProfileId,
          bedrockInferenceProfileArn: options.bedrockInferenceProfileArn,
          browser: options.browser,
          headless: options.headless,
          timeoutMs: options.timeoutMs,
          retries: options.retries,
          screenshot: options.screenshot,
          trace: options.trace,
          video: options.video,
          usernameEnv: options.usernameEnv,
          passwordEnv: options.passwordEnv,
          totpSecretEnv: options.totpSecretEnv
        }
      });
      const backend = createPlaywrightQaBackend();
      const result = await backend.execute({
        runId: run.id,
        target: parsedTarget,
        backend: "playwright",
        targetUrl: config.target.baseUrl,
        mode: config.mode,
        config: redactQaConfig(config),
        testCommand: config.test.command,
        workingDirectory: cwd,
        outputDirectory: resolve(cwd, ".runs", run.id, "artifacts")
      });

      stdout(`QA backend ${result.success ? "passed" : "failed"}: ${result.artifacts.qaReport}`);
      if (!result.success) {
        throw new Error(`QA backend failed with exit code ${result.exitCode ?? "unknown"}`);
      }
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

  const artifact = program.command("artifact").description("Register and inspect run artifacts.");
  artifact
    .command("add")
    .argument("<id>", "artifact id from the current phase required outputs")
    .argument("<file>", "local file to register as the artifact content")
    .option("--run <id>", "run id; defaults to most recent run")
    .option("--phase <phase>", "phase id; defaults to the run current phase")
    .option("--media-type <type>", "artifact media type; inferred from file extension when omitted")
    .description("Copy a local file into the active run and register it as an artifact.")
    .action(async (id: string, file: string, options: ArtifactAddOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const absoluteFile = resolve(cwd, file);
      const content = await readFile(absoluteFile, "utf8");
      const phaseId = options.phase ?? run.current_phase;
      const fileName = basename(file);
      const mediaType = options.mediaType ?? inferMediaType(fileName);
      const updated = await new FlowRuntime({ repoRoot: cwd, store }).registerArtifact(run.id, {
        id,
        fileName,
        phaseId,
        mediaType,
        content
      });
      stdout(`Registered artifact ${id}: ${updated.artifact_registry[id].path}`);
    });

  program
    .command("phase")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Show the current phase contract.")
    .action(async (options: { run?: string }) => {
      const run = await loadRun(new FileRunStore(cwd), options.run);
      const phase = currentPhase(run);
      stdout(`Current phase: ${phase.id}`);
      stdout(`Description: ${phase.description}`);
      stdout(`Agents: ${phase.agents.join(", ")}`);
      stdout(`Required outputs: ${phase.required_outputs.join(", ") || "none"}`);
      stdout(`Approval required: ${phase.approval_required ? "yes" : "no"}`);
      for (const condition of phase.transition_conditions) {
        stdout(`Condition: ${condition}`);
      }
    });

  program
    .command("complete")
    .argument("<phase>", "current phase id to complete")
    .option("--run <id>", "run id; defaults to most recent run")
    .option("--outputs <ids>", "comma-separated output artifact ids; defaults to current phase required outputs")
    .option("--policy <id>", "policy id or path; defaults to configured policy when available")
    .description("Complete the current phase after artifact and policy gates pass.")
    .action(async (phaseId: string, options: CompleteOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const phase = currentPhase(run);
      if (phase.id !== phaseId) {
        throw new Error(`cannot complete phase ${phaseId}; current phase is ${phase.id}`);
      }
      const outputIds = options.outputs
        ? options.outputs.split(",").map((id) => id.trim()).filter(Boolean)
        : phase.required_outputs;
      const nextPhase = nextRunnablePhase(run, phase.id);
      if (nextPhase) {
        const decision = await evaluatePhaseGate(cwd, run, nextPhase.id, options.policy);
        if (!decision.allowed) {
          throw new Error(`cannot enter ${nextPhase.id}: ${decision.reasons.join("; ")}`);
        }
      }
      const updated = await new FlowRuntime({ repoRoot: cwd, store }).completePhase(run.id, phaseId, outputIds);
      stdout(`Completed ${phaseId}; current phase: ${updated.current_phase}`);
    });

  const policyCommand = program.command("policy").description("Evaluate run policy gates.");
  policyCommand
    .command("check")
    .option("--run <id>", "run id; defaults to most recent run")
    .option("--policy <id>", "policy id or path; defaults to configured policy when available")
    .description("Evaluate policy for the current phase.")
    .action(async (options: PolicyCheckOptions) => {
      const run = await loadRun(new FileRunStore(cwd), options.run);
      const decision = await evaluatePhaseGate(cwd, run, run.current_phase, options.policy);
      if (!decision.allowed) {
        throw new Error(`Policy check failed for ${run.current_phase}: ${decision.reasons.join("; ")}`);
      }
      stdout(`Policy check passed for ${run.current_phase}`);
    });

  const contextCommand = program.command("context").description("Create compact agent context packs.");
  contextCommand
    .command("pack")
    .option("--run <id>", "run id; defaults to most recent run")
    .option("--output <path>", "output path; defaults to the run context directory")
    .description("Write a current-phase context pack for agents.")
    .action(async (options: ContextPackOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const content = await renderContextPack(run);
      const outputPath = options.output
        ? resolve(cwd, options.output)
        : resolve(cwd, ".runs", run.id, "context", "current-phase-context.md");
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, "utf8");
      stdout(`Context pack written: ${outputPath}`);
    });

  const tdd = program.command("tdd").description("Record red/green test-first evidence for implementation artifacts.");
  tdd
    .command("red")
    .requiredOption("--artifact <id>", "artifact id the evidence supports, usually tests_added")
    .requiredOption("--command <command>", "test command expected to fail for RED evidence")
    .option("--files <files>", "comma-separated related files")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Run a command and record valid RED evidence only when it fails.")
    .action(async (options: TddEvidenceOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const attempt = await runEvidenceCommand(options.command, cwd, relatedFiles(options.files), (exitCode) => exitCode !== 0);
      if (!attempt.valid) {
        throw new Error(`red evidence command must fail; received exit code ${attempt.exitCode}`);
      }
      await writeTddEvidence(cwd, store, run, options.artifact, options.command, { red: attempt });
      stdout(`Recorded red TDD evidence for ${options.artifact}`);
    });

  tdd
    .command("green")
    .requiredOption("--artifact <id>", "artifact id the evidence supports, usually tests_added")
    .requiredOption("--command <command>", "test command expected to pass for GREEN evidence")
    .option("--files <files>", "comma-separated related files")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Run a command and record valid GREEN evidence only when it passes.")
    .action(async (options: TddEvidenceOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const attempt = await runEvidenceCommand(options.command, cwd, relatedFiles(options.files), (exitCode) => exitCode === 0);
      if (!attempt.valid) {
        throw new Error(`green evidence command must pass; received exit code ${attempt.exitCode}`);
      }
      await writeTddEvidence(cwd, store, run, options.artifact, options.command, { green: attempt });
      stdout(`Recorded green TDD evidence for ${options.artifact}`);
    });

  tdd
    .command("status")
    .option("--artifact <id>", "artifact id to inspect", "tests_added")
    .option("--run <id>", "run id; defaults to most recent run")
    .description("Show red/green TDD evidence status.")
    .action(async (options: TddStatusOptions) => {
      const store = new FileRunStore(cwd);
      const run = await loadRun(store, options.run);
      const evidence = await readTddEvidence(cwd, run, options.artifact ?? "tests_added");
      if (!evidence) {
        stdout(`TDD evidence for ${options.artifact ?? "tests_added"}: missing`);
        return;
      }
      const red = evidence.red?.valid ? "red valid" : "red missing";
      const green = evidence.green?.valid ? "green valid" : "green missing";
      stdout(`TDD evidence for ${evidence.artifactId}: ${red}, ${green}`);
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
  skills.command("lint").description("Validate bundled skill cards for required workflow sections.").action(async () => {
    const failures = await lintSkillCards(resolve(repoRootFromDist, "skills"));
    if (failures.length > 0) {
      throw new Error(`Skill lint failed:\n${failures.join("\n")}`);
    }
    stdout("Skill lint passed");
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

async function readQaConfigFile(
  cwd: string,
  path: string | undefined
): Promise<NormalizeQaConfigInput["fileConfig"]> {
  if (!path) {
    return undefined;
  }

  try {
    const absolutePath = resolve(cwd, path);
    const content = await readFile(absolutePath, "utf8");
    return path.endsWith(".json")
      ? (JSON.parse(content) as NormalizeQaConfigInput["fileConfig"])
      : (parse(content) as NormalizeQaConfigInput["fileConfig"]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function validateApplyPreview(run: RunState, connector: string, previewPayload: unknown): string[] {
  const reasons: string[] = [];
  if (!isRecord(previewPayload)) {
    return ["Preview payload must be a JSON object."];
  }

  const target = stringValue(previewPayload.target) ?? stringValue(previewPayload.connector);
  if (target && target !== connector) {
    reasons.push(`Preview target ${target} does not match requested connector ${connector}.`);
  }

  const mode = stringValue(previewPayload.mode);
  if (mode && mode !== "preview") {
    reasons.push(`Preview payload mode must be preview; received ${mode}.`);
  }

  const runId = stringValue(previewPayload.runId) ?? stringValue(previewPayload.run_id);
  if (runId && runId !== run.id) {
    reasons.push(`Preview payload belongs to run ${runId}, not active run ${run.id}.`);
  }

  const idempotencyKey = stringValue(previewPayload.idempotencyKey) ?? stringValue(previewPayload.idempotency_key);
  if (!idempotencyKey) {
    reasons.push("Preview payload is missing an idempotency key.");
  } else {
    const recorded = run.connector_write_previews.some(
      (preview) => preview.connector_id === connector && preview.idempotency_key === idempotencyKey
    );
    if (!recorded) {
      reasons.push(`Preview idempotency key ${idempotencyKey} is not recorded on the active run.`);
    }
  }

  return reasons;
}

type TddEvidencePatch = Pick<TddEvidenceArtifact, "red" | "green">;

async function writeTddEvidence(
  cwd: string,
  store: FileRunStore,
  run: RunState,
  artifactId: string,
  testCommand: string,
  patch: TddEvidencePatch
): Promise<RunState> {
  const previous = await readTddEvidence(cwd, run, artifactId);
  const now = new Date().toISOString();
  const evidence: TddEvidenceArtifact = {
    artifactId,
    testCommand,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    red: patch.red ?? previous?.red,
    green: patch.green ?? previous?.green
  };
  return new FlowRuntime({ repoRoot: cwd, store }).registerArtifact(run.id, {
    id: artifactId,
    fileName: "tdd-evidence.json",
    phaseId: run.current_phase,
    mediaType: "application/json",
    content: `${JSON.stringify(evidence, null, 2)}\n`
  });
}

async function readTddEvidence(
  cwd: string,
  run: RunState,
  artifactId: string
): Promise<TddEvidenceArtifact | undefined> {
  const artifact = run.artifact_registry[artifactId];
  if (!artifact) {
    return undefined;
  }
  try {
    return JSON.parse(await readFile(resolve(cwd, ".runs", run.id, artifact.path), "utf8")) as TddEvidenceArtifact;
  } catch {
    return undefined;
  }
}

async function runEvidenceCommand(
  command: string,
  cwd: string,
  relatedFiles: string[],
  isValidExitCode: (exitCode: number) => boolean
): Promise<NonNullable<TddEvidenceArtifact["red"]>> {
  const startedAt = new Date().toISOString();
  const execution = await runShellCommand(command, cwd);
  const completedAt = new Date().toISOString();
  return {
    startedAt,
    completedAt,
    exitCode: execution.exitCode,
    stdoutSnippet: snippet(execution.stdout),
    stderrSnippet: snippet(execution.stderr),
    relatedFiles,
    valid: isValidExitCode(execution.exitCode)
  };
}

const maxCommandOutput = 16_384;
const defaultEvidenceTimeoutMs = 30_000;

function runShellCommand(command: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timeoutMs = Number(process.env.SWARM_FLOW_COMMAND_TIMEOUT_MS ?? defaultEvidenceTimeoutMs);
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    function finish(exitCode: number, finalStderr = stderr): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr: finalStderr });
    }

    child.stdout?.on("data", (chunk) => {
      stdout = appendCommandOutput(stdout, String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendCommandOutput(stderr, String(chunk));
    });
    child.on("error", (error) => {
      finish(1, appendCommandOutput(stderr, error.message));
    });
    child.on("close", (code) => {
      if (timedOut) {
        finish(124, appendCommandOutput(stderr, `Command timed out after ${timeoutMs}ms: ${command}`));
        return;
      }
      finish(code ?? 1);
    });
  });
}

function appendCommandOutput(existing: string, chunk: string): string {
  const next = existing + chunk;
  if (next.length <= maxCommandOutput) {
    return next;
  }
  return next.slice(next.length - maxCommandOutput);
}

function relatedFiles(files?: string): string[] {
  return (files ?? "")
    .split(",")
    .map((file) => file.trim())
    .filter(Boolean);
}

function snippet(value: string): string {
  return value.slice(0, 4000);
}

async function loadRun(store: FileRunStore, runId?: string): Promise<RunState> {
  const run = runId ? await store.load(runId) : await store.latest();
  if (!run) {
    throw new Error("No runs found.");
  }
  return run;
}

function currentPhase(run: RunState): RunState["flow_snapshot"]["phases"][number] {
  const phase = run.flow_snapshot.phases.find((candidate) => candidate.id === run.current_phase);
  if (!phase) {
    throw new Error(`Current phase ${run.current_phase} not found in flow ${run.flow_id}`);
  }
  return phase;
}

function nextRunnablePhase(run: RunState, completedPhaseId: string): RunState["flow_snapshot"]["phases"][number] | undefined {
  const completed = new Set([...run.completed_phases, completedPhaseId]);
  return run.flow_snapshot.phases.find((candidate) => {
    if (completed.has(candidate.id)) {
      return false;
    }
    return candidate.dependencies.every((dependency) => completed.has(dependency));
  });
}

async function evaluatePhaseGate(cwd: string, run: RunState, phaseId: string, policyIdOrPath?: string) {
  const policy = await loadPolicy(cwd, policyIdOrPath);
  const decision = evaluatePhaseEntry({
    policy,
    phaseId,
    artifacts: new Set(Object.keys(run.artifact_registry)),
    approvals: new Set(Object.keys(run.approvals)),
    validationStatus: await readValidationStatus(cwd, run)
  });
  const phase = run.flow_snapshot.phases.find((candidate) => candidate.id === phaseId);
  if (phase?.approval_required && !run.approvals[phaseId]) {
    return {
      allowed: false,
      reasons: [...decision.reasons, `${phaseId} requires approval`]
    };
  }
  return decision;
}

async function loadPolicy(cwd: string, policyIdOrPath?: string): Promise<Policy> {
  const policyName = policyIdOrPath ?? (await configuredPolicy(cwd)) ?? "local-dev";
  const policyPath =
    policyName.endsWith(".yaml") || policyName.includes("/")
      ? resolve(cwd, policyName)
      : resolve(repoRootFromDist, "policies", `${policyName}.yaml`);
  const raw = await readFile(policyPath, "utf8");
  return parse(raw) as Policy;
}

async function configuredPolicy(cwd: string): Promise<string | undefined> {
  try {
    const raw = await readFile(resolve(cwd, "swarm-flow.config.json"), "utf8");
    const config = JSON.parse(raw) as { defaultPolicy?: unknown };
    return typeof config.defaultPolicy === "string" ? config.defaultPolicy : undefined;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function readValidationStatus(cwd: string, run: RunState): Promise<"passed" | "failed" | "unknown"> {
  const entry = run.artifact_registry.validation_status;
  if (!entry) {
    return "unknown";
  }
  const content = await readFile(resolve(cwd, ".runs", run.id, entry.path), "utf8");
  if (/\bfailed\b/i.test(content)) {
    return "failed";
  }
  if (/\bpassed\b/i.test(content)) {
    return "passed";
  }
  return "unknown";
}

function inferMediaType(fileName: string): "text/markdown" | "application/json" | string {
  return fileName.endsWith(".json") ? "application/json" : "text/markdown";
}

async function renderContextPack(run: RunState): Promise<string> {
  const phase = currentPhase(run);
  const skillMatches = await skillsForPhase(phase.id);
  const artifacts = Object.values(run.artifact_registry)
    .map((artifact) => `- \`${artifact.id}\` -> \`${artifact.path}\` (${artifact.produced_by_phase})`)
    .join("\n");
  const requiredOutputs = phase.required_outputs.map((output) => `- \`${output}\``).join("\n") || "- none";
  const conditions = phase.transition_conditions.map((condition) => `- ${condition}`).join("\n") || "- none";
  const skills = skillMatches.map((skill) => `- \`${skill.id}\` - ${skill.title}`).join("\n") || "- no direct phase skill found";

  return [
    "# swarm-flow Context Pack",
    "",
    `Run: \`${run.id}\``,
    `Flow: \`${run.flow_id}\``,
    `Goal: ${run.feature.goal}`,
    `Current phase: \`${phase.id}\``,
    "",
    "## Required outputs",
    "",
    requiredOutputs,
    "",
    "## Transition conditions",
    "",
    conditions,
    "",
    "## Matching skills",
    "",
    skills,
    "",
    "## Registered artifacts",
    "",
    artifacts || "- none",
    "",
    "## Open assumptions and risks",
    "",
    `Assumptions: ${run.unresolved_assumptions.length ? run.unresolved_assumptions.join("; ") : "none"}`,
    `Risks: ${run.unresolved_risks.length ? run.unresolved_risks.join("; ") : "none"}`,
    "",
    "## Safety reminders",
    "",
    "- Treat `run.json` and registered artifacts as source of truth.",
    "- Keep external writes in preview mode until a user explicitly selects and approves them.",
    "- Do not advance the phase until required artifacts are registered and policy gates pass.",
    ""
  ].join("\n");
}

async function skillsForPhase(phaseId: string): Promise<Array<{ id: string; title: string }>> {
  const files = await listNestedFiles(resolve(repoRootFromDist, "skills"), ".md");
  const matches: Array<{ id: string; title: string }> = [];
  for (const file of files) {
    const content = await readFile(resolve(repoRootFromDist, "skills", file), "utf8");
    const metadata = parseFrontmatter(content);
    if (metadata.phase === phaseId || file.startsWith(`${phaseId}/`)) {
      matches.push({
        id: String(metadata.id ?? file.replace(/\.md$/, "")),
        title: String(metadata.title ?? file.replace(/\.md$/, ""))
      });
    }
  }
  return matches.sort((a, b) => a.id.localeCompare(b.id));
}

async function lintSkillCards(skillsRoot: string): Promise<string[]> {
  const failures: string[] = [];
  for (const file of await listNestedFiles(skillsRoot, ".md")) {
    const content = await readFile(resolve(skillsRoot, file), "utf8");
    const metadata = parseFrontmatter(content);
    for (const field of ["id", "title", "phase", "inputs", "outputs"]) {
      if (!(field in metadata)) {
        failures.push(`${file}: missing frontmatter field ${field}`);
      }
    }
    const requiredSections = [
      ["Purpose", /# Purpose\b/i],
      ["When to use", /# When to use\b/i],
      ["When NOT to use", /# When NOT to use\b/i],
      ["Prerequisites", /# Prerequisites\b/i],
      ["Exact steps or Process", /# (Exact steps|Process)\b/i],
      ["Anti-rationalization checks", /# Anti-rationalization checks\b/i],
      ["Verification", /# Verification\b/i],
      ["Exit criteria", /# Exit criteria\b/i],
      ["Failure and escalation guidance", /# Failure and escalation guidance\b/i]
    ] as const;
    for (const [label, pattern] of requiredSections) {
      if (!pattern.test(content)) {
        failures.push(`${file}: missing section ${label}`);
      }
    }
  }
  return failures;
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }
  return parse(match[1] ?? "") as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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
}): Promise<RunState> {
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
  return run;
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
