#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_DATABASE_URL:?Set ADMIN_DATABASE_URL to the disposable PostgreSQL 18 admin database}"
: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL to a direct microapp_migrator login}"
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }

bcv_database="microapp_role_membership_bcv_test"
main_database="microapp_role_membership_main_test"
bcv_owner_url="postgres://legacy_owner:legacy-owner-test-only@localhost:5432/${bcv_database}"
bcv_admin_url="postgres://microapp:microapp-test-only@localhost:5432/${bcv_database}"
main_owner_url="postgres://legacy_owner:legacy-owner-test-only@localhost:5432/${main_database}"
main_admin_url="postgres://microapp:microapp-test-only@localhost:5432/${main_database}"
bcv_migrator_url="postgres://microapp_migrator:migrator-test-only@localhost:5432/${bcv_database}"
main_migrator_url="postgres://microapp_migrator:migrator-test-only@localhost:5432/${main_database}"

psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c \
  "CREATE ROLE legacy_owner LOGIN PASSWORD 'legacy-owner-test-only' NOSUPERUSER CREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;"
psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c \
  "CREATE DATABASE ${bcv_database} OWNER legacy_owner;"

# The non-superuser database owner creates all application roles. PostgreSQL 16+
# records the creator as an incoming member with ADMIN OPTION only.
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_owner_url" <<'SQL'
CREATE ROLE microapp_migrator LOGIN PASSWORD 'migrator-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE microapp_runtime LOGIN PASSWORD 'runtime-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE microapp_bcv_sync LOGIN PASSWORD 'bcv-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO microapp_migrator;
GRANT USAGE ON SCHEMA public TO microapp_runtime, microapp_bcv_sync;
GRANT CONNECT ON DATABASE microapp_role_membership_bcv_test
  TO microapp_migrator, microapp_runtime, microapp_bcv_sync;
SQL

for migration in 0001_initial 0002_google_identity; do
  psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_owner_url" \
    --file "apps/api/migrations/${migration}.sql" >/dev/null
done
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_owner_url" \
  -c "INSERT INTO organizations (name, slug) VALUES ('BCV membership sentinel', 'bcv-membership-sentinel');"

export ADOPTION_DATABASE_URL="$bcv_owner_url"
bash scripts/db/adopt-baseline.sh verify | grep -F "BASELINE_VERIFIED"
ADOPT_BASELINE_CONFIRM=adopt-0002 bash scripts/db/adopt-baseline.sh apply | grep -F "BASELINE_ADOPTED"

export MIGRATION_DATABASE_URL="$bcv_migrator_url"
bash scripts/db/migrate.sh

# BCV profile: all 25 migrations, automatic creator edges, and the full 0022-0025 assertion chain.
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" -c \
  "SELECT count(*)=25 AND bool_and(state='applied') FROM public.schema_migrations")" = "t"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" -c \
  "SELECT count(*)=2 FROM pg_catalog.pg_auth_members m
   JOIN pg_catalog.pg_roles granted_role ON granted_role.oid=m.roleid
   JOIN pg_catalog.pg_database d ON d.datname=current_database()
   WHERE granted_role.rolname IN ('microapp_runtime','microapp_bcv_sync')
     AND m.member=d.datdba AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option")" = "t"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" -c \
  "SELECT NOT pg_catalog.pg_has_role('legacy_owner','microapp_runtime','USAGE')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_runtime','SET')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_bcv_sync','USAGE')
      AND NOT pg_catalog.pg_has_role('legacy_owner','microapp_bcv_sync','SET')")" = "t"
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" \
  --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" --file "apps/api/migrations/0023_register_shift_runtime_operations.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" --file "apps/api/migrations/0024_organization_structure_admin_operations.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" --file "apps/api/migrations/0025_inventory_receipts.assertions.sql"

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
bcv_admin_sql() {
  psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" -c "$1" >/dev/null
}
main_admin_sql() {
  psql -X -v ON_ERROR_STOP=1 --dbname "$main_admin_url" -c "$1" >/dev/null
}
expect_producer_migration_rejection() {
  expect_failure "$1 / 0022 preflight" "MICROAPP_BCV_SYNC_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_migrator_url" \
      --file "apps/api/migrations/0022_bcv_dedicated_producer_role.sql"
  expect_failure "$1 / 0022 assertions" "BCV_PRODUCER_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" \
      --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
}

# Use a third role as the granted role to avoid creating a circular membership
# (legacy_owner is already an incoming ADMIN-only member of both application roles).
bcv_admin_sql "CREATE ROLE outgoing_target NOLOGIN"

# Producer: outgoing membership and an unexpected incoming member must fail closed.
bcv_admin_sql "GRANT outgoing_target TO microapp_bcv_sync"
expect_producer_migration_rejection "producer outgoing membership"
bcv_admin_sql "REVOKE outgoing_target FROM microapp_bcv_sync"
bcv_admin_sql "CREATE ROLE unexpected_member NOLOGIN"
bcv_admin_sql "GRANT microapp_bcv_sync TO unexpected_member"
expect_producer_migration_rejection "producer unexpected incoming member"
bcv_admin_sql "REVOKE microapp_bcv_sync FROM unexpected_member"

