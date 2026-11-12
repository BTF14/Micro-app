#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_DATABASE_URL:?Set ADMIN_DATABASE_URL to the disposable PostgreSQL 18 admin database}"
: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL to a direct microapp_migrator login}"
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }

database="microapp_role_membership_test"
owner_url="postgres://legacy_owner:legacy-owner-test-only@localhost:5432/${database}"
migrator_url="${MIGRATION_DATABASE_URL}"

psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c \
  "CREATE ROLE legacy_owner LOGIN PASSWORD 'legacy-owner-test-only' NOSUPERUSER CREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;"
psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c \
  "CREATE DATABASE ${database} OWNER legacy_owner;"

# The non-superuser database owner creates the application roles. PostgreSQL 16+
# records the creator as an incoming member with ADMIN OPTION only.
psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" <<'SQL'
CREATE ROLE microapp_migrator LOGIN PASSWORD 'migrator-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE microapp_runtime LOGIN PASSWORD 'runtime-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE microapp_bcv_sync LOGIN PASSWORD 'bcv-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO microapp_migrator;
GRANT USAGE ON SCHEMA public TO microapp_runtime, microapp_bcv_sync;
GRANT CONNECT ON DATABASE microapp_role_membership_test
  TO microapp_migrator, microapp_runtime, microapp_bcv_sync;
SQL

for migration in 0001_initial 0002_google_identity; do
  psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
    --file "apps/api/migrations/${migration}.sql" >/dev/null
done
psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
  -c "INSERT INTO organizations (name, slug) VALUES ('Membership sentinel', 'membership-sentinel');"

export ADOPTION_DATABASE_URL="$owner_url"
bash scripts/db/adopt-baseline.sh verify | grep -F "BASELINE_VERIFIED"
ADOPT_BASELINE_CONFIRM=adopt-0002 bash scripts/db/adopt-baseline.sh apply | grep -F "BASELINE_ADOPTED"

export MIGRATION_DATABASE_URL="$migrator_url"
bash scripts/db/migrate.sh

# Confirm all 23 migrations are applied and both creator edges are ADMIN-only.
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$owner_url" -c \
  "SELECT count(*)=23 AND bool_and(state='applied') FROM public.schema_migrations")" = "t"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$owner_url" -c \
  "SELECT count(*)=2 FROM pg_catalog.pg_auth_members m
   JOIN pg_catalog.pg_roles granted_role ON granted_role.oid=m.roleid
   JOIN pg_catalog.pg_database d ON d.datname=current_database()
   WHERE granted_role.rolname IN ('microapp_runtime','microapp_bcv_sync')
     AND m.member=d.datdba AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option")" = "t"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$owner_url" -c \
  "SELECT NOT pg_catalog.pg_has_role('legacy_owner','microapp_runtime','USAGE')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_runtime','SET')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_bcv_sync','USAGE')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_bcv_sync','SET')")" = "t"

psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
  --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
  --file "scripts/db/restore_role_assertions_main.sql"

expect_failure() {
  local label="$1" marker="$2"
  shift 2
  local status=0 output
  output="$("$@" 2>&1)" || status=$?
  if [[ "$status" -eq 0 ]] || ! grep -Fq "$marker" <<<"$output"; then
    printf 'FAIL: %s (expected marker %s; exit %s)\n%s\n' "$label" "$marker" "$status" "$output" >&2
    exit 1
  fi
  printf 'PASS: %s\n' "$label"
}
admin_sql() {
  psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c "$1" >/dev/null
}
expect_producer_migration_rejection() {
  expect_failure "$1 / 0022 preflight" "MICROAPP_BCV_SYNC_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$migrator_url" \
      --file "apps/api/migrations/0022_bcv_dedicated_producer_role.sql"
  expect_failure "$1 / 0022 assertions" "BCV_PRODUCER_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
      --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
}
expect_runtime_assertion_rejection() {
  expect_failure "$1 / restore runtime assertions" "RESTORE_RUNTIME_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
      --file "scripts/db/restore_role_assertions_main.sql"
}

# Producer: outgoing membership and an unexpected incoming member must fail closed.
admin_sql "GRANT legacy_owner TO microapp_bcv_sync"
expect_producer_migration_rejection "producer outgoing membership"
admin_sql "REVOKE legacy_owner FROM microapp_bcv_sync"
admin_sql "CREATE ROLE unexpected_member NOLOGIN"
admin_sql "GRANT microapp_bcv_sync TO unexpected_member"
expect_producer_migration_rejection "producer unexpected incoming member"
admin_sql "REVOKE microapp_bcv_sync FROM unexpected_member"

# Producer: owner SET and INHERIT capabilities must each fail closed.
admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET TRUE, INHERIT FALSE"
expect_producer_migration_rejection "producer owner SET capability"
admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"
admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT TRUE"
expect_producer_migration_rejection "producer owner INHERIT capability"
admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"

# Runtime uses the same invariant in the restore assertion contract.
admin_sql "GRANT legacy_owner TO microapp_runtime"
expect_runtime_assertion_rejection "runtime outgoing membership"
admin_sql "REVOKE legacy_owner FROM microapp_runtime"
admin_sql "GRANT microapp_runtime TO unexpected_member"
expect_runtime_assertion_rejection "runtime unexpected incoming member"
admin_sql "REVOKE microapp_runtime FROM unexpected_member"
admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET TRUE, INHERIT FALSE"
expect_runtime_assertion_rejection "runtime owner SET capability"
admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"
admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT TRUE"
expect_runtime_assertion_rejection "runtime owner INHERIT capability"
admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"

# Final positive reruns prove the negative fixtures were cleaned up exactly.
psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
  --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$owner_url" \
  --file "scripts/db/restore_role_assertions_main.sql"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$owner_url" -c \
  "SELECT count(*)=23 AND bool_and(state='applied') FROM public.schema_migrations")" = "t"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$owner_url" -c \
  "SELECT count(*) FROM organizations WHERE slug='membership-sentinel'")" = "1"
echo "PASS: PostgreSQL 18 managed-owner role-membership contract (migrations 0001-0023, assertions, fail-closed cases)"
