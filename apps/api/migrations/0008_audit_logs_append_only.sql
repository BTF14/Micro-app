BEGIN;

-- General audit history is append-only. This is deliberately separate from
-- warehouse_inventory_movements, whose ledger guard does not cover audit_logs.
CREATE OR REPLACE FUNCTION reject_audit_logs_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $audit_logs_append_only$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOGS_APPEND_ONLY: % is forbidden', TG_OP
    USING ERRCODE = '23514';
END;
$audit_logs_append_only$;

CREATE TRIGGER audit_logs_10_append_only_rows
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_logs_mutation();

CREATE TRIGGER audit_logs_20_append_only_truncate
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION reject_audit_logs_mutation();

-- These triggers protect ordinary SQL callers. The runtime connection must
-- still be a non-owner with least-privilege SELECT/INSERT grants; ownership
-- cannot be inferred from DATABASE_URL in source and is not changed here.
ALTER TABLE audit_logs ENABLE ALWAYS TRIGGER audit_logs_10_append_only_rows;
ALTER TABLE audit_logs ENABLE ALWAYS TRIGGER audit_logs_20_append_only_truncate;

REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE audit_logs FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reject_audit_logs_mutation() FROM PUBLIC;

COMMENT ON TABLE audit_logs IS
  'Append-only general audit history. Runtime access must use a non-owner role with SELECT/INSERT only; corrections are new compensating audit events.';

COMMIT;
