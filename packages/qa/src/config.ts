import type {
  BedrockAuthConfig,
  BedrockResourceConfig,
  NormalizedAiProviderConfig
} from "./ai-provider.js";

export type NormalizedQaConfig = {
  backend: "playwright";
  mode: "suggest" | "execute" | "full";
  commentMode: "preview" | "summary";
  target: {
    environment: string;
    baseUrl?: string;
    loginUrl?: string;
    apiUrl?: string;
    previewUrl?: string;
    healthcheckUrl?: string;
    credentials?: {
      usernameEnv?: string;
      passwordEnv?: string;
      totpSecretEnv?: string;
    };
  };
  browser: {
    name: "chromium" | "firefox" | "webkit";
    headless: boolean;
    timeoutMs: number;
    retries: number;
    screenshot: "off" | "failures" | "always";
    trace: "off" | "retain-on-failure" | "on";
    video: "off" | "retain-on-failure" | "on";
  };
  test: {
    command: string;
    directory: string;
    generatedDirectory: string;
  };
  artifacts: {
    directories: string[];
  };
  accessibility: {
    command?: string;
  };
  ai: NormalizedAiProviderConfig;
};

type QaConfigOverride = Partial<Omit<NormalizedQaConfig, "target" | "ai">> & {
  target?: Partial<NormalizedQaConfig["target"]>;
  ai?: Partial<NormalizedAiProviderConfig>;
};

type QaFileConfig = {
  qa?: QaConfigOverride;
};

export type QaActionInputs = {
  targetUrl?: string;
  loginUrl?: string;
  apiUrl?: string;
  previewUrl?: string;
  healthcheckUrl?: string;
  environment?: string;
  aiProvider?: NormalizedAiProviderConfig["provider"];
  aiModel?: string;
  aiBaseUrl?: string;
  awsRegion?: string;
  awsProfile?: string;
  awsRoleToAssumeArn?: string;
  awsExternalId?: string;
  bedrockModelId?: string;
  bedrockInferenceProfileId?: string;
  bedrockInferenceProfileArn?: string;
  mode?: NormalizedQaConfig["mode"];
  commentMode?: NormalizedQaConfig["commentMode"];
  testCommand?: string;
  browser?: NormalizedQaConfig["browser"]["name"];
  headless?: boolean | string;
  timeoutMs?: number | string;
  retries?: number | string;
  screenshot?: NormalizedQaConfig["browser"]["screenshot"];
  trace?: NormalizedQaConfig["browser"]["trace"];
  video?: NormalizedQaConfig["browser"]["video"];
  accessibilityCommand?: string;
  artifactDirectories?: string | string[];
  usernameEnv?: string;
  passwordEnv?: string;
  totpSecretEnv?: string;
};

export type QaCliFlags = QaActionInputs;

export type NormalizeQaConfigInput = {
  fileConfig?: QaFileConfig;
  actionInputs?: QaActionInputs;
  env?: Record<string, string | undefined>;
  cliFlags?: QaCliFlags;
};

const defaults: NormalizedQaConfig = {
  backend: "playwright",
  mode: "suggest",
  commentMode: "preview",
  target: {
    environment: "staging"
  },
  browser: {
    name: "chromium",
    headless: true,
    timeoutMs: 30_000,
    retries: 2,
    screenshot: "failures",
    trace: "retain-on-failure",
    video: "off"
  },
  test: {
    command: "npx playwright test --reporter=json",
    directory: "tests",
    generatedDirectory: "tests/swarm-flow"
  },
  artifacts: {
    directories: ["test-results", "playwright-report", ".runs/<run-id>/artifacts"]
  },
  accessibility: {},
  ai: {
    provider: "openai",
    model: "gpt-5.4-mini"
  }
};

export function normalizeQaConfig(input: NormalizeQaConfigInput = {}): NormalizedQaConfig {
  const env = input.env ?? {};
  const config = mergeQaConfig(defaults, expandQaConfig(input.fileConfig?.qa, env));

  applyActionLikeInputs(config, input.actionInputs);
  resolveEnvReferences(config, env);
  applyActionLikeInputs(config, input.cliFlags);
  resolveEnvReferences(config, env);

  return config;
}

export function redactQaConfig(config: NormalizedQaConfig): NormalizedQaConfig {
  return {
    ...config,
    target: {
      ...config.target,
      credentials: config.target.credentials ? { ...config.target.credentials } : undefined
    },
    ai: {
      ...config.ai,
      bedrock: config.ai.bedrock
        ? {
            resource: config.ai.bedrock.resource ? { ...config.ai.bedrock.resource } : undefined,
            auth: config.ai.bedrock.auth
              ? {
                  ...config.ai.bedrock.auth,
                  externalId: config.ai.bedrock.auth.externalId ? "[redacted]" : undefined
                }
              : undefined
          }
        : undefined
    }
  };
}

