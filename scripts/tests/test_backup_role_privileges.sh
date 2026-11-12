#!/usr/bin/env bash
set -euo pipefail

expected_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
backup_url="postgresql://microapp_backup:backup-test-only@localhost:5432/microapp_source"
if [[ "\${SOURCE_URL:-}" != "$expected_source_url" ]]; then
  echo "Refusing to run: SOURCE_URL must target the fixed disposable PostgreSQL CI database." >&2
  exit 2
fi

# Synthetic-only role setup. The production provisioning SQL is executed below;
# only its password prompt is replaced by the documented CI-only env path.
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator') THEN
    CREATE ROLE microapp_migrator;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime') THEN
    CREATE ROLE microapp_runtime;
  END IF;
END;
$roles$;

ALTER ROLE microapp_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE microapp_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

-- Add non-table relation kinds and a security-definer mutation routine so the
-- audit covers views, sequences, ownership and callable administrative code.
CREATE OR REPLACE VIEW public.backup_role_audit_view AS
  SELECT id, sku FROM public.products;
CREATE SEQUENCE IF NOT EXISTS public.backup_role_audit_sequence;
CREATE OR REPLACE FUNCTION public.backup_role_mutation_probe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.products SET name = 'must-not-run' WHERE sku = 'SYN-RESTORE-001';
END;
$function$;
REVOKE ALL ON FUNCTION public.backup_role_mutation_probe() FROM PUBLIC;
SQL

BACKUP_ROLE_TEST_PASSWORD="backup-test-only" \
  psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -v backup_role_test_mode=1 \
  -f scripts/provision_neon_backup_role.sql

# The independent audit must pass when connected as the provisioned backup LOGIN.
psql "$backup_url" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql

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
assert_true "backup role has database CONNECT but not CREATE" "
  has_database_privilege('microapp_backup', 'microapp_source', 'CONNECT')
  AND NOT has_database_privilege('microapp_backup', 'microapp_source', 'CREATE')
"
assert_true "backup role has schema USAGE but not CREATE" "
  has_schema_privilege('microapp_backup', 'public', 'USAGE')
  AND NOT has_schema_privilege('microapp_backup', 'public', 'CREATE')
"
assert_true "backup role has SELECT on every public table" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND NOT has_table_privilege('microapp_backup', c.oid, 'SELECT')
  )
"
assert_true "backup role has SELECT on every public sequence" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND CASE WHEN c.relkind='S'
        THEN NOT has_sequence_privilege('microapp_backup', c.oid, 'SELECT')
        ELSE false
      END
  )
"
assert_true "backup role has no column-level write or reference grants" "
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND CASE WHEN c.relkind IN ('r','p') THEN (
        has_any_column_privilege('microapp_backup', c.oid, 'INSERT')
        OR has_any_column_privilege('microapp_backup', c.oid, 'UPDATE')
        OR has_any_column_privilege('microapp_backup', c.oid, 'REFERENCES')
      ) ELSE false END
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
    WHERE n.nspname='public'
      AND CASE WHEN c.relkind='S'
        THEN (
          has_sequence_privilege('microapp_backup', c.oid, 'USAGE')
          OR has_sequence_privilege('microapp_backup', c.oid, 'UPDATE')
        )
        ELSE false
      END
  )
"

assert_true "backup role has no default privileges beyond sequence SELECT" "
  EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE a.grantee=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup')
      AND d.defaclnamespace='public'::regnamespace
      AND d.defaclobjtype='S'
      AND a.privilege_type='SELECT'
      AND NOT a.is_grantable
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE a.grantee=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup')
      AND (d.defaclnamespace <> 'public'::regnamespace
        OR d.defaclobjtype NOT IN ('r','S')
        OR a.privilege_type <> 'SELECT' OR a.is_grantable)
  )
