import { describe, expect, it } from "vitest";
import { runHostCommand } from "../src/tasks/execute";
import { ExitCode, ToolkitError } from "../src/core/errors";

describe("runHostCommand", () => {
  it("runs a host command and captures output", async () => {
    const result = await runHostCommand([process.execPath, "-e", "console.log('ok')"], process.cwd());

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("ok");
    expect(result.stderr).toBe("");
  });

  it("throws a ToolkitError when command is missing", async () => {
    await expect(runHostCommand([], process.cwd())).rejects.toBeInstanceOf(ToolkitError);
    await expect(runHostCommand([], process.cwd())).rejects.toMatchObject({ code: ExitCode.TaskFailed });
  });
});