function mergeQaConfig(base: NormalizedQaConfig, override?: QaConfigOverride): NormalizedQaConfig {
  if (!override) {
    return structuredClone(base);
  }

  const targetCredentials = {
    ...base.target.credentials,
    ...override.target?.credentials
  };

  return {
    ...base,
    ...override,
    target: {
      ...base.target,
      ...override.target,
      credentials: Object.keys(targetCredentials).length > 0 ? targetCredentials : undefined
    },
    browser: {
      ...base.browser,
      ...override.browser
    },
    test: {
      ...base.test,
      ...override.test
    },
    ai: {
      ...base.ai,
      ...override.ai,
      bedrock:
        base.ai.bedrock || override.ai?.bedrock
          ? {
              auth: mergeOptionalObject(base.ai.bedrock?.auth, override.ai?.bedrock?.auth),
              resource: mergeOptionalObject(base.ai.bedrock?.resource, override.ai?.bedrock?.resource)
            }
          : undefined
    }
  };
}

function expandQaConfig(
  config: QaConfigOverride | undefined,
  env: Record<string, string | undefined>
): QaConfigOverride | undefined {
  if (!config) {
    return undefined;
  }

  return {
    ...config,
    target: config.target ? expandTarget(config.target, env) : undefined,
    ai: config.ai ? expandAi(config.ai, env) : undefined
  };
}

function expandTarget(
  target: Partial<NormalizedQaConfig["target"]>,
  env: Record<string, string | undefined>
): Partial<NormalizedQaConfig["target"]> {
  return {
    ...target,
    baseUrl: expandEnvString(target.baseUrl, env),
    loginUrl: expandEnvString(target.loginUrl, env),
    apiUrl: expandEnvString(target.apiUrl, env),
    previewUrl: expandEnvString(target.previewUrl, env),
    healthcheckUrl: expandEnvString(target.healthcheckUrl, env)
  };
}

function expandAi(
  ai: Partial<NormalizedAiProviderConfig>,
  env: Record<string, string | undefined>
): Partial<NormalizedAiProviderConfig> {
  const auth = ai.bedrock?.auth ? resolveBedrockAuth(ai.bedrock.auth, env) : undefined;
  const resource = ai.bedrock?.resource ? resolveBedrockResource(ai.bedrock.resource, env) : undefined;
  const model = resource?.arn ?? resource?.id ?? ai.model;

  return {
    ...ai,
    model,
    bedrock:
      auth || resource
        ? {
            auth,
            resource
          }
        : ai.bedrock
  };
}

function applyActionLikeInputs(config: NormalizedQaConfig, inputs?: QaActionInputs): void {
  if (!inputs) {
    return;
  }

  config.mode = inputs.mode ?? config.mode;
  config.commentMode = inputs.commentMode ?? config.commentMode;
  config.target.environment = inputs.environment ?? config.target.environment;
  config.target.baseUrl = inputs.targetUrl ?? config.target.baseUrl;
  config.target.loginUrl = inputs.loginUrl ?? config.target.loginUrl;
  config.target.apiUrl = inputs.apiUrl ?? config.target.apiUrl;
  config.target.previewUrl = inputs.previewUrl ?? config.target.previewUrl;
  config.target.healthcheckUrl = inputs.healthcheckUrl ?? config.target.healthcheckUrl;

  if (inputs.usernameEnv || inputs.passwordEnv || inputs.totpSecretEnv) {
    config.target.credentials = {
      ...config.target.credentials,
      usernameEnv: inputs.usernameEnv ?? config.target.credentials?.usernameEnv,
      passwordEnv: inputs.passwordEnv ?? config.target.credentials?.passwordEnv,
      totpSecretEnv: inputs.totpSecretEnv ?? config.target.credentials?.totpSecretEnv
    };
  }

  config.ai.provider = inputs.aiProvider ?? config.ai.provider;
  config.ai.model = inputs.aiModel ?? config.ai.model;
  config.ai.baseUrl = inputs.aiBaseUrl ?? config.ai.baseUrl;
  config.ai.region = inputs.awsRegion ?? config.ai.region;
  config.ai.profile = inputs.awsProfile ?? config.ai.profile;
  applyBedrockInputs(config, inputs);

  config.test.command = inputs.testCommand ?? config.test.command;
  config.browser.name = inputs.browser ?? config.browser.name;
  config.browser.headless = toBoolean(inputs.headless, config.browser.headless);
  config.browser.timeoutMs = toNumber(inputs.timeoutMs, config.browser.timeoutMs);
  config.browser.retries = toNumber(inputs.retries, config.browser.retries);
  config.browser.screenshot = inputs.screenshot ?? config.browser.screenshot;
  config.browser.trace = inputs.trace ?? config.browser.trace;
  config.browser.video = inputs.video ?? config.browser.video;
  config.accessibility.command = inputs.accessibilityCommand ?? config.accessibility.command;
  config.artifacts.directories =
    normalizeArtifactDirectories(inputs.artifactDirectories) ?? config.artifacts.directories;
}

