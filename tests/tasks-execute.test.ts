import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { executePipeline } from "../src/tasks/execute";
import { ExitCode, ToolkitError } from "../src/core/errors";
import type { ScopeRecord, TasksConfig } from "../src/core/config/types";
import { runInDocker } from "../src/docker/runner";

vi.mock("../src/docker/runner", () => ({
  runInDocker: vi.fn()
}));

const scopes: ScopeRecord[] = [
  { id: "back:service:alpha", type: "service", path: "back/services/alpha", profile: "default", tags: [] }
];

const baseTasks: TasksConfig = {
  jobs: 1,
  pipelines: { build: ["noop"] },
  profiles: { default: { executor: "pnpm" } },
  taskGraph: { noop: { command: ["echo", "hi"] } }
};

const baseConfig: import("../src/core/config/types").ToolkitConfig = {
  paths: {
    backServices: "back/services",
    backLibs: "back/libs",
    frontApps: "front/apps",
    frontPackages: "front/packages",
    contracts: "contracts",
    docs: "docs",
    infra: "infra"
  },
  changed: {
    toolingPrefixes: ["config/"],
    contractsPrefix: "contracts/",
    docsPrefix: "docs/",
    defaultBaseBranch: "main"
  },
  git: { defaultBranch: "main", allowFetchBase: false },
  docker: {
    composeFile: "infra/tools.compose.yaml",
    service: "tools",
    entry: "toolkit",
    command: "docker",
    infraCompose: "infra/compose.yaml"
  },
  tools: { nodeVersion: "24", pnpmVersion: "10" },
  tasks: baseTasks,
  contracts: { authoritative: "design", root: "contracts", runtimePath: "/q/openapi?format=json", allowlist: [] },
  docs: { root: "docs" },
  policies: { sanitizePattern: "[a-z0-9-]", maxNameLength: 64 },
  scopes: { overrides: {}, exclude: [] },
  arch: { enabled: false, templatePath: "" }
};

describe("executePipeline", () => {
  it("returns dry-run commands", async () => {
    const results = await executePipeline({
      repoRoot: "/repo",
      docker: {
        composeFile: "infra/tools.compose.yaml",
        service: "tools",
        entry: "toolkit",
        command: "docker",
        infraCompose: "infra/compose.yaml"
      },
      pipeline: "build",
      scopes,
      tasksConfig: baseTasks,
      dryRun: true,
      config: baseConfig
    });

    expect(results[0].tasks[0].stdout).toBe("pnpm -C back/services/alpha echo hi");
    expect(results[0].tasks[0].command).toEqual(["pnpm", "-C", "back/services/alpha", "echo", "hi"]);
  });

  it("throws when pipeline is unknown", async () => {
    await expect(
      executePipeline({
        repoRoot: "/repo",
        docker: {
          composeFile: "infra/tools.compose.yaml",
          service: "tools",
          entry: "toolkit",
          command: "docker",
          infraCompose: "infra/compose.yaml"
        },
        pipeline: "missing",
        scopes,
        tasksConfig: baseTasks,
        dryRun: false,
        config: baseConfig
      })
    ).rejects.toMatchObject({ code: ExitCode.InvalidConfig });
  });

  it("throws when profile is unknown", async () => {
    await expect(
      executePipeline({
        repoRoot: "/repo",
        docker: {
          composeFile: "infra/tools.compose.yaml",
          service: "tools",
          entry: "toolkit",
          command: "docker",
          infraCompose: "infra/compose.yaml"
        },
        pipeline: "build",
        scopes: [{ ...scopes[0], profile: "missing" }],
        tasksConfig: baseTasks,
        dryRun: false,
        config: baseConfig
      })
    ).rejects.toMatchObject({ code: ExitCode.InvalidConfig });
  });

  it("throws when task is unknown", async () => {
    await expect(
      executePipeline({
        repoRoot: "/repo",
        docker: {
          composeFile: "infra/tools.compose.yaml",
          service: "tools",
          entry: "toolkit",
          command: "docker",
          infraCompose: "infra/compose.yaml"
        },
        pipeline: "build",
        scopes,
        tasksConfig: { ...baseTasks, taskGraph: {} },
        dryRun: false,
        config: baseConfig
      })
    ).rejects.toMatchObject({ code: ExitCode.InvalidConfig });
  });

  it("throws when a task fails", async () => {
    vi.mocked(runInDocker).mockResolvedValue({ exitCode: 1, stdout: "", stderr: "boom" });

    await expect(
      executePipeline({
        repoRoot: "/repo",
        docker: {
          composeFile: "infra/tools.compose.yaml",
          service: "tools",
          entry: "toolkit",
          command: "docker",
          infraCompose: "infra/compose.yaml"
        },
        pipeline: "build",
        scopes,
        tasksConfig: baseTasks,
        dryRun: false,
        config: baseConfig
      })
    ).rejects.toBeInstanceOf(ToolkitError);
  });

  it("skips cached tasks", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-cache-"));
    const scopeRoot = path.join(repoRoot, "back/services/alpha");
    await fs.mkdir(scopeRoot, { recursive: true });
    const inputPath = path.join(scopeRoot, "input.txt");
    const outputPath = path.join(scopeRoot, "output.txt");
    await fs.writeFile(inputPath, "in", "utf8");
    await fs.writeFile(outputPath, "out", "utf8");

    const tasksConfig: TasksConfig = {
      jobs: 1,
      pipelines: { build: ["cached"] },
      profiles: { default: { executor: "pnpm" } },
      taskGraph: {
        cached: { command: ["echo", "hi"], inputs: ["input.txt"], outputs: ["output.txt"], cacheable: true }
      }
    };

    const results = await executePipeline({
      repoRoot,
      docker: baseConfig.docker,
      pipeline: "build",
      scopes,
      tasksConfig,
      dryRun: false,
      config: { ...baseConfig, tasks: tasksConfig }
    });

    expect(results[0].tasks[0].cached).toBe(true);
    expect(results[0].tasks[0].stdout).toBe("cached");
  });

  it("runs task dependencies in order", async () => {
    vi.mocked(runInDocker).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });

    const tasksConfig: TasksConfig = {
      jobs: 1,
      pipelines: { build: ["build"] },
      profiles: { default: { executor: "pnpm" } },
      taskGraph: {
        lint: { command: ["lint"] },
        build: { command: ["build"], deps: ["lint"] }
      }
    };

    const results = await executePipeline({
      repoRoot: "/repo",
      docker: baseConfig.docker,
      pipeline: "build",
      scopes,
      tasksConfig,
      dryRun: false,
      config: { ...baseConfig, tasks: tasksConfig }
    });

    expect(results[0].tasks.map((task) => task.taskId)).toEqual(["lint", "build"]);
  });
});
