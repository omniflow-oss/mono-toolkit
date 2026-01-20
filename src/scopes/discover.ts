import path from "node:path";
import { listDirectories, pathExists } from "../core/fs";
import type { PathsConfig, ScopeRecord, ScopesConfig } from "../core/config/types";

const scopeRoots = (paths: PathsConfig) => [
  { root: paths.backServices, type: "service", prefix: "back:service" },
  { root: paths.backLibs, type: "lib", prefix: "back:lib" },
  { root: paths.frontApps, type: "app", prefix: "front:app" },
  { root: paths.frontPackages, type: "package", prefix: "front:package" }
] as const;

export const discoverScopes = async (
  repoRoot: string,
  paths: PathsConfig,
  scopesConfig: ScopesConfig
): Promise<ScopeRecord[]> => {
  const result: ScopeRecord[] = [];
  for (const rootEntry of scopeRoots(paths)) {
    const absoluteRoot = path.join(repoRoot, rootEntry.root);
    if (!(await pathExists(absoluteRoot))) {
      continue;
    }
    const scopes = await listDirectories(absoluteRoot);
    for (const name of scopes) {
      const scopeId = `${rootEntry.prefix}:${name}`;
      if (scopesConfig.exclude.includes(scopeId)) {
        continue;
      }
      const override = scopesConfig.overrides[scopeId] ?? {};
      result.push({
        id: scopeId,
        type: rootEntry.type,
        path: path.join(rootEntry.root, name),
        profile: override.profile ?? "default",
        tags: override.tags ?? [],
        port: override.port,
        deps: override.deps
      });
    }
  }

  return result;
};
