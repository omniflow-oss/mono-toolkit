import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/core/config/load";

describe("loadConfig", () => {
  it("applies merge policy for overrides", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-config-"));
    const configDir = path.join(repoRoot, "config");
    await fs.mkdir(configDir, { recursive: true });

    await fs.writeFile(
      path.join(configDir, "merge-policy.json"),
      JSON.stringify({ "tasks.pipelines.check": "replace" }, null, 2)
    );

    await fs.writeFile(
      path.join(configDir, "tasks.json"),
      JSON.stringify({ pipelines: { check: ["custom"] } }, null, 2)
    );

    const config = await loadConfig(repoRoot);

    expect(config.tasks.pipelines.check).toEqual(["custom"]);
    expect(config.tasks.pipelines.build).toEqual(["build"]);
  });
});
