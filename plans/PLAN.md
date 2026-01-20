# Mono-Toolkit — Exhaustive Spec (v1.1)

> Package: `ofcx/mono-toolkit`
> Repo: `mono-toolkit`
> CLI bin: `mono-toolkit`
> Primary targets: **Quarkus 3.30** services/libs + **Nuxt 4 / Nuxt UI v4** apps/packages + OpenAPI contract workflows + docs.

---

## 1) North Star

### Goal

Provide **one deterministic, Docker-first monorepo toolkit** usable via `npx` or as a dependency that standardizes:

* scope discovery (back/services, back/libs, front/apps, front/packages)
* changed-based execution by default
* task pipelines (fmt/lint/typecheck/test/build/check/dev)
* contracts (lint / drift / breaking / build / TS client generation)
* docs (target repo docs) + **VitePress docs for the toolkit itself**
* infra orchestration (compose-driven tools container + optional repo infra)
* scaffolding aligned with **vertical slice architecture**
* diagnostics (doctor) + consistent machine-readable reports

### Core hypotheses

* Determinism and governance > host-native convenience.
* Monorepos share enough structure to standardize workflows.
* Default `--changed` yields major CI/runtime savings.
* Config is the customization API; CLI is stable UX.
* Tool versions and tool configs must be centralized and pinned.

---

## 2) Non-goals

* Not replacing Maven/pnpm; it orchestrates them.
* Not providing production infra provisioning beyond compose wrappers.
* Not enforcing one business domain; it enforces build/quality/process contracts.

---

## 3) Hard requirements (locked)

1. All runtime artifacts and caches live under repo root: **`.cache/mono-toolkit/**`**.
2. All tool configs are centralized under: **`config/tools/**`** in target repos.
3. All commands run in Docker **except**: `init`, and optionally `infra:*` (host by default).
4. Tools container image starts from **GraalVM (native-image capable)**, then adds Node + pnpm + toolchain.
5. OpenAPI drift compares **dev-authored spec** vs **Quarkus runtime spec** fetched from `/q/openapi?format=json`.
6. Nuxt types/client generation uses **openapi-typescript + openapi-fetch** by default.
7. Vertical slice architecture is first-class: scaffolding + architecture checks.

---

## 4) Package deliverable

### 4.1 Published artifacts

* `dist/**` (compiled runtime)
* `config/defaults/**` (default JSON config)
* `config/tools/**` (default tool config templates)
* `schemas/**` (JSON Schemas)
* `templates/**` (scaffolding)
* `docs/**` (VitePress content for toolkit docs)

### 4.2 Module/runtime strategy

* Toolkit source is TypeScript.
* Build to `dist/` (CJS entrypoint for stable `bin` across Node environments).

---

## 5) CLI Contract

### 5.1 Commands

**Core**

* `init`
* `doctor` (`doctor --fix` supported)
* `bootstrap`
* `dev`
* `check`
* `fmt`
* `lint`
* `typecheck`
* `test`
* `build`

**Lists**

* `list:scopes`
* `list:ports`
* `list:changed`

**Contracts**

* `contracts:lint`
* `contracts:drift`
* `contracts:breaking`
* `contracts:build`

**Docs (target repo docs)**

* `docs:lint`
* `docs:build`
* `docs:serve`

**Infra**

* `infra:up`
* `infra:down`
* `infra:ps`
* `infra:logs`

**Scaffolding**

* `new <type> <name>`
* `delete <type> <name>`
* `new feature <name> --in <serviceScope>`  ← vertical slice

**Tooling tests**

* `tooling:test`
* `tooling:test:e2e`

### 5.2 Types

* `type`: `service | lib | app | package | feature`

### 5.3 Flags

* `--scope <pathOrId>`
* `--tag <tag>`
* `--changed` (default)
* `--all`
* `--since <gitRef>`
* `--base <branch>`
* `--jobs <n>`
* `--dry-run`
* `--json`
* `--ci`
* `--verbose | -v`

### 5.4 Default execution behavior

* Default selection: `--changed` unless `--all` or `--scope` or `--tag`.
* `check` pipeline is config-driven but defaults to: `lint → typecheck → test → build`.
* All commands (except `init`, host-level `infra:*` by default) run inside Docker.

### 5.5 Exit codes (stable)

* `0`: success
* `1`: task failed
* `2`: invalid config
* `3`: docker/compose missing
* `4`: git missing / cannot compute base
* `5`: repository root not found

---

## 6) Repository root detection

Walk upward from cwd looking for:

* `pnpm-workspace.yaml`, OR
* `package.json` with `"private": true`

---

## 7) Scope model

### 7.1 Scope structure

Each scope is a stable record:

* `id`: stable, e.g. `back:service:<name>`
* `type`: `service|lib|app|package|contracts|docs|tooling|infra|global`
* `path`: repo-relative
* `profile`: execution profile name
* `tags`: string[]
* `port`: number (optional)
* `deps`: scope ids[] (optional)

### 7.2 Discovery

* Folder scan using `config/paths.json`:

  * `<backServices>/*`, `<backLibs>/*`, `<frontApps>/*`, `<frontPackages>/*`
