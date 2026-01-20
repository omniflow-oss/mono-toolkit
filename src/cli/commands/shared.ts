import { findRepoRootOrThrow } from "../../core/root";
import { loadConfig } from "../../core/config/load";
import { discoverScopes } from "../../scopes/discover";

export const loadRepoContext = async (context: { cwd?: string }) => {
  const cwd = context.cwd ?? process.cwd();
  const repoRoot = await findRepoRootOrThrow(cwd);
  const config = await loadConfig(repoRoot);
  const scopes = await discoverScopes(repoRoot, config.paths, config.scopes);
  return { repoRoot, config, scopes };
};
