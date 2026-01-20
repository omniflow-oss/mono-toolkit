import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { initCommand } from "../src/cli/commands/init";

const createContext = (cwd: string) => {
  const stdout: string[] = [];
  const context = {
    cwd,
    process: {
      stdout: { write: (chunk: string) => stdout.push(chunk) },
      stderr: { write: () => undefined },
      exitCode: undefined as number | undefined
    }
  };
  return { context, stdout };
};

const loadCommandFn = async (command: { loader: () => Promise<unknown> }) => {
  const loaded = await command.loader();
  return typeof loaded === "function" ? loaded : (loaded as { default: (...args: unknown[]) => unknown }).default;
};

describe("initCommand", () => {
  it("initializes repo files", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-init-"));
    const originalCwd = process.cwd();
    process.chdir(repoRoot);

    try {
      const { context, stdout } = createContext(repoRoot);
      const run = await loadCommandFn(initCommand);
      await run.call(context, { json: true });

      const output = JSON.parse(stdout.join("").trim());
      expect(output.status).toBe("ok");

      const configPath = path.join(repoRoot, "config", "paths.json");
      const toolsPath = path.join(repoRoot, "config", "tools", "biome", "biome.base.jsonc");
      const infraPath = path.join(repoRoot, "infra", "tools.compose.yaml");
      const cachePath = path.join(repoRoot, ".cache", "mono-toolkit", "cache");
      const biomeRouter = path.join(repoRoot, "biome.jsonc");

      await expect(fs.stat(configPath)).resolves.toBeDefined();
      await expect(fs.stat(toolsPath)).resolves.toBeDefined();
      await expect(fs.stat(infraPath)).resolves.toBeDefined();
      await expect(fs.stat(cachePath)).resolves.toBeDefined();
      await expect(fs.stat(biomeRouter)).resolves.toBeDefined();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
