import { promises as fs } from "node:fs";
import path from "node:path";
import { ExitCode, ToolkitError } from "./errors";

export const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
};

export const writeJsonFile = async (filePath: string, value: unknown): Promise<void> => {
  const content = JSON.stringify(value, null, 2) + "\n";
  await fs.writeFile(filePath, content, "utf8");
};

export const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const listDirectories = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
};

export const copyFileIfMissing = async (source: string, target: string): Promise<boolean> => {
  if (await pathExists(target)) {
    return false;
  }
  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
  return true;
};

export const copyDirIfMissing = async (sourceDir: string, targetDir: string): Promise<void> => {
  await ensureDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirIfMissing(sourcePath, targetPath);
        return;
      }
      if (!(await pathExists(targetPath))) {
        await fs.copyFile(sourcePath, targetPath);
      }
    })
  );
};

export const assertPathWithinRoot = (root: string, target: string, label = "path"): void => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(prefix)) {
    throw new ToolkitError(`Invalid ${label} outside repository root`, ExitCode.InvalidConfig, {
      root: resolvedRoot,
      target: resolvedTarget
    });
  }
};
