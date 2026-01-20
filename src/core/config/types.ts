export type ScopeType =
  | "service"
  | "lib"
  | "app"
  | "package"
  | "contracts"
  | "docs"
  | "tooling"
  | "infra"
  | "global";

export interface PathsConfig {
  backServices: string;
  backLibs: string;
  frontApps: string;
  frontPackages: string;
  contracts: string;
  docs: string;
  infra: string;
}

export interface ChangedConfig {
  toolingPrefixes: string[];
  contractsPrefix: string;
  docsPrefix: string;
  defaultBaseBranch: string;
}

export interface GitConfig {
  defaultBranch: string;
  allowFetchBase: boolean;
}

export interface DockerConfig {
  composeFile: string;
  service: string;
  entry: string;
  command: string;
  infraCompose: string;
}

export interface ToolsConfig {
  nodeVersion: string;
  pnpmVersion: string;
}

export interface TaskDefinition {
  command: string[];
  env?: Record<string, string>;
  inputs?: string[];
  outputs?: string[];
  cacheable?: boolean;
}

export interface PipelineConfig {
  [pipeline: string]: string[];
}

export interface ProfileConfig {
  executor: "pnpm" | "maven" | "custom";
  baseArgs?: string[];
}

export interface TasksConfig {
  jobs: number;
  pipelines: PipelineConfig;
  profiles: Record<string, ProfileConfig>;
  taskGraph: Record<string, TaskDefinition>;
}

export interface ContractsConfig {
  authoritative: "design" | "runtime";
  root: string;
  runtimePath: string;
  allowlist: string[];
}

export interface DocsConfig {
  root: string;
}

export interface PoliciesConfig {
  sanitizePattern: string;
  maxNameLength: number;
}

export interface ScopesConfig {
  overrides: Record<string, Partial<ScopeRecord>>;
  exclude: string[];
}

export interface ArchConfig {
  enabled: boolean;
  templatePath: string;
}

export interface ScopeRecord {
  id: string;
  type: ScopeType;
  path: string;
  profile: string;
  tags: string[];
  port?: number;
  deps?: string[];
}

export interface ToolkitConfig {
  paths: PathsConfig;
  changed: ChangedConfig;
  git: GitConfig;
  docker: DockerConfig;
  tools: ToolsConfig;
  tasks: TasksConfig;
  contracts: ContractsConfig;
  docs: DocsConfig;
  policies: PoliciesConfig;
  scopes: ScopesConfig;
  arch: ArchConfig;
}

export interface ConfigMap {
  paths: PathsConfig;
  changed: ChangedConfig;
  git: GitConfig;
  docker: DockerConfig;
  tools: ToolsConfig;
  tasks: TasksConfig;
  contracts: ContractsConfig;
  docs: DocsConfig;
  policies: PoliciesConfig;
  scopes: ScopesConfig;
  arch: ArchConfig;
}

export const configFiles = [
  "paths",
  "changed",
  "git",
  "docker",
  "tools",
  "tasks",
  "contracts",
  "docs",
  "policies",
  "scopes",
  "arch"
] as const;

export type ConfigName = (typeof configFiles)[number];
