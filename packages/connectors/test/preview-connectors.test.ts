import { describe, expect, it } from "vitest";
import {
  createCiConnector,
  createConfluenceConnector,
  createFilesystemConnector,
  createGitConnector,
  createGitHubConnector,
  createJiraConnector
} from "../src/index.js";

describe("preview connectors", () => {
  it("keeps external connector writes in preview mode by default", async () => {
    const jira = createJiraConnector();

    const result = await jira.create({
      preview: true,
      idempotencyKey: "run-1:jira:CASE-1",
      payload: {
        title: "Bulk reassignment",
        body: "Create implementation tasks."
      }
    });

    expect(result.preview).toBe(true);
    expect(result.externalId).toBeUndefined();
    expect(result.writeLogEntry.connector).toBe("jira");
  });

  it("exposes the starter connector set", () => {
    const connectors = [
      createFilesystemConnector("/repo"),
      createGitConnector("/repo"),
      createGitHubConnector(),
      createJiraConnector(),
      createConfluenceConnector(),
      createCiConnector()
    ];

    expect(connectors.map((connector) => connector.id)).toEqual([
      "filesystem",
      "git",
      "github",
      "jira",
      "confluence",
      "ci"
    ]);
  });
});
