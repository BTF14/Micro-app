#!/usr/bin/env bash
set -euo pipefail

# Full-schema + populated business-graph restore test. Every connection target
# is fixed to the disposable PostgreSQL 18 service in backup-restore-smoke.yml.
expected_admin_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
schema_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_schema_source"
schema_restore_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_schema_restore"
migration_url="postgresql://microapp_migrator:migrator-test-only@localhost:5432/microapp_schema_source"
runtime_url="postgresql://microapp_runtime:runtime-test-only@localhost:5432/microapp_schema_source"
producer_url="postgresql://microapp_bcv_sync:bcv-sync-test-only@localhost:5432/microapp_schema_source"
migration_restore_url="postgresql://microapp_migrator:migrator-test-only@localhost:5432/microapp_schema_restore"
runtime_restore_url="postgresql://microapp_runtime:runtime-test-only@localhost:5432/microapp_schema_restore"
producer_restore_url="postgresql://microapp_bcv_sync:bcv-sync-test-only@localhost:5432/microapp_schema_restore"

if [[ "${SOURCE_URL:-}" != "$expected_admin_url" ]]; then
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

echo "== Seed coherent synthetic tenant, branch, shift, warehouse, counts, ledger and completed checkout"
psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -f scripts/backup_restore_fixture_bcv.sql

source_ephemeral="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atq -F '|' -c 'SELECT (SELECT count(*) FROM public.auth_sessions), (SELECT count(*) FROM public.auth_rate_limits), (SELECT count(*) FROM public.auth_bootstrap_attempts)')"
[[ "$source_ephemeral" == "1|1|1" ]] || {
  echo "Synthetic ephemeral auth fixture missing from source database." >&2
  exit 1
}

role_contract_ok="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT count(*) = 3 AND COALESCE(bool_and(
  rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolreplication AND NOT rolbypassrls
  AND ((rolname = 'microapp_migrator' AND rolinherit)
    OR (rolname IN ('microapp_runtime','microapp_bcv_sync') AND NOT rolinherit))
), false)
FROM pg_catalog.pg_roles
WHERE rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')")"
[[ "$role_contract_ok" == "t" ]] || { echo "Synthetic role attributes violate the expected least-privilege contract." >&2; exit 1; }

role_memberships="$(psql "$schema_source_url" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT count(*)
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles r ON r.oid IN (m.roleid, m.member)
WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')")"
[[ "$role_memberships" == "0" ]] || { echo "Synthetic migrator/runtime/producer roles unexpectedly have memberships." >&2; exit 1; }

role_search_path_manifest() {
  local migrator_connection="$1"
  local runtime_connection="$2"
  local producer_connection="$3"
  for connection in "$migrator_connection" "$runtime_connection" "$producer_connection"; do
    psql "$connection" -X -v ON_ERROR_STOP=1 -Atqc       "SELECT current_user || ':' || session_user || ':' || current_setting('search_path') || ':' || array_to_string(current_schemas(true), ',')"
  done
}
source_role_search_paths="$(role_search_path_manifest "$migration_url" "$runtime_url" "$producer_url")"

echo "== Dump complete schema and populated synthetic graph; exclude ephemeral auth tables"
# Preserve ownership and ACLs. All required synthetic roles already exist in
# the disposable PostgreSQL cluster and are verified above.
pg_dump "$schema_source_url" --format=custom \
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
pg_restore --exit-on-error --dbname="$schema_restore_url" "$tmpdir/schema.restored.dump"

