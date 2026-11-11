#!/usr/bin/env bash
set -euo pipefail

: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL to a direct microapp_migrator connection string}"
: "${MIGRATIONS_DIR:?Set MIGRATIONS_DIR to the exact migration bundle used for this restore}"
profile="${RESTORE_GRANTS_PROFILE:-}"
case "$profile" in main|bcv) ;; *) echo "RESTORE_GRANTS_PROFILE must be main or bcv." >&2; exit 2;; esac
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }
command -v awk >/dev/null 2>&1 || { echo "awk is required." >&2; exit 2; }

identity="$(psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user")"
[[ "$identity" == "microapp_migrator:microapp_migrator" ]] || {
  echo "Refusing restore grant bootstrap: connection must be a direct microapp_migrator login." >&2
  exit 2
}

shopt -s nullglob
migration_files=()
for file in "$MIGRATIONS_DIR"/[0-9][0-9][0-9][0-9]_*.sql; do
  case "$file" in *.assertions.sql|*.deferred_failure.sql) continue ;; esac
  migration_files+=("$file")
done
expected=16
[[ "$profile" == "bcv" ]] && expected=22
[[ "${#migration_files[@]}" -eq "$expected" ]] || {
  echo "Refusing ACL replay: profile $profile requires exactly $expected numbered migrations; found ${#migration_files[@]}." >&2
  exit 2
}

tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT
{
  echo "BEGIN;"
  # Replay only top-level ACL statements in migration order. Never rerun table,
  # index, function, trigger, or data DDL: schema_migrations already records
  # those changes as applied. Later REVOKEs therefore supersede old GRANTs.
  for file in "${migration_files[@]}"; do
    awk '
      BEGIN { capture = 0; statement = "" }
      capture {
        statement = statement "\n" $0
        if ($0 ~ /;[[:space:]]*$/) { print statement; capture = 0; statement = "" }
        next
      }
      /^[[:space:]]*(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)[[:space:]]/ {
        capture = 1
        statement = $0
        if ($0 ~ /;[[:space:]]*$/) { print statement; capture = 0; statement = "" }
        next
      }
    ' "$file" | {
      if [[ "$profile" == "bcv" ]]; then
        # Projection migration 0019 removes these paired-intent objects. Skip
        # only their now-inapplicable historical ACL statements.
        grep -Ev 'inventory_balance_ledger_intents|record_inventory_balance_ledger_intent|consume_inventory_balance_ledger_intent|assert_inventory_balance_ledger_intent_consumed' || true
      else
        cat
      fi
    }
  done
  echo "COMMIT;"
} > "$tmp_sql"

if ! grep -Eq '^[[:space:]]*GRANT[[:space:]]|^[[:space:]]*REVOKE[[:space:]]|^[[:space:]]*ALTER DEFAULT PRIVILEGES[[:space:]]' "$tmp_sql"; then
  echo "No ACL statements were found in the pinned migration profile." >&2
  exit 1
fi

echo "== Replay final ACL history ($profile profile, $expected migrations; no schema/data DDL)"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$tmp_sql"
echo "PASS: ordered migration ACL history replayed without rerunning schema/data DDL."
