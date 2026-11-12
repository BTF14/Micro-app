-- OPERATOR-RUN ONLY. Do NOT run automatically or against Neon main without
-- a separately approved change window, destination verification and recovery gate.
-- No password is stored in this file or supplied as a command-line argument.
-- Run interactively with psql as the authorized schema/role administrator:
--   psql "$APP_MIGRATOR_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/provision_neon_backup_role.sql
-- psql will request the password interactively via \\password.

\set ON_ERROR_STOP on
SELECT current_database() AS target_database \gset

-- Create the fixed role only if absent; keep LOGIN disabled until password setup.
SELECT 'CREATE ROLE microapp_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_backup')
\gexec

DO $preflight$
DECLARE v_oid oid := (SELECT oid FROM pg_roles WHERE rolname='microapp_backup');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member=v_oid OR roleid=v_oid) THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup has role memberships in either direction; review/revoke them explicitly first';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_database WHERE datdba=v_oid)
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=v_oid)
     OR EXISTS (SELECT 1 FROM pg_class WHERE relowner=v_oid)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner=v_oid) THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup owns database/schema/objects; transfer ownership explicitly first';
  END IF;
END
$preflight$;

ALTER ROLE microapp_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

REVOKE ALL PRIVILEGES ON DATABASE :"target_database" FROM microapp_backup;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM microapp_backup;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM microapp_backup;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM microapp_backup;

GRANT CONNECT ON DATABASE :"target_database" TO microapp_backup;
GRANT USAGE ON SCHEMA public TO microapp_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO microapp_backup;

-- SELECT preserves sequence state in a complete pg_dump; USAGE/UPDATE are denied.
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO microapp_backup;

-- Default privileges are owner-specific. Configure separately for every actual
-- table/sequence owner after inspecting ownership; do not guess the owner here.

\password microapp_backup
ALTER ROLE microapp_backup LOGIN;
