import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderTemplateDir } from "../src/scaffold/template";

describe("renderTemplateDir", () => {
  it("renders template variables and file names", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-template-"));
    const templateDir = path.join(root, "template");
    const targetDir = path.join(root, "output");
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(path.join(templateDir, "__name__.txt"), "Name={{name}} Pas={{pascalName}}\n");

    await renderTemplateDir(templateDir, targetDir, "my-feature");

    const outputPath = path.join(targetDir, "my-feature.txt");
    const content = await fs.readFile(outputPath, "utf8");
    expect(content).toBe("Name=my-feature Pas=MyFeature\n");
  });
});
