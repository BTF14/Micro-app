-- OPERATOR-RUN ONLY. Do NOT run automatically or against Neon main without
-- a separately approved change window, destination verification and recovery gate.
-- No password is stored in this file or supplied as a command-line argument.
-- Run interactively with psql as the authorized schema/role administrator:
--   psql "$APP_MIGRATOR_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/provision_neon_backup_role.sql
-- The operator will be prompted securely by psql's \\password command.

\set ON_ERROR_STOP on

DO $provision$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_backup') THEN
    CREATE ROLE microapp_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$provision$;

-- Normalize the intended attributes and keep LOGIN disabled until a password
-- has been set interactively. Never grant role memberships or object ownership.
ALTER ROLE microapp_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE CURRENT_DATABASE TO microapp_backup;
GRANT USAGE ON SCHEMA public TO microapp_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO microapp_backup;

-- Sequence SELECT is required to preserve sequence state in a complete pg_dump.
-- Do not grant USAGE or UPDATE; the backup login cannot nextval()/setval().
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO microapp_backup;

-- Prevent future tables/sequences created by the migration owner from silently
-- omitting the backup principal. Run as the role that owns future objects.
-- This default-privilege statement is intentionally not attempted here because
-- PostgreSQL applies it only for the current creating role; provision it separately
-- for each actual object owner after inventorying ownership.

\password microapp_backup
ALTER ROLE microapp_backup LOGIN;
