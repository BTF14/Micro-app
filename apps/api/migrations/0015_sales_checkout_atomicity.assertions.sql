-- Run after 0015_sales_checkout_atomicity.sql on disposable PostgreSQL.
BEGIN;

DO $sales_checkout_contract_assertions$
DECLARE
  helper_oid oid;
  reconciliation_oid oid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid = 'public.sales'::regclass
       AND attname IN ('branch_id', 'register_shift_id', 'warehouse_id', 'settlement_currency', 'request_hash')
       AND NOT attisdropped
     GROUP BY attrelid
    HAVING count(*) = 5
  ) THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_CONTEXT_COLUMNS_MISSING';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.sales'::regclass AND conname='sales_completed_checkout_context_ck' AND NOT convalidated)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.payments'::regclass AND conname='payments_ves_amount_scale_ck' AND NOT convalidated)
  THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_FORWARD_COMPATIBLE_CONSTRAINTS_MISSING';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.sales'::regclass AND conname='sales_branch_scope_fk')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.sales'::regclass AND conname='sales_register_shift_scope_fk')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.sales'::regclass AND conname='sales_warehouse_scope_fk')
  THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_COMPOSITE_SCOPE_FOREIGN_KEYS_MISSING';
  END IF;

  SELECT oid INTO helper_oid
    FROM pg_catalog.pg_proc
   WHERE oid = 'public.lock_open_register_shift(uuid,uuid,uuid)'::regprocedure
     AND prosecdef = true;
  IF helper_oid IS NULL
    OR NOT pg_catalog.has_function_privilege('microapp_runtime', helper_oid, 'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid = helper_oid),
                 pg_catalog.acldefault('f', (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = helper_oid)))
      ) acl
      WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'OPEN_REGISTER_SHIFT_HELPER_SECURITY_CONTRACT_INVALID';
  END IF;

  SELECT oid INTO reconciliation_oid
    FROM pg_catalog.pg_proc
   WHERE oid = 'public.assert_completed_sale_reconciled()'::regprocedure
     AND prosecdef = true;
  IF reconciliation_oid IS NULL THEN
    RAISE EXCEPTION 'SALE_RECONCILIATION_TRIGGER_MUST_BE_SECURITY_DEFINER';
  END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.sales', 'SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.sales', 'INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.sale_items', 'SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.sale_items', 'INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.payments', 'SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.payments', 'INSERT')
  THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_RUNTIME_READ_INSERT_GRANTS_MISSING';
  END IF;

  IF NOT pg_catalog.has_column_privilege('microapp_runtime', 'public.sales', 'status', 'UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime', 'public.sales', 'completed_at', 'UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.sales', 'UPDATE')
    OR pg_catalog.has_column_privilege('microapp_runtime', 'public.sales', 'subtotal_usd', 'UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.register_shifts', 'UPDATE')
  THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_RUNTIME_UPDATE_GRANTS_TOO_BROAD_OR_MISSING';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='sales_checkout_lifecycle_guard' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='sale_items_checkout_lifecycle_guard' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='payments_checkout_lifecycle_guard' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='sales_completed_reconciliation' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='sale_items_completed_reconciliation' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='payments_completed_reconciliation' AND NOT tgisinternal)
  THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_LIFECYCLE_OR_RECONCILIATION_TRIGGERS_MISSING';
  END IF;
END;
$sales_checkout_contract_assertions$;

ROLLBACK;
