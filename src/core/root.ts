import { promises as fs } from "node:fs";
import path from "node:path";
import { readJsonFile } from "./fs";
import { ExitCode, ToolkitError } from "./errors";

const hasPnpmWorkspace = async (dirPath: string): Promise<boolean> => {
  try {
    await fs.access(path.join(dirPath, "pnpm-workspace.yaml"));
    return true;
  } catch {
    return false;
  }
};

const hasPrivatePackageJson = async (dirPath: string): Promise<boolean> => {
  try {
    const pkgPath = path.join(dirPath, "package.json");
    const pkg = await readJsonFile<{ private?: boolean }>(pkgPath);
    return Boolean(pkg.private);
  } catch {
    return false;
  }
};

export const findRepoRoot = async (startDir: string): Promise<string | null> => {
  let current = path.resolve(startDir);
  while (true) {
    if ((await hasPnpmWorkspace(current)) || (await hasPrivatePackageJson(current))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
};

export const findRepoRootOrThrow = async (startDir: string): Promise<string> => {
  const root = await findRepoRoot(startDir);
  if (!root) {
    throw new ToolkitError("Repository root not found", ExitCode.RootNotFound);
  }
  return root;
};
