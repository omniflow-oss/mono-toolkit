import path from "node:path";
import { readJsonFile } from "./fs";
import { getPackageRoot } from "./package-root";

export const getPackageVersion = async (): Promise<string> => {
	const packageJson = path.join(getPackageRoot(), "package.json");
	const pkg = await readJsonFile<{ version?: string }>(packageJson);
	return pkg.version ?? "0.0.0";
};
