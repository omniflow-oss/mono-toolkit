import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runContractsTask } from "../src/contracts/runner";
import type { ContractsConfig, GitConfig, ScopeRecord, DockerConfig } from "../src/core/config/types";

vi.mock("../src/docker/runner", () => ({
  runInDocker: vi.fn()
}));

vi.mock("../src/core/exec", () => ({
  execCommand: vi.fn()
}));

vi.mock("../src/changed/base", () => ({
  resolveBaseRef: vi.fn()
}));

import { runInDocker } from "../src/docker/runner";
import { execCommand } from "../src/core/exec";
import { resolveBaseRef } from "../src/changed/base";

const docker: DockerConfig = {
  composeFile: "infra/tools.compose.yaml",
  service: "tools",
  entry: "toolkit",
  command: "docker",
  infraCompose: "infra/compose.yaml"
};

const contracts: ContractsConfig = {
  authoritative: "design",
  root: "contracts",
  runtimePath: "/q/openapi?format=json",
  allowlist: []
};

const git: GitConfig = { defaultBranch: "main", allowFetchBase: false };

const serviceScope: ScopeRecord = {
  id: "back:service:alpha",
  type: "service",
  path: "back/services/alpha",
  profile: "default",
  tags: [],
  port: 8080
};

describe("runContractsTask", () => {
  it("runs spectral lint for contracts", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-contracts-"));
    const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
    await fs.mkdir(path.dirname(specPath), { recursive: true });
    await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
    vi.mocked(runInDocker).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });

    const result = await runContractsTask({ repoRoot, docker, contracts, git, scope: serviceScope, taskId: "contracts:lint" });

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(runInDocker)).toHaveBeenCalled();
  });

  it("runs drift checks", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-drift-"));
    const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
    await fs.mkdir(path.dirname(specPath), { recursive: true });
    await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
    vi.mocked(runInDocker)
      .mockResolvedValueOnce({ exitCode: 0, stdout: "{}", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "diff", stderr: "" });

    const result = await runContractsTask({ repoRoot, docker, contracts, git, scope: serviceScope, taskId: "contracts:drift" });

    expect(result.exitCode).toBe(0);
  });

  it("runs breaking change checks", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-breaking-"));
    const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
    await fs.mkdir(path.dirname(specPath), { recursive: true });
    await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
    vi.mocked(resolveBaseRef).mockResolvedValue("main");
    vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "openapi: 3.0.0", stderr: "" });
    vi.mocked(runInDocker)
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "ok", stderr: "" });

    const result = await runContractsTask({
      repoRoot,
      docker,
      contracts,
      git,
      scope: serviceScope,
      taskId: "contracts:breaking"
    });

    expect(result.exitCode).toBe(0);
  });
});
