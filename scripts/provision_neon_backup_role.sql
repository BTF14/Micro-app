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
DECLARE
  v_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_backup');
  v_database_owner oid;
  v_is_superuser boolean;
BEGIN
  SELECT datdba INTO v_database_owner
  FROM pg_catalog.pg_database
  WHERE datname = current_database();

  SELECT rolsuper INTO v_is_superuser
  FROM pg_catalog.pg_roles
  WHERE oid = v_oid;

  IF v_oid IS NULL OR v_is_superuser IS NULL THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup role lookup failed';
  END IF;
  IF v_is_superuser THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup is SUPERUSER; a non-superuser operator cannot safely clear this attribute';
  END IF;

  -- PostgreSQL 16+ may automatically grant the creator ADMIN OPTION on a
  -- role it creates. This is an INCOMING membership: it does not make the
  -- backup principal a member of the database owner or inherit its privileges.
  -- Permit only the direct owner of this database; all outgoing memberships
  -- and every other incoming member remain forbidden.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members
    WHERE member = v_oid
  ) THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup has outgoing role memberships';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members
    WHERE roleid = v_oid AND member <> v_database_owner
  ) THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup has an incoming member other than the current database owner';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_database WHERE datdba=v_oid)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspowner=v_oid)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relowner=v_oid)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proowner=v_oid) THEN
    RAISE EXCEPTION 'Refusing provisioning: microapp_backup owns database/schema/objects; transfer ownership explicitly first';
  END IF;
END
$preflight$;

-- NOSUPERUSER is deliberately set only at CREATE ROLE above. PostgreSQL
-- managed services (including Neon) reject ALTER ROLE ... NOSUPERUSER when
-- the operator is not itself a superuser, even when the target is already
-- non-superuser. Existing SUPERUSER roles fail closed in the preflight.
ALTER ROLE microapp_backup NOLOGIN NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

REVOKE ALL PRIVILEGES ON DATABASE :"target_database" FROM microapp_backup;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM microapp_backup;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM microapp_backup;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM microapp_backup;

GRANT CONNECT ON DATABASE :"target_database" TO microapp_backup;
GRANT USAGE ON SCHEMA public TO microapp_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO microapp_backup;

-- SELECT alone permits reading last_value for pg_dump; USAGE permits nextval()
-- and would violate the read-only contract. Grant future table/view and sequence
-- SELECT for objects created by the role executing this script.
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO microapp_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO microapp_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO microapp_backup;

-- IMPORTANT: ALTER DEFAULT PRIVILEGES is owner-specific. The two statements
-- above affect only the current_user (the role executing this script). After a
-- SELECT-only owner inventory, apply these statements for EACH additional
-- verified owner that creates objects, using an authorized role administrator:
--
-- ALTER DEFAULT PRIVILEGES FOR ROLE <owner_verificado>
--   IN SCHEMA public GRANT SELECT ON TABLES TO microapp_backup;
-- ALTER DEFAULT PRIVILEGES FOR ROLE <owner_verificado>
--   IN SCHEMA public GRANT SELECT ON SEQUENCES TO microapp_backup;
--
-- Never guess an owner name (including neondb_owner), never grant USAGE/UPDATE
-- on sequences, and stop if the operator lacks authority to alter that owner's
-- defaults. Verify the resulting pg_default_acl entries with the audit.

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