* Overlay optional `config/scopes.json` to override/add:

  * ports, tags, profile, deps, excluded scopes.

### 7.3 Special scopes

* `__ALL__` if tooling-affecting changes detected
* `__CONTRACTS__` if contracts prefix changed
* `__DOCS__` if docs prefix changed

---

## 8) Changed detection (CI-grade)

### 8.1 Base resolution

* If `--since` provided → use it.
* Else, if CI base ref env present (`GITHUB_BASE_REF`, MR target) → diff vs that.
* Else, use merge-base: `git merge-base HEAD <defaultBranch>`.
* If shallow clone prevents merge-base, toolkit may fetch base ref (config-controlled).

### 8.2 Mapping changed files → scopes

* If file matches any `toolingPrefixes` → `__ALL__`
* If under contracts prefix → `__CONTRACTS__`
* If under docs prefix → `__DOCS__`
* Else match first-level folders in scope roots.

---

## 9) Config system (target repo overrides)

### 9.1 Location

* Toolkit defaults ship in `mono-toolkit/config/defaults/**`.
* Target monorepo overrides in `repo/config/**` (same filenames).

### 9.2 Merge strategy

* Objects: deep merge
* Arrays: concatUnique
* Per-field merge policy supported via `config/merge-policy.json` (optional)

### 9.3 Validation

* Every config validated against JSON Schema (`schemas/**`). Invalid config is hard error (exit 2).

---

## 10) Target repo cache contract + permissions

### 10.1 Directories

Toolkit creates and uses:

```
.cache/mono-toolkit/
  cache/
    pnpm-store/
    m2/
    oas/
  tmp/
    openapi/
    work/
  reports/
    summary.json
    openapi/
    lint/
    test/
```

### 10.2 Permissions

* Directories: `0775`
* Files: `0664`
* Tools container sets `umask 0002`.
* `doctor` verifies container user can write caches.

---

## 11) Docker execution model

### 11.1 Mandatory wrapper

All non-host commands run via:

* `docker compose -f <repoRoot>/<infraCompose> run --rm <service> <entry> ...`

### 11.2 Tools image

* Base: GraalVM native-image capable image.
* Adds:

  * `git`, `curl`, `bash`
  * Node (pinned)
  * pnpm (via corepack)
  * CLI tools (spectral, openapi-typescript, oasdiff, swagger-cli, biome)
  * Maven (if not included) and system deps for native builds.

### 11.3 Compose mounts

* Repo root → `/workspace`
* `.cache/mono-toolkit/cache/pnpm-store` → `/pnpm-store`
* `.cache/mono-toolkit/cache/m2` → `/home/dev/.m2`

### 11.4 User mode

Default: `hostUser`.

* Compose uses `${UID}:${GID}`.
* Entry script ensures writable volumes.

---

## 12) Central tool configs under `config/tools/**` (target repo)

### 12.1 Structure

```
config/tools/
  biome/biome.base.jsonc
  spectral/.spectral.yaml
  spectral/rules/*.yaml
  spotless/eclipse-formatter.xml
  spotless/importorder.txt
  spotbugs/exclude.xml
  openapi/normalize.json
  openapi/oasdiff.conf.yaml
  archunit/ArchRules.java.template (optional)
```

### 12.2 Routing patterns

* `biome.jsonc` at repo root is a thin router that extends `config/tools/biome/biome.base.jsonc`.
* Maven plugins reference config files in `config/tools/**`.

---

## 13) Task execution (profiles + task graph)

### 13.1 Files

* `config/tasks.json` defines:

  * `pipelines`
  * `profiles`
  * `taskGraph` (deps, inputs, outputs, cacheable)

### 13.2 Executors

* Java (Maven): `mvn -pl <module> -am ...`
* JS (pnpm): `pnpm -C <path> ...` or `pnpm -r --filter ...`

### 13.3 Parallelism

* Config default `jobs`.
* Safe parallel groups:

  * JS scopes: parallel OK
  * Maven scopes: parallel with `-T 1C` or controlled mode

---

## 14) Vertical slice architecture support

### 14.1 Required conventions (Quarkus scopes)

Within each service/lib:

```
src/main/java/.../features/<feature>/
  api/
  application/
  domain/
  infrastructure/
shared/
```

Rules:

* No direct imports across `features/*`.
* Cross-feature collaboration only via:

  * explicit application ports
  * events
  * shared contracts

### 14.2 Scaffolding

`mono-toolkit new feature <name> --in <service>` generates:

* API: Resource, DTOs
* Application: UseCase + Port interfaces
* Domain: model + errors
* Infrastructure: adapter skeleton
* Tests: per layer

### 14.3 Architecture checks

Command: `check:arch`

* Default implementation uses an **ArchUnit test template** (recommended).
* Alternative baseline: static import scanning rules.
* `check` pipeline includes `check:arch` for quarkus profiles.

---

## 15) OpenAPI workflows

### 15.1 Source of truth

Default `config/contracts.json`:

* `authoritative = "design"`
  Meaning:
* Dev-authored spec is canonical:

  * `contracts/<service>/openapi.yaml`
