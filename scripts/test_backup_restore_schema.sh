#!/usr/bin/env bash
set -euo pipefail

# This is a schema-wide synthetic restore test. It uses only the fixed
# disposable PostgreSQL service from backup-restore-smoke.yml.
expected_admin_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
schema_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_schema_source"
schema_restore_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_schema_restore"
migration_url="postgresql://microapp_migrator:migrator-test-only@localhost:5432/microapp_schema_source"

if [[ "$SOURCE_URL" != "$expected_admin_url" ]]; then
  echo "Refusing to run: SOURCE_URL must be the fixed disposable CI admin database." >&2
  exit 2
fi
if [[ "$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()')" != "microapp_source" ]]; then
  echo "Refusing to run: admin connection is not microapp_source." >&2
  exit 2
fi

started_at=$SECONDS
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "== Provision disposable schema source and restore databases"
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE microapp_migrator LOGIN PASSWORD 'migrator-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE microapp_runtime LOGIN PASSWORD 'runtime-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE microapp_bcv_sync LOGIN PASSWORD 'bcv-sync-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE DATABASE microapp_schema_source;
CREATE DATABASE microapp_schema_restore;
GRANT CONNECT ON DATABASE microapp_schema_source TO microapp_migrator, microapp_runtime, microapp_bcv_sync;
GRANT CONNECT ON DATABASE microapp_schema_restore TO microapp_migrator, microapp_runtime, microapp_bcv_sync;
SQL

psql "$schema_source_url" -X -v ON_ERROR_STOP=1 <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO microapp_migrator;
GRANT USAGE ON SCHEMA public TO microapp_runtime, microapp_bcv_sync;
SQL

echo "== Apply every numbered migration using the official migration runner"
MIGRATION_DATABASE_URL="$migration_url" bash scripts/db/migrate.sh

expected_migrations="$(find apps/api/migrations -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' ! -name '*.assertions.sql' ! -name '*.deferred_failure.sql' | wc -l | awk '{print $1}')"
ledger_ok="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) = $expected_migrations AND bool_and(state = 'applied') AND bool_and(length(checksum) = 64) AND bool_and(applied_at IS NOT NULL) FROM public.schema_migrations")"
if [[ "$ledger_ok" != "t" ]]; then
  echo "Migration ledger does not match the complete checked-out migration bundle." >&2
  exit 1
fi

intent_table="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT to_regclass('public.inventory_balance_ledger_intents') IS NOT NULL")"
projection_function="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL")"
if [[ "$intent_table" == "$projection_function" ]]; then
  echo "Expected exactly one inventory ledger implementation (intent table or projection function)." >&2
  exit 1
fi

echo "== Dump the complete disposable schema, excluding ephemeral auth tables"
pg_dump "$schema_source_url" --no-owner --no-privileges --format=custom \
  --exclude-table=public.auth_sessions \
  --exclude-table=public.auth_rate_limits \
  --exclude-table=public.auth_bootstrap_attempts \
  --file="$tmpdir/schema.dump"
test -s "$tmpdir/schema.dump"

echo "== Encrypt, checksum, decrypt and restore into a second disposable database"
age-keygen -o "$tmpdir/age-key.txt" >/dev/null 2>"$tmpdir/age-keygen.log"
public_key="$(awk '/^# public key:/ {print $4}' "$tmpdir/age-key.txt")"
[[ "$public_key" =~ ^age1[[:alnum:]]+$ ]] || { echo "Temporary age public key invalid." >&2; exit 1; }
age -r "$public_key" -o "$tmpdir/schema.dump.age" "$tmpdir/schema.dump"
(cd "$tmpdir" && sha256sum schema.dump.age > schema.dump.age.sha256 && sha256sum --check schema.dump.age.sha256)
age -d -i "$tmpdir/age-key.txt" -o "$tmpdir/schema.restored.dump" "$tmpdir/schema.dump.age"
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$schema_restore_url" "$tmpdir/schema.restored.dump"

