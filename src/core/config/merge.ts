export type MergePolicy = Record<string, "replace" | "concat">;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const concatUnique = (left: unknown[], right: unknown[]): unknown[] => {
	const seen = new Set(left.map((item) => JSON.stringify(item)));
	const merged = [...left];
	for (const item of right) {
		const key = JSON.stringify(item);
		if (!seen.has(key)) {
			merged.push(item);
			seen.add(key);
		}
	}
	return merged;
};

export const mergeObjects = <T>(
	base: T,
	override: Partial<T>,
	policy: MergePolicy = {},
	path: string[] = [],
): T => {
	if (!isPlainObject(base) || !isPlainObject(override)) {
		return (override ?? base) as T;
	}

	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const nextPath = [...path, key];
		const policyKey = nextPath.join(".");
		const rule = policy[policyKey];
		const baseValue = (base as Record<string, unknown>)[key];

		if (Array.isArray(baseValue) || Array.isArray(value)) {
			if (rule === "replace") {
				result[key] = value ?? baseValue;
			} else if (Array.isArray(baseValue) && Array.isArray(value)) {
				result[key] =
					rule === "concat"
						? [...baseValue, ...value]
						: concatUnique(baseValue, value);
			} else {
				result[key] = value ?? baseValue;
			}
			continue;
		}

		if (isPlainObject(baseValue) && isPlainObject(value)) {
			result[key] = mergeObjects(baseValue, value, policy, nextPath);
			continue;
		}

		result[key] = value ?? baseValue;
	}

	return result as T;
};
