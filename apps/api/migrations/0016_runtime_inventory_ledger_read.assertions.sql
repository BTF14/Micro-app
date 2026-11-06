-- Run after 0016_runtime_inventory_ledger_read.sql on disposable PostgreSQL.
DO $runtime_inventory_ledger_read$
BEGIN
  IF NOT has_table_privilege('microapp_runtime', 'public.warehouse_inventory_movements', 'SELECT') THEN
    RAISE EXCEPTION 'RUNTIME_MUST_READ_INVENTORY_MOVEMENT_LEDGER';
  END IF;

  IF NOT has_table_privilege('microapp_runtime', 'public.warehouse_inventory_movements', 'INSERT') THEN
    RAISE EXCEPTION 'RUNTIME_MUST_APPEND_INVENTORY_MOVEMENT_LEDGER';
  END IF;

  IF has_table_privilege('microapp_runtime', 'public.warehouse_inventory_movements', 'UPDATE')
    OR has_table_privilege('microapp_runtime', 'public.warehouse_inventory_movements', 'DELETE')
    OR has_table_privilege('microapp_runtime', 'public.warehouse_inventory_movements', 'TRUNCATE')
  THEN
    RAISE EXCEPTION 'RUNTIME_MUST_NOT_MUTATE_INVENTORY_MOVEMENT_LEDGER';
  END IF;

  IF has_table_privilege('microapp_runtime', 'public.inventory_balance_ledger_intents', 'SELECT') THEN
    RAISE EXCEPTION 'RUNTIME_MUST_NOT_READ_PRIVATE_BALANCE_LEDGER_INTENTS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) acl
    WHERE c.oid = 'public.warehouse_inventory_movements'::regclass
      AND acl.grantee = 0
      AND acl.privilege_type = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'PUBLIC_MUST_NOT_READ_INVENTORY_MOVEMENT_LEDGER';
  END IF;
END;
$runtime_inventory_ledger_read$;
