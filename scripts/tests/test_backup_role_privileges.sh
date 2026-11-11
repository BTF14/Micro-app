#!/usr/bin/env bash
set -euo pipefail

expected_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
backup_url="postgresql://microapp_backup:backup-test-only@localhost:5432/microapp_source"
if [[ "${SOURCE_URL:-}" != "$expected_source_url" ]]; then
  echo "Refusing to run: SOURCE_URL must target the fixed disposable PostgreSQL CI database." >&2
  exit 2
fi

psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE microapp_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE microapp_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE microapp_backup LOGIN PASSWORD 'backup-test-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE microapp_source TO microapp_backup;
GRANT USAGE ON SCHEMA public TO microapp_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO microapp_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO microapp_backup;
SQL

assert_true() {
  local label="$1"
  local sql="$2"
  local actual
  actual="$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT $sql")"
  if [[ "$actual" != "t" ]]; then
    echo "FAIL: $label (expected true, got: $actual)" >&2
    exit 1
  fi
  echo "PASS: $label"
}

assert_true "backup role has only the required non-admin role attributes" "
  rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolreplication AND NOT rolbypassrls AND NOT rolinherit
  FROM pg_roles WHERE rolname='microapp_backup'
"
assert_true "backup role is not a member, directly or transitively, of migrator" "
  NOT pg_has_role('microapp_backup', 'microapp_migrator', 'MEMBER')
"
assert_true "backup role is not a member, directly or transitively, of runtime" "
  NOT pg_has_role('microapp_backup', 'microapp_runtime', 'MEMBER')
"
assert_true "backup role owns no database, schema or public objects" "
  NOT EXISTS (SELECT 1 FROM pg_database WHERE datdba=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup'))
  AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup'))
  AND NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relnamespace='public'::regnamespace
      AND relowner=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup')
  )
"
assert_true "backup role has schema USAGE but not CREATE" "
  has_schema_privilege('microapp_backup', 'public', 'USAGE')
  AND NOT has_schema_privilege('microapp_backup', 'public', 'CREATE')
"
assert_true "backup role has SELECT on every public table" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND NOT has_table_privilege('microapp_backup', c.oid, 'SELECT')
  )
"
assert_true "backup role has SELECT on every public sequence" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
      AND NOT has_sequence_privilege('microapp_backup', c.oid, 'SELECT')
  )
"
assert_true "current public dump scope has no RLS-protected tables requiring BYPASSRLS" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (c.relrowsecurity OR c.relforcerowsecurity)
  )
"
assert_true "backup role has no table write privileges" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (
        has_table_privilege('microapp_backup', c.oid, 'INSERT')
        OR has_table_privilege('microapp_backup', c.oid, 'UPDATE')
        OR has_table_privilege('microapp_backup', c.oid, 'DELETE')
        OR has_table_privilege('microapp_backup', c.oid, 'TRUNCATE')
      )
  )
"
assert_true "backup role cannot use or update sequences" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
      AND (
        has_sequence_privilege('microapp_backup', c.oid, 'USAGE')
        OR has_sequence_privilege('microapp_backup', c.oid, 'UPDATE')
      )
  )
"

expect_denied() {
  local label="$1"
  local sql="$2"
  local output
  if output="$(psql "$backup_url" -X -v ON_ERROR_STOP=1 -c "$sql" 2>&1)"; then
    echo "FAIL: $label unexpectedly succeeded" >&2
    exit 1
  fi
  if ! grep -Eiq 'permission denied|must be owner|not permitted' <<<"$output"; then
    echo "FAIL: $label failed for an unexpected reason: $output" >&2
    exit 1
  fi
  echo "PASS: $label is denied"
}

expect_denied "INSERT" "INSERT INTO public.products (organization_id, sku, name, price_usd) VALUES ('11111111-1111-4111-8111-111111111111', 'BACKUP-DENY', 'must fail', 1)"
expect_denied "UPDATE" "UPDATE public.products SET name='must fail' WHERE sku='SYN-RESTORE-001'"
expect_denied "DELETE" "DELETE FROM public.products WHERE sku='SYN-RESTORE-001'"
expect_denied "TRUNCATE" "TRUNCATE TABLE public.products"
expect_denied "CREATE schema" "CREATE SCHEMA backup_role_must_not_create"\nexpect_denied "CREATE object in public" "CREATE TABLE public.backup_role_must_not_create (id integer)"
expect_denied "ALTER object" "ALTER TABLE public.products ADD COLUMN backup_role_must_not_alter integer"
expect_denied "DROP object" "DROP TABLE public.products"
expect_denied "ALTER schema" "ALTER SCHEMA public OWNER TO microapp_backup"
expect_denied "DROP schema" "DROP SCHEMA public"
expect_denied "sequence mutation" "SELECT setval(pg_get_serial_sequence('public.sales', 'sale_number'), 1, false)"
expect_denied "ALTER sequence" "ALTER SEQUENCE public.sales_sale_number_seq RESTART WITH 1"
expect_denied "role administration" "ALTER ROLE microapp_runtime NOLOGIN"
expect_denied "role membership administration" "GRANT microapp_migrator TO microapp_backup"

echo "PASS: synthetic backup principal privilege matrix."
