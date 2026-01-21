import { existsSync } from "node:fs";
import path from "node:path";

export const getPackageRoot = (): string => {
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
