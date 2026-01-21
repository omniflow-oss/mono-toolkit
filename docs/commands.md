# Commands

## Core

- `init`
- `doctor` (`--fix` supported)
- `bootstrap`, `dev`, `check`, `fmt`, `lint`, `typecheck`, `test`, `build`

## Lists

- `list:scopes`
- `list:ports`
- `list:changed`

## Contracts

- `contracts:lint`
- `contracts:drift`
- `contracts:breaking`
- `contracts:build`
- `contracts:client`

## Docs

- `docs:lint`
- `docs:build`
- `docs:serve`

## Infra

- `infra:up`
- `infra:down`
- `infra:ps`
- `infra:logs`

## Scaffolding

- `new <type> <name>`
- `delete <type> <name>`
- `new feature <name> --in <serviceScope>`

## Tooling tests

- `tooling:test`
- `tooling:test:e2e`

## Flags

```
--scope <pathOrId>
--tag <tag>
--changed
--all
--since <gitRef>
--base <branch>
--jobs <n>
--dry-run
--json
--ci
--verbose
```
