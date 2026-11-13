#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
mkdir -p "$tmpdir/bin"

cat > "$tmpdir/bin/psql" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
args="$*"
if [[ "$args" == *"current_user"* && "$args" == *"session_user"* ]]; then
  printf '%s\n' "microapp_migrator:microapp_migrator"
elif [[ "$args" == *"SELECT version, filename, checksum"* ]]; then
  cat "$FAKE_LEDGER_FILE"
elif [[ "$args" == *" -f "* ]]; then
  exit 0
else
  echo "Unexpected psql invocation in restore profile test: $args" >&2
  exit 90
fi
SH
chmod +x "$tmpdir/bin/psql"
export PATH="$tmpdir/bin:$PATH"
export MIGRATION_DATABASE_URL="postgresql://microapp_migrator:test@127.0.0.1:5432/restore_profile_test"

make_profile() {
  local count="$1"
  local profile_dir="$2"
  local ledger="$3"
  mkdir -p "$profile_dir"
  : > "$ledger"
  for ((version=1; version<=count; version++)); do
    local prefix filename source checksum
    prefix="$(printf '%04d_' "$version")"
    source="$(find "$repo_root/apps/api/migrations" -maxdepth 1 -type f -name "${prefix}*.sql" ! -name '*.assertions.sql' ! -name '*.deferred_failure.sql' | sort | head -n 1)"
    [[ -n "$source" ]] || { echo "Missing migration $prefix in repository bundle." >&2; exit 1; }
    filename="$(basename "$source")"
    cp "$source" "$profile_dir/$filename"
    checksum="$(sha256sum "$profile_dir/$filename" | awk '{print $1}')"
    printf '%s|%s|%s\n' "${prefix%_}" "$filename" "$checksum" >> "$ledger"
  done
}

run_profile() {
  local name="$1"
  local count="$2"
  local dir="$tmpdir/$name"
  local ledger="$tmpdir/$name.ledger"
  make_profile "$count" "$dir" "$ledger"
  FAKE_LEDGER_FILE="$ledger" MIGRATIONS_DIR="$dir" RESTORE_GRANTS_PROFILE="$name" \
    bash "$repo_root/scripts/db/reapply_restore_role_grants.sh" > "$tmpdir/$name.log"
  grep -F "($name profile, $count migrations" "$tmpdir/$name.log" >/dev/null
}

run_profile main 16
run_profile bcv 23
run_profile bcv-0024 24

echo "PASS: historical main 0001–0016 and BCV 0001–0023 ACL profiles remain supported alongside BCV 0001–0024."
