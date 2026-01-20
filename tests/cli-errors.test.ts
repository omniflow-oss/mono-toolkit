import { describe, expect, it, vi } from "vitest";

vi.mock("../src/cli/commands/shared", () => ({
  loadRepoContext: vi.fn()
}));

vi.mock("../src/core/exec", () => ({
  execCommand: vi.fn()
}));

vi.mock("../src/core/root", () => ({
  findRepoRootOrThrow: vi.fn()
}));

vi.mock("../src/reports/cache", () => ({
  ensureCacheLayout: vi.fn()
}));

import { deleteCommand } from "../src/cli/commands/delete";
import { doctorCommand } from "../src/cli/commands/doctor";
import { infraDownCommand } from "../src/cli/commands/infra";
import { newCommand } from "../src/cli/commands/new";
import { loadRepoContext } from "../src/cli/commands/shared";
import { execCommand } from "../src/core/exec";
import { findRepoRootOrThrow } from "../src/core/root";
import { ensureCacheLayout } from "../src/reports/cache";
import { ExitCode } from "../src/core/errors";
import type { ToolkitConfig } from "../src/core/config/types";

const createContext = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context = {
    process: {
      stdout: { write: (chunk: string) => stdout.push(chunk) },
      stderr: { write: (chunk: string) => stderr.push(chunk) },
      exitCode: undefined as number | undefined
    }
  };
  return { context, stdout, stderr };
};

const loadCommandFn = async (command: { loader: () => Promise<unknown> }) => {
  const loaded = await command.loader();
  return typeof loaded === "function" ? loaded : (loaded as { default: (...args: unknown[]) => unknown }).default;
};

const config: ToolkitConfig = {
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
  tasks: { jobs: 1, pipelines: {}, profiles: {}, taskGraph: {} },
  contracts: { authoritative: "design", root: "contracts", runtimePath: "", allowlist: [] },
  docs: { root: "docs" },
  policies: { sanitizePattern: "[a-z0-9-]", maxNameLength: 64 },
  scopes: { overrides: {}, exclude: [] },
  arch: { enabled: false, templatePath: "" }
};

describe("cli error paths", () => {
  it("handles feature creation missing --in", async () => {
    vi.mocked(loadRepoContext).mockResolvedValue({ repoRoot: "/repo", config, scopes: [] });
    const { context, stdout } = createContext();

    const run = await loadCommandFn(newCommand);
    await run.call(context, { json: true }, "feature", "alpha");

    const payload = JSON.parse(stdout.join("").trim());
    expect(payload).toMatchObject({ status: "error" });
    expect(context.process.exitCode).toBe(ExitCode.TaskFailed);
  });

  it("handles feature deletion with unknown scope", async () => {
    vi.mocked(loadRepoContext).mockResolvedValue({ repoRoot: "/repo", config, scopes: [] });
    const { context, stdout } = createContext();

    const run = await loadCommandFn(deleteCommand);
    await run.call(context, { json: true, in: "missing" }, "feature", "alpha");

    const payload = JSON.parse(stdout.join("").trim());
    expect(payload).toMatchObject({ status: "error" });
    expect(context.process.exitCode).toBe(ExitCode.TaskFailed);
  });

  it("writes infra output and exit code on failure", async () => {
    vi.mocked(loadRepoContext).mockResolvedValue({ repoRoot: "/repo", config, scopes: [] });
    vi.mocked(execCommand).mockResolvedValue({ exitCode: 2, stdout: "down\n", stderr: "err" });

    const { context, stdout, stderr } = createContext();
    const run = await loadCommandFn(infraDownCommand);
    await run.call(context, { json: false });

    expect(stdout.join("")).toBe("down\n");
    expect(stderr.join("")).toBe("err");
    expect(context.process.exitCode).toBe(2);
  });

  it("reports doctor cache failures", async () => {
    vi.mocked(findRepoRootOrThrow).mockResolvedValue("/repo");
    vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    vi.mocked(ensureCacheLayout).mockRejectedValue(new Error("nope"));

    const { context, stdout } = createContext();
    const run = await loadCommandFn(doctorCommand);
    await run.call(context, { json: true, fix: false });

    const payload = JSON.parse(stdout.join("").trim());
    expect(payload).toMatchObject({ status: "error" });
    expect(context.process.exitCode).toBe(ExitCode.TaskFailed);
  });

  it("keeps running doctor when fix is enabled", async () => {
    vi.mocked(findRepoRootOrThrow).mockResolvedValue("/repo");
    vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    vi.mocked(ensureCacheLayout).mockRejectedValue(new Error("nope"));

    const { context, stdout } = createContext();
    const run = await loadCommandFn(doctorCommand);
    await run.call(context, { json: false, fix: true });

    expect(stdout.join("")).toContain("FAIL cache");
    expect(context.process.exitCode).toBe(ExitCode.TaskFailed);
  });
});
