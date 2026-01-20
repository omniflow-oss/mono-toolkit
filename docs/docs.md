# Docs Workflows

Docs commands run VitePress tasks against the configured docs root.

```bash
npx mono-toolkit docs:lint
npx mono-toolkit docs:build
npx mono-toolkit docs:serve
```

Config:

- `docs.root` points to the target repo docs folder.

Commands run inside the tools container via `pnpm -C <docsRoot> <command>`.
