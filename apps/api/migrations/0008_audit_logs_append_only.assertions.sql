-- Run after 0008_audit_logs_append_only.sql on disposable PostgreSQL 18.
-- Tests both the intended least-privilege runtime role and database triggers
-- against a separate non-owner role deliberately granted mutation privileges.
BEGIN;

CREATE ROLE micro_app_audit_runtime_test NOLOGIN;
CREATE ROLE micro_app_audit_mutator_test NOLOGIN;

GRANT SELECT, INSERT ON TABLE audit_logs TO micro_app_audit_runtime_test;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLE audit_logs TO micro_app_audit_mutator_test;

DO $grant_identity_sequence$
DECLARE
  audit_sequence regclass := pg_get_serial_sequence('public.audit_logs', 'id')::regclass;
BEGIN
  EXECUTE format(
    'GRANT USAGE, SELECT ON SEQUENCE %s TO micro_app_audit_runtime_test',
    audit_sequence
  );
  EXECUTE format(
    'GRANT USAGE, SELECT ON SEQUENCE %s TO micro_app_audit_mutator_test',
    audit_sequence
  );
END;
$grant_identity_sequence$;

INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000007', 'Audit Logs Test', 'audit-logs-test');

-- The runtime-role contract is SELECT/INSERT only, and the role is not owner.
SET LOCAL ROLE micro_app_audit_runtime_test;

DO $runtime_privilege_assertions$
DECLARE
  audit_owner oid;
  runtime_oid oid;
BEGIN
  SELECT relowner INTO audit_owner
  FROM pg_class
  WHERE oid = 'public.audit_logs'::regclass;
  SELECT oid INTO runtime_oid
  FROM pg_roles
  WHERE rolname = current_user;

  IF audit_owner = runtime_oid THEN
    RAISE EXCEPTION 'FAIL: runtime role owns audit_logs';
  END IF;
  IF NOT has_table_privilege(current_user, 'public.audit_logs', 'SELECT')
    OR NOT has_table_privilege(current_user, 'public.audit_logs', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: runtime role lacks SELECT/INSERT';
  END IF;
  IF has_table_privilege(current_user, 'public.audit_logs', 'UPDATE')
    OR has_table_privilege(current_user, 'public.audit_logs', 'DELETE')
    OR has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE')
    OR has_table_privilege(current_user, 'public.audit_logs', 'TRIGGER') THEN
    RAISE EXCEPTION 'FAIL: runtime role has a mutation/trigger privilege';
  END IF;

  INSERT INTO audit_logs (organization_id, action, entity_type, entity_id, metadata)
  VALUES (
    '00000000-0000-4000-8000-000000000007',
    'audit.test.append',
    'test',
    'runtime-role',
    '{"source":"disposable-postgres"}'::jsonb
  );

  IF (SELECT count(*) FROM audit_logs
      WHERE organization_id = '00000000-0000-4000-8000-000000000007'
        AND action = 'audit.test.append') <> 1 THEN
    RAISE EXCEPTION 'FAIL: runtime role could not read its inserted audit event';
  END IF;

  BEGIN
    UPDATE audit_logs SET action = 'tampered'
    WHERE action = 'audit.test.append';
    RAISE EXCEPTION 'FAIL: runtime role updated audit_logs';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM audit_logs WHERE action = 'audit.test.append';
    RAISE EXCEPTION 'FAIL: runtime role deleted audit_logs';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    TRUNCATE TABLE audit_logs;
    RAISE EXCEPTION 'FAIL: runtime role truncated audit_logs';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    ALTER TABLE audit_logs DISABLE TRIGGER USER;
    RAISE EXCEPTION 'FAIL: runtime role disabled audit triggers';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DROP TRIGGER audit_logs_10_append_only_rows ON audit_logs;
    RAISE EXCEPTION 'FAIL: runtime role dropped an audit trigger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$runtime_privilege_assertions$;

RESET ROLE;

-- Prove the triggers reject mutations even when a non-owner has table-level
-- UPDATE/DELETE/TRUNCATE grants. This prevents relying on grants alone.
SET LOCAL ROLE micro_app_audit_mutator_test;

DO $trigger_assertions$
BEGIN
  BEGIN
    UPDATE audit_logs SET action = 'tampered'
    WHERE action = 'audit.test.append';
    RAISE EXCEPTION 'FAIL: UPDATE bypassed audit append-only trigger';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    DELETE FROM audit_logs WHERE action = 'audit.test.append';
    RAISE EXCEPTION 'FAIL: DELETE bypassed audit append-only trigger';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    TRUNCATE TABLE audit_logs;
    RAISE EXCEPTION 'FAIL: TRUNCATE bypassed audit append-only trigger';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$trigger_assertions$;

RESET ROLE;

DO $final_audit_assertions$
BEGIN
  IF (SELECT count(*) FROM audit_logs
      WHERE organization_id = '00000000-0000-4000-8000-000000000007'
        AND action = 'audit.test.append') <> 1 THEN
    RAISE EXCEPTION 'FAIL: blocked mutations changed the audit event';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.audit_logs'::regclass
      AND tgname = 'audit_logs_10_append_only_rows'
      AND tgenabled = 'A'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.audit_logs'::regclass
      AND tgname = 'audit_logs_20_append_only_truncate'
      AND tgenabled = 'A'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: audit append-only triggers are absent or not ENABLE ALWAYS';
  END IF;
END;
$final_audit_assertions$;

ROLLBACK;
