# Contracts

Contracts workflows target service scopes and operate on `contracts/<service>/openapi.yaml`.

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
