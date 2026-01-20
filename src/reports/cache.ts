import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir } from "../core/fs";

const dirMode = 0o775;
const fileMode = 0o664;

export const cacheRoot = ".cache/mono-toolkit";

const cacheDirs = [
  "cache/pnpm-store",
  "cache/m2",
  "cache/oas",
  "tmp/openapi",
  "tmp/work",
  "reports/openapi",
  "reports/lint",
  "reports/test"
];

export const ensureCacheLayout = async (repoRoot: string): Promise<void> => {
  for (const dir of cacheDirs) {
    const target = path.join(repoRoot, cacheRoot, dir);
    await ensureDir(target);
    await fs.chmod(target, dirMode);
  }
};

export const writeReportFile = async (repoRoot: string, relativePath: string, content: string): Promise<void> => {
  const target = path.join(repoRoot, cacheRoot, relativePath);
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, content, "utf8");
  await fs.chmod(target, fileMode);
};
