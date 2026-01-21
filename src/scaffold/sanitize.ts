import { ExitCode, ToolkitError } from "../core/errors";
import type { PoliciesConfig } from "../core/config/types";

export const sanitizeName = (
	name: string,
	policies: PoliciesConfig,
): string => {
	const pattern = new RegExp(`^${policies.sanitizePattern}+$`);
	if (!pattern.test(name)) {
		throw new ToolkitError("Invalid name", ExitCode.InvalidConfig, {
			name,
			pattern: policies.sanitizePattern,
		});
	}
	if (name.length > policies.maxNameLength) {
		throw new ToolkitError("Name too long", ExitCode.InvalidConfig, {
			name,
			max: policies.maxNameLength,
		});
	}
	return name;
};
