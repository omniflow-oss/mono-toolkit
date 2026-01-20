import path from "node:path";
import type { DockerConfig } from "../core/config/types";

export const buildComposeArgs = (
  repoRoot: string,
  dockerConfig: DockerConfig,
  commandArgs: string[]
): { command: string; args: string[] } => {
  const composeFile = path.join(repoRoot, dockerConfig.composeFile);
  const args = [
    "compose",
    "-f",
    composeFile,
    "run",
    "--rm",
    dockerConfig.service,
    dockerConfig.entry,
    ...commandArgs
  ];
  return { command: dockerConfig.command, args };
};
