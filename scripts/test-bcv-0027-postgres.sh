#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL_ADMIN:?DATABASE_URL_ADMIN must point to disposable PostgreSQL 18}"
case "$DATABASE_URL_ADMIN" in
 postgres://microapp:*@localhost:5432/microapp_test|postgres://microapp:*@127.0.0.1:5432/microapp_test|postgresql://microapp:*@localhost:5432/microapp_test|postgresql://microapp:*@127.0.0.1:5432/microapp_test) ;;
 postgres://microapp:*@postgres:5432/microapp_test|postgresql://microapp:*@postgres:5432/microapp_test) [[ "${CI:-}" == "true" ]] || { echo "Service-host targets are allowed only inside GitHub Actions." >&2; exit 2; } ;;
 *) echo "Refusing non-disposable BCV 0027 test target." >&2; exit 2 ;;
esac
server_version="$(psql "$DATABASE_URL_ADMIN" -X -v ON_ERROR_STOP=1 -Atc "SHOW server_version_num")"
if [[ "$server_version" -lt 180000 || "$server_version" -ge 190000 ]]; then
  echo "BCV 0027 integration matrix requires PostgreSQL 18; got server_version_num=$server_version." >&2
  exit 2
fi
pnpm --filter @micro-app/api exec vitest run src/bcv-0027.integration.test.ts
