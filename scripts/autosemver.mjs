import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const getLatestTag = () => {
	try {
		const tag = execSync("git tag --list 'v*' --sort=-v:refname", {
			encoding: "utf8",
		}).trim();
		return tag.split("\n").find(Boolean) ?? null;
	} catch {
		return null;
	}
};

const readCommits = (range) => {
	const command = range
		? `git log ${range} --pretty=%B`
		: "git log --pretty=%B";
	try {
		return execSync(command, { encoding: "utf8" }).trim();
	} catch {
		return "";
	}
};

const bumpVersion = (version, bump) => {
	const [major, minor, patch] = version.split(".").map(Number);
	if (bump === "major") {
		return `${major + 1}.0.0`;
	}
	if (bump === "minor") {
		return `${major}.${minor + 1}.0`;
	}
	return `${major}.${minor}.${patch + 1}`;
};

const detectBump = (log) => {
	if (!log) {
		return null;
	}
	if (/BREAKING CHANGE|!:/m.test(log)) {
		return "major";
	}
	if (/^feat(\(.+\))?:/m.test(log)) {
		return "minor";
	}
	if (/^fix(\(.+\))?:/m.test(log)) {
		return "patch";
	}
	return "patch";
};

const output = process.env.GITHUB_OUTPUT;
const emit = (key, value) => {
	if (output) {
		writeFileSync(output, `${key}=${value}\n`, { flag: "a" });
	}
};

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const latestTag = getLatestTag();
const range = latestTag ? `${latestTag}..HEAD` : null;
const log = readCommits(range);
const bump = detectBump(log);

if (!bump) {
	emit("released", "false");
	process.exit(0);
}

const nextVersion = bumpVersion(pkg.version, bump);
pkg.version = nextVersion;
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
try {
	execSync("pnpm biome format --write package.json", {
		stdio: "ignore",
	});
} catch {
	// ignore formatting failures
}
emit("released", "true");
emit("version", nextVersion);
console.log(`Next version: ${nextVersion}`);
