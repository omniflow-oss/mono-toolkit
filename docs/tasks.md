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

## Caching

If `cacheable` is true and all outputs are newer than inputs, the task is skipped and marked `cached` in reports.

Metadata is stored at `.cache/mono-toolkit/cache/tasks.json` with input hashes and output paths.
