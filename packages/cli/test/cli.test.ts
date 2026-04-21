import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProgram } from "../src/index.js";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
    workspace = undefined;
  }
});

describe("CLI", () => {
  it("initializes a local swarm-flow config", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "init"]);

    const config = await readFile(join(workspace, "swarm-flow.config.json"), "utf8");
    expect(config).toContain('"defaultFlow": "feature-default"');
    expect(output.join("\n")).toContain("Initialized swarm-flow.config.json");
  });

  it("initializes agent instructions for Claude and Codex", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "init", "--agent", "all"]);

    const agents = await readFile(join(workspace, "AGENTS.md"), "utf8");
    const claude = await readFile(join(workspace, "CLAUDE.md"), "utf8");
    expect(agents).toContain("When the user asks to build, fix, refactor, research, or remediate");
    expect(claude).toContain("swarm-flow");
    expect(output.join("\n")).toContain("Initialized agent instructions");
  });

  it("lists bundled flows", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: process.cwd(),
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "flows", "list"]);

    expect(output.join("\n")).toContain("feature-default");
    expect(output.join("\n")).toContain("incident-remediation");
    expect(output.join("\n")).toContain("epic-delivery");
    expect(output.join("\n")).toContain("review-only");
    expect(output.join("\n")).toContain("qa-only");
  });

  it("inspects bundled flows and skills", async () => {
    const output: string[] = [];
    const program = createProgram({
      cwd: process.cwd(),
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "flows", "inspect", "feature-default"]);
    await program.parseAsync(["node", "swarm-flow", "skills", "inspect", "planning/task-breakdown"]);
    await program.parseAsync(["node", "swarm-flow", "skills", "inspect", "planning/slice-planning"]);
    await program.parseAsync(["node", "swarm-flow", "skills", "inspect", "validation/review-swarm"]);
    await program.parseAsync(["node", "swarm-flow", "skills", "inspect", "validation/qa-swarm"]);

    expect(output.join("\n")).toContain("Feature Delivery");
    expect(output.join("\n")).toContain("Task Breakdown");
    expect(output.join("\n")).toContain("Slice Planning");
    expect(output.join("\n")).toContain("Review Swarm");
    expect(output.join("\n")).toContain("QA Swarm");
  });

  it("lists and shows agent integrations", async () => {
    const output: string[] = [];
    const program = createProgram({
      cwd: process.cwd(),
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "integrations", "list"]);
    await program.parseAsync(["node", "swarm-flow", "integrations", "show", "claude-code"]);
    await program.parseAsync(["node", "swarm-flow", "integrations", "show", "codex"]);

    expect(output.join("\n")).toContain("claude-code");
    expect(output.join("\n")).toContain("plugins/claude-code");
    expect(output.join("\n")).toContain("plugins/codex");
  });

  it("registers artifacts, blocks unapproved phase completion, then advances after approval", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const flowPath = join(workspace, "flow.yaml");
    const artifactPath = join(workspace, "feature-brief.md");
    await writeFile(
      flowPath,
      [
        "id: feature-default",
        "name: Feature Delivery",
        "phases:",
        "  - id: intake",
        "    description: Normalize",
        "    agents: [pm]",
        "    required_outputs: [feature_brief]",
        "  - id: planning",
        "    description: Plan",
        "    agents: [pm]",
        "    required_outputs: [acceptance_criteria]",
        "    dependencies: [intake]",
        "    approval_required: true"
      ].join("\n"),
      "utf8"
    );
    await writeFile(artifactPath, "# Feature Brief\n\nEvidence-backed intake.\n", "utf8");
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "start",
      "feature",
      "--title",
      "Bulk case reassignment",
      "--goal",
      "Reassign cases by region",
      "--flow",
      flowPath
    ]);
    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "") ?? "missing";
    await program.parseAsync(["node", "swarm-flow", "artifact", "add", "feature_brief", "feature-brief.md"]);

    await expect(program.parseAsync(["node", "swarm-flow", "complete", "intake"])).rejects.toThrow(
      "planning requires approval"
    );

    await program.parseAsync(["node", "swarm-flow", "approve", "planning"]);
    await program.parseAsync(["node", "swarm-flow", "complete", "intake"]);

    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId, "run.json"), "utf8"));
    expect(runState.completed_phases).toEqual(["intake"]);
    expect(runState.current_phase).toBe("planning");
    expect(runState.artifact_registry.feature_brief.path).toBe("artifacts/feature-brief.md");
    expect(output.join("\n")).toContain("Registered artifact feature_brief");
    expect(output.join("\n")).toContain("Completed intake; current phase: planning");
  });

  it("checks policy, packs current phase context, and lints bundled skills", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "start", "Plan a governed launch checklist"]);
    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "") ?? "missing";
    await program.parseAsync(["node", "swarm-flow", "policy", "check"]);
    await program.parseAsync(["node", "swarm-flow", "context", "pack"]);
    await program.parseAsync(["node", "swarm-flow", "skills", "lint"]);

    const context = await readFile(join(workspace, ".runs", runId, "context", "current-phase-context.md"), "utf8");
    expect(context).toContain("# swarm-flow Context Pack");
    expect(context).toContain("Current phase: `intake`");
    expect(context).toContain("Required outputs");
    expect(output.join("\n")).toContain("Policy check passed for intake");
    expect(output.join("\n")).toContain("Context pack written:");
    expect(output.join("\n")).toContain("Skill lint passed");
  });

  it("records red and green TDD evidence through CLI commands", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await writeFile(join(workspace, "red.mjs"), "process.exit(1);\n", "utf8");
    await writeFile(join(workspace, "green.mjs"), "process.exit(0);\n", "utf8");
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "start", "Add evidence-backed tests"]);
    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "") ?? "missing";
    await program.parseAsync([
      "node",
      "swarm-flow",
      "tdd",
      "red",
      "--artifact",
      "tests_added",
      "--command",
      "node red.mjs"
    ]);
    await program.parseAsync([
      "node",
      "swarm-flow",
      "tdd",
      "green",
      "--artifact",
      "tests_added",
      "--command",
      "node green.mjs"
    ]);
    await program.parseAsync(["node", "swarm-flow", "tdd", "status"]);

    const evidence = JSON.parse(
      await readFile(join(workspace, ".runs", runId, "artifacts", "tdd-evidence.json"), "utf8")
    );
    expect(evidence).toMatchObject({
      artifactId: "tests_added",
      testCommand: "node green.mjs",
      red: {
        exitCode: 1,
        valid: true
      },
      green: {
        exitCode: 0,
        valid: true
      }
    });
    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId, "run.json"), "utf8"));
    expect(runState.artifact_registry.tests_added.path).toBe("artifacts/tdd-evidence.json");
    expect(output.join("\n")).toContain("Recorded red TDD evidence for tests_added");
    expect(output.join("\n")).toContain("Recorded green TDD evidence for tests_added");
    expect(output.join("\n")).toContain("TDD evidence for tests_added: red valid, green valid");
  });

  it("rejects invalid TDD red and green command outcomes", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await writeFile(join(workspace, "pass.mjs"), "process.exit(0);\n", "utf8");
    await writeFile(join(workspace, "fail.mjs"), "process.exit(1);\n", "utf8");
    const program = createProgram({
      cwd: workspace,
      stdout: () => {},
      stderr: () => {}
    });

    await program.parseAsync(["node", "swarm-flow", "start", "Add evidence-backed tests"]);
    await expect(
      program.parseAsync([
        "node",
        "swarm-flow",
        "tdd",
        "red",
        "--artifact",
        "tests_added",
        "--command",
        "node pass.mjs"
      ])
    ).rejects.toThrow("red evidence command must fail");
    await expect(
      program.parseAsync([
        "node",
        "swarm-flow",
        "tdd",
        "green",
        "--artifact",
        "tests_added",
        "--command",
        "node fail.mjs"
      ])
    ).rejects.toThrow("green evidence command must pass");
  });

  it("records timed out TDD evidence with bounded stderr context", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await writeFile(join(workspace, "slow.mjs"), "setTimeout(() => process.exit(0), 1000);\n", "utf8");
    const previousTimeout = process.env.SWARM_FLOW_COMMAND_TIMEOUT_MS;
    process.env.SWARM_FLOW_COMMAND_TIMEOUT_MS = "25";
    const program = createProgram({
      cwd: workspace,
      stdout: () => {},
      stderr: () => {}
    });

    try {
      await program.parseAsync(["node", "swarm-flow", "start", "Add timeout evidence"]);
      await program.parseAsync([
        "node",
        "swarm-flow",
        "tdd",
        "red",
        "--artifact",
        "tests_added",
        "--command",
        "node slow.mjs"
      ]);

      const runId = (await import("node:fs/promises").then(({ readdir }) => readdir(join(workspace ?? "", ".runs"))))[0];
      const evidence = JSON.parse(
        await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "tdd-evidence.json"), "utf8")
      );
      expect(evidence.red.exitCode).toBe(124);
      expect(evidence.red.stderrSnippet).toContain("Command timed out after 25ms");
    } finally {
      if (previousTimeout === undefined) {
        delete process.env.SWARM_FLOW_COMMAND_TIMEOUT_MS;
      } else {
        process.env.SWARM_FLOW_COMMAND_TIMEOUT_MS = previousTimeout;
      }
    }
  });

  it("lists runs and shows run details", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const flowPath = join(workspace, "flow.yaml");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(
        flowPath,
        [
          "id: feature-default",
          "name: Feature Delivery",
          "phases:",
          "  - id: intake",
          "    description: Normalize",
          "    agents: [pm]",
          "    required_outputs: [feature_brief]"
        ].join("\n"),
        "utf8"
      )
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "start",
      "feature",
      "--title",
      "Bulk case reassignment",
      "--goal",
      "Reassign cases by region",
      "--flow",
      flowPath
    ]);
    const startedLine = output.find((line) => line.startsWith("Started "));
    const runId = startedLine?.replace("Started ", "");
    expect(runId).toBeTruthy();
    await program.parseAsync(["node", "swarm-flow", "runs", "list"]);
    await program.parseAsync(["node", "swarm-flow", "preview", "jira"]);
    await program.parseAsync(["node", "swarm-flow", "run", "show", runId ?? "missing"]);

    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId ?? "missing", "run.json"), "utf8"));
    expect(runState.connector_write_previews).toHaveLength(1);
    expect(runState.connector_write_previews[0].connector_id).toBe("jira");
    expect(output.join("\n")).toContain("run-");
    expect(output.join("\n")).toContain("Current phase: intake");
  });

  it("starts a feature run from a natural language request", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const flowPath = join(workspace, "feature-default.yaml");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(
        flowPath,
        [
          "id: feature-default",
          "name: Feature Delivery",
          "phases:",
          "  - id: intake",
          "    description: Normalize",
          "    agents: [pm]",
          "    required_outputs: [feature_brief]"
        ].join("\n"),
        "utf8"
      )
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "start",
      "Allow admins to bulk reassign cases by region, with audit history and role checks.",
      "--flow",
      flowPath
    ]);

    const startedLine = output.find((line) => line.startsWith("Started "));
    const runId = startedLine?.replace("Started ", "");
    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId ?? "missing", "run.json"), "utf8"));
    expect(runState.feature.title).toBe("Allow admins to bulk reassign cases by region");
    expect(runState.feature.goal).toBe("Allow admins to bulk reassign cases by region, with audit history and role checks.");
  });

  it("infers a bundled flow for plain-language bugfix requests", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "start",
      "Fix failed webhook retries without duplicating deliveries"
    ]);

    const startedLine = output.find((line) => line.startsWith("Started "));
    const runId = startedLine?.replace("Started ", "");
    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId ?? "missing", "run.json"), "utf8"));
    expect(runState.flow_id).toBe("bugfix-fastlane");
    expect(runState.current_phase).toBe("intake");
    expect(runState.artifact_registry.bug_brief.path).toBe("artifacts/bug-brief.md");
    expect(runState.artifact_registry.feature_brief).toBeUndefined();
  });

  it("starts explicit epic, review, and qa runs with target metadata", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "epic", "JIRA-123"]);
    await program.parseAsync(["node", "swarm-flow", "review", "https://github.com/org/repo/pull/123"]);
    await program.parseAsync(["node", "swarm-flow", "qa", "https://preview.example.com"]);

    const runIds = output.filter((line) => line.startsWith("Started ")).map((line) => line.replace("Started ", ""));
    expect(runIds).toHaveLength(3);

    const [epicRun, reviewRun, qaRun] = await Promise.all(
      runIds.map(async (runId) => JSON.parse(await readFile(join(workspace ?? "", ".runs", runId, "run.json"), "utf8")))
    );
    expect(epicRun.flow_id).toBe("epic-delivery");
    expect(epicRun.scope).toBe("epic");
    expect(epicRun.target).toEqual({ type: "jira", value: "JIRA-123" });
    expect(reviewRun.flow_id).toBe("review-only");
    expect(reviewRun.scope).toBe("review");
    expect(reviewRun.target).toEqual({ type: "github_pr", value: "https://github.com/org/repo/pull/123" });
    expect(qaRun.flow_id).toBe("qa-only");
    expect(qaRun.scope).toBe("qa");
    expect(qaRun.target).toEqual({ type: "url", value: "https://preview.example.com" });
  });

  it("runs the Playwright QA backend and writes governed QA artifacts", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await import("node:fs/promises").then(({ writeFile }) =>
      Promise.all([
        writeFile(
          join(workspace ?? "", "fake-test.mjs"),
          [
            "import { mkdirSync, writeFileSync } from 'node:fs';",
            "mkdirSync('playwright-report', { recursive: true });",
            "writeFileSync('playwright-report/index.html', '<html>report</html>');",
            "mkdirSync('test-results/spec', { recursive: true });",
            "writeFileSync('test-results/spec/trace.zip', 'trace');",
            "writeFileSync('test-results/spec/screenshot.png', 'screenshot');",
            "writeFileSync('test-results/spec/video.webm', 'video');",
            "process.exit(0);"
          ].join("\n"),
          "utf8"
        ),
        writeFile(join(workspace ?? "", "a11y.mjs"), "console.log('a11y ok');\nprocess.exit(0);\n", "utf8")
      ])
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "qa",
      "https://github.com/org/repo/pull/123",
      "--backend",
      "playwright",
      "--target-url",
      "https://preview.example.com",
      "--test-command",
      "node fake-test.mjs",
      "--accessibility-command",
      "node a11y.mjs"
    ]);

    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();
    const qaReport = await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "qa-report.md"), "utf8");
    const preview = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "github-comments.preview.json"), "utf8")
    );
    const browserArtifacts = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "browser-artifacts.json"), "utf8")
    );
    const accessibilityReport = await readFile(
      join(workspace, ".runs", runId ?? "missing", "artifacts", "accessibility-report.md"),
      "utf8"
    );
    expect(qaReport).toContain("Playwright QA Report");
    expect(qaReport).toContain("Browser artifacts");
    expect(browserArtifacts.artifacts.trace[0]).toContain("trace.zip");
    expect(browserArtifacts.artifacts.screenshot[0]).toContain("screenshot.png");
    expect(browserArtifacts.artifacts.video[0]).toContain("video.webm");
    expect(browserArtifacts.artifacts.html[0]).toContain("playwright-report/index.html");
    expect(accessibilityReport).toContain("Result: passed");
    expect(preview.mode).toBe("preview");
    expect(output.join("\n")).toContain("QA backend passed");
  });

  it("loads QA backend settings from a YAML config file", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await import("node:fs/promises").then(({ writeFile }) =>
      Promise.all([
        writeFile(join(workspace ?? "", "fake-test.mjs"), "process.exit(0);\n", "utf8"),
        writeFile(
          join(workspace ?? "", "swarm-flow.qa.yaml"),
          [
            "schema: v1",
            "qa:",
            "  target:",
            "    baseUrl: https://config-preview.example.com",
            "  test:",
            "    command: node fake-test.mjs",
            "  ai:",
            "    provider: bedrock",
            "    regionEnv: AWS_REGION",
            "    bedrock:",
            "      resource:",
            "        type: inference-profile",
            "        arnEnv: BEDROCK_INFERENCE_PROFILE_ARN"
          ].join("\n"),
          "utf8"
        )
      ])
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "qa",
      "https://github.com/org/repo/pull/123",
      "--backend",
      "playwright",
      "--config-file",
      "swarm-flow.qa.yaml"
    ]);

    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();
    const qaContext = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "qa-context.json"), "utf8")
    );
    expect(qaContext.targetUrl).toBe("https://config-preview.example.com");
    expect(qaContext.config.target.baseUrl).toBe("https://config-preview.example.com");
    expect(qaContext.config.ai.provider).toBe("bedrock");
    expect(output.join("\n")).toContain("QA backend passed");
  });

  it("keeps QA backend comments in preview mode without recording a posting selection", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(join(workspace ?? "", "fake-test.mjs"), "process.exit(0);\n", "utf8")
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "qa",
      "https://github.com/org/repo/pull/123",
      "--backend",
      "playwright",
      "--comment-mode",
      "preview",
      "--test-command",
      "node fake-test.mjs"
    ]);

    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();
    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId ?? "missing", "run.json"), "utf8"));
    const preview = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "github-comments.preview.json"), "utf8")
    );
    expect(preview.mode).toBe("preview");
    expect(runState.external_posting_selections).toEqual([]);
  });

  it("routes start review and start qa to standalone swarm flows", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "start", "review", "--target", "https://github.com/org/repo/pull/456"]);
    await program.parseAsync(["node", "swarm-flow", "start", "qa", "--target", "https://preview.example.com"]);

    const runIds = output.filter((line) => line.startsWith("Started ")).map((line) => line.replace("Started ", ""));
    expect(runIds).toHaveLength(2);

    const [reviewRun, qaRun] = await Promise.all(
      runIds.map(async (runId) => JSON.parse(await readFile(join(workspace ?? "", ".runs", runId, "run.json"), "utf8")))
    );
    expect(reviewRun.flow_id).toBe("review-only");
    expect(reviewRun.scope).toBe("review");
    expect(reviewRun.target).toEqual({ type: "github_pr", value: "https://github.com/org/repo/pull/456" });
    expect(qaRun.flow_id).toBe("qa-only");
    expect(qaRun.scope).toBe("qa");
    expect(qaRun.target).toEqual({ type: "url", value: "https://preview.example.com" });
  });

  it("previews external comments for a standalone review run", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "review", "https://github.com/org/repo/pull/123"]);
    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();

    await program.parseAsync(["node", "swarm-flow", "comments", "preview", "--run", runId ?? "missing"]);

    const preview = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "outputs", "previews", "github-comments.preview.json"), "utf8")
    );
    expect(preview.mode).toBe("preview");
    expect(preview.target).toBe("https://github.com/org/repo/pull/123");
    expect(preview.comments[0]).toMatchObject({
      id: "comment-1",
      connector_id: "github",
      recommended: true
    });
  });

  it("records selected external comments without posting them", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync(["node", "swarm-flow", "review", "https://github.com/org/repo/pull/123"]);
    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();
    await program.parseAsync(["node", "swarm-flow", "comments", "preview", "--run", runId ?? "missing"]);
    await program.parseAsync([
      "node",
      "swarm-flow",
      "comments",
      "select",
      "--run",
      runId ?? "missing",
      "--ids",
      "comment-1"
    ]);

    const runState = JSON.parse(await readFile(join(workspace, ".runs", runId ?? "missing", "run.json"), "utf8"));
    expect(runState.external_posting_selections).toEqual([
      {
        target: "https://github.com/org/repo/pull/123",
        selection_mode: "selected",
        selected_comment_ids: ["comment-1"],
        skipped_comment_ids: [],
        posted: []
      }
    ]);
    expect(output.join("\n")).toContain("Comment selection recorded");
  });

  it("refuses to apply preview payloads as live connector writes", async () => {
    workspace = await mkdtemp(join(tmpdir(), "swarm-flow-cli-"));
    const flowPath = join(workspace, "flow.yaml");
    await writeFile(
      flowPath,
      [
        "id: feature-default",
        "name: Feature Delivery",
        "phases:",
        "  - id: intake",
        "    description: Normalize",
        "    agents: [pm]",
        "    required_outputs: [feature_brief]"
      ].join("\n"),
      "utf8"
    );
    const previewPath = join(workspace, "filesystem.preview.json");
    await writeFile(
      previewPath,
      JSON.stringify(
        {
          runId: "run-placeholder",
          target: "filesystem",
          mode: "preview",
          operation: "create",
          payload: {
            path: "should-not-exist.txt",
            content: "live write bypass"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    const output: string[] = [];
    const program = createProgram({
      cwd: workspace,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });

    await program.parseAsync([
      "node",
      "swarm-flow",
      "start",
      "feature",
      "--title",
      "Preview safety",
      "--goal",
      "Keep writes preview-only",
      "--flow",
      flowPath
    ]);

    await expect(program.parseAsync(["node", "swarm-flow", "apply", "filesystem", "filesystem.preview.json"])).rejects.toThrow(
      "Live connector apply is not supported"
    );
    await expect(readFile(join(workspace, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });
});
