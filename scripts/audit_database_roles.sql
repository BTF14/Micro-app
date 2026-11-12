-- Read-only, fail-closed audit of the EFFECTIVE connected principal.
-- Run with psql using the candidate DATABASE_URL_BACKUP_RO:
--   psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql
-- This script performs SELECT/DO only; it does not provision or modify roles.
\set ON_ERROR_STOP on

\echo 'Auditing effective PostgreSQL principal (current_user); no credentials are emitted.'
SELECT current_database() AS database_name,
       current_user AS effective_login,
       session_user AS session_login,
       current_setting('server_version') AS server_version;

-- Human-readable, non-secret evidence from the requested catalog surfaces.
SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE grantee = current_user
ORDER BY table_schema, table_name, privilege_type;

SELECT schemaname, tablename, tableowner, rowsecurity
FROM pg_catalog.pg_tables
WHERE schemaname='public'
ORDER BY tablename;

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

  -- Fail closed on memberships in either direction. This also prevents inheriting
  -- privileged group roles or allowing another principal to SET ROLE to this login.
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member=v_role OR roleid=v_role) THEN
    RAISE EXCEPTION 'FAIL: principal % has direct role memberships (inbound or outbound)', v_role_name;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_database WHERE datdba=v_role)
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=v_role)
     OR EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relowner=v_role
     )
     OR EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proowner=v_role
     ) THEN
    RAISE EXCEPTION 'FAIL: principal % owns database/schema/public objects', v_role_name;
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

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
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
    RAISE EXCEPTION 'FAIL: table grants are missing SELECT or include write/DDL-adjacent privileges';
  END IF;

  -- pg_dump must preserve sequence state. SELECT is read-only and is required
  -- by the tested dump contract; USAGE/UPDATE (nextval/setval) are forbidden.
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
      AND (
        NOT has_sequence_privilege(v_role_name,c.oid,'SELECT')
        OR has_sequence_privilege(v_role_name,c.oid,'USAGE')
        OR has_sequence_privilege(v_role_name,c.oid,'UPDATE')
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: sequences require SELECT only (no USAGE/UPDATE)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (c.relrowsecurity OR c.relforcerowsecurity)
  ) THEN
    RAISE EXCEPTION 'FAIL: public dump scope includes RLS-protected tables; BYPASSRLS is not permitted';
  END IF;

  RAISE NOTICE 'PASS: effective principal % satisfies the audited read-only backup contract', v_role_name;
END
$audit$;

\echo 'PASS: database role audit completed. No changes were made.'
