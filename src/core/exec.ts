import { spawn } from "node:child_process";
import { ExitCode, ToolkitError } from "./errors";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export const execCommand = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
};

export const requireCommand = async (command: string): Promise<void> => {
  const result = await execCommand(command, ["--version"]);
  if (result.exitCode !== 0) {
    throw new ToolkitError(`Missing required command: ${command}`, ExitCode.TaskFailed);
  }
};