"
assert_true "backup role owns no view or sequence" "
  NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relnamespace='public'::regnamespace
      AND relkind IN ('r','p','v','m','f','S')
      AND relowner=(SELECT oid FROM pg_roles WHERE rolname='microapp_backup')
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
expect_denied "CREATE schema" "CREATE SCHEMA backup_role_must_not_create"
expect_denied "CREATE object in public" "CREATE TABLE public.backup_role_must_not_create (id integer)"
expect_denied "ALTER object" "ALTER TABLE public.products ADD COLUMN backup_role_must_not_alter integer"
expect_denied "DROP object" "DROP TABLE public.products"
expect_denied "ALTER schema" "ALTER SCHEMA public OWNER TO microapp_backup"
expect_denied "DROP schema" "DROP SCHEMA public"
expect_denied "sequence mutation" "SELECT setval(pg_get_serial_sequence('public.sales', 'sale_number'), 1, false)"
expect_denied "sequence nextval" "SELECT nextval('public.backup_role_audit_sequence')" 
expect_denied "security-definer mutation routine" "SELECT public.backup_role_mutation_probe()"
expect_denied "ALTER sequence" "ALTER SEQUENCE public.sales_sale_number_seq RESTART WITH 1"
expect_denied "role administration" "ALTER ROLE microapp_runtime NOLOGIN"
expect_denied "role membership administration" "GRANT microapp_migrator TO microapp_backup"

expect_audit_denied() {
  local label="$1"
  local alteration="$2"
  psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "$alteration" >/dev/null
  if psql "$backup_url" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql >/dev/null 2>&1; then
    echo "FAIL: role audit accepted forbidden attribute: $label" >&2
    exit 1
  fi
  echo "PASS: role audit rejects $label"
  psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "ALTER ROLE microapp_backup NOCREATEDB NOCREATEROLE NOBYPASSRLS NOSUPERUSER" >/dev/null
}

expect_audit_denied "CREATEDB" "ALTER ROLE microapp_backup CREATEDB"
expect_audit_denied "CREATEROLE" "ALTER ROLE microapp_backup CREATEROLE"
expect_audit_denied "BYPASSRLS" "ALTER ROLE microapp_backup BYPASSRLS"

expect_audit_denied "SUPERUSER" "ALTER ROLE microapp_backup SUPERUSER"

# Prove the audit catches newly introduced table, sequence and routine grants.
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "GRANT UPDATE ON public.products TO microapp_backup" >/dev/null
if psql "$backup_url" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql >/dev/null 2>&1; then
  echo "FAIL: role audit accepted UPDATE on a table" >&2; exit 1
fi
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "REVOKE UPDATE ON public.products FROM microapp_backup" >/dev/null
echo "PASS: role audit rejects table UPDATE"

psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SEQUENCE public.backup_role_audit_sequence TO microapp_backup" >/dev/null
if psql "$backup_url" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql >/dev/null 2>&1; then
  echo "FAIL: role audit accepted sequence USAGE" >&2; exit 1
fi
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "REVOKE USAGE ON SEQUENCE public.backup_role_audit_sequence FROM microapp_backup" >/dev/null
echo "PASS: role audit rejects sequence USAGE"

psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "GRANT EXECUTE ON FUNCTION public.backup_role_mutation_probe() TO microapp_backup" >/dev/null
if psql "$backup_url" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql >/dev/null 2>&1; then
  echo "FAIL: role audit accepted EXECUTE on a security-definer mutation routine" >&2; exit 1
fi
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c "REVOKE EXECUTE ON FUNCTION public.backup_role_mutation_probe() FROM microapp_backup" >/dev/null
echo "PASS: role audit rejects EXECUTE on security-definer mutation routine"


# Validate a complete custom-format dump as the backup principal. The parent
# restore harness performs the age encryption/decryption round-trip immediately
# after this test, using only a disposable synthetic key.
dump_dir="$(mktemp -d)"
trap 'rm -rf "$dump_dir"' EXIT
pg_dump "$backup_url" --no-owner --no-privileges --format=custom --file="$dump_dir/backup.dump"
test -s "$dump_dir/backup.dump"
archive_list="$(pg_restore --list "$dump_dir/backup.dump")"
grep -Eq 'TABLE public products ' <<<"$archive_list"
grep -Eq 'SEQUENCE public backup_role_audit_sequence ' <<<"$archive_list"
echo "PASS: backup LOGIN produced an intact custom-format pg_dump archive."

echo "PASS: synthetic backup principal privilege matrix and effective-principal audit."
