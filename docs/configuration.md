# Configuration

Mono-Toolkit reads defaults from `mono-toolkit/config/defaults/**` and merges repo overrides from `config/*.json`.

## Required config files

- `paths.json`
- `changed.json`
- `git.json`
- `docker.json`
- `tools.json`
- `tasks.json`
- `contracts.json`
- `docs.json`
- `policies.json`
- `scopes.json`
- `arch.json`

## Merge rules

- Objects: deep merge
- Arrays: concat unique
- Optional overrides via `config/merge-policy.json`

## Validation

Each config file is validated against schemas in `schemas/**`. Invalid config exits with code `2`.

## Example override

```json
{
  "git": {
    "defaultBranch": "main",
    "allowFetchBase": true
  }
}
```
