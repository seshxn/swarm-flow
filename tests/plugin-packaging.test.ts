import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("agent integration plugins", () => {
  it("ships root-level Claude Code marketplace metadata for public installation", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8")
    ) as {
      name: string;
      commands: string;
    };
    const marketplace = JSON.parse(
      readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8")
    ) as {
      plugins: Array<{ name: string; source: unknown }>;
    };

    expect(manifest.name).toBe("swarm-flow");
    expect(manifest.commands).toBe("./plugins/claude-code/.claude/commands");
    expect(JSON.stringify(manifest)).toContain("github.com/seshxn/swarm-flow");
    expect(marketplace.plugins).toContainEqual(
      expect.objectContaining({
        name: "swarm-flow",
        source: { source: "github", repo: "seshxn/swarm-flow" }
      })
    );
  });

  it("ships a Claude Code plugin manifest with command entrypoints", () => {
    const manifestPath = join(root, "plugins/claude-code/.claude-plugin/plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      commands: string;
      description: string;
    };

    expect(manifest.name).toBe("swarm-flow");
    expect(manifest.description).toContain("artifact-driven");
    expect(manifest.commands).toBe("./.claude/commands");
    expect(existsSync(join(root, "plugins/claude-code/.claude/commands/swarm.md"))).toBe(true);
    expect(existsSync(join(root, "plugins/claude-code/.claude/commands/swarm-start.md"))).toBe(true);
    expect(existsSync(join(root, "plugins/claude-code/.claude/commands/swarm-resume.md"))).toBe(true);
    expect(existsSync(join(root, "plugins/claude-code/.claude/commands/swarm-preview.md"))).toBe(true);
  });

  it("ships a Codex plugin manifest and marketplace entry", () => {
    const rootManifest = JSON.parse(
      readFileSync(join(root, ".codex-plugin/plugin.json"), "utf8")
    ) as {
      name: string;
      skills: string;
    };
    const manifestPath = join(root, "plugins/codex/.codex-plugin/plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      skills: string;
      interface: { displayName: string };
    };
    const marketplace = JSON.parse(
      readFileSync(join(root, ".agents/plugins/marketplace.json"), "utf8")
    ) as {
      plugins: Array<{ name: string; source: { path: string } }>;
    };

    expect(rootManifest.name).toBe("swarm-flow");
    expect(rootManifest.skills).toBe("./plugins/codex/skills/");
    expect(JSON.stringify(rootManifest)).toContain("github.com/seshxn/swarm-flow");
    expect(manifest.name).toBe("swarm-flow");
    expect(manifest.skills).toBe("./skills/");
    expect(manifest.interface.displayName).toBe("swarm-flow");
    const skillPath = join(root, "plugins/codex/skills/swarm-flow/SKILL.md");
    expect(existsSync(skillPath)).toBe(true);
    expect(readFileSync(skillPath, "utf8")).toContain('swarm-flow start "<user request>"');
    for (const skill of [
      "swarm-flow-phase",
      "swarm-flow-implementation",
      "swarm-flow-validation",
      "swarm-flow-preview-writes",
      "swarm-flow-repair-loop"
    ]) {
      const phaseSkillPath = join(root, "plugins/codex/skills", skill, "SKILL.md");
      expect(existsSync(phaseSkillPath)).toBe(true);
      expect(readFileSync(phaseSkillPath, "utf8")).toContain("swarm-flow");
    }
    expect(marketplace.plugins).toContainEqual(
      expect.objectContaining({
        name: "swarm-flow",
        source: { source: "local", path: "./plugins/codex" }
      })
    );
  });
});
