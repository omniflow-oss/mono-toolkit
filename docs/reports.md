# Reports

Reports are written under `.cache/mono-toolkit/reports`.

## Summary

`summary.json` includes:

- pipeline
- status
- scopes + task results
- task metadata (command, duration, cached)
- error excerpts when a task fails

## Scope reports

Each scope gets `reports/scopes/<scope>.json` with its task results.

## OpenAPI

- `reports/openapi/<service>/breaking.json`
