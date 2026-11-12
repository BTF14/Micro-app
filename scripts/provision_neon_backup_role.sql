-- OPERATOR-RUN ONLY. Do NOT run automatically or against Neon main without
-- a separately approved change window, destination verification and recovery gate.
-- No password is stored in this file or supplied as a command-line argument.
-- Run interactively with psql as the authorized schema/role administrator:
--   psql "$APP_MIGRATOR_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/provision_neon_backup_role.sql
-- psql requests the password securely via \password. Synthetic CI may opt into
-- the non-secret test-only environment variable using -v backup_role_test_mode=1.

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

-- SELECT alone permits reading last_value for pg_dump; USAGE permits nextval()
-- and would violate the read-only contract. Default ACLs are owner-specific:
-- this statement applies to objects subsequently created by the role executing
-- this script, which must be verified as the actual schema/object owner.
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO microapp_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO microapp_backup;

-- CI-only escape hatch: the password is read from the environment, never argv.
-- Normal operator execution takes the secure interactive psql \password path.
\if :{?backup_role_test_mode}
  \getenv backup_role_test_password BACKUP_ROLE_TEST_PASSWORD
  ALTER ROLE microapp_backup PASSWORD :'backup_role_test_password';
  \unset backup_role_test_password
\else
  \password microapp_backup
\endif
ALTER ROLE microapp_backup LOGIN;
