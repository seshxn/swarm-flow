import { describe, expect, it } from "vitest";
import {
  createCiConnector,
  createConfluenceConnector,
  createFilesystemConnector,
  createGitConnector,
  createGitHubConnector,
  createJiraConnector,
  createSlackConnector,
  discoverConnectorCapabilities
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
      createSlackConnector(),
      createCiConnector()
    ];

    expect(connectors.map((connector) => connector.id)).toEqual([
      "filesystem",
      "git",
      "github",
      "jira",
      "confluence",
      "slack",
      "ci"
    ]);
  });

  it("exposes slack as a preview-safe connector", async () => {
    const slack = createSlackConnector();
    const result = await slack.update({
      preview: true,
      idempotencyKey: "run-1:slack:summary",
      payload: {
        channel: "#delivery",
        body: "Review completed."
      }
    });

    expect(slack.id).toBe("slack");
    expect(result.preview).toBe(true);
    expect(result.writeLogEntry.connector).toBe("slack");
  });

  it("discovers preview backend capabilities for external connectors", () => {
    const capabilities = discoverConnectorCapabilities();

    expect(capabilities.connectors.github).toContain("preview");
    expect(capabilities.connectors.jira).toContain("preview");
    expect(capabilities.connectors.slack).toContain("preview");
  });
});
