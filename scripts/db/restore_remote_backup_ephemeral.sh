#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_DUMP:?Set BACKUP_DUMP to the decrypted custom-format archive}"
: "${RESTORE_ADMIN_URL:?Set RESTORE_ADMIN_URL to the disposable PostgreSQL admin connection}"
: "${RESTORE_MIGRATOR_URL:?Set RESTORE_MIGRATOR_URL to the direct microapp_migrator connection}"
: "${RESTORE_RUNTIME_URL:?Set RESTORE_RUNTIME_URL to the direct microapp_runtime connection}"
: "${RESTORE_PRODUCER_URL:?Set RESTORE_PRODUCER_URL to the direct microapp_bcv_sync connection}"
: "${RESTORE_DATABASE_NAME:?Set RESTORE_DATABASE_NAME to the disposable target database name}"
: "${MIGRATIONS_DIR:?Set MIGRATIONS_DIR to the checked-out migration bundle}"
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required." >&2; exit 2; }
command -v git >/dev/null 2>&1 || { echo "git is required." >&2; exit 2; }
command -v tar >/dev/null 2>&1 || { echo "tar is required." >&2; exit 2; }

[[ -s "$BACKUP_DUMP" ]] || { echo "Backup archive is missing or empty." >&2; exit 2; }
pg_restore --list "$BACKUP_DUMP" >/dev/null

admin_identity="$(psql "$RESTORE_ADMIN_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user || ':' || (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user)")"
[[ "$admin_identity" == "microapp:microapp:true" ]] || {
  echo "Refusing role bootstrap: only the disposable microapp PostgreSQL service administrator is accepted." >&2
  exit 2
}
target_db="$(psql "$RESTORE_ADMIN_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_database()")"
[[ "$target_db" == "$RESTORE_DATABASE_NAME" ]] || { echo "Refusing restore outside the declared disposable target database." >&2; exit 2; }

echo "== Provision isolated application roles in disposable PostgreSQL"
psql "$RESTORE_ADMIN_URL" -X -v ON_ERROR_STOP=1 -v restore_database="$RESTORE_DATABASE_NAME" <<'SQL'
DO $bootstrap_roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator') THEN
    CREATE ROLE microapp_migrator LOGIN PASSWORD 'migrator-restore-test-only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime') THEN
    CREATE ROLE microapp_runtime LOGIN PASSWORD 'runtime-restore-test-only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_bcv_sync') THEN
    CREATE ROLE microapp_bcv_sync LOGIN PASSWORD 'bcv-sync-restore-test-only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
END
$bootstrap_roles$;
GRANT CONNECT ON DATABASE :"restore_database" TO microapp_migrator, microapp_runtime, microapp_bcv_sync;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO microapp_migrator;
GRANT USAGE ON SCHEMA public TO microapp_runtime, microapp_bcv_sync;
SQL

migrator_identity="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user")"
[[ "$migrator_identity" == "microapp_migrator:microapp_migrator" ]] || {
  echo "Restore connection is not a direct microapp_migrator LOGIN." >&2
  exit 2
}

echo "== Restore encrypted-backup payload as microapp_migrator with owner/ACL replay disabled"
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
  --dbname="$RESTORE_MIGRATOR_URL" "$BACKUP_DUMP"

ledger_profile="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT CASE
  WHEN count(*) = 16 AND min(version) = '0001' AND max(version) = '0016'
       AND count(DISTINCT version) = 16 AND bool_and(state = 'applied') THEN 'main'
  WHEN count(*) = 22 AND min(version) = '0001' AND max(version) = '0022'
       AND count(DISTINCT version) = 22 AND bool_and(state = 'applied') THEN 'bcv'
  ELSE 'unsupported'
END
FROM public.schema_migrations")"
case "$ledger_profile" in
  main) expected=16 ;;
  bcv) expected=22 ;;
  *) echo "Backup migration ledger is not a complete supported 16- or 22-migration profile; refusing ACL reconstruction." >&2; exit 1 ;;
esac

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Main/paired-intent backups must use the immutable migration bundle from the
# exact main baseline; BCV projection backups use the current checked-out 22-file
# bundle. The helper below independently verifies every file checksum against
# the restored schema_migrations ledger before extracting any ACL statement.
if [[ "$ledger_profile" == "main" ]]; then
  main_profile_ref="${MAIN_PROFILE_REF:-c5373564413ba086690552c6b7deeab08d7b4a89}"
  if ! git cat-file -e "${main_profile_ref}^{commit}" 2>/dev/null; then
    git fetch --no-tags origin "$main_profile_ref" --depth=1
  fi
  mkdir -p "$tmpdir/main-profile"
  git archive "$main_profile_ref" apps/api/migrations | tar -x -C "$tmpdir/main-profile"
  source_migrations_dir="$tmpdir/main-profile/apps/api/migrations"
else
  source_migrations_dir="$MIGRATIONS_DIR"
fi

