import { isAbsolute, relative, resolve } from "node:path";

export type ConnectorReadRequest = {
  id: string;
};

export type ConnectorSearchRequest = {
  query: string;
  limit?: number;
};

export type ConnectorWriteRequest<TPayload = unknown> = {
  payload: TPayload;
  preview: boolean;
  idempotencyKey: string;
};

export type ConnectorWriteResult = {
  preview: boolean;
  idempotencyKey: string;
  externalId?: string;
  rollbackMetadata?: unknown;
  writeLogEntry: {
    connector: string;
    operation: "create" | "update";
    at: string;
  };
};

export type Connector<TRead = unknown, TSearch = unknown, TCreate = unknown, TUpdate = unknown> = {
  id: string;
  read(request: ConnectorReadRequest): Promise<TRead>;
  search(request: ConnectorSearchRequest): Promise<TSearch[]>;
  create(request: ConnectorWriteRequest<TCreate>): Promise<ConnectorWriteResult>;
  update(request: ConnectorWriteRequest<TUpdate>): Promise<ConnectorWriteResult>;
  previewWrite(request: ConnectorWriteRequest<TCreate | TUpdate>): Promise<ConnectorWriteResult>;
  validatePermissions(): Promise<{ ok: boolean; reasons: string[] }>;
};

export type ConnectorBackendKind =
  | "preview"
  | "atlassian_mcp"
  | "github_plugin"
  | "github_mcp"
  | "gh_cli"
  | "slack_mcp"
  | "github_actions";

export type ConnectorCapabilityRegistry = {
  connectors: Record<string, ConnectorBackendKind[]>;
};

export type PreviewConnectorOptions = {
  id: string;
  readableName: string;
  repoRoot?: string;
};

export function previewOnlyWriteResult(
  connector: string,
  operation: "create" | "update",
  idempotencyKey: string
): ConnectorWriteResult {
  return {
    preview: true,
    idempotencyKey,
    writeLogEntry: {
      connector,
      operation,
      at: new Date().toISOString()
    }
  };
}

export function createFilesystemConnector(repoRoot: string): Connector {
  return {
    id: "filesystem",
    async read(request) {
      const fs = await import("node:fs/promises");
      try {
        const content = await fs.readFile(resolveWithinRepo(repoRoot, request.id), "utf8");
        return { content };
      } catch {
        return { content: "" };
      }
    },
    async search(request) {
      return [{ connector: "filesystem", query: request.query, mode: "preview" }];
    },
    async create(request) {
      enforcePreview("filesystem", request.preview);
      return previewOnlyWriteResult("filesystem", "create", request.idempotencyKey);
    },
    async update(request) {
      enforcePreview("filesystem", request.preview);
      return previewOnlyWriteResult("filesystem", "update", request.idempotencyKey);
    },
    async previewWrite(request) {
      return previewOnlyWriteResult("filesystem", "update", request.idempotencyKey);
    },
    async validatePermissions() {
      return { ok: true, reasons: [] };
    }
  };
}

export function createGitConnector(repoRoot: string): Connector {
  const runGit = async (args: string[]) => {
    const { execFile } = await import("node:child_process");
    const util = await import("node:util");
    const execFileAsync = util.promisify(execFile);
    const { stdout } = await execFileAsync("git", args, { cwd: repoRoot });
    return String(stdout).trim();
  };

  return {
    id: "git",
    async read(request) {
      try {
        const content = await runGit(["show", request.id]);
        return { content };
      } catch {
        return { content: "" };
      }
    },
    async search(request) {
      return [{ connector: "git", query: request.query, mode: "preview" }];
    },
    async create(request) {
      enforcePreview("git", request.preview);
      return previewOnlyWriteResult("git", "create", request.idempotencyKey);
    },
    async update(request) {
      enforcePreview("git", request.preview);
      return previewOnlyWriteResult("git", "update", request.idempotencyKey);
    },
    async previewWrite(request) {
      return previewOnlyWriteResult("git", "update", request.idempotencyKey);
    },
    async validatePermissions() {
      return { ok: true, reasons: [] };
    }
  };
}

export function createGitHubConnector(): Connector {
  return createPreviewConnector({
    id: "github",
    readableName: "GitHub"
  });
}

export function createJiraConnector(): Connector {
  return createPreviewConnector({
    id: "jira",
    readableName: "Jira"
  });
}

export function createConfluenceConnector(): Connector {
  return createPreviewConnector({
    id: "confluence",
    readableName: "Confluence"
  });
}

export function createSlackConnector(): Connector {
  return createPreviewConnector({
    id: "slack",
    readableName: "Slack"
  });
}

export function createCiConnector(): Connector {
  return createPreviewConnector({
    id: "ci",
    readableName: "CI"
  });
}

export function discoverConnectorCapabilities(): ConnectorCapabilityRegistry {
  return {
    connectors: {
      filesystem: ["preview"],
      git: ["preview"],
      github: ["github_plugin", "gh_cli", "preview"],
      jira: ["atlassian_mcp", "preview"],
      confluence: ["atlassian_mcp", "preview"],
      slack: ["slack_mcp", "preview"],
      ci: ["github_actions", "preview"]
    }
  };
}

function createPreviewConnector(options: PreviewConnectorOptions): Connector {
  return {
    id: options.id,
    async read(request) {
      return {
        connector: options.id,
        id: request.id,
        repoRoot: options.repoRoot,
        mode: "preview"
      };
    },
    async search(request) {
      return [
        {
          connector: options.id,
          query: request.query,
          title: `${options.readableName} preview result`,
          mode: "preview"
        }
      ];
    },
    async create(request) {
      enforcePreview(options.id, request.preview);
      return previewOnlyWriteResult(options.id, "create", request.idempotencyKey);
    },
    async update(request) {
      enforcePreview(options.id, request.preview);
      return previewOnlyWriteResult(options.id, "update", request.idempotencyKey);
    },
    async previewWrite(request) {
      return previewOnlyWriteResult(options.id, "update", request.idempotencyKey);
    },
    async validatePermissions() {
      return {
        ok: true,
        reasons: []
      };
    }
  };
}

function enforcePreview(connector: string, preview: boolean): void {
  if (!preview) {
    throw new Error(`${connector} connector only supports preview writes in v0.1`);
  }
}

function resolveWithinRepo(repoRoot: string, requestedPath: string): string {
  if (requestedPath.includes("\0")) {
    throw new Error("filesystem path contains a null byte");
  }

  const root = resolve(repoRoot);
  const target = resolve(root, requestedPath);
  const relativePath = relative(root, target);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("filesystem path escapes repository root");
  }
  return target;
}