* Runtime spec must match (drift check)

### 15.2 Quarkus runtime spec capture

`contracts:drift` for a service scope:

1. Start service with deterministic port (profile-controlled). Options:

   * CI: `mvn -pl <svc> test` with profile to boot HTTP (recommended)
   * Local: `mvn -pl <svc> quarkus:dev`
2. Fetch runtime spec:

   * `GET http://localhost:<port>/q/openapi?format=json`
3. Normalize runtime and design specs.
4. Diff. Fail if drift unless allowlisted.

### 15.3 Normalization

Both specs normalized via:

* bundle references
* deterministic ordering
* canonical output YAML

Stored under:

* `.cache/mono-toolkit/cache/oas/<svc>/design.norm.yaml`
* `.cache/mono-toolkit/cache/oas/<svc>/runtime.norm.yaml`

### 15.4 Drift allowlist

`config/contracts.json` supports:

* ignore rules by JSON pointer patterns
* ignore server URLs/tags ordering/etc.

### 15.5 Breaking changes

`contracts:breaking` compares:

* design spec at base vs head
* Uses `oasdiff`.
  Outputs:
* `.cache/mono-toolkit/reports/openapi/<svc>/breaking.json`

---

## 16) Nuxt 4 type generation

### 16.1 Default strategy

* Generate types: `openapi-typescript`
* Typed client: `openapi-fetch`

### 16.2 Output package

Generated in:

* `front/packages/api/`
  Structure:
* `src/services/<svc>/schema.ts`
* `src/services/<svc>/client.ts`
* `src/services/<svc>/index.ts`
* `src/index.ts`

### 16.3 Nuxt integration

Each Nuxt app has `plugins/api.ts`:

* reads `runtimeConfig.public.api.*.baseURL`
* provides `$api.<svc>` clients
* integrates auth headers, correlation-id, SSR-safe fetch

---

## 17) Docs

### 17.1 Toolkit docs (VitePress)

* `mono-toolkit/docs/**` is a VitePress site for toolkit documentation.
* Commands in toolkit repo:

  * `pnpm docs:dev`
  * `pnpm docs:build`

### 17.2 Target repo docs

`mono-toolkit docs:*` commands operate on `repo/docs` (configurable).

---

## 18) Reports contract

Always write a summary:

* `.cache/mono-toolkit/reports/summary.json`

Per task and per scope:

* status, duration, command, artifacts, error excerpts

Optional:

* `reports/junit.xml` (if CI requires)

---

## 19) Security / safety requirements

* No shell string concatenation: spawn with argv arrays only.
* Validate all paths remain under repo root.
* Sanitize scaffold names (`[a-z0-9-]`), length-limited.
* Config cannot inject arbitrary docker args (whitelist only).
* Verbose logs redact env secrets.

---

## 20) Init behavior (target repo bootstrapping)

`mono-toolkit init` (host):

* Creates `config/*.json` files if missing
* Copies tool configs into `config/tools/**` if missing
* Creates `.cache/mono-toolkit/**` structure with permissions
* Creates `infra/tools.compose.yaml` and `infra/Dockerfile.tools` if missing
* Creates root `biome.jsonc` router if missing
* Optionally initializes contracts skeleton and spectral ruleset

---

## 21) Tooling tests

### 21.1 Unit tests

* Merge semantics
* root detection
* git base resolution
* path sanitization
* scope discovery

### 21.2 E2E tests

* Run against temp monorepo fixture
* Validate:

  * docker runner wiring
  * caches are writable
  * contracts:drift works (mock service)
  * openapi types generation emits expected exports

---

## 22) Publishing

* Versioning: changesets
* Build: `pnpm build` produces `dist/`
* Publish: `pnpm publish --access public`

---

## 23) Required file trees

### 23.1 mono-toolkit package tree (authoritative)

(see implementation tree in section 4)

### 23.2 Target repo additions (authoritative)

```
config/
  paths.json
  changed.json
  git.json
  docker.json
  tools.json
  tasks.json
  contracts.json
  docs.json
  policies.json
  scopes.json
  arch.json
  tools/**

.cache/mono-toolkit/**
infra/
  tools.compose.yaml
  Dockerfile.tools
```

---

## 24) Default configs (authoritative set)

The toolkit ships defaults for:

* `paths.json`
* `changed.json`
* `git.json`
* `docker.json`
* `tools.json`
* `tasks.json`
* `contracts.json`
* `docs.json`
* `policies.json`
* `scopes.json`
* `arch.json`

Each has a JSON schema under `schemas/**`.

---

## 25) Implementation notes (non-normative)

* Prefer node 20+.
* Prefer deterministic ports allocation: base + hash(scopeId) range.
* Prefer caching by input/output keys in `.cache/mono-toolkit/cache`.

---

## Appendix A — Concrete “missing” best practices included

* scopes overlay file
* task graph with cache keys
* CI-grade merge-base diff strategy
* strict security hardening for command runner
* standardized reports + json output
* vertical slice scaffolding + arch checks
* openapi drift normalization + ignore rules
* Nuxt runtime plugin generation
* toolkit VitePress docs