mapfile -t available_migrations < <(find "$source_migrations_dir" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' ! -name '*.assertions.sql' ! -name '*.deferred_failure.sql' | sort)
if (( ${#available_migrations[@]} != expected )); then
  echo "Pinned migration bundle does not contain exactly $expected migrations for profile $ledger_profile." >&2
  exit 1
fi

profile_dir="$tmpdir/migrations"
mkdir -p "$profile_dir"
for ((i=0; i<expected; i++)); do
  file="${available_migrations[$i]}"
  expected_prefix="$(printf '%04d_' "$((i+1))")"
  [[ "$(basename "$file")" == "$expected_prefix"* ]] || {
    echo "Migration bundle is not contiguous at version $((i+1)); refusing ACL replay." >&2
    exit 1
  }
  cp "$file" "$profile_dir/"
done

echo "== Reconstruct the final ACL history from the backup's own migration profile ($ledger_profile)"
MIGRATION_DATABASE_URL="$RESTORE_MIGRATOR_URL" \
MIGRATIONS_DIR="$profile_dir" \
RESTORE_GRANTS_PROFILE="$ledger_profile" \
  bash scripts/db/reapply_restore_role_grants.sh

echo "== Validate restored application identity, ownership, least privilege and ephemeral auth state"
role_contract="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT count(*) = 3 AND bool_and(
  rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolreplication AND NOT rolbypassrls
  AND ((rolname='microapp_migrator' AND rolinherit)
    OR (rolname IN ('microapp_runtime','microapp_bcv_sync') AND NOT rolinherit))
)
FROM pg_catalog.pg_roles
WHERE rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')")"
[[ "$role_contract" == "t" ]] || { echo "Restored role contract is invalid." >&2; exit 1; }

membership_count="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT count(*) FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles r ON r.oid IN (m.roleid,m.member)
WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')")"
[[ "$membership_count" == "0" ]] || { echo "Unexpected application-role membership found." >&2; exit 1; }

owner_contract="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT
  NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
      AND pg_catalog.pg_get_userbyid(c.relowner) <> 'microapp_migrator'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind IN ('f','p')
      AND pg_catalog.pg_get_userbyid(p.proowner) <> 'microapp_migrator'
  )")"
[[ "$owner_contract" == "t" ]] || { echo "Not all restored public application objects are owned by microapp_migrator." >&2; exit 1; }

auth_contract="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT
  to_regclass('public.auth_sessions') IS NOT NULL
  AND to_regclass('public.auth_rate_limits') IS NOT NULL
  AND to_regclass('public.auth_bootstrap_attempts') IS NOT NULL
  AND (SELECT count(*)=0 FROM public.auth_sessions)
  AND (SELECT count(*)=0 FROM public.auth_rate_limits)
  AND (SELECT count(*)=0 FROM public.auth_bootstrap_attempts)
  AND to_regclass('public.schema_migrations') IS NOT NULL")"
[[ "$auth_contract" == "t" ]] || { echo "Ephemeral auth schema/empty-data contract or migration ledger is invalid." >&2; exit 1; }

runtime_identity="$(psql "$RESTORE_RUNTIME_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user")"
[[ "$runtime_identity" == "microapp_runtime:microapp_runtime" ]] || { echo "Runtime LOGIN verification failed." >&2; exit 1; }
runtime_read_probe="$(psql "$RESTORE_RUNTIME_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) >= 0 FROM public.organizations")"
[[ "$runtime_read_probe" == "t" ]] || { echo "Runtime role cannot perform its required organization read." >&2; exit 1; }
runtime_acl_probe="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT pg_catalog.has_table_privilege('microapp_runtime','public.organizations','SELECT') AND NOT pg_catalog.has_schema_privilege('microapp_runtime','public','CREATE')")"
[[ "$runtime_acl_probe" == "t" ]] || { echo "Runtime SELECT/schema least-privilege contract is invalid." >&2; exit 1; }
producer_identity="$(psql "$RESTORE_PRODUCER_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT current_user || ':' || session_user")"
[[ "$producer_identity" == "microapp_bcv_sync:microapp_bcv_sync" ]] || { echo "BCV producer LOGIN verification failed." >&2; exit 1; }

# Exercise the dedicated producer's real column-level write contract only
# inside a transaction that is always rolled back. The unique source prevents
# collisions with fixture/production-shaped synthetic rows in this disposable DB.
sync_state_rows="$(psql "$RESTORE_PRODUCER_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM public.bcv_sync_state WHERE singleton=true")"
[[ "$sync_state_rows" == "1" ]] || { echo "BCV producer cannot read the expected singleton sync-state row." >&2; exit 1; }
psql "$RESTORE_PRODUCER_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
UPDATE public.bcv_sync_state
   SET attempt_id=gen_random_uuid(), last_attempt_at=clock_timestamp(),
       last_outcome='running', updated_at=clock_timestamp()
 WHERE singleton=true;
INSERT INTO public.exchange_rates
  (base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status)
VALUES
  ('USD','VES',1,'RESTORE_ROLE_SMOKE_' || gen_random_uuid()::text,
   CURRENT_DATE,clock_timestamp(),'valid')
RETURNING id AS restore_smoke_rate_id \\gset
UPDATE public.exchange_rates
   SET validation_status='stale'
 WHERE id=:'restore_smoke_rate_id';
ROLLBACK;
SQL

public_tables="$(psql "$RESTORE_MIGRATOR_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
(( public_tables > 0 )) || { echo "No public application tables were restored." >&2; exit 1; }

echo "PASS: remote archive restored as microapp_migrator using the $ledger_profile ($expected migration) ACL profile."
echo "PASS: application roles, object ownership, empty ephemeral auth tables and migration ledger validated."
echo "PASS: runtime and BCV producer LOGIN identities connect independently; public table count=$public_tables."
