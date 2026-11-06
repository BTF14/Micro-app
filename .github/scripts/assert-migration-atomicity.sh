#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER is required}"
: "${MIGRATION_FILE:?MIGRATION_FILE is required}"
: "${ROLLBACK_ASSERTION_SQL:?ROLLBACK_ASSERTION_SQL is required}"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE" >&2
  exit 2
fi

# This helper is only for historical migrations that do not own their
# transaction. Refuse files with an explicit top-level BEGIN/COMMIT so the
# psql --single-transaction wrapper cannot accidentally nest or commit early.
if grep -Eq '^[[:space:]]*BEGIN[[:space:]]*;[[:space:]]*$' "$MIGRATION_FILE" ||
   grep -Eq '^[[:space:]]*COMMIT[[:space:]]*;[[:space:]]*$' "$MIGRATION_FILE"; then
  echo "Refusing to wrap a migration that declares its own transaction: $MIGRATION_FILE" >&2
  exit 2
fi

temporary_migration="$(mktemp)"
trap 'rm -f "$temporary_migration"' EXIT
cat "$MIGRATION_FILE" > "$temporary_migration"
printf '\n-- Deliberately fail after all migration statements to prove rollback.\nSELECT 1 / 0;\n' >> "$temporary_migration"

status=0
output="$(
  docker exec -i -e PGPASSWORD=migrator-test-only "$POSTGRES_CONTAINER" \
    psql -h 127.0.0.1 -1 -v ON_ERROR_STOP=1 \
      -U microapp_migrator -d microapp_test -f /dev/stdin \
      < "$temporary_migration" 2>&1
)" || status=$?

printf '%s\n' "$output"
if [[ "$status" -eq 0 ]]; then
  echo "Expected injected migration failure, but psql succeeded." >&2
  exit 1
fi
if ! grep -Fq "division by zero" <<< "$output"; then
  echo "Migration failed for an unexpected reason; refusing to count this as an atomicity pass." >&2
  exit 1
fi

remaining="$(
  docker exec "$POSTGRES_CONTAINER" psql -At -v ON_ERROR_STOP=1 \
    -U microapp -d microapp_test -c "$ROLLBACK_ASSERTION_SQL"
)"
if [[ "$remaining" != "t" ]]; then
  echo "Atomicity assertion failed for $MIGRATION_FILE: $remaining" >&2
  exit 1
fi

echo "Atomic rollback verified: $MIGRATION_FILE"
