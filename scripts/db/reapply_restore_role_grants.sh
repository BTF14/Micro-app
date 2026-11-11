#!/usr/bin/env bash
set -euo pipefail

: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL to a direct microapp_migrator connection string}"
: "${MIGRATIONS_DIR:?Set MIGRATIONS_DIR to the exact migration bundle used for this restore}"
profile="${RESTORE_GRANTS_PROFILE:-}"
case "$profile" in main|bcv) ;; *) echo "RESTORE_GRANTS_PROFILE must be main or bcv." >&2; exit 2;; esac
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }
for file in 0012_postgres_runtime_role_grants.sql 0013_bcv_official_rate_precision_and_grants.sql 0016_runtime_inventory_ledger_read.sql; do
  [[ -s "$MIGRATIONS_DIR/$file" ]] || { echo "Required grant migration missing: $file" >&2; exit 2; }
done

identity="$(psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user")"
[[ "$identity" == "microapp_migrator:microapp_migrator" ]] || {
  echo "Refusing restore grant bootstrap: connection must be a direct microapp_migrator login." >&2
  exit 2
}

echo "== Reapply idempotent runtime ACL contract from the versioned migrations"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/0012_postgres_runtime_role_grants.sql"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/0013_bcv_official_rate_precision_and_grants.sql"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/0016_runtime_inventory_ledger_read.sql"

if [[ "$profile" == "bcv" ]]; then
  producer_migration="$MIGRATIONS_DIR/0022_bcv_dedicated_producer_role.sql"
  [[ -s "$producer_migration" ]] || { echo "BCV producer grant migration missing." >&2; exit 2; }
  tmp_sql="$(mktemp)"
  trap 'rm -f "$tmp_sql"' EXIT
  # Reapply only the idempotent role/table/column ACL portion. The migration's
  # CREATE FUNCTION is deliberately not replayed because the restored function
  # already exists and its owner is reconstructed as microapp_migrator.
  awk '/^CREATE FUNCTION public\.lock_bcv_sync_state\(\)/ { exit } { print }' "$producer_migration" > "$tmp_sql"
  cat >> "$tmp_sql" <<'SQL'
REVOKE ALL ON FUNCTION public.lock_bcv_sync_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_bcv_sync_state() TO microapp_runtime;
COMMIT;
SQL
  psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$tmp_sql"
fi

echo "PASS: role/table/column/function ACL bootstrap replayed from the pinned migration bundle."