manifest() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT 'tables|' || COALESCE(string_agg(table_name, ',' ORDER BY table_name), '')
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   AND table_name NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'columns|' || COALESCE(string_agg(
     c.relname || ':' || a.attname || ':'
     || pg_catalog.format_type(a.atttypid, a.atttypmod) || ':'
     || a.attnotnull::text || ':' || a.attidentity::text || ':' || a.attgenerated::text || ':'
     || COALESCE(coll_ns.nspname || '.' || coll.collname, '') || ':'
     || COALESCE(pg_catalog.md5(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)), ''),
     ';' ORDER BY c.relname, a.attnum
   ), '')
   FROM pg_catalog.pg_attribute a
   JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
   LEFT JOIN pg_catalog.pg_collation coll ON coll.oid = a.attcollation AND a.attcollation <> 0
   LEFT JOIN pg_catalog.pg_namespace coll_ns ON coll_ns.oid = coll.collnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
    AND a.attnum > 0 AND NOT a.attisdropped
    AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
 SELECT 'relation_definitions|' || COALESCE(string_agg(
     c.relname || ':' || c.relkind::text || ':' || c.relpersistence::text || ':'
     || c.relispartition::text || ':' || c.relreplident::text || ':'
     || COALESCE(array_to_string(c.reloptions, ','), '') || ':'
     || CASE WHEN c.relkind IN ('v','m')
          THEN pg_catalog.md5(pg_catalog.pg_get_viewdef(c.oid, true)) ELSE '' END,
     ';' ORDER BY c.relname
   ), '')
   FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
    AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
 SELECT 'partition_tree|' || COALESCE(string_agg(
     parent.relname || ':' || child.relname || ':'
     || COALESCE(pg_catalog.pg_get_expr(child.relpartbound, child.oid), ''),
     ';' ORDER BY parent.relname, child.relname
   ), '')
   FROM pg_catalog.pg_inherits inh
   JOIN pg_catalog.pg_class parent ON parent.oid = inh.inhparent
   JOIN pg_catalog.pg_class child ON child.oid = inh.inhrelid
   JOIN pg_catalog.pg_namespace n ON n.oid = parent.relnamespace
  WHERE n.nspname = 'public';
 SELECT 'types|' || COALESCE(string_agg(
     t.typname || ':' || t.typtype::text || ':'
     || CASE WHEN t.typtype = 'd'
          THEN pg_catalog.format_type(t.typbasetype, t.typtypmod) ELSE '' END
     || ':' || t.typnotnull::text || ':' || COALESCE(t.typdefault, ''),
     ';' ORDER BY t.typname
   ), '')
   FROM pg_catalog.pg_type t
   JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype IN ('d','e','r','m') AND t.typisdefined;
 SELECT 'enum_labels|' || COALESCE(string_agg(
     t.typname || ':' || e.enumlabel || ':' || e.enumsortorder::text,
     ';' ORDER BY t.typname, e.enumsortorder
   ), '')
   FROM pg_catalog.pg_enum e
   JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
   JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public';
 SELECT 'event_triggers|' || COALESCE(string_agg(
     e.evtname || ':' || e.evtevent::text || ':' || e.evtenabled::text || ':'
     || COALESCE(array_to_string(e.evttags, ','), '') || ':'
     || pg_catalog.md5(pg_catalog.pg_get_functiondef(e.evtfoid)),
     ';' ORDER BY e.evtname
   ), '')
   FROM pg_catalog.pg_event_trigger e;
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
SELECT 'constraints|' || COALESCE(string_agg(
     c.relname || ':' || con.conname || ':' || pg_catalog.md5(pg_catalog.pg_get_constraintdef(con.oid))
     || ':' || con.convalidated::text || ':' || con.condeferrable::text
     || ':' || con.condeferred::text || ':' || con.connoinherit::text,
     ';' ORDER BY c.relname, con.conname
   ), '')
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'indexes|' || COALESCE(string_agg(
     tbl.relname || ':' || idx.relname || ':' || pg_catalog.md5(pg_catalog.pg_get_indexdef(idx.oid))
     || ':' || ix.indisvalid::text || ':' || ix.indisready::text || ':' || ix.indislive::text
     || ':' || ix.indisunique::text || ':' || ix.indisprimary::text || ':' || ix.indisexclusion::text
     || ':' || ix.indisreplident::text || ':' || ix.indnullsnotdistinct::text,
     ';' ORDER BY tbl.relname, idx.relname
   ), '')
   FROM pg_catalog.pg_index ix
   JOIN pg_catalog.pg_class idx ON idx.oid = ix.indexrelid
   JOIN pg_catalog.pg_class tbl ON tbl.oid = ix.indrelid
   JOIN pg_catalog.pg_namespace n ON n.oid = tbl.relnamespace
  WHERE n.nspname = 'public'
    AND tbl.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
SELECT 'triggers|' || COALESCE(string_agg(c.relname || ':' || t.tgname || ':' || t.tgenabled::text || ':' || pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid)), ';' ORDER BY c.relname, t.tgname), '')
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND NOT t.tgisinternal
   AND c.relname NOT IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts');
SELECT 'sequences|' || COALESCE(string_agg(c.relname || ':' || pg_catalog.format_type(s.seqtypid, NULL) || ':' || s.seqstart::text || ':' || s.seqincrement::text || ':' || s.seqmin::text || ':' || s.seqmax::text || ':' || s.seqcache::text || ':' || s.seqcycle::text, ';' ORDER BY c.relname), '')
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_sequence s ON s.seqrelid = c.oid
 WHERE n.nspname = 'public'
   AND NOT EXISTS (
     SELECT 1
       FROM pg_catalog.pg_depend d
       JOIN pg_catalog.pg_class owning_table ON owning_table.oid = d.refobjid
      WHERE d.classid = 'pg_catalog.pg_class'::regclass
        AND d.objid = c.oid
        AND d.refclassid = 'pg_catalog.pg_class'::regclass
        AND owning_table.relname IN ('auth_sessions', 'auth_rate_limits', 'auth_bootstrap_attempts')
   );
SELECT 'sequence_state|' || COALESCE(string_agg(sequencename || ':' || COALESCE(last_value::text, 'NULL'), ';' ORDER BY sequencename), '')
  FROM pg_catalog.pg_sequences
 WHERE schemaname = 'public';
