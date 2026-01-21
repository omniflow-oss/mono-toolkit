import { buildApplication, buildRouteMap } from "@stricli/core";
import { getPackageVersion } from "../core/version";
import { deleteCommand } from "./commands/delete";
import { doctorCommand } from "./commands/doctor";
import {
	infraDownCommand,
	infraLogsCommand,
	infraPsCommand,
	infraUpCommand,
} from "./commands/infra";
import { initCommand } from "./commands/init";
import {
	listChangedCommand,
	listPortsCommand,
	listScopesCommand,
} from "./commands/list";
import { newCommand } from "./commands/new";
import { createPipelineCommand } from "./commands/pipeline";

export const createApp = async () => {
	const routes = buildRouteMap({
		routes: {
			init: initCommand,
			doctor: doctorCommand,
			bootstrap: createPipelineCommand("bootstrap", "Bootstrap repository"),
			dev: createPipelineCommand("dev", "Run dev pipeline"),
			check: createPipelineCommand("check", "Run check pipeline"),
			fmt: createPipelineCommand("fmt", "Format code"),
			lint: createPipelineCommand("lint", "Lint code"),
			typecheck: createPipelineCommand("typecheck", "Typecheck code"),
			test: createPipelineCommand("test", "Run tests"),
			build: createPipelineCommand("build", "Build scopes"),
			"list:scopes": listScopesCommand,
			"list:ports": listPortsCommand,
			"list:changed": listChangedCommand,
			"contracts:lint": createPipelineCommand(
				"contracts:lint",
				"Lint OpenAPI contracts",
			),
			"contracts:drift": createPipelineCommand(
				"contracts:drift",
				"Check OpenAPI drift",
			),
			"contracts:breaking": createPipelineCommand(
				"contracts:breaking",
				"Check OpenAPI breaking changes",
			),
			"contracts:build": createPipelineCommand(
				"contracts:build",
				"Build OpenAPI artifacts",
			),
			"contracts:client": createPipelineCommand(
				"contracts:client",
				"Generate OpenAPI client",
			),
			"docs:lint": createPipelineCommand("docs:lint", "Lint docs"),
			"docs:build": createPipelineCommand("docs:build", "Build docs"),
			"docs:serve": createPipelineCommand("docs:serve", "Serve docs"),
			"infra:up": infraUpCommand,
			"infra:down": infraDownCommand,
			"infra:ps": infraPsCommand,
			"infra:logs": infraLogsCommand,
			new: newCommand,
			delete: deleteCommand,
			"tooling:test": createPipelineCommand(
				"tooling:test",
				"Run tooling tests",
			),
			"tooling:test:e2e": createPipelineCommand(
				"tooling:test:e2e",
				"Run tooling e2e tests",
			),
		},
		docs: {
			brief: "mono-toolkit CLI",
		},
	});

	return buildApplication(routes, {
		name: "mono-toolkit",
		versionInfo: {
			currentVersion: await getPackageVersion(),
		},
		scanner: {
			caseStyle: "allow-kebab-for-camel",
		},
		documentation: {
			useAliasInUsageLine: true,
		},
	});
};
