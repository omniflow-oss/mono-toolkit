import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const getPackageRoot = (): string => {
	try {
		const require = createRequire(__filename);
		const pkgPath = require.resolve("@ofcx/mono-toolkit/package.json");
		return path.dirname(pkgPath);
	} catch {
		// ignore
	}
	let current = __dirname;
	let previous = current;
	while (true) {
		const candidate = path.join(current, "package.json");
		if (existsSync(candidate)) {
			return current;
		}
		previous = current;
		current = path.dirname(current);
		if (current === previous) {
			return path.resolve(__dirname, "..", "..");
		}
	}
};
