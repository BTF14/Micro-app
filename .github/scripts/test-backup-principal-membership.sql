-- Disposable PostgreSQL 18 regression test for the backup principal membership contract.
-- Run only against the CI PostgreSQL service. No external connection or secrets.
-- Convert only this disposable CI database to a non-superuser owner so the
-- effective pg_has_role(USAGE/SET) checks are exercised, not bypassed.
CREATE ROLE backup_diag_owner NOLOGIN CREATEROLE
  NOSUPERUSER NOCREATEDB NOREPLICATION NOBYPASSRLS NOINHERIT;
GRANT CREATE ON DATABASE microapp_test TO backup_diag_owner;
ALTER DATABASE microapp_test OWNER TO backup_diag_owner;
SET ROLE backup_diag_owner;
CREATE ROLE backup_diag_principal NOLOGIN;
RESET ROLE;
CREATE ROLE backup_diag_parent NOLOGIN;
CREATE ROLE backup_diag_child NOLOGIN;

-- Mirror the workflow's has_membership predicate. The only permitted edge is
-- the direct database owner's ADMIN-only edge (ADMIN=true, INHERIT=false,
-- SET=false); a non-superuser owner must also lack effective USAGE and SET.
CREATE FUNCTION pg_temp.backup_has_membership() RETURNS boolean
LANGUAGE sql
AS $predicate$
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_auth_members m
      WHERE m.member = (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user
      )
    ) OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_auth_members m
      JOIN pg_catalog.pg_database d
        ON d.datname = current_database()
      WHERE m.roleid = (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user
      )
        AND (
          m.member <> d.datdba
          OR NOT m.admin_option
          OR m.inherit_option
          OR m.set_option
        )
    ) OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_database d
      JOIN pg_catalog.pg_roles database_owner
        ON database_owner.oid = d.datdba
      WHERE d.datname = current_database()
        AND NOT database_owner.rolsuper
        AND (
          pg_catalog.pg_has_role(
            d.datdba,
            (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user),
            'USAGE'
          )
          OR pg_catalog.pg_has_role(
            d.datdba,
            (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user),
            'SET'
          )
        )
    );
$predicate$;

-- The disposable non-superuser database owner has the PostgreSQL 18 creator
-- edge. Recreate it explicitly to pin the expected ADMIN-only options.
REVOKE backup_diag_principal FROM backup_diag_owner;
GRANT backup_diag_principal TO backup_diag_owner
  WITH ADMIN OPTION, INHERIT FALSE, SET FALSE;

DO $owner_admin_edge_exists$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_database d ON d.datname = current_database()
    WHERE m.roleid = 'backup_diag_principal'::regrole
      AND m.member = d.datdba
      AND m.admin_option
      AND NOT m.inherit_option
      AND NOT m.set_option
  ) THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_EXPECTED_OWNER_ADMIN_ONLY_EDGE_MISSING';
  END IF;
END;
$owner_admin_edge_exists$;

SET ROLE backup_diag_principal;
DO $owner_admin_only_is_allowed$
BEGIN
  IF pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_OWNER_ADMIN_ONLY_MUST_BE_FALSE';
  END IF;
END;
$owner_admin_only_is_allowed$;
RESET ROLE;

-- An outgoing edge is always forbidden.
GRANT backup_diag_parent TO backup_diag_principal;
SET ROLE backup_diag_principal;
DO $outgoing_membership_is_rejected$
BEGIN
  IF NOT pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_OUTGOING_MUST_BE_TRUE';
  END IF;
END;
$outgoing_membership_is_rejected$;
RESET ROLE;
REVOKE backup_diag_parent FROM backup_diag_principal;

-- Any incoming member other than the direct database owner is forbidden.
GRANT backup_diag_principal TO backup_diag_child;
SET ROLE backup_diag_principal;
DO $unexpected_incoming_member_is_rejected$
BEGIN
  IF NOT pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_ROGUE_INCOMING_MUST_BE_TRUE';
  END IF;
END;
$unexpected_incoming_member_is_rejected$;
RESET ROLE;
REVOKE backup_diag_principal FROM backup_diag_child;

-- The owner edge is accepted only with ADMIN=true, INHERIT=false, SET=false.
GRANT backup_diag_principal TO backup_diag_owner
  WITH ADMIN OPTION, INHERIT FALSE, SET TRUE;
SET ROLE backup_diag_principal;
DO $owner_set_option_is_rejected$
BEGIN
  IF NOT pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_OWNER_SET_MUST_BE_TRUE';
  END IF;
END;
$owner_set_option_is_rejected$;
RESET ROLE;

GRANT backup_diag_principal TO backup_diag_owner
  WITH ADMIN OPTION, INHERIT TRUE, SET FALSE;
SET ROLE backup_diag_principal;
DO $owner_inherit_option_is_rejected$
BEGIN
  IF NOT pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_OWNER_INHERIT_MUST_BE_TRUE';
  END IF;
END;
$owner_inherit_option_is_rejected$;
RESET ROLE;

GRANT backup_diag_principal TO backup_diag_owner
  WITH ADMIN FALSE, INHERIT FALSE, SET FALSE;
SET ROLE backup_diag_principal;
DO $owner_without_admin_option_is_rejected$
BEGIN
  IF NOT pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_OWNER_NO_ADMIN_MUST_BE_TRUE';
  END IF;
END;
$owner_without_admin_option_is_rejected$;
RESET ROLE;

-- Restore the allowed edge and prove the final state is accepted.
GRANT backup_diag_principal TO backup_diag_owner
  WITH ADMIN OPTION, INHERIT FALSE, SET FALSE;
SET ROLE backup_diag_principal;
DO $final_owner_admin_only_is_allowed$
BEGIN
  IF pg_temp.backup_has_membership() THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_FINAL_OWNER_ADMIN_ONLY_MUST_BE_FALSE';
  END IF;
END;
$final_owner_admin_only_is_allowed$;
RESET ROLE;

REVOKE backup_diag_principal FROM backup_diag_owner;
DROP FUNCTION pg_temp.backup_has_membership();
DROP ROLE backup_diag_child, backup_diag_parent, backup_diag_principal;
REVOKE CREATE ON DATABASE microapp_test FROM backup_diag_owner;
ALTER DATABASE microapp_test OWNER TO microapp;
DROP ROLE backup_diag_owner;
