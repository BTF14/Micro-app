#!/usr/bin/env bash
set -euo pipefail
: "\${DATABASE_URL_INVENTORY_REVIEW:?Set a disposable loopback PostgreSQL URL}"

python3 - "$DATABASE_URL_INVENTORY_REVIEW" <<'PY'
import sys
from urllib.parse import urlsplit

target = urlsplit(sys.argv[1])
if target.scheme not in ("postgres", "postgresql") or target.hostname not in ("localhost", "127.0.0.1", "::1"):
    raise SystemExit("Refusing non-loopback PostgreSQL target.")
database = target.path.lstrip("/")
if not database.startswith("inventory_review_test"):
    raise SystemExit("Refusing database name outside inventory_review_test*.")
PY

psql "$DATABASE_URL_INVENTORY_REVIEW" -X -v ON_ERROR_STOP=1 -f tools/inventory-accounting-review.sql
echo "PostgreSQL temporary-table harness passed; transaction rolled back."