function applyBedrockInputs(config: NormalizedQaConfig, inputs: QaActionInputs): void {
  if (
    !inputs.awsRoleToAssumeArn &&
    !inputs.awsExternalId &&
    !inputs.bedrockModelId &&
    !inputs.bedrockInferenceProfileId &&
    !inputs.bedrockInferenceProfileArn
  ) {
    return;
  }

  const auth =
    inputs.awsRoleToAssumeArn || inputs.awsExternalId
      ? {
          ...config.ai.bedrock?.auth,
          mode: config.ai.bedrock?.auth?.mode ?? "oidc-role",
          roleToAssumeArn: inputs.awsRoleToAssumeArn ?? config.ai.bedrock?.auth?.roleToAssumeArn,
          externalId: inputs.awsExternalId ?? config.ai.bedrock?.auth?.externalId
        }
      : config.ai.bedrock?.auth;

  const resource = bedrockResourceFromInputs(inputs) ?? config.ai.bedrock?.resource;
  config.ai.bedrock = {
    auth,
    resource
  };

  if (resource?.arn || resource?.id) {
    config.ai.model = resource.arn ?? resource.id ?? config.ai.model;
  }
}

function bedrockResourceFromInputs(inputs: QaActionInputs): BedrockResourceConfig | undefined {
  if (inputs.bedrockInferenceProfileArn || inputs.bedrockInferenceProfileId) {
    return {
      type: "inference-profile",
      arn: inputs.bedrockInferenceProfileArn,
      id: inputs.bedrockInferenceProfileId
    };
  }
  if (inputs.bedrockModelId) {
    return {
      type: "model-id",
      id: inputs.bedrockModelId
    };
  }
  return undefined;
}

function resolveEnvReferences(config: NormalizedQaConfig, env: Record<string, string | undefined>): void {
  config.ai.region = config.ai.region ?? valueFromEnv(config.ai.regionEnv, env);
  config.ai.profile = config.ai.profile ?? valueFromEnv(config.ai.profileEnv, env);

  if (config.ai.provider === "bedrock") {
    config.ai.region = config.ai.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION;
    config.ai.profile = config.ai.profile ?? env.AWS_PROFILE;
  }
}

function resolveBedrockAuth(auth: BedrockAuthConfig, env: Record<string, string | undefined>): BedrockAuthConfig {
  return {
    ...auth,
    roleToAssumeArn: auth.roleToAssumeArn ?? valueFromEnv(auth.roleToAssumeArnEnv, env),
    profile: auth.profile ?? valueFromEnv(auth.profileEnv, env),
    externalId: auth.externalId ?? valueFromEnv(auth.externalIdEnv, env)
  };
}

function resolveBedrockResource(
  resource: BedrockResourceConfig,
  env: Record<string, string | undefined>
): BedrockResourceConfig {
  return {
    ...resource,
    id: resource.id ?? valueFromEnv(resource.idEnv, env),
    arn: resource.arn ?? valueFromEnv(resource.arnEnv, env)
  };
}

function expandEnvString(value: string | undefined, env: Record<string, string | undefined>): string | undefined {
  return value?.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name: string) => env[name] ?? "");
}

function valueFromEnv(name: string | undefined, env: Record<string, string | undefined>): string | undefined {
  return name ? env[name] : undefined;
}

function mergeOptionalObject<T extends object>(base: T | undefined, override: T | undefined): T | undefined {
  if (!base && !override) {
    return undefined;
  }
  return {
    ...base,
    ...override
  } as T;
}

function toBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return fallback;
}

function toNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }
  return fallback;
}

function normalizeArtifactDirectories(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const items = Array.isArray(value) ? value : value.split(/[,\n]/g);
  return items.map((item) => item.trim()).filter(Boolean);
}
