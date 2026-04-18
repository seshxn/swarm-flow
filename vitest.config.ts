import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@swarm-flow/core": `${root}packages/core/src/index.ts`,
      "@swarm-flow/qa": `${root}packages/qa/src/index.ts`,
      "@swarm-flow/runtime": `${root}packages/runtime/src/index.ts`,
      "@swarm-flow/connectors": `${root}packages/connectors/src/index.ts`
    }
  }
});
