import { exec } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse } from "yaml";
import { hookDefinitionSchema, type HookDefinition, type HookExecution, type RunState } from "@swarm-flow/core";
import { FileRunStore } from "./index.js";

const execAsync = promisify(exec);
const bundledHooksDir = fileURLToPath(new URL("../../../hooks", import.meta.url));

export type HookRunnerOptions = {
  repoRoot: string;
  store: FileRunStore;
};

export class HookRunner {
  constructor(private readonly options: HookRunnerOptions) {}

  async executeHooks(runId: string, trigger: string, hookIds: string[], phaseId?: string): Promise<HookExecution[]> {
    if (!hookIds || hookIds.length === 0) return [];

    const results: HookExecution[] = [];
    for (const hookId of hookIds) {
      const result = await this.runHook(runId, trigger, hookId, phaseId);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  private async runHook(runId: string, trigger: string, hookId: string, phaseId?: string): Promise<HookExecution | undefined> {
    const run = await this.options.store.load(runId);
    
    // Find hook file
    const hookDef = await this.loadHookDefinition(hookId);
    if (!hookDef) {
       const missing: HookExecution = {
         id: hookId,
         trigger,
         phase: phaseId,
         status: "failed",
         error: "Hook definition not found",
         started_at: new Date().toISOString(),
         completed_at: new Date().toISOString()
       };
       run.hook_executions.push(missing);
       await this.options.store.save(run);
       return missing;
    }

    // Check conditions
    const conditionsMet = this.evaluateConditions(hookDef.conditions, run);
    if (!conditionsMet) {
       // Skipping, not met
       return undefined;
    }

    // Record start
    const started: HookExecution = {
      id: hookId,
      trigger,
      phase: phaseId,
      status: "running",
      started_at: new Date().toISOString()
    };
    run.hook_executions.push(started);
    await this.options.store.save(run);

    let success = true;
    let errorMessage: string | undefined;

    try {
      for (const action of hookDef.actions) {
        if (action.startsWith("command:")) {
           const cmd = resolveCommandAction(action.slice(8));
           await execAsync(cmd, { cwd: this.options.repoRoot });
        } else if (action.startsWith("connector:")) {
           // Provide basic log trace for connectors if they aren't fully wired yet
           console.log(`[swarm-flow] executing hook connector action: ${action.slice(10)} (stub)`);
        } else if (action.startsWith("log:")) {
           console.log(`[swarm-flow] ${trigger} hook for phase ${phaseId ?? "start"}: ${hookDef.description}`);
        }
      }
    } catch (err) {
      success = false;
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // Record complete
    const finalRun = await this.options.store.load(runId);
    const existing = finalRun.hook_executions
      .slice()
      .reverse()
      .find((h) => h.id === hookId && h.phase === phaseId && h.trigger === trigger && h.status === "running");
    const completedAt = new Date().toISOString();
    let completed: HookExecution;
    
    if (existing) {
       existing.status = success ? "completed" : "failed";
       existing.completed_at = completedAt;
       if (!success) existing.error = errorMessage;
       completed = existing;
    } else {
       completed = {
         id: hookId,
         trigger,
         phase: phaseId,
         status: success ? "completed" : "failed",
         error: errorMessage,
         started_at: completedAt,
         completed_at: completedAt
       };
       finalRun.hook_executions.push(completed);
    }

    await this.options.store.save(finalRun);
    return completed;
  }

  private async loadHookDefinition(hookId: string): Promise<HookDefinition | null> {
    const directories = [
      "before-phase",
      "after-phase",
      "before-run",
      "after-run",
      "validation-failure",
      "pr-events",
      "ci-events"
    ];
    const wanted = hookLookupKeys(hookId);
    const hookRoots = [...new Set([join(this.options.repoRoot, "hooks"), bundledHooksDir])];

    for (const hooksDir of hookRoots) {
      for (const dir of directories) {
        try {
          const entries = await readdir(join(hooksDir, dir), { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
              continue;
            }

            const path = join(hooksDir, dir, entry.name);
            const content = await readFile(path, "utf8");
            const parsed = parse(content);
            const validation = hookDefinitionSchema.safeParse(parsed);
            if (!validation.success) {
              continue;
            }

            const fileKey = normalizeHookKey(entry.name.replace(/\.yaml$/, ""));
            const idKey = normalizeHookKey(validation.data.id);
            if (wanted.has(fileKey) || wanted.has(idKey)) {
              return validation.data;
            }
          }
        } catch {
          // Directory may not exist in consuming projects.
        }
      }
    }

    return null;
  }

  private evaluateConditions(conditions: string[], run: RunState): boolean {
    for (const condition of conditions) {
       if (condition.startsWith("artifact_exists:")) {
         const artifactId = condition.slice(16);
         if (!run.artifact_registry[artifactId]) return false;
       }
    }
    return true;
  }
}

function hookLookupKeys(hookId: string): Set<string> {
  const primary = normalizeHookKey(hookId);
  const aliases: Record<string, string[]> = {
    loadprojectcontext: ["loadrepocontext"],
    readrepo: ["loaddiscoverycontext"],
    readjira: ["loaddiscoverycontext"],
    readconfluence: ["loaddiscoverycontext"],
    runlint: ["runlint"],
    runtypecheck: ["runtypecheck"],
    runtests: ["runtests"],
    riskscan: ["riskscan"],
    syncjira: ["syncjira"],
    syncconfluence: ["syncconfluence"]
  };
  return new Set([primary, ...(aliases[primary] ?? [])]);
}

function normalizeHookKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCommandAction(command: string): string {
  const aliases: Record<string, string> = {
    npm_test: "npm test",
    npm_typecheck: "npm run typecheck",
    npm_build: "npm run build"
  };
  return aliases[command] ?? command.replace(/_/g, " ");
}