SELECT 'extensions|' || COALESCE(string_agg(e.extname || ':' || e.extversion || ':' || n.nspname, ';' ORDER BY e.extname), '')
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace;
SELECT 'functions|' || COALESCE(string_agg(p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)), ';' ORDER BY p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), '')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p');
SELECT 'migration_ledger|' || COALESCE(string_agg(version || ':' || filename || ':' || checksum || ':' || state || ':' || extract(epoch FROM applied_at)::text, ';' ORDER BY version), '')
  FROM public.schema_migrations;
SELECT 'intent_table|' || (pg_catalog.to_regclass('public.inventory_balance_ledger_intents') IS NOT NULL)::text;
SELECT 'projection_function|' || (pg_catalog.to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL)::text;
SELECT 'bcv_sync_state_table|' || (pg_catalog.to_regclass('public.bcv_sync_state') IS NOT NULL)::text;

-- Ownership, ACLs, RLS and policies must survive the actual restore.
SELECT 'relation_owners|' || COALESCE(string_agg(c.relname || ':' || pg_catalog.pg_get_userbyid(c.relowner), ';' ORDER BY c.relname), '')
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')
   AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
SELECT 'function_owners|' || COALESCE(string_agg(p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || pg_catalog.pg_get_userbyid(p.proowner), ';' ORDER BY p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), '')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind IN ('f','p');
SELECT 'schema_owner_acl|' || COALESCE(string_agg(n.nspname || ':' || pg_catalog.pg_get_userbyid(n.nspowner) || ':' || COALESCE(n.nspacl::text, ''), ';' ORDER BY n.nspname), '')
  FROM pg_catalog.pg_namespace n WHERE n.nspname = 'public';
SELECT 'relation_acl|' || COALESCE(string_agg(
    c.relname || ':' || CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END
    || ':' || pg_catalog.pg_get_userbyid(a.grantor) || ':' || a.privilege_type || ':' || a.is_grantable::text,
    ';' ORDER BY c.relname, a.grantee, a.grantor, a.privilege_type
  ), '')
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(c.relacl, pg_catalog.acldefault(CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, c.relowner))
  ) AS a
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')
   AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts')
   AND a.grantee <> c.relowner;
SELECT 'column_acl|' || COALESCE(string_agg(
    c.relname || ':' || a.attname || ':'
    || CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END
    || ':' || pg_catalog.pg_get_userbyid(acl.grantor) || ':' || acl.privilege_type || ':' || acl.is_grantable::text,
    ';' ORDER BY c.relname, a.attnum, acl.grantee, acl.grantor, acl.privilege_type
  ), '')
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl
 WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
   AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts')
   AND acl.grantee <> c.relowner;
SELECT 'function_acl|' || COALESCE(string_agg(
    p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):'
    || CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END
    || ':' || pg_catalog.pg_get_userbyid(a.grantor) || ':' || a.privilege_type || ':' || a.is_grantable::text,
    ';' ORDER BY p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), a.grantee, a.grantor, a.privilege_type
  ), '')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f'::"char", p.proowner))) AS a
 WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
   AND a.grantee <> p.proowner;
SELECT 'default_acl|' || COALESCE(string_agg(
    pg_catalog.pg_get_userbyid(d.defaclrole) || ':' || COALESCE(n.nspname, '*') || ':' || d.defaclobjtype::text || ':' || COALESCE(d.defaclacl::text, ''),
    ';' ORDER BY d.defaclrole, d.defaclnamespace, d.defaclobjtype
  ), '')
  FROM pg_catalog.pg_default_acl d
  LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace;
SELECT 'rls|' || COALESCE(string_agg(c.relname || ':' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text, ';' ORDER BY c.relname), '')
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
   AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
SELECT 'policies|' || COALESCE(string_agg(
    schemaname || ':' || tablename || ':' || policyname || ':' || permissive || ':'
    || array_to_string(roles, ',') || ':' || cmd || ':' || COALESCE(qual, '') || ':' || COALESCE(with_check, ''),
    ';' ORDER BY schemaname, tablename, policyname
  ), '')
  FROM pg_catalog.pg_policies WHERE schemaname = 'public'
   AND tablename NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
SELECT 'role_contract|' || COALESCE(string_agg(
    rolname || ':' || rolcanlogin::text || ':' || rolsuper::text || ':' || rolcreatedb::text
    || ':' || rolcreaterole::text || ':' || rolreplication::text || ':' || rolbypassrls::text
    || ':' || rolinherit::text || ':' || COALESCE(array_to_string(rolconfig, ','), ''),
    ';' ORDER BY rolname
  ), '')
  FROM pg_catalog.pg_roles
 WHERE rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync');
