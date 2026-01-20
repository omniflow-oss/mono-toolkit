# Scopes

Scopes are repo units discovered from configured roots:

- `back/services/*` → `back:service:<name>`
- `back/libs/*` → `back:lib:<name>`
- `front/apps/*` → `front:app:<name>`
- `front/packages/*` → `front:package:<name>`

Special scopes are added when paths exist:

- `contracts:root`
- `docs:root`
- `infra:root`
- `tooling:root`
- `global:root`

## Overrides

`config/scopes.json` can override:

- `profile`
- `tags`
- `port`
- `deps`
- exclusions

## Deterministic ports

Service scopes receive a deterministic port if not overridden, derived from the scope id.
