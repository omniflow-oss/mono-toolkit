# Scaffolding

## New scope

```bash
npx mono-toolkit new service billing
npx mono-toolkit new app web
```

## New feature (vertical slice)

```bash
npx mono-toolkit new feature orders --in back:service:billing
```

Creates:

- `api/` resource stub
- `application/` use case stub
- `domain/` model stub
- `infrastructure/` adapter stub
- `tests/` test stub

All paths are validated to remain under the repo root.
