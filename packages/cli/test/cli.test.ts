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

    expect(output.join("\n")).toContain("Feature Delivery");
    expect(output.join("\n")).toContain("Task Breakdown");
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
});
