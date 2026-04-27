import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("repository metadata", () => {
  it("keeps workspace package versions aligned with the root package", () => {
    const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
    const packagePaths = [
      "packages/core/package.json",
      "packages/runtime/package.json",
      "packages/connectors/package.json",
      "packages/adapters/package.json",
      "packages/qa/package.json",
      "packages/sdk/package.json",
      "packages/cli/package.json"
    ];

    for (const packagePath of packagePaths) {
      const pkg = JSON.parse(readFileSync(join(root, packagePath), "utf8")) as {
        version: string;
        dependencies?: Record<string, string>;
      };
      expect(pkg.version, packagePath).toBe(rootPackage.version);
      for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
        if (name.startsWith("@swarm-flow/")) {
          expect(version, `${packagePath} -> ${name}`).toBe(rootPackage.version);
        }
      }
    }
  });

  it("publishes flow schema fields supported by the core flow model", () => {
    const schema = JSON.parse(readFileSync(join(root, "schemas/flow.schema.json"), "utf8")) as {
      $defs: { phase: { properties: Record<string, unknown> } };
    };

    expect(schema.$defs.phase.properties.optional_agents).toBeTruthy();
    expect(schema.$defs.phase.properties.optional_outputs).toBeTruthy();
  });
});
