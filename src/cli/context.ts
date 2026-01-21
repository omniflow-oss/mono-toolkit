import type { ApplicationContext } from "@stricli/core";

export interface CliContext extends ApplicationContext {
	readonly cwd: string;
}

export const buildCliContext = (
	processRef: ApplicationContext["process"],
): CliContext => {
	return {
		process: processRef,
		cwd: process.cwd(),
	};
};
