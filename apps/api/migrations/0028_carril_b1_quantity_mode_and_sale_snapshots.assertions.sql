BEGIN;

DO $carril_b1_assertions$
DECLARE
  migrator oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator');
  runtime oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime');
  fn record;
  def text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid='public.products'::regclass AND attname='quantity_mode'
       AND attnotnull AND NOT attisdropped
  ) THEN RAISE EXCEPTION 'PRODUCT_QUANTITY_MODE_COLUMN_INVALID'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.products'::regclass AND conname='products_integer_minimum_stock_ck'
       AND pg_catalog.pg_get_constraintdef(oid) LIKE '%quantity_mode%'
       AND pg_catalog.pg_get_constraintdef(oid) LIKE '%trunc%'
  ) THEN RAISE EXCEPTION 'PRODUCT_INTEGER_MINIMUM_STOCK_CHECK_MISSING'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid='public.sale_items'::regclass AND attname='unit_snapshot'
       AND attnotnull AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid='public.sale_items'::regclass AND attname='quantity_mode_snapshot'
       AND attnotnull AND NOT attisdropped
  ) THEN RAISE EXCEPTION 'SALE_ITEM_QUANTITY_SNAPSHOTS_NOT_REQUIRED'; END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_constraint
       WHERE conrelid='public.sale_items'::regclass
         AND conname IN ('sale_items_unit_snapshot_nonempty_ck',
                         'sale_items_quantity_mode_snapshot_ck',
                         'sale_items_integer_quantity_snapshot_ck')) <> 3
  THEN RAISE EXCEPTION 'SALE_ITEM_QUANTITY_SNAPSHOT_CHECKS_MISSING'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.sale_items'::regclass AND tgname='sale_items_checkout_lifecycle_guard'
      AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.sale_items'::regclass AND tgname='zzz_sale_items_quantity_snapshot_guard'
      AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.inventory_count_lines'::regclass
      AND tgname='inventory_count_lines_integer_quantity_guard'
      AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.inventory_receipt_lines'::regclass
      AND tgname='inventory_receipt_lines_integer_quantity_guard'
      AND NOT tgisinternal AND tgenabled='O')
  THEN RAISE EXCEPTION 'CARRIL_B1_QUANTITY_GUARDS_MISSING'; END IF;

  FOR fn IN
    SELECT p.oid, p.proname, p.proowner, p.prosecdef, p.proconfig, p.proacl
      FROM pg_catalog.pg_proc p
     WHERE p.oid IN (
       'public.guard_product_quantity_mode_transition()'::regprocedure,
       'public.guard_sale_item_quantity_snapshots()'::regprocedure,
       'public.guard_integer_inventory_count_line()'::regprocedure,
       'public.guard_integer_inventory_receipt_line()'::regprocedure
     )
  LOOP
    IF fn.proowner <> migrator OR fn.prosecdef IS DISTINCT FROM
         (fn.proname <> 'guard_product_quantity_mode_transition')
       OR NOT (fn.proconfig @> ARRAY['search_path=pg_catalog'])
       OR EXISTS (
         SELECT 1 FROM pg_catalog.aclexplode(COALESCE(fn.proacl, pg_catalog.acldefault('f',fn.proowner))) acl
          WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
       )
       OR pg_catalog.has_function_privilege(runtime, fn.oid, 'EXECUTE')
    THEN RAISE EXCEPTION 'CARRIL_B1_TRIGGER_FUNCTION_SECURITY_INVALID: %', fn.proname; END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_functiondef('public.guard_sale_item_quantity_snapshots()'::regprocedure)
    INTO def;
  IF pg_catalog.strpos(def,'NEW.unit_snapshot')=0
     OR pg_catalog.strpos(def,'NEW.quantity_mode_snapshot')=0
     OR pg_catalog.strpos(def,'FOR SHARE')=0
     OR pg_catalog.strpos(def,'SALE_ITEM_QUANTITY_SNAPSHOT_MUST_MATCH_PRODUCT')=0
  THEN RAISE EXCEPTION 'SALE_ITEM_SNAPSHOT_TRIGGER_DEFINITION_INVALID'; END IF;

  SELECT pg_catalog.pg_get_functiondef('public.guard_product_quantity_mode_transition()'::regprocedure)
    INTO def;
  IF pg_catalog.strpos(def,'inventory_count_lines')=0
     OR pg_catalog.strpos(def,'inventory_counts')=0
     OR pg_catalog.strpos(def,'INTEGER_PRODUCT_HAS_FRACTIONAL_PENDING_COUNT')=0
     OR pg_catalog.strpos(def,'INTEGER_PRODUCT_HAS_FRACTIONAL_MINIMUM_STOCK')=0
  THEN RAISE EXCEPTION 'PRODUCT_MODE_TRANSITION_GUARD_MISSING'; END IF;

  SELECT pg_catalog.pg_get_functiondef('public.guard_integer_inventory_count_line()'::regprocedure)
    INTO def;
  IF pg_catalog.strpos(def,'counted_quantity')=0
     OR pg_catalog.strpos(def,'trunc')=0
     OR pg_catalog.strpos(def,'INTEGER_PRODUCT_COUNT_QUANTITY_MUST_BE_WHOLE')=0
  THEN RAISE EXCEPTION 'INVENTORY_COUNT_INTEGER_GUARD_DEFINITION_INVALID'; END IF;

  SELECT pg_catalog.pg_get_functiondef('public.guard_integer_inventory_receipt_line()'::regprocedure)
    INTO def;
  IF pg_catalog.strpos(def,'NEW.quantity')=0
     OR pg_catalog.strpos(def,'trunc')=0
     OR pg_catalog.strpos(def,'INTEGER_PRODUCT_RECEIPT_QUANTITY_MUST_BE_WHOLE')=0
  THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_INTEGER_GUARD_DEFINITION_INVALID'; END IF;

  IF NOT pg_catalog.has_column_privilege('microapp_runtime','public.products','quantity_mode','SELECT')
     OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.products','quantity_mode','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.products','UPDATE')
  THEN RAISE EXCEPTION 'PRODUCT_QUANTITY_MODE_RUNTIME_COLUMN_GRANT_INVALID'; END IF;

  IF pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','DELETE')
  THEN RAISE EXCEPTION 'CARRIL_B1_MUST_PRESERVE_LEDGER_ONLY_INVENTORY_WRITES'; END IF;
  IF pg_catalog.has_table_privilege('microapp_runtime','public.sale_items','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.sale_items','DELETE')
  THEN RAISE EXCEPTION 'SALE_ITEM_SNAPSHOTS_MUST_REMAIN_APPEND_ONLY'; END IF;
END;
$carril_b1_assertions$;

ROLLBACK;
