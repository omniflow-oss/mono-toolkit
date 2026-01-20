import { numberParser } from "@stricli/core";

export const selectionFlags = {
  scope: {
    kind: "parsed",
    brief: "Scope id or path",
    parse: String,
    optional: true
  },
  tag: {
    kind: "parsed",
    brief: "Scope tag",
    parse: String,
    optional: true
  },
  changed: {
    kind: "boolean",
    brief: "Run only changed scopes",
    default: true
  },
  all: {
    kind: "boolean",
    brief: "Run all scopes",
    default: false
  },
  since: {
    kind: "parsed",
    brief: "Git ref to diff from",
    parse: String,
    optional: true
  },
  base: {
    kind: "parsed",
    brief: "Git base branch",
    parse: String,
    optional: true
  }
} as const;

export const runtimeFlags = {
  jobs: {
    kind: "parsed",
    brief: "Parallel job count",
    parse: numberParser,
    optional: true
  },
  dryRun: {
    kind: "boolean",
    brief: "Print commands without executing",
    default: false
  },
  json: {
    kind: "boolean",
    brief: "Output JSON",
    default: false
  },
  ci: {
    kind: "boolean",
    brief: "CI mode",
    default: false
  },
  verbose: {
    kind: "boolean",
    brief: "Verbose output",
    default: false
  }
} as const;
