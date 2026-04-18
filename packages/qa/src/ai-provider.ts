export type AiProvider =
  | "openai"
  | "azure_openai"
  | "anthropic"
  | "bedrock"
  | "google"
  | "ollama"
  | "openai_compatible";

export type BedrockAuthMode = "oidc-role" | "local-profile" | "static-env" | "existing-env";

export type BedrockResourceType = "model-id" | "inference-profile" | "prompt" | "provisioned-model" | "custom-model";

export type BedrockAuthConfig = {
  mode: BedrockAuthMode;
  roleToAssumeArnEnv?: string;
  roleToAssumeArn?: string;
  profileEnv?: string;
  profile?: string;
  externalIdEnv?: string;
  externalId?: string;
  sessionName?: string;
};

export type BedrockResourceConfig = {
  type: BedrockResourceType;
  idEnv?: string;
  id?: string;
  arnEnv?: string;
  arn?: string;
};

export type NormalizedAiProviderConfig = {
  provider: AiProvider;
  model: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  regionEnv?: string;
  region?: string;
  profileEnv?: string;
  profile?: string;
  temperature?: number;
  maxTokens?: number;
  bedrock?: {
    auth?: BedrockAuthConfig;
    resource?: BedrockResourceConfig;
  };
};

export type CrewAiModelConfig = {
  model: string;
  env: Record<string, string>;
  redacted: Record<string, unknown>;
};

export function toCrewAiModelConfig(config: NormalizedAiProviderConfig): CrewAiModelConfig {
  const model = withProviderPrefix(config.provider, config.model);
  const env: Record<string, string> = {};

  if (config.region) {
    env.AWS_REGION = config.region;
  }
  if (config.profile) {
    env.AWS_PROFILE = config.profile;
  }
  if (config.baseUrl && config.provider === "openai_compatible") {
    env.OPENAI_API_BASE = config.baseUrl;
  }

  return {
    model,
    env,
    redacted: {
      provider: config.provider,
      model: config.model,
      ...(config.region ? { region: config.region } : {}),
      ...(config.profile ? { profile: config.profile } : {}),
      ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
      ...(config.apiKeyEnv ? { apiKeyEnv: config.apiKeyEnv } : {}),
      ...(config.bedrock?.resource
        ? {
            bedrock: {
              resource: config.bedrock.resource,
              auth: config.bedrock.auth
                ? {
                    mode: config.bedrock.auth.mode,
                    roleToAssumeArnEnv: config.bedrock.auth.roleToAssumeArnEnv,
                    profileEnv: config.bedrock.auth.profileEnv,
                    externalIdEnv: config.bedrock.auth.externalIdEnv,
                    sessionName: config.bedrock.auth.sessionName
                  }
                : undefined
            }
          }
        : {})
    }
  };
}

function withProviderPrefix(provider: AiProvider, model: string): string {
  if (/^(openai|azure|anthropic|bedrock|gemini|ollama)\//.test(model)) {
    return model;
  }

  switch (provider) {
    case "openai":
      return `openai/${model}`;
    case "azure_openai":
      return `azure/${model}`;
    case "anthropic":
      return `anthropic/${model}`;
    case "bedrock":
      return `bedrock/${model}`;
    case "google":
      return `gemini/${model}`;
    case "ollama":
      return `ollama/${model}`;
    case "openai_compatible":
      return `openai/${model}`;
  }
}
