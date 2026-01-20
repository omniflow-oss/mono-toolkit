import path from "node:path";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { execCommand } from "../../core/exec";
import { loadRepoContext } from "./shared";
import { setExitCode, writeError, writeJson, writeText } from "../output";

const runInfra = async (
  context: CommandContext,
  subcommand: string[],
  json: boolean
): Promise<void> => {
  const { repoRoot, config } = await loadRepoContext(context);
  const composeFile = path.join(repoRoot, config.docker.infraCompose);
  const result = await execCommand(config.docker.command, ["compose", "-f", composeFile, ...subcommand], {
    cwd: repoRoot
  });
  if (json) {
    writeJson(context, { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
  } else {
    if (result.stdout) {
      writeText(context, result.stdout.trimEnd());
    }
    if (result.stderr) {
      context.process.stderr.write(result.stderr);
    }
  }
  if (result.exitCode !== 0) {
    setExitCode(context, result.exitCode);
  }
};

export const infraUpCommand = buildCommand({
  parameters: { flags: { json: { kind: "boolean", brief: "Output JSON", default: false } } },
  docs: { brief: "Start infra services" },
  func: async function (flags) {
    const context = this as CommandContext;
    try {
      await runInfra(context, ["up", "-d"], flags.json);
    } catch (error) {
      setExitCode(context, writeError(context, error as Error, flags.json));
    }
  }
});

export const infraDownCommand = buildCommand({
  parameters: { flags: { json: { kind: "boolean", brief: "Output JSON", default: false } } },
  docs: { brief: "Stop infra services" },
  func: async function (flags) {
    const context = this as CommandContext;
    try {
      await runInfra(context, ["down"], flags.json);
    } catch (error) {
      setExitCode(context, writeError(context, error as Error, flags.json));
    }
  }
});

export const infraPsCommand = buildCommand({
  parameters: { flags: { json: { kind: "boolean", brief: "Output JSON", default: false } } },
  docs: { brief: "List infra services" },
  func: async function (flags) {
    const context = this as CommandContext;
    try {
      await runInfra(context, ["ps"], flags.json);
    } catch (error) {
      setExitCode(context, writeError(context, error as Error, flags.json));
    }
  }
});

export const infraLogsCommand = buildCommand({
  parameters: { flags: { json: { kind: "boolean", brief: "Output JSON", default: false } } },
  docs: { brief: "Tail infra logs" },
  func: async function (flags) {
    const context = this as CommandContext;
    try {
      await runInfra(context, ["logs"], flags.json);
    } catch (error) {
      setExitCode(context, writeError(context, error as Error, flags.json));
    }
  }
});
