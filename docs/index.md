# Mono-Toolkit

Deterministic Docker-first monorepo tooling for Quarkus services, Nuxt apps, shared libraries, and OpenAPI contracts.

## What it does

- Discovers scopes under `back/` and `front/` automatically.
- Runs tasks via Docker to keep builds reproducible.
- Defaults to `--changed` execution for faster CI.
- Provides contracts and docs pipelines with reports under `.cache/mono-toolkit`.
- Generates OpenAPI TypeScript clients and Nuxt API plugins.
- Scaffolds vertical-slice features with consistent structure.

## Quick start

```bash
pnpm add -D @ofcx/mono-toolkit
npx mono-toolkit init
```

Run a pipeline:

```bash
npx mono-toolkit check
```

## Key paths

- Config: `config/*.json`
- Tool configs: `config/tools/**`
- Cache/reports: `.cache/mono-toolkit/**`
- Templates: `templates/**`

## Next

Start with the [Getting Started](./guide) guide or jump to [Commands](./commands).
