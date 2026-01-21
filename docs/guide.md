# Getting Started

## Install

```bash
pnpm add -D @ofcx/mono-toolkit
```

## Initialize a repo

```bash
npx mono-toolkit init
```

This creates:

- `config/*.json` defaults
- `config/tools/**` tool configs
- `.cache/mono-toolkit/**` cache layout
- `infra/tools.compose.yaml` and `infra/Dockerfile.tools`
- a `biome.jsonc` router

## Run common pipelines

```bash
npx mono-toolkit check
npx mono-toolkit build
npx mono-toolkit test --all
```

## How execution works

- All commands (except `init` and optional `infra:*`) run in Docker.
- Selection defaults to `--changed` unless you pass `--all`, `--scope`, or `--tag`.
- Reports land in `.cache/mono-toolkit/reports`.
