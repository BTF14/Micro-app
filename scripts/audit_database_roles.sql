-- Read-only, fail-closed audit of the EFFECTIVE connected principal.
-- Run with psql using the candidate DATABASE_URL_BACKUP_RO:
--   psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql
-- This script performs catalog reads and a read-only DO block; it changes nothing.
\set ON_ERROR_STOP on

\echo 'Auditing effective PostgreSQL principal (current_user); no credentials are emitted.'
SELECT current_database() AS database_name,
       current_user AS effective_login,
       session_user AS session_login,
       current_setting('server_version') AS server_version;

-- Explicit evidence surfaces: table/view grants, routine grants, sequence ACLs,
-- ownership of relation kinds (including views and sequences), and default ACLs.
SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_schema='public'
  AND grantee IN (current_user, 'PUBLIC')
ORDER BY table_schema, table_name, grantee, privilege_type;

SELECT grantee, routine_schema, routine_name, privilege_type, is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema='public'
  AND grantee IN (current_user, 'PUBLIC')
ORDER BY routine_schema, routine_name, grantee, privilege_type;

SELECT n.nspname AS sequence_schema, c.relname AS sequence_name,
       pg_get_userbyid(c.relowner) AS sequence_owner,
       c.relacl
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='S'
ORDER BY n.nspname, c.relname;

SELECT n.nspname AS object_schema, c.relname AS object_name,
       c.relkind, pg_get_userbyid(c.relowner) AS object_owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p','v','m','f','S')
ORDER BY n.nspname, c.relkind, c.relname;

SELECT pg_get_userbyid(d.defaclrole) AS object_owner,
       COALESCE(n.nspname, '<global>') AS schema_name,
       d.defaclobjtype, x.grantee,
       CASE WHEN x.grantee=0 THEN 'PUBLIC'
            ELSE pg_get_userbyid(x.grantee) END AS grantee_name,
       x.privilege_type, x.is_grantable
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS x
ORDER BY object_owner, schema_name, d.defaclobjtype, grantee_name, x.privilege_type;

DO $audit$
DECLARE
  v_role oid;
  v_role_name name := current_user;
  v_problem text;
