# Tasks

Tasks are defined in `config/tasks.json` under `taskGraph`.

## Task definition

```json
{
  "command": ["lint"],
  "env": { "CI": "1" },
  "deps": ["setup"],
  "inputs": ["src/**"],
  "outputs": ["dist/**"],
  "cacheable": true
}
```

## Executors

- `pnpm`: `pnpm -C <scope.path> ...`
- `maven`: `mvn -pl <scope.path> -am ...`
- `custom`: uses `baseArgs` + task command
 
Tooling tasks (`contracts:*`, `docs:*`) are executed via the toolkit runner.

## Caching

If `cacheable` is true and the input hash matches the cached entry, the task is skipped and marked `cached` in reports.

Metadata is stored at `.cache/mono-toolkit/cache/tasks.json` with input hashes and output paths.
