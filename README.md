# Mono-Toolkit

[![Tests](https://github.com/omniflow-oss/mono-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/omniflow-oss/mono-toolkit/actions/workflows/ci.yml)
[![Docs](https://github.com/omniflow-oss/mono-toolkit/actions/workflows/docs.yml/badge.svg)](https://github.com/omniflow-oss/mono-toolkit/actions/workflows/docs.yml)
[![Coverage](https://img.shields.io/badge/coverage-86.98%25-yellowgreen)](https://github.com/omniflow-oss/mono-toolkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ofcx/mono-toolkit)](https://www.npmjs.com/package/@ofcx/mono-toolkit)
[![downloads](https://img.shields.io/npm/dm/@ofcx/mono-toolkit)](https://www.npmjs.com/package/@ofcx/mono-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Deterministic Docker-first monorepo toolkit for Quarkus services, Nuxt apps, shared libraries, and OpenAPI contracts.

Documentation: https://omniflow-oss.github.io/mono-toolkit/

## Highlights

- Discovers scopes under `back/` and `front/` automatically.
- Runs pipelines in Docker for reproducible builds.
- Default `--changed` execution for faster CI.
- Contracts workflows with OpenAPI lint, drift, breaking, and client generation.
- VitePress docs workflows for target repos.
- Vertical-slice scaffolding with consistent structure.
- JSON reports in `.cache/mono-toolkit/reports`.

## Install

```bash
pnpm add -D @ofcx/mono-toolkit
```

## Quick start

```bash
npx mono-toolkit init
npx mono-toolkit check
```

## Docs

- Guide: https://omniflow-oss.github.io/mono-toolkit/guide
- Commands: https://omniflow-oss.github.io/mono-toolkit/commands
- Configuration: https://omniflow-oss.github.io/mono-toolkit/configuration

## License

MIT. See `LICENSE`.
