import { describe, expect, it } from "vitest";
import { ExitCode, ToolkitError } from "../src/core/errors";
import { setExitCode, writeError, writeJson, writeText } from "../src/cli/output";

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

describe("cli output", () => {
  it("writes JSON and text output", () => {
    const { context, stdout } = createContext();

    writeJson(context, { status: "ok" });
    writeText(context, "hello");

    const lines = stdout.join("").trim().split("\n");
    expect(JSON.parse(lines[0])).toEqual({ status: "ok" });
    expect(lines[1]).toBe("hello");
  });

  it("writes JSON errors and returns codes", () => {
    const { context, stdout } = createContext();
    const code = writeError(context, new ToolkitError("bad", ExitCode.InvalidConfig, { a: 1 }), true);

    expect(code).toBe(ExitCode.InvalidConfig);
    const payload = JSON.parse(stdout.join("").trim());
    expect(payload).toMatchObject({ status: "error", message: "bad", code: ExitCode.InvalidConfig });
  });

  it("writes text errors and sets exit code", () => {
    const { context, stderr } = createContext();
    const code = writeError(context, new Error("oops"), false);

    expect(code).toBe(ExitCode.TaskFailed);
    expect(stderr.join("")).toBe("oops\n");
    setExitCode(context, code);
    expect(context.process.exitCode).toBe(ExitCode.TaskFailed);
  });
});