SELECT 'role_memberships|' || COALESCE(string_agg(
    pg_catalog.pg_get_userbyid(m.roleid) || ':' || pg_catalog.pg_get_userbyid(m.member)
    || ':' || m.admin_option::text || ':' || m.inherit_option::text || ':' || m.set_option::text,
    ';' ORDER BY m.roleid, m.member
  ), '')
  FROM pg_catalog.pg_auth_members m
  JOIN pg_catalog.pg_roles r ON r.oid IN (m.roleid, m.member)
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync');
SELECT 'effective_table_privileges|' || COALESCE(string_agg(
    r.rolname || ':' || c.relname || ':' || p.privilege || ':'
    || pg_catalog.has_table_privilege(r.rolname, c.oid, p.privilege)::text,
    ';' ORDER BY r.rolname, c.relname, p.privilege
  ), '')
  FROM pg_catalog.pg_roles r
  CROSS JOIN pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) AS p(privilege)
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')
   AND n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
   AND c.relname NOT IN ('auth_sessions','auth_rate_limits','auth_bootstrap_attempts');
SELECT 'effective_column_privileges|' || COALESCE(string_agg(
    r.rolname || ':' || c.relname || ':' || a.attname || ':' || p.privilege || ':'
    || pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname::text, p.privilege)::text,
    ';' ORDER BY r.rolname, c.relname, a.attnum, p.privilege
  ), '')
  FROM pg_catalog.pg_roles r
  CROSS JOIN pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) AS p(privilege)
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')
   AND n.nspname = 'public' AND c.relname IN ('bcv_sync_state','exchange_rates')
   AND a.attnum > 0 AND NOT a.attisdropped;
SELECT 'effective_sequence_privileges|' || COALESCE(string_agg(
    r.rolname || ':' || c.relname || ':' || p.privilege || ':'
    || pg_catalog.has_sequence_privilege(r.rolname, c.oid, p.privilege)::text,
    ';' ORDER BY r.rolname, c.relname, p.privilege
  ), '')
  FROM pg_catalog.pg_roles r
  CROSS JOIN pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('USAGE'),('SELECT'),('UPDATE')) AS p(privilege)
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')
   AND n.nspname = 'public' AND c.relkind = 'S';
SELECT 'effective_function_privileges|' || COALESCE(string_agg(
    r.rolname || ':' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):'
    || pg_catalog.has_function_privilege(r.rolname, p.oid, 'EXECUTE')::text,
    ';' ORDER BY r.rolname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
  ), '')
  FROM pg_catalog.pg_roles r
  CROSS JOIN pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')
   AND n.nspname = 'public' AND p.prokind IN ('f','p');
SELECT 'effective_schema_privileges|' || COALESCE(string_agg(
    r.rolname || ':' || n.nspname || ':' || p.privilege || ':'
    || pg_catalog.has_schema_privilege(r.rolname, n.oid, p.privilege)::text,
    ';' ORDER BY r.rolname, n.nspname, p.privilege
  ), '')
  FROM pg_catalog.pg_roles r
  CROSS JOIN pg_catalog.pg_namespace n
  CROSS JOIN (VALUES ('USAGE'),('CREATE')) AS p(privilege)
 WHERE r.rolname IN ('microapp_migrator','microapp_runtime','microapp_bcv_sync')
   AND n.nspname = 'public';
SELECT 'database_acl|' || pg_catalog.pg_get_userbyid(d.datdba) || ':' || COALESCE(d.datacl::text, '')
  FROM pg_catalog.pg_database d WHERE d.datname = pg_catalog.current_database();

-- Synthetic business graph: counts, ledger movements, balance, checkout and audit.
SELECT 'fixture_organizations|' || count(*)::text
  FROM public.organizations
 WHERE id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414');
SELECT 'fixture_organization_members|' || count(*)::text
  FROM public.organization_members
 WHERE (organization_id = '11111111-1111-4111-8111-111111111111' AND user_id = '22222222-2222-4222-8222-222222222222' AND role = 'owner')
    OR (organization_id = '14141414-1414-4414-8414-141414141414' AND user_id = '15151515-1515-4515-8515-151515151515' AND role = 'owner');
SELECT 'fixture_auth_allowlist|' || count(*)::text
  FROM public.auth_allowlist
 WHERE email IN ('backup-restore@example.invalid','backup-restore-tenant-b@example.invalid');
SELECT 'fixture_branch_memberships|' || count(*)::text
  FROM public.branch_memberships bm
  JOIN public.organization_members om
    ON om.organization_id=bm.organization_id AND om.user_id=bm.user_id
  JOIN public.branches b
    ON b.organization_id=bm.organization_id AND b.id=bm.branch_id
 WHERE bm.is_active
   AND ((bm.organization_id='11111111-1111-4111-8111-111111111111' AND bm.branch_id='33333333-3333-4333-8333-333333333333' AND bm.user_id='22222222-2222-4222-8222-222222222222')
     OR (bm.organization_id='14141414-1414-4414-8414-141414141414' AND bm.branch_id='16161616-1616-4616-8616-161616161616' AND bm.user_id='15151515-1515-4515-8515-151515151515'));
