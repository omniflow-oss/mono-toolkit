# Pipelines

Pipelines are defined in `config/tasks.json` under `pipelines` and map to task ids.

## Default pipeline

`check` runs:

- `lint`
- `typecheck`
- `test`
- `check:arch`
- `build`

## Selection behavior

- `--changed` is default.
- `--all` overrides.
- `--scope`/`--tag` override `--changed`.

## Parallelism

`tasks.jobs` controls parallel scopes.

## Tooling pipelines

Contracts and docs pipelines run via the toolkit runners and may write
additional reports and artifacts under `.cache/mono-toolkit`.
