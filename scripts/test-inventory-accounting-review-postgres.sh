#!/usr/bin/env bash
set -euo pipefail
: "$DATABASE_URL_INVENTORY_REVIEW"
case "$DATABASE_URL_INVENTORY_REVIEW" in *localhost*|*127.0.0.1*|*::1*) ;; *) echo "Refusing non-loopback PostgreSQL target." >&2; exit 2 ;; esac
database_name="$(psql "$DATABASE_URL_INVENTORY_REVIEW" -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT current_database()' 2>/dev/null)"
case "$database_name" in inventory_review_test*) ;; *) echo "Refusing database name outside inventory_review_test*." >&2; exit 2 ;; esac
psql "$DATABASE_URL_INVENTORY_REVIEW" -X -v ON_ERROR_STOP=1 -f tools/inventory-accounting-review.sql
echo "PostgreSQL temporary-table harness passed; transaction rolled back."