SELECT 'fixture_supplier_products|' || count(*)::text
  FROM public.products p
  JOIN public.suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id
 WHERE p.id IN ('77777777-7777-4777-8777-777777777777','18181818-1818-4818-8818-181818181818');
SELECT 'fixture_products_legacy_stock|' || COALESCE(string_agg(id::text || ':' || stock_quantity::text, ';' ORDER BY id), '')
  FROM public.products
 WHERE id IN ('77777777-7777-4777-8777-777777777777','18181818-1818-4818-8818-181818181818');
SELECT 'fixture_tenant_b_graph|' || count(*)::text
  FROM public.organizations o
  JOIN public.branches b ON b.organization_id=o.id
  JOIN public.branch_memberships bm ON bm.organization_id=o.id AND bm.branch_id=b.id
  JOIN public.warehouses w ON w.organization_id=o.id AND w.branch_id=b.id
  JOIN public.products p ON p.organization_id=o.id
  JOIN public.inventory_balances ib ON ib.organization_id=o.id AND ib.warehouse_id=w.id AND ib.product_id=p.id
 WHERE o.id='14141414-1414-4414-8414-141414141414'
   AND b.id='16161616-1616-4616-8616-161616161616'
   AND bm.user_id='15151515-1515-4515-8515-151515151515'
   AND w.id='19191919-1919-4919-8919-191919191919'
   AND p.id='18181818-1818-4818-8818-181818181818'
   AND ib.on_hand_quantity=5.000 AND ib.balance_version=1;
SELECT 'fixture_cross_tenant_links|' || count(*)::text
  FROM public.inventory_balances ib
  JOIN public.warehouses w ON w.id=ib.warehouse_id
  JOIN public.products p ON p.id=ib.product_id
 WHERE ib.organization_id <> w.organization_id
    OR ib.organization_id <> p.organization_id
    OR ib.branch_id <> w.branch_id;
SELECT 'fixture_register_shift|' || count(*)::text
  FROM public.register_shifts
 WHERE id = '55555555-5555-4555-8555-555555555555' AND closed_at IS NULL;
SELECT 'fixture_counts|' || count(*)::text
  FROM public.inventory_counts
 WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','20202020-2020-4020-8020-202020202020')
   AND status = 'confirmed';
SELECT 'fixture_count_lines|' || count(*)::text
  FROM public.inventory_count_lines
 WHERE count_id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','20202020-2020-4020-8020-202020202020');
SELECT 'fixture_balances|' || COALESCE(string_agg(
    organization_id::text || ':' || on_hand_quantity::text || ':' || reserved_quantity::text || ':' || balance_version::text,
    ';' ORDER BY organization_id, warehouse_id, product_id
  ), '')
  FROM public.inventory_balances
 WHERE (organization_id = '11111111-1111-4111-8111-111111111111' AND warehouse_id = '99999999-9999-4999-8999-999999999999' AND product_id = '77777777-7777-4777-8777-777777777777')
    OR (organization_id = '14141414-1414-4414-8414-141414141414' AND warehouse_id = '19191919-1919-4919-8919-191919191919' AND product_id = '18181818-1818-4818-8818-181818181818');
SELECT 'fixture_movements|' || COALESCE(string_agg(
    organization_id::text || ':' || movement_type || ':' || quantity_delta::text || ':' || COALESCE(reference_type, '') || ':' || COALESCE(reference_id::text, ''),
    ';' ORDER BY created_at, id
  ), '')
  FROM public.warehouse_inventory_movements
 WHERE (organization_id = '11111111-1111-4111-8111-111111111111' AND product_id = '77777777-7777-4777-8777-777777777777')
    OR (organization_id = '14141414-1414-4414-8414-141414141414' AND product_id = '18181818-1818-4818-8818-181818181818');
SELECT 'fixture_pending_ledger_intents|' || count(*)::text
  FROM public.inventory_balance_ledger_intents
 WHERE organization_id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414');
SELECT 'fixture_completed_sale|' || count(*)::text
  FROM public.sales
 WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
   AND status = 'completed' AND settlement_currency = 'USD'
   AND branch_id = '33333333-3333-4333-8333-333333333333'
   AND register_shift_id = '55555555-5555-4555-8555-555555555555'
   AND warehouse_id = '99999999-9999-4999-8999-999999999999'
   AND total_usd = 10.0000 AND total_ves_snapshot = 2501.23;
SELECT 'fixture_sale_items|' || count(*)::text
  FROM public.sale_items
 WHERE sale_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
   AND product_id = '77777777-7777-4777-8777-777777777777'
   AND quantity = 2.000 AND line_total_usd = 10.0000 AND line_total_ves = 2501.23;
SELECT 'fixture_payments|' || count(*)::text
  FROM public.payments
 WHERE sale_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
   AND currency = 'USD' AND amount = 10.0000 AND usd_equivalent_snapshot = 10.0000;