manifest() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT 'tables|' || COALESCE(string_agg(table_name, ',' ORDER BY table_name), '')
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   AND table_name NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'required_core_objects|' || count(*)::text
  FROM (VALUES
    ('organizations'), ('app_users'), ('organization_members'),
    ('auth_allowlist'), ('auth_bootstrap'), ('suppliers'), ('products'),
    ('exchange_rates'), ('sales'), ('sale_items'), ('payments'),
    ('inventory_movements'), ('audit_logs'), ('branches'),
    ('branch_memberships'), ('registers'), ('register_shifts'),
    ('warehouses'), ('inventory_counts'), ('inventory_count_lines'),
    ('inventory_balances'), ('warehouse_inventory_movements'),
    ('schema_migrations')
  ) AS required(table_name)
 WHERE pg_catalog.to_regclass('public.' || required.table_name) IS NOT NULL;
SELECT 'constraints|' || COALESCE(string_agg(c.relname || ':' || con.conname || ':' || pg_catalog.md5(pg_catalog.pg_get_constraintdef(con.oid)), ';' ORDER BY c.relname, con.conname), '')
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'indexes|' || COALESCE(string_agg(indexname || ':' || pg_catalog.md5(indexdef), ';' ORDER BY indexname), '')
  FROM pg_catalog.pg_indexes WHERE schemaname = 'public'
   AND tablename NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'triggers|' || COALESCE(string_agg(c.relname || ':' || t.tgname || ':' || pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid)), ';' ORDER BY c.relname, t.tgname), '')
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND NOT t.tgisinternal
   AND c.relname NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'functions|' || COALESCE(string_agg(p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)), ';' ORDER BY p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), '')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p');
SELECT 'migration_ledger|' || COALESCE(string_agg(version || ':' || filename || ':' || checksum || ':' || state || ':' || extract(epoch FROM applied_at)::text, ';' ORDER BY version), '')
  FROM public.schema_migrations;
SELECT 'intent_table|' || (pg_catalog.to_regclass('public.inventory_balance_ledger_intents') IS NOT NULL)::text;
SELECT 'projection_function|' || (pg_catalog.to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL)::text;
SELECT 'bcv_sync_state_table|' || (pg_catalog.to_regclass('public.bcv_sync_state') IS NOT NULL)::text;
SQL
}

source_manifest="$(manifest "$schema_source_url")"
restored_manifest="$(manifest "$schema_restore_url")"
if [[ "$source_manifest" != "$restored_manifest" ]]; then
  echo "Restored schema manifest differs from source:" >&2
  diff -u <(printf '%s\n' "$source_manifest") <(printf '%s\n' "$restored_manifest") || true
  exit 1
fi

required_tables="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM (VALUES ('organizations'),('app_users'),('organization_members'),('auth_allowlist'),('auth_bootstrap'),('suppliers'),('products'),('exchange_rates'),('sales'),('sale_items'),('payments'),('inventory_movements'),('audit_logs'),('branches'),('branch_memberships'),('registers'),('register_shifts'),('warehouses'),('inventory_counts'),('inventory_count_lines'),('inventory_balances'),('warehouse_inventory_movements'),('schema_migrations')) AS required(table_name) WHERE pg_catalog.to_regclass('public.' || required.table_name) IS NOT NULL")"
[[ "$required_tables" == "23" ]] || { echo "Expected 22 stable application tables plus schema_migrations (23 required objects), got $required_tables." >&2; exit 1; }

ephemeral="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT (pg_catalog.to_regclass('public.auth_sessions') IS NULL AND pg_catalog.to_regclass('public.auth_rate_limits') IS NULL AND pg_catalog.to_regclass('public.auth_bootstrap_attempts') IS NULL)")"
[[ "$ephemeral" == "t" ]] || { echo "Ephemeral auth tables were unexpectedly restored." >&2; exit 1; }

restored_ledger_ok="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) = $expected_migrations AND bool_and(state = 'applied') AND bool_and(length(checksum) = 64) AND bool_and(applied_at IS NOT NULL) FROM public.schema_migrations")"
[[ "$restored_ledger_ok" == "t" ]] || { echo "Restored migration ledger is incomplete." >&2; exit 1; }

echo "PASS: all $expected_migrations numbered migrations applied through scripts/db/migrate.sh."
echo "PASS: 22 stable application tables plus schema_migrations, constraints, indexes, triggers and function definitions survived encrypted restore."
echo "PASS: inventory ledger mode and optional BCV sync schema match between source and restore."
echo "PASS: auth_sessions, auth_rate_limits and auth_bootstrap_attempts are excluded."
echo "Schema round-trip elapsed seconds: $((SECONDS - started_at))."
