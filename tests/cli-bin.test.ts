import { afterEach, describe, expect, it, vi } from "vitest";

const flush = async () => {
  await new Promise((resolve) => setImmediate(resolve));
};

describe("bin/cli", () => {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock("@stricli/core");
    vi.unmock("../src/cli/app");
    vi.unmock("../src/cli/context");
  });

  it("runs the cli application", async () => {
    const runMock = vi.fn().mockResolvedValue(undefined);
    const createAppMock = vi.fn().mockResolvedValue({ app: true });
    const buildContextMock = vi.fn().mockReturnValue({ process });

    vi.doMock("@stricli/core", () => ({ run: runMock }));
    vi.doMock("../src/cli/app", () => ({ createApp: createAppMock }));
    vi.doMock("../src/cli/context", () => ({ buildCliContext: buildContextMock }));

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.argv = ["node", "cli", "check"];

    await import("../src/bin/cli");
    await flush();

    expect(createAppMock).toHaveBeenCalled();
    expect(buildContextMock).toHaveBeenCalledWith(process);
    expect(runMock).toHaveBeenCalledWith({ app: true }, ["check"], { process });
    expect(stderrSpy).not.toHaveBeenCalled();

    stderrSpy.mockRestore();
  });

  it("reports errors when initialization fails", async () => {
    const createAppMock = vi.fn().mockRejectedValue(new Error("boom"));

    vi.doMock("@stricli/core", () => ({ run: vi.fn() }));
    vi.doMock("../src/cli/app", () => ({ createApp: createAppMock }));
    vi.doMock("../src/cli/context", () => ({ buildCliContext: vi.fn() }));

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await import("../src/bin/cli");
    await flush();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith("boom\n");

    stderrSpy.mockRestore();
  });
});
