import { describe, expect, it } from "vitest";
import { normalizeQaConfig, redactQaConfig, toCrewAiModelConfig } from "../src/index.js";

describe("QA config", () => {
  it("merges defaults, file config, action inputs, env, and CLI flags", () => {
    const config = normalizeQaConfig({
      fileConfig: {
        qa: {
          backend: "playwright",
          target: {
            environment: "staging",
            baseUrl: "https://file.example.com"
          },
          ai: {
            provider: "openai",
            model: "gpt-4.1"
          }
        }
      },
      actionInputs: {
        targetUrl: "https://action.example.com",
        aiProvider: "bedrock",
        aiModel: "anthropic.claude-3-5-sonnet-20241022-v2:0"
      },
      env: {
        AWS_REGION: "us-east-1"
      },
      cliFlags: {
        mode: "execute"
      }
    });

    expect(config.target.baseUrl).toBe("https://action.example.com");
    expect(config.ai).toMatchObject({
      provider: "bedrock",
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      region: "us-east-1"
    });
    expect(config.mode).toBe("execute");
    expect(config.artifacts.directories).toEqual([
      "test-results",
      "playwright-report",
      ".runs/<run-id>/artifacts"
    ]);
  });

  it("merges artifact and accessibility overrides across config layers", () => {
    const config = normalizeQaConfig({
      fileConfig: {
        qa: {
          accessibility: {
            command: "npx playwright test accessibility"
          },
          artifacts: {
            directories: ["test-results", "playwright-report"]
          }
        }
      },
      actionInputs: {
        accessibilityCommand: "npm run qa:accessibility",
        artifactDirectories: "reports/one,reports/two"
      },
      cliFlags: {
        accessibilityCommand: "npx playwright test --grep accessibility",
        artifactDirectories: ["final-results"]
      }
    });

    expect(config.accessibility.command).toBe("npx playwright test --grep accessibility");
    expect(config.artifacts.directories).toEqual(["final-results"]);
  });

  it("maps Bedrock provider config to a CrewAI-compatible model string", () => {
    expect(
      toCrewAiModelConfig({
        provider: "bedrock",
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        region: "us-east-1"
      })
    ).toEqual({
      model: "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0",
      env: {
        AWS_REGION: "us-east-1"
      },
      redacted: {
        provider: "bedrock",
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        region: "us-east-1"
      }
    });
  });

  it("resolves Bedrock role and inference profile ARN from environment references", () => {
    const config = normalizeQaConfig({
      fileConfig: {
        qa: {
          ai: {
            provider: "bedrock",
            regionEnv: "AWS_REGION",
            bedrock: {
              auth: {
                mode: "oidc-role",
                roleToAssumeArnEnv: "AWS_BEDROCK_ROLE_ARN",
                externalIdEnv: "AWS_EXTERNAL_ID",
                sessionName: "swarm-flow-qa"
              },
              resource: {
                type: "inference-profile",
                arnEnv: "BEDROCK_INFERENCE_PROFILE_ARN"
              }
            }
          }
        }
      },
      env: {
        AWS_REGION: "us-east-1",
        AWS_BEDROCK_ROLE_ARN: "arn:aws:iam::123456789012:role/swarm-flow-bedrock",
        AWS_EXTERNAL_ID: "external-123",
        BEDROCK_INFERENCE_PROFILE_ARN:
          "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
      }
    });

    expect(config.ai).toMatchObject({
      provider: "bedrock",
      model: "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0",
      region: "us-east-1",
      bedrock: {
        auth: {
          mode: "oidc-role",
          roleToAssumeArn:
            "arn:aws:iam::123456789012:role/swarm-flow-bedrock",
          externalId: "external-123",
          sessionName: "swarm-flow-qa"
        },
        resource: {
          type: "inference-profile",
          arn: "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
        }
      }
    });

    expect(toCrewAiModelConfig(config.ai).model).toBe(
      "bedrock/arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
    );
  });

  it("accepts Bedrock role and inference profile ARN from action inputs", () => {
    const config = normalizeQaConfig({
      actionInputs: {
        aiProvider: "bedrock",
        awsRegion: "us-east-1",
        awsRoleToAssumeArn: "arn:aws:iam::123456789012:role/swarm-flow-bedrock",
        bedrockInferenceProfileArn:
          "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
      }
    });

    expect(config.ai).toMatchObject({
      provider: "bedrock",
      model: "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0",
      region: "us-east-1",
      bedrock: {
        auth: {
          mode: "oidc-role",
          roleToAssumeArn: "arn:aws:iam::123456789012:role/swarm-flow-bedrock"
        },
        resource: {
          type: "inference-profile",
          arn: "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
        }
      }
    });
  });

  it("redacts sensitive QA config values for artifacts", () => {
    const config = normalizeQaConfig({
      actionInputs: {
        aiProvider: "bedrock",
        awsExternalId: "external-123",
        passwordEnv: "STAGING_PASSWORD",
        bedrockInferenceProfileArn:
          "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-sonnet-4-v1:0"
      }
    });

    const redacted = redactQaConfig(config);

    expect(JSON.stringify(redacted)).not.toContain("external-123");
    expect(redacted.target.credentials?.passwordEnv).toBe("STAGING_PASSWORD");
    expect(redacted.ai.bedrock?.auth?.externalId).toBe("[redacted]");
  });
});
