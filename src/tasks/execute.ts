import path from "node:path";
import { promises as fs } from "node:fs";
import { runInDocker } from "../docker/runner";
import { execCommand } from "../core/exec";
import { ExitCode, ToolkitError } from "../core/errors";
import type {
  DockerConfig,
  ProfileConfig,
  ScopeRecord,
  TaskDefinition,
  TasksConfig,
  ToolkitConfig
} from "../core/config/types";
import { runContractsTask } from "../contracts/runner";
import { runDocsTask } from "../docs/runner";

export interface TaskRunResult {
  scopeId: string;
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string[];
  durationMs: number;
  cached: boolean;
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

const resolveTaskPath = (repoRoot: string, scope: ScopeRecord, value: string): string => {
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.join(repoRoot, scope.path, value);
};

const isTaskCached = async (options: {
  repoRoot: string;
  scope: ScopeRecord;
  task: TaskDefinition;
}): Promise<boolean> => {
  if (!options.task.cacheable || !options.task.outputs?.length || !options.task.inputs?.length) {
    return false;
  }
  const resolvedOutputs = options.task.outputs.map((output) => resolveTaskPath(options.repoRoot, options.scope, output));
  const resolvedInputs = options.task.inputs.map((input) => resolveTaskPath(options.repoRoot, options.scope, input));
  try {
    const outputStats = await Promise.all(resolvedOutputs.map((output) => fs.stat(output)));
    const inputStats = await Promise.all(resolvedInputs.map((input) => fs.stat(input)));
    const newestInput = Math.max(...inputStats.map((stat) => stat.mtimeMs));
    const oldestOutput = Math.min(...outputStats.map((stat) => stat.mtimeMs));
    return oldestOutput >= newestInput;
  } catch {
    return false;
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
  config: ToolkitConfig;
}): Promise<TaskRunResult> => {
  const start = Date.now();
  if (options.taskId.startsWith("contracts:")) {
    const result = await runContractsTask({
      repoRoot: options.repoRoot,
      docker: options.docker,
      contracts: options.config.contracts,
      git: options.config.git,
      scope: options.scope,
      taskId: options.taskId
    });
    return {
      scopeId: options.scope.id,
      taskId: options.taskId,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      command: [options.taskId],
      durationMs: Date.now() - start,
      cached: false
    };
  }

  if (options.taskId.startsWith("docs:")) {
    const result = await runDocsTask({
      repoRoot: options.repoRoot,
      docker: options.docker,
      docs: options.config.docs,
      taskId: options.taskId
    });
    return {
      scopeId: options.scope.id,
      taskId: options.taskId,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      command: [options.taskId],
      durationMs: Date.now() - start,
      cached: false
    };
  }

  const args = buildCommandArgs(options.scope, options.task, options.profile);
  if (options.dryRun) {
    return {
      scopeId: options.scope.id,
      taskId: options.taskId,
      exitCode: 0,
      stdout: args.join(" "),
      stderr: "",
      command: args,
      durationMs: 0,
      cached: false
    };
  }

  if (await isTaskCached({ repoRoot: options.repoRoot, scope: options.scope, task: options.task })) {
    return {
      scopeId: options.scope.id,
      taskId: options.taskId,
      exitCode: 0,
      stdout: "cached",
      stderr: "",
      command: args,
      durationMs: 0,
      cached: true
    };
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
    stderr: result.stderr,
    command: args,
    durationMs: Date.now() - start,
    cached: false
  };
};

const runScope = async (options: {
  repoRoot: string;
  docker: DockerConfig;
  scope: ScopeRecord;
  taskIds: string[];
  tasksConfig: TasksConfig;
  dryRun: boolean;
  config: ToolkitConfig;
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
      dryRun: options.dryRun,
      config: options.config
    });
    results.push(result);
    if (result.exitCode !== 0) {
      break;
    }
  }
  return { scopeId: options.scope.id, tasks: results };
};

const resolveTaskOrder = (taskIds: string[], taskGraph: TasksConfig["taskGraph"]): string[] => {
  const result: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (taskId: string) => {
    if (visited.has(taskId)) {
      return;
    }
    if (visiting.has(taskId)) {
      throw new ToolkitError(`Cyclic task dependency: ${taskId}`, ExitCode.InvalidConfig);
    }
    visiting.add(taskId);
    const task = taskGraph[taskId];
    if (!task) {
      throw new ToolkitError(`Unknown task: ${taskId}`, ExitCode.InvalidConfig);
    }
    for (const dep of task.deps ?? []) {
      visit(dep);
    }
    visiting.delete(taskId);
    visited.add(taskId);
    result.push(taskId);
  };

  for (const taskId of taskIds) {
    visit(taskId);
  }
  return result;
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
  config: ToolkitConfig;
}): Promise<ScopeRunResult[]> => {
  const pipelineTasks = options.tasksConfig.pipelines[options.pipeline];
  if (!pipelineTasks) {
    throw new ToolkitError(`Unknown pipeline: ${options.pipeline}`, ExitCode.InvalidConfig);
  }
  const taskIds = resolveTaskOrder(pipelineTasks, options.tasksConfig.taskGraph);

  const results: ScopeRunResult[] = [];
  await runWithConcurrency(options.scopes, options.tasksConfig.jobs, async (scope) => {
    const scopeResult = await runScope({
      repoRoot: options.repoRoot,
      docker: options.docker,
      scope,
      taskIds,
      tasksConfig: options.tasksConfig,
      dryRun: options.dryRun,
      config: options.config
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
