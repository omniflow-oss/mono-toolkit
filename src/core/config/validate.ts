import path from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import type { AnySchema } from "ajv";
import addFormats from "ajv-formats";
import { readJsonFile } from "../fs";
import { ExitCode, ToolkitError } from "../errors";
import { getPackageRoot } from "../package-root";

const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const validatorCache = new Map<string, ValidateFunction>();

const loadValidator = async (schemaName: string): Promise<ValidateFunction> => {
	const cached = validatorCache.get(schemaName);
	if (cached) {
		return cached;
	}
	const schemaPath = path.join(
		getPackageRoot(),
		"schemas",
		`${schemaName}.schema.json`,
	);
	const schema = await readJsonFile<AnySchema>(schemaPath);
	const validator = ajv.compile(schema);
	validatorCache.set(schemaName, validator);
	return validator;
};

export const validateConfig = async (
	schemaName: string,
	data: unknown,
): Promise<void> => {
	const validator = await loadValidator(schemaName);
	const valid = validator(data);
	if (!valid) {
		throw new ToolkitError("Invalid configuration", ExitCode.InvalidConfig, {
			schema: schemaName,
			errors: validator.errors ?? [],
		});
	}
};
