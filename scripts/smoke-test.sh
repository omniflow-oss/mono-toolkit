#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

cd "${TEMP_DIR}"

(cd "${ROOT_DIR}" && pnpm build)

cat > package.json <<'EOF'
{
  "name": "mono-toolkit-smoke",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "docs:lint": "markdownlint-cli2 'docs/**/*.md'"
  }
}
EOF

pnpm add -D "${ROOT_DIR}"

mkdir -p back/services/foo
mkdir -p front/apps/web
mkdir -p front/packages/api/src/services
mkdir -p contracts/foo

cat > contracts/foo/openapi.yaml <<'EOF'
openapi: 3.0.0
info:
  title: Foo
  version: 1.0.0
paths: {}
EOF

MONO_TOOLKIT_INIT_ALLOW_BUILD_FAILURE=true npx mono-toolkit init
npx mono-toolkit doctor --json

npx mono-toolkit list:scopes --json
npx mono-toolkit list:ports --json

npx mono-toolkit check --dry-run --all
npx mono-toolkit contracts:lint --dry-run --scope back:service:foo
npx mono-toolkit contracts:client --dry-run --scope back:service:foo
npx mono-toolkit docs:lint --dry-run --all

npx mono-toolkit new service bar
npx mono-toolkit new feature orders --in back:service:foo
npx mono-toolkit delete feature orders --in back:service:foo

test -f .cache/mono-toolkit/reports/summary.json
echo "Smoke test complete: ${TEMP_DIR}"
