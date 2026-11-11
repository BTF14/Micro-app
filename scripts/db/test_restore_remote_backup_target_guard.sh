#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
mkdir -p "$tmpdir/bin"
touch "$tmpdir/archive.dump"

cat > "$tmpdir/bin/pg_restore" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == "--list" ]]
SH
cat > "$tmpdir/bin/psql" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
last_arg="${!#}"
printf '%s\n' "$last_arg" >> "$PSQL_CALL_LOG"
case "$last_arg" in
  *"current_user || ':' || session_user || ':'"*)
    printf '%s\n' "microapp:microapp:true"
    ;;
  *"SELECT current_database()"*)
    printf '%s\n' "microapp_restore"
    ;;
  *"inet_server_addr"*)
    printf '%s\n' "10.20.30.40:5432:microapp_restore"
    ;;
  *)
    echo "Unexpected psql call in non-loopback guard test." >&2
    exit 90
    ;;
esac
SH
chmod +x "$tmpdir/bin/pg_restore" "$tmpdir/bin/psql"

export PATH="$tmpdir/bin:$PATH"
export PSQL_CALL_LOG="$tmpdir/psql-calls.log"
export BACKUP_DUMP="$tmpdir/archive.dump"
export RESTORE_ADMIN_URL="postgresql://microapp:test-only@127.0.0.1:5432/microapp_restore"
export RESTORE_MIGRATOR_URL="postgresql://microapp_migrator:test-only@127.0.0.1:5432/microapp_restore"
export RESTORE_RUNTIME_URL="postgresql://microapp_runtime:test-only@127.0.0.1:5432/microapp_restore"
export RESTORE_PRODUCER_URL="postgresql://microapp_bcv_sync:test-only@127.0.0.1:5432/microapp_restore"
export RESTORE_DATABASE_NAME="microapp_restore"
export MIGRATIONS_DIR="$repo_root/apps/api/migrations"

if output="$(bash "$repo_root/scripts/db/restore_remote_backup_ephemeral.sh" 2>&1)"; then
  echo "Expected non-loopback restore target to be refused." >&2
  exit 1
fi
if ! grep -q "loopback PostgreSQL" <<< "$output"; then
  printf '%s\n' "$output" >&2
  echo "Restore runner did not fail at the loopback target guard." >&2
  exit 1
fi
call_count="$(wc -l < "$PSQL_CALL_LOG" | tr -d ' ')"
[[ "$call_count" == "3" ]] || {
  echo "Expected refusal before role bootstrap; observed $call_count psql calls." >&2
  exit 1
}
echo "PASS: remote/non-loopback restore targets are rejected before role bootstrap."
