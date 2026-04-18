import { mkdtemp, readFile, rm } from "node:fs/promises";
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
      "--target-url",
      "https://preview.example.com",
      "--test-command",
      "node fake-test.mjs"
    ]);

    const runId = output.find((line) => line.startsWith("Started "))?.replace("Started ", "");
    expect(runId).toBeTruthy();
    const qaReport = await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "qa-report.md"), "utf8");
    const preview = JSON.parse(
      await readFile(join(workspace, ".runs", runId ?? "missing", "artifacts", "github-comments.preview.json"), "utf8")
    );
    expect(qaReport).toContain("Playwright QA Report");
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
});