# Producer: owner SET and INHERIT capabilities must each fail closed.
bcv_admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET TRUE, INHERIT FALSE"
expect_producer_migration_rejection "producer owner SET capability"
bcv_admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"
bcv_admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT TRUE"
expect_producer_migration_rejection "producer owner INHERIT capability"
bcv_admin_sql "GRANT microapp_bcv_sync TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"

# The main restore assertions describe the 0001-0016 restore profile, not the
# BCV 0001-0024 profile. Validate runtime there without changing either profile's grants.
psql -X -v ON_ERROR_STOP=1 --dbname "$ADMIN_DATABASE_URL" -c \
  "CREATE DATABASE ${main_database} OWNER legacy_owner;"
main_admin_sql "GRANT microapp_migrator TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"
psql -X -v ON_ERROR_STOP=1 --dbname "$main_owner_url" <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO microapp_migrator;
GRANT USAGE ON SCHEMA public TO microapp_runtime;
GRANT CONNECT ON DATABASE microapp_role_membership_main_test TO microapp_migrator, microapp_runtime;
SQL
for migration in 0001_initial 0002_google_identity; do
  psql -X -v ON_ERROR_STOP=1 --dbname "$main_owner_url" \
    --file "apps/api/migrations/${migration}.sql" >/dev/null
done
psql -X -v ON_ERROR_STOP=1 --dbname "$main_owner_url" \
  -c "INSERT INTO organizations (name, slug) VALUES ('Main membership sentinel', 'main-membership-sentinel');"
export ADOPTION_DATABASE_URL="$main_owner_url"
bash scripts/db/adopt-baseline.sh verify | grep -F "BASELINE_VERIFIED"
ADOPT_BASELINE_CONFIRM=adopt-0002 bash scripts/db/adopt-baseline.sh apply | grep -F "BASELINE_ADOPTED"

main_migrations_dir="$(mktemp -d)"
trap 'rm -rf "$main_migrations_dir"' EXIT
for file in apps/api/migrations/00{01..16}_*.sql; do
  case "$file" in *.assertions.sql|*.deferred_failure.sql) continue ;; esac
  cp "$file" "$main_migrations_dir/"
done
MIGRATIONS_DIR="$main_migrations_dir" MIGRATION_DATABASE_URL="$main_migrator_url" \
  bash scripts/db/migrate.sh

# Main profile runtime assertion passes with the same owner-only ADMIN edge.
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$main_admin_url" -c \
  "SELECT count(*)=16 AND bool_and(state='applied') FROM public.schema_migrations")" = "t"
psql -X -v ON_ERROR_STOP=1 --dbname "$main_admin_url" \
  --file "scripts/db/restore_role_assertions_main.sql"

expect_runtime_assertion_rejection() {
  expect_failure "$1 / restore runtime assertions" "RESTORE_RUNTIME_ROLE_MEMBERSHIP_FORBIDDEN" \
    psql -X -v ON_ERROR_STOP=1 --dbname "$main_admin_url" \
      --file "scripts/db/restore_role_assertions_main.sql"
}
# Runtime: outgoing membership and a non-owner incoming member must fail closed.
main_admin_sql "GRANT outgoing_target TO microapp_runtime"
expect_runtime_assertion_rejection "runtime outgoing membership"
main_admin_sql "REVOKE outgoing_target FROM microapp_runtime"
main_admin_sql "GRANT microapp_runtime TO unexpected_member"
expect_runtime_assertion_rejection "runtime unexpected incoming member"
main_admin_sql "REVOKE microapp_runtime FROM unexpected_member"
main_admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET TRUE, INHERIT FALSE"
expect_runtime_assertion_rejection "runtime owner SET capability"
main_admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"
main_admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT TRUE"
expect_runtime_assertion_rejection "runtime owner INHERIT capability"
main_admin_sql "GRANT microapp_runtime TO legacy_owner WITH ADMIN OPTION, SET FALSE, INHERIT FALSE"

# Final positive reruns prove all negative fixtures were cleaned up.
psql -X -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" \
  --file "apps/api/migrations/0022_bcv_dedicated_producer_role.assertions.sql"
psql -X -v ON_ERROR_STOP=1 --dbname "$main_admin_url" \
  --file "scripts/db/restore_role_assertions_main.sql"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$bcv_admin_url" -c \
  "SELECT count(*) FROM organizations WHERE slug='bcv-membership-sentinel'")" = "1"
test "$(psql -X -At -v ON_ERROR_STOP=1 --dbname "$main_admin_url" -c \
  "SELECT count(*) FROM organizations WHERE slug='main-membership-sentinel'")" = "1"
echo "PASS: PostgreSQL 18 managed-owner role-membership contract (BCV 0001-0025; main 0001-0016; positive and fail-closed cases)"
