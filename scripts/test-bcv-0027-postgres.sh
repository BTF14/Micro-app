#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL_ADMIN:?DATABASE_URL_ADMIN must point to disposable PostgreSQL 18}"
case "$DATABASE_URL_ADMIN" in
 postgres://microapp:*@localhost:5432/microapp_test|postgres://microapp:*@127.0.0.1:5432/microapp_test|postgresql://microapp:*@localhost:5432/microapp_test|postgresql://microapp:*@127.0.0.1:5432/microapp_test) ;;
 *) echo "Refusing non-disposable BCV 0027 test target." >&2; exit 2 ;;
esac
pnpm --filter @micro-app/api exec vitest run src/bcv-0027.integration.test.ts
