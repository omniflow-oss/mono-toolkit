import path from "node:path";
import { runInDocker } from "../docker/runner";
import { execCommand } from "../core/exec";
import { ExitCode, ToolkitError } from "../core/errors";
import type { DockerConfig, ProfileConfig, ScopeRecord, TaskDefinition, TasksConfig } from "../core/config/types";

export interface TaskRunResult {
  scopeId: string;
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ScopeRunResult {
  scopeId: string;
  tasks: TaskRunResult[];
}

const buildCommandArgs = (
  scope: ScopeRecord,
  task: TaskDefinition,
  profile: ProfileConfig
): string[] => {
  const taskCommand = task.command;
  switch (profile.executor) {
    case "pnpm":
      return ["pnpm", "-C", scope.path, ...(profile.baseArgs ?? []), ...taskCommand];
    case "maven":
      return ["mvn", "-pl", scope.path, "-am", ...(profile.baseArgs ?? []), ...taskCommand];
    case "custom":
      return [...(profile.baseArgs ?? []), ...taskCommand];
    default:
      return taskCommand;
  }
};

const runTask = async (options: {
  repoRoot: string;
  docker: DockerConfig;
  scope: ScopeRecord;
  taskId: string;
  task: TaskDefinition;
  profile: ProfileConfig;
  dryRun: boolean;
}): Promise<TaskRunResult> => {
  const args = buildCommandArgs(options.scope, options.task, options.profile);
  if (options.dryRun) {
    return { scopeId: options.scope.id, taskId: options.taskId, exitCode: 0, stdout: args.join(" "), stderr: "" };
  }

  const result = await runInDocker({
    repoRoot: options.repoRoot,
    docker: options.docker,
    args,
    env: options.task.env
  });

  return {
    scopeId: options.scope.id,
    taskId: options.taskId,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  };
};

const runScope = async (options: {
  repoRoot: string;
  docker: DockerConfig;
  scope: ScopeRecord;
  taskIds: string[];
  tasksConfig: TasksConfig;
  dryRun: boolean;
}): Promise<ScopeRunResult> => {
  const profile = options.tasksConfig.profiles[options.scope.profile];
  if (!profile) {
    throw new ToolkitError(`Unknown profile: ${options.scope.profile}`, ExitCode.InvalidConfig);
  }

  const results: TaskRunResult[] = [];
  for (const taskId of options.taskIds) {
    const task = options.tasksConfig.taskGraph[taskId];
    if (!task) {
      throw new ToolkitError(`Unknown task: ${taskId}`, ExitCode.InvalidConfig);
    }
    const result = await runTask({
      repoRoot: options.repoRoot,
      docker: options.docker,
      scope: options.scope,
      taskId,
      task,
      profile,
      dryRun: options.dryRun
    });
    results.push(result);
    if (result.exitCode !== 0) {
      break;
    }
  }
  return { scopeId: options.scope.id, tasks: results };
};

const runWithConcurrency = async <T>(items: T[], limit: number, run: (item: T) => Promise<void>): Promise<void> => {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) {
        return;
      }
      await run(item);
    }
  });
  await Promise.all(workers);
};

export const executePipeline = async (options: {
  repoRoot: string;
  docker: DockerConfig;
  pipeline: string;
  scopes: ScopeRecord[];
  tasksConfig: TasksConfig;
  dryRun: boolean;
}): Promise<ScopeRunResult[]> => {
  const taskIds = options.tasksConfig.pipelines[options.pipeline];
  if (!taskIds) {
    throw new ToolkitError(`Unknown pipeline: ${options.pipeline}`, ExitCode.InvalidConfig);
  }

  const results: ScopeRunResult[] = [];
  await runWithConcurrency(options.scopes, options.tasksConfig.jobs, async (scope) => {
    const scopeResult = await runScope({
      repoRoot: options.repoRoot,
      docker: options.docker,
      scope,
      taskIds,
      tasksConfig: options.tasksConfig,
      dryRun: options.dryRun
    });
    results.push(scopeResult);
  });

  const failed = results.flatMap((scope) => scope.tasks).find((task) => task.exitCode !== 0);
  if (failed) {
    throw new ToolkitError(`Task failed: ${failed.taskId}`, ExitCode.TaskFailed, { task: failed });
  }

  return results;
};

export const runHostCommand = async (args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const [command, ...rest] = args;
  if (!command) {
    throw new ToolkitError("Missing command", ExitCode.TaskFailed);
  }
  return execCommand(command, rest, { cwd });
};

export const makeScopePath = (repoRoot: string, scope: ScopeRecord): string => {
  return path.join(repoRoot, scope.path);
};
