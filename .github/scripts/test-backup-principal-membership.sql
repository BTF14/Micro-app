-- Disposable PostgreSQL regression test for the backup principal membership predicate.
-- Run only against the CI PostgreSQL service. No external connection or secrets.
BEGIN;

CREATE ROLE backup_diag_principal NOLOGIN;
CREATE ROLE backup_diag_parent NOLOGIN;
CREATE ROLE backup_diag_child NOLOGIN;

-- Direction 1: principal is a member of another role (pg_auth_members.member).
GRANT backup_diag_parent TO backup_diag_principal;
SET ROLE backup_diag_principal;
DO $test_principal_is_member$
DECLARE principal_oid oid; member_edge boolean; granted_role_edge boolean;
BEGIN
  SELECT oid INTO principal_oid FROM pg_catalog.pg_roles WHERE rolname = current_user;
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = principal_oid),
         EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid = principal_oid)
    INTO member_edge, granted_role_edge;
  IF NOT member_edge OR granted_role_edge THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_MEMBER_DIRECTION_TEST_FAILED';
  END IF;
END;
$test_principal_is_member$;
RESET ROLE;

REVOKE backup_diag_parent FROM backup_diag_principal;

-- Direction 2: another role is a member of the principal (pg_auth_members.roleid).
GRANT backup_diag_principal TO backup_diag_child;
SET ROLE backup_diag_principal;
DO $test_principal_is_granted_role$
DECLARE principal_oid oid; member_edge boolean; granted_role_edge boolean;
BEGIN
  SELECT oid INTO principal_oid FROM pg_catalog.pg_roles WHERE rolname = current_user;
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = principal_oid),
         EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid = principal_oid)
    INTO member_edge, granted_role_edge;
  IF member_edge OR NOT granted_role_edge THEN
    RAISE EXCEPTION 'BACKUP_MEMBERSHIP_GRANTED_ROLE_DIRECTION_TEST_FAILED';
  END IF;
END;
$test_principal_is_granted_role$;
RESET ROLE;

-- Baseline: no membership edge in either direction must evaluate false.
REVOKE backup_diag_principal FROM backup_diag_child;
SET ROLE backup_diag_principal;
DO $test_no_membership$
DECLARE principal_oid oid; has_membership boolean;
BEGIN
  SELECT oid INTO principal_oid FROM pg_catalog.pg_roles WHERE rolname = current_user;
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members
    WHERE member = principal_oid OR roleid = principal_oid
  ) INTO has_membership;
  IF has_membership THEN RAISE EXCEPTION 'BACKUP_MEMBERSHIP_EMPTY_BASELINE_TEST_FAILED'; END IF;
END;
$test_no_membership$;
RESET ROLE;

DROP ROLE backup_diag_child, backup_diag_parent, backup_diag_principal;
COMMIT;
