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
echo "Unexpected database connection: URL guard should reject before psql." >&2
exit 90
SH
chmod +x "$tmpdir/bin/pg_restore" "$tmpdir/bin/psql"

export PATH="$tmpdir/bin:$PATH"
export PSQL_CALL_LOG="$tmpdir/psql-calls.log"
export BACKUP_DUMP="$tmpdir/archive.dump"
export RESTORE_ADMIN_URL="postgresql://microapp:test-only@127.0.0.1:5432/microapp_remote_restore"
export RESTORE_MIGRATOR_URL="postgresql://microapp_migrator:test-only@127.0.0.1:5432/microapp_remote_restore"
export RESTORE_RUNTIME_URL="postgresql://microapp_runtime:test-only@127.0.0.1:5432/microapp_remote_restore"
export RESTORE_PRODUCER_URL="postgresql://microapp_bcv_sync:test-only@127.0.0.1:5432/microapp_remote_restore"
export RESTORE_DATABASE_NAME="microapp_remote_restore"
export MIGRATIONS_DIR="$repo_root/apps/api/migrations"

expect_url_refusal() {
  local description="$1"
  shift
  : > "$PSQL_CALL_LOG"
  if output="$(env "$@" bash "$repo_root/scripts/db/restore_remote_backup_ephemeral.sh" 2>&1)"; then
    echo "Expected non-loopback restore target to be refused: $description" >&2
    exit 1
  fi
  if ! grep -q "must use the fixed loopback PostgreSQL endpoint" <<< "$output"; then
    printf '%s\n' "$output" >&2
    echo "Restore runner did not fail at the URL target guard: $description" >&2
    exit 1
  fi
  if [[ -s "$PSQL_CALL_LOG" ]]; then
    echo "Restore runner attempted a database connection before rejecting $description." >&2
    exit 1
  fi
}

expect_url_refusal "administrator URL" RESTORE_ADMIN_URL="postgresql://microapp:test-only@10.20.30.40:5432/microapp_remote_restore"
expect_url_refusal "runtime URL" RESTORE_RUNTIME_URL="postgresql://microapp_runtime:test-only@remote.example:5432/microapp_remote_restore"
expect_url_refusal "query override" RESTORE_PRODUCER_URL="postgresql://microapp_bcv_sync:test-only@127.0.0.1:5432/microapp_remote_restore?host=remote.example"

echo "PASS: non-loopback and query-overridden restore URLs are rejected before any database connection."