SELECT 'fixture_audit|' || count(*)::text
  FROM public.audit_logs
 WHERE organization_id = '11111111-1111-4111-8111-111111111111'
   AND actor_user_id = '22222222-2222-4222-8222-222222222222'
   AND action = 'sale.completed' AND entity_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
SELECT 'fixture_cross_table_relationships|' || count(*)::text
  FROM public.sales s
  JOIN public.branches b
    ON b.organization_id = s.organization_id AND b.id = s.branch_id
  JOIN public.register_shifts rs
    ON rs.organization_id = s.organization_id AND rs.branch_id = s.branch_id AND rs.id = s.register_shift_id
  JOIN public.warehouses w
    ON w.organization_id = s.organization_id AND w.branch_id = s.branch_id AND w.id = s.warehouse_id
  JOIN public.sale_items si
    ON si.organization_id = s.organization_id AND si.sale_id = s.id
  JOIN public.products p
    ON p.organization_id = si.organization_id AND p.id = si.product_id
  JOIN public.payments pay
    ON pay.organization_id = s.organization_id AND pay.sale_id = s.id
  JOIN public.warehouse_inventory_movements m
    ON m.organization_id = s.organization_id AND m.branch_id = s.branch_id
   AND m.warehouse_id = s.warehouse_id AND m.product_id = si.product_id
   AND m.movement_type = 'sale' AND m.reference_id = s.id
  JOIN public.audit_logs a
    ON a.organization_id = s.organization_id AND a.actor_user_id = s.created_by
   AND a.action = 'sale.completed' AND a.entity_id = s.id::text
  JOIN public.exchange_rates er
    ON er.id=s.exchange_rate_id AND er.rate=s.exchange_rate_snapshot
   AND er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid'
   AND er.effective_date=(now() AT TIME ZONE 'America/Caracas')::date
  JOIN public.bcv_sync_state sync
    ON sync.singleton=true AND sync.last_outcome IN ('inserted','unchanged')
   AND sync.last_success_at IS NOT NULL
   AND sync.last_effective_date=(now() AT TIME ZONE 'America/Caracas')::date
 WHERE s.id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
SQL
}

source_manifest="$(manifest "$schema_source_url")"
restored_manifest="$(manifest "$schema_restore_url")"
if [[ "$source_manifest" != "$restored_manifest" ]]; then
  echo "Restored schema/data manifest differs from source:" >&2
  diff -u <(printf '%s\n' "$source_manifest") <(printf '%s\n' "$restored_manifest") || true
  exit 1
fi

restored_role_search_paths="$(role_search_path_manifest "$migration_restore_url" "$runtime_restore_url" "$producer_restore_url")"
if [[ "$source_role_search_paths" != "$restored_role_search_paths" ]]; then
  echo "Effective role search_path differs after restore." >&2
  diff -u <(printf '%s\n' "$source_role_search_paths") <(printf '%s\n' "$restored_role_search_paths") || true
  exit 1
fi


