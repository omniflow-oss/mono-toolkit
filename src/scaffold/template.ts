import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir } from "../core/fs";

const toPascal = (name: string): string => {
  return name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

const applyReplacements = (content: string, vars: Record<string, string>): string => {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
};

export const renderTemplateDir = async (templateDir: string, targetDir: string, name: string): Promise<void> => {
  const variables = {
    name,
    kebabName: name,
    pascalName: toPascal(name)
  };
  const entries = await fs.readdir(templateDir, { withFileTypes: true });
  await ensureDir(targetDir);
  for (const entry of entries) {
    const sourcePath = path.join(templateDir, entry.name);
    const targetPath = path.join(targetDir, entry.name.replace("__name__", name));
    if (entry.isDirectory()) {
      await renderTemplateDir(sourcePath, targetPath, name);
      continue;
    }
    const content = await fs.readFile(sourcePath, "utf8");
    const rendered = applyReplacements(content, variables);
    await fs.writeFile(targetPath, rendered, "utf8");
  }
};
