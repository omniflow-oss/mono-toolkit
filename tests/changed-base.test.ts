import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveBaseRef } from "../src/changed/base";
import { ExitCode, ToolkitError } from "../src/core/errors";
import * as execModule from "../src/core/exec";

describe("resolveBaseRef", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_BASE_REF;
  });

  it("returns provided since ref", async () => {
    const result = await resolveBaseRef({
      since: "abc123",
      base: "main",
      defaultBranch: "main",
      allowFetchBase: false,
      cwd: "/repo"
    });

    expect(result).toBe("abc123");
  });

  it("returns env base ref when present", async () => {
    process.env.GITHUB_BASE_REF = "release";
    const result = await resolveBaseRef({
      base: "main",
      defaultBranch: "main",
      allowFetchBase: false,
      cwd: "/repo"
    });

    expect(result).toBe("release");
  });

  it("uses merge-base when available", async () => {
    vi.spyOn(execModule, "execCommand").mockResolvedValue({ exitCode: 0, stdout: "base123\n", stderr: "" });

    const result = await resolveBaseRef({
      base: "main",
      defaultBranch: "main",
      allowFetchBase: false,
      cwd: "/repo"
    });

    expect(result).toBe("base123");
  });

  it("throws when merge-base fails and fetch is disabled", async () => {
    vi.spyOn(execModule, "execCommand").mockResolvedValue({ exitCode: 1, stdout: "", stderr: "" });

    await expect(
      resolveBaseRef({ base: "main", defaultBranch: "main", allowFetchBase: false, cwd: "/repo" })
    ).rejects.toBeInstanceOf(ToolkitError);
    await expect(
      resolveBaseRef({ base: "main", defaultBranch: "main", allowFetchBase: false, cwd: "/repo" })
    ).rejects.toMatchObject({ code: ExitCode.GitMissing });
  });

  it("fetches base when needed", async () => {
    const execSpy = vi.spyOn(execModule, "execCommand");
    execSpy
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "fetched123\n", stderr: "" });

    const result = await resolveBaseRef({ base: "main", defaultBranch: "main", allowFetchBase: true, cwd: "/repo" });

    expect(result).toBe("fetched123");
    expect(execSpy).toHaveBeenCalledWith("git", ["fetch", "origin", "main", "--depth=1"], { cwd: "/repo" });
  });

  it("throws when fetch fails", async () => {
    const execSpy = vi.spyOn(execModule, "execCommand");
    execSpy
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "nope" });

    await expect(
      resolveBaseRef({ base: "main", defaultBranch: "main", allowFetchBase: true, cwd: "/repo" })
    ).rejects.toMatchObject({ code: ExitCode.GitMissing });
  });

  it("throws when merge-base fails after fetch", async () => {
    const execSpy = vi.spyOn(execModule, "execCommand");
    execSpy
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "bad" });

    await expect(
      resolveBaseRef({ base: "main", defaultBranch: "main", allowFetchBase: true, cwd: "/repo" })
    ).rejects.toMatchObject({ code: ExitCode.GitMissing });
  });
});