fixture_assertions() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT
  (SELECT count(*) = 2 FROM public.organizations WHERE id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414'))
  AND (SELECT count(*) = 2 FROM public.organization_members WHERE (organization_id='11111111-1111-4111-8111-111111111111' AND user_id='22222222-2222-4222-8222-222222222222' AND role='owner') OR (organization_id='14141414-1414-4414-8414-141414141414' AND user_id='15151515-1515-4515-8515-151515151515' AND role='owner'))
  AND (SELECT count(*) = 2 FROM public.auth_allowlist WHERE email IN ('backup-restore@example.invalid','backup-restore-tenant-b@example.invalid'))
  AND (SELECT count(*) = 2 FROM public.branch_memberships bm JOIN public.organization_members om ON om.organization_id=bm.organization_id AND om.user_id=bm.user_id JOIN public.branches b ON b.organization_id=bm.organization_id AND b.id=bm.branch_id WHERE bm.is_active AND ((bm.organization_id='11111111-1111-4111-8111-111111111111' AND bm.branch_id='33333333-3333-4333-8333-333333333333' AND bm.user_id='22222222-2222-4222-8222-222222222222') OR (bm.organization_id='14141414-1414-4414-8414-141414141414' AND bm.branch_id='16161616-1616-4616-8616-161616161616' AND bm.user_id='15151515-1515-4515-8515-151515151515')))
  AND (SELECT count(*) = 2 FROM public.products p JOIN public.suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id WHERE p.id IN ('77777777-7777-4777-8777-777777777777','18181818-1818-4818-8818-181818181818'))
  AND (SELECT count(*) = 2 FROM public.products WHERE id IN ('77777777-7777-4777-8777-777777777777','18181818-1818-4818-8818-181818181818') AND stock_quantity=0.000)
  AND (SELECT count(*) = 2 FROM public.warehouses WHERE id IN ('99999999-9999-4999-8999-999999999999','19191919-1919-4919-8919-191919191919'))
  AND (SELECT count(*) = 1 FROM public.register_shifts WHERE id = '55555555-5555-4555-8555-555555555555' AND closed_at IS NULL)
  AND (SELECT count(*) = 3 FROM public.inventory_counts WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','20202020-2020-4020-8020-202020202020') AND status='confirmed')
  AND (SELECT count(*) = 3 FROM public.inventory_count_lines WHERE count_id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','20202020-2020-4020-8020-202020202020'))
  AND (SELECT count(*) = 1 FROM public.inventory_balances WHERE organization_id='11111111-1111-4111-8111-111111111111' AND warehouse_id='99999999-9999-4999-8999-999999999999' AND product_id='77777777-7777-4777-8777-777777777777' AND on_hand_quantity=9.000 AND balance_version=3)
  AND (SELECT count(*) = 1 FROM public.inventory_balances WHERE organization_id='14141414-1414-4414-8414-141414141414' AND warehouse_id='19191919-1919-4919-8919-191919191919' AND product_id='18181818-1818-4818-8818-181818181818' AND on_hand_quantity=5.000 AND balance_version=1)
  AND (SELECT count(*) = 4 FROM public.warehouse_inventory_movements WHERE organization_id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414') AND product_id IN ('77777777-7777-4777-8777-777777777777','18181818-1818-4818-8818-181818181818'))
  AND (SELECT pg_catalog.to_regclass('public.inventory_balance_ledger_intents') IS NULL
          AND pg_catalog.to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL)
  AND (SELECT count(*) = 1 FROM public.organizations o JOIN public.branches b ON b.organization_id=o.id JOIN public.branch_memberships bm ON bm.organization_id=o.id AND bm.branch_id=b.id JOIN public.warehouses w ON w.organization_id=o.id AND w.branch_id=b.id JOIN public.products p ON p.organization_id=o.id JOIN public.inventory_balances ib ON ib.organization_id=o.id AND ib.warehouse_id=w.id AND ib.product_id=p.id WHERE o.id='14141414-1414-4414-8414-141414141414' AND b.id='16161616-1616-4616-8616-161616161616' AND bm.user_id='15151515-1515-4515-8515-151515151515' AND w.id='19191919-1919-4919-8919-191919191919' AND p.id='18181818-1818-4818-8818-181818181818' AND ib.on_hand_quantity=5.000 AND ib.balance_version=1)
  AND (SELECT count(*) = 0 FROM public.inventory_balances ib JOIN public.warehouses w ON w.id=ib.warehouse_id JOIN public.products p ON p.id=ib.product_id WHERE ib.organization_id<>w.organization_id OR ib.organization_id<>p.organization_id OR ib.branch_id<>w.branch_id)
  AND (SELECT count(*) = 1 FROM public.auth_bootstrap WHERE id=true AND consumed_at IS NOT NULL AND created_organization_id='11111111-1111-4111-8111-111111111111')
  AND (SELECT count(*) = 1 FROM public.exchange_rates
        WHERE id='88888888-8888-4888-8888-888888888888'
          AND source='BCV_OFFICIAL_HTML_V1' AND validation_status='valid'
          AND effective_date=(now() AT TIME ZONE 'America/Caracas')::date)
   AND (SELECT count(*) = 1 FROM public.bcv_sync_state
        WHERE singleton=true AND last_outcome='inserted'
          AND last_success_at IS NOT NULL
          AND last_effective_date=(now() AT TIME ZONE 'America/Caracas')::date)
  AND (SELECT count(*) = 1 FROM public.sales WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' AND status='completed' AND settlement_currency='USD' AND branch_id='33333333-3333-4333-8333-333333333333' AND register_shift_id='55555555-5555-4555-8555-555555555555' AND warehouse_id='99999999-9999-4999-8999-999999999999' AND total_usd=10.0000 AND total_ves_snapshot=2501.23)
  AND (SELECT count(*) = 1 FROM public.sale_items WHERE sale_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' AND product_id='77777777-7777-4777-8777-777777777777' AND quantity=2.000 AND line_total_usd=10.0000 AND line_total_ves=2501.23)
  AND (SELECT count(*) = 1 FROM public.payments WHERE sale_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' AND currency='USD' AND amount=10.0000 AND usd_equivalent_snapshot=10.0000 AND allocation_position=1)
  AND (SELECT count(*) = 1 FROM public.audit_logs WHERE action='sale.completed' AND entity_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  AND (SELECT count(*) = 1
    FROM public.sales s
    JOIN public.branches b ON b.organization_id=s.organization_id AND b.id=s.branch_id
    JOIN public.register_shifts rs ON rs.organization_id=s.organization_id AND rs.branch_id=s.branch_id AND rs.id=s.register_shift_id
    JOIN public.warehouses w ON w.organization_id=s.organization_id AND w.branch_id=s.branch_id AND w.id=s.warehouse_id
    JOIN public.sale_items si ON si.organization_id=s.organization_id AND si.sale_id=s.id
    JOIN public.products p ON p.organization_id=si.organization_id AND p.id=si.product_id
    JOIN public.payments pay ON pay.organization_id=s.organization_id AND pay.sale_id=s.id
    JOIN public.warehouse_inventory_movements m ON m.organization_id=s.organization_id AND m.branch_id=s.branch_id AND m.warehouse_id=s.warehouse_id AND m.product_id=si.product_id AND m.movement_type='sale' AND m.reference_id=s.id
    JOIN public.audit_logs a ON a.organization_id=s.organization_id AND a.actor_user_id=s.created_by AND a.action='sale.completed' AND a.entity_id=s.id::text
    JOIN public.exchange_rates er ON er.id=s.exchange_rate_id AND er.rate=s.exchange_rate_snapshot
    WHERE s.id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  AND (SELECT count(*) = 1 FROM public.inventory_count_lines
       WHERE count_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND counted_quantity=10.000)
  AND (SELECT count(*) = 1 FROM public.inventory_count_lines
       WHERE count_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
         AND counted_quantity=11.000 AND expected_on_hand_quantity=10.000
         AND expected_balance_version=1)
  AND (SELECT count(*) = 0
       FROM public.inventory_balances b
       WHERE b.organization_id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414')
         AND b.on_hand_quantity <> COALESCE((
           SELECT sum(m.quantity_delta)
           FROM public.warehouse_inventory_movements m
           WHERE m.organization_id=b.organization_id AND m.branch_id=b.branch_id
             AND m.warehouse_id=b.warehouse_id AND m.product_id=b.product_id
         ), 0))
  AND (SELECT count(*) = 0
       FROM public.warehouse_inventory_movements m
       LEFT JOIN public.inventory_balances b
         ON b.organization_id=m.organization_id AND b.branch_id=m.branch_id
        AND b.warehouse_id=m.warehouse_id AND b.product_id=m.product_id
       WHERE m.organization_id IN ('11111111-1111-4111-8111-111111111111','14141414-1414-4414-8414-141414141414')
         AND b.product_id IS NULL)
  AND (SELECT count(*) = 1 FROM public.sales s
       WHERE s.id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
         AND s.total_usd=(SELECT sum(si.line_total_usd) FROM public.sale_items si WHERE si.sale_id=s.id)
         AND s.total_usd=(SELECT sum(pay.usd_equivalent_snapshot) FROM public.payments pay WHERE pay.sale_id=s.id))
"
}
source_fixture_ok="$(fixture_assertions "$schema_source_url")"
restored_fixture_ok="$(fixture_assertions "$schema_restore_url")"
if [[ "$source_fixture_ok" != "t" || "$restored_fixture_ok" != "t" ]]; then
  echo "Synthetic business graph assertions failed before or after restore." >&2
  exit 1
fi


required_tables="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM (VALUES ('organizations'),('app_users'),('organization_members'),('auth_allowlist'),('auth_bootstrap'),('suppliers'),('products'),('exchange_rates'),('sales'),('sale_items'),('payments'),('inventory_movements'),('audit_logs'),('branches'),('branch_memberships'),('registers'),('register_shifts'),('warehouses'),('inventory_counts'),('inventory_count_lines'),('inventory_balances'),('warehouse_inventory_movements'),('bcv_sync_state'),('schema_migrations')) AS required(table_name) WHERE pg_catalog.to_regclass('public.' || required.table_name) IS NOT NULL")"
[[ "$required_tables" == "24" ]] || { echo "Expected 23 stable application tables plus schema_migrations (24 required objects), got $required_tables." >&2; exit 1; }

ephemeral="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT (pg_catalog.to_regclass('public.auth_sessions') IS NULL AND pg_catalog.to_regclass('public.auth_rate_limits') IS NULL AND pg_catalog.to_regclass('public.auth_bootstrap_attempts') IS NULL)")"
[[ "$ephemeral" == "t" ]] || { echo "Ephemeral auth tables were unexpectedly restored." >&2; exit 1; }

restored_ledger_ok="$(psql "$schema_restore_url" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) = $expected_migrations AND bool_and(state = 'applied') AND bool_and(length(checksum) = 64) AND bool_and(applied_at IS NOT NULL) FROM public.schema_migrations")"
[[ "$restored_ledger_ok" == "t" ]] || { echo "Restored migration ledger is incomplete." >&2; exit 1; }

echo "PASS: all $expected_migrations numbered migrations applied through scripts/db/migrate.sh."
echo "PASS: encrypted restore preserved schema, ownership, ACLs, RLS/policies, role contract and effective search_path."
echo "PASS: populated PR #287 BCV/checkout and projection-ledger graph and cross-table relationships survived restore."
echo "PASS: auth_sessions, auth_rate_limits and auth_bootstrap_attempts contained synthetic source rows and were excluded from restore."
echo "Schema/data round-trip elapsed seconds: $((SECONDS - started_at))."
