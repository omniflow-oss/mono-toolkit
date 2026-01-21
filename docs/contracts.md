# Contracts

Contracts workflows target service scopes and operate on `contracts/<service>/openapi.yaml`.

If `contracts.allowlist` is non-empty, only services in the list are eligible for contracts pipelines.

Use `contracts.driftIgnore` to supply JSON pointer patterns ignored by drift and breaking checks.

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
- Direction follows `contracts.authoritative` (design vs runtime).

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

The generated client is written to `front/packages/api/src/services/<service>` and
Nuxt apps get/refresh `plugins/api.ts` with `$api.<service>` clients.

Generated clients depend on `openapi-fetch` in the target repo.

Nuxt runtime config expects:

```ts
public: {
  api: {
    <service>: { baseURL: "https://..." }
  }
}
```
