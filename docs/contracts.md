# Contracts

Contracts workflows target service scopes and operate on `contracts/<service>/openapi.yaml`.

If `contracts.allowlist` is non-empty, only services in the list are eligible for contracts pipelines.

## Lint

Runs Spectral against the design spec:

```bash
npx mono-toolkit contracts:lint
```

## Drift

Compares design vs runtime:

- Fetches runtime spec from `http://localhost:<port>/q/openapi?format=json`.
- Normalizes both specs.
- Runs `oasdiff diff`.

```bash
npx mono-toolkit contracts:drift --scope back:service:alpha
```

## Breaking

Diffs base vs head design specs using git:

```bash
npx mono-toolkit contracts:breaking --scope back:service:alpha
```

Reports go to `.cache/mono-toolkit/reports/openapi/<service>/breaking.json`.

## Client generation

```bash
npx mono-toolkit contracts:client --scope back:service:alpha
```

Generates a TypeScript client at `.cache/mono-toolkit/reports/openapi/<service>/client.ts`.