BEGIN
  IF session_user <> current_user THEN
    RAISE EXCEPTION 'FAIL: SET ROLE detected (session_user %, current_user %); audit the login principal directly', session_user, current_user;
  END IF;

  SELECT oid INTO v_role FROM pg_catalog.pg_roles WHERE rolname = v_role_name;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'FAIL: connected principal % is not present in pg_roles', v_role_name;
  END IF;

  SELECT string_agg(problem, '; ' ORDER BY problem) INTO v_problem
  FROM (
    SELECT 'SUPERUSER' AS problem WHERE (SELECT rolsuper FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'CREATEDB' WHERE (SELECT rolcreatedb FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'CREATEROLE' WHERE (SELECT rolcreaterole FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'REPLICATION' WHERE (SELECT rolreplication FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'BYPASSRLS' WHERE (SELECT rolbypassrls FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'INHERIT enabled' WHERE (SELECT rolinherit FROM pg_roles WHERE oid=v_role)
    UNION ALL SELECT 'LOGIN disabled' WHERE NOT (SELECT rolcanlogin FROM pg_roles WHERE oid=v_role)
  ) x;
  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: principal % has forbidden role attributes: %', v_role_name, v_problem;
  END IF;

  -- No memberships in either direction; this also explicitly excludes the
  -- database owner, Neon owner and application runtime principals.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members m
    WHERE m.member=v_role OR m.roleid=v_role
  ) THEN
    RAISE EXCEPTION 'FAIL: principal % has role memberships (including possible pg_database_owner/neondb_owner/runtime membership)', v_role_name;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_roles granted_role ON granted_role.oid=m.roleid
    WHERE m.member=v_role
      AND granted_role.rolname IN ('pg_database_owner','neondb_owner','microapp_runtime')
  ) THEN
    RAISE EXCEPTION 'FAIL: backup principal is a member of a prohibited owner/runtime role';
  END IF;

  -- pg_shdepend covers ownership dependencies beyond ordinary tables; the
  -- explicit relation query makes views and sequences visible in evidence.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_shdepend
    WHERE refclassid='pg_catalog.pg_authid'::regclass
      AND refobjid=v_role AND deptype='o'
  ) THEN
    RAISE EXCEPTION 'FAIL: principal % owns one or more database objects', v_role_name;
  END IF;

  IF NOT has_database_privilege(v_role_name, current_database(), 'CONNECT')
     OR has_database_privilege(v_role_name, current_database(), 'CREATE')
  THEN
    RAISE EXCEPTION 'FAIL: database requires CONNECT and must deny CREATE';
  END IF;

  IF NOT has_schema_privilege(v_role_name, 'public', 'USAGE')
     OR has_schema_privilege(v_role_name, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'FAIL: public schema requires USAGE and must deny CREATE';
  END IF;

  -- Include ordinary/partitioned tables, views, materialized views and foreign
  -- tables. Effective checks include PUBLIC and any inherited ACL source.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND (
        NOT has_table_privilege(v_role_name,c.oid,'SELECT')
        OR has_table_privilege(v_role_name,c.oid,'INSERT')
        OR has_table_privilege(v_role_name,c.oid,'UPDATE')
        OR has_table_privilege(v_role_name,c.oid,'DELETE')
        OR has_table_privilege(v_role_name,c.oid,'TRUNCATE')
        OR has_table_privilege(v_role_name,c.oid,'REFERENCES')
        OR has_table_privilege(v_role_name,c.oid,'TRIGGER')
        OR has_any_column_privilege(v_role_name,c.oid,'INSERT')
        OR has_any_column_privilege(v_role_name,c.oid,'UPDATE')
        OR has_any_column_privilege(v_role_name,c.oid,'REFERENCES')
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: tables/views require SELECT only; write, trigger, reference and column-write privileges are forbidden';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema='public'
      AND grantee IN (current_user, 'PUBLIC')
      AND (privilege_type <> 'SELECT' OR is_grantable='YES')
  ) THEN
    RAISE EXCEPTION 'FAIL: explicit table/view ACL contains non-SELECT or grant-option privilege';
  END IF;

  -- SELECT is sufficient to read sequence state for pg_dump. USAGE permits
  -- nextval(); UPDATE permits setval()/nextval(); both are prohibited.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
      AND (
        NOT has_sequence_privilege(v_role_name,c.oid,'SELECT')
        OR has_sequence_privilege(v_role_name,c.oid,'USAGE')
        OR has_sequence_privilege(v_role_name,c.oid,'UPDATE')
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: sequences require SELECT only (USAGE and UPDATE are forbidden)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('S', c.relowner))) a
    WHERE n.nspname='public' AND c.relkind='S'
      AND a.grantee IN (v_role, 0)
      AND (a.privilege_type <> 'SELECT' OR a.is_grantable)
  ) THEN
    RAISE EXCEPTION 'FAIL: sequence ACL grants a privilege other than non-grantable SELECT';
  END IF;

  -- Do not allow direct routine grants or effective EXECUTE on callable public
  -- routines. Trigger-only functions are excluded because PostgreSQL invokes
  -- them through table triggers, not as caller-executable routines.
  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND grantee=current_user
      AND (privilege_type <> 'EXECUTE' OR is_grantable='YES')
  ) THEN
    RAISE EXCEPTION 'FAIL: unexpected explicit routine privilege or grant option';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgfoid=p.oid)
      AND has_function_privilege(v_role_name,p.oid,'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'FAIL: backup principal can EXECUTE a callable public routine; inspect routine_privileges and revoke grants';
  END IF;

  -- Default ACLs are owner-specific. The backup role must not own defaults;
  -- any defaults granted to it may only be non-grantable SELECT on tables or
  -- sequences. Function EXECUTE and all other default grants are forbidden.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl
    WHERE defaclrole=v_role
  ) THEN
    RAISE EXCEPTION 'FAIL: backup principal owns default privileges';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE a.grantee=v_role
      AND (
        d.defaclnamespace <> 'public'::regnamespace
        OR d.defaclobjtype NOT IN ('r','S')
        OR a.privilege_type <> 'SELECT'
        OR a.is_grantable
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: default ACL grants backup privileges beyond non-grantable table/sequence SELECT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (c.relrowsecurity OR c.relforcerowsecurity)
  ) THEN
    RAISE EXCEPTION 'FAIL: public dump scope includes RLS-protected tables; BYPASSRLS is not permitted';
  END IF;

  RAISE NOTICE 'PASS: effective principal % satisfies the audited read-only backup contract', v_role_name;
END
$audit$;

\echo 'PASS: database role audit completed. No changes were made.'
