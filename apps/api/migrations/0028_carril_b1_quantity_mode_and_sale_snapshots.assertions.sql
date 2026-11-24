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
    WHERE tgrelid='public.sale_items'::regclass AND tgname='sale_items_completed_reconciliation'
      AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.sales'::regclass AND tgname='sales_completed_reconciliation'
      AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.payments'::regclass AND tgname='payments_completed_reconciliation'
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


-- Exercise the actual production trigger functions against isolated temporary
-- line tables and synthetic products. This transaction is rolled back below.
CREATE TEMP TABLE b1_sale_item_assertions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  unit_snapshot text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(unit_snapshot)) > 0),
  quantity_mode_snapshot text NOT NULL CHECK (quantity_mode_snapshot IN ('integer','fractional')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  CHECK (quantity_mode_snapshot <> 'integer' OR quantity = pg_catalog.trunc(quantity))
);
CREATE TRIGGER b1_sale_item_snapshot_guard
BEFORE INSERT ON pg_temp.b1_sale_item_assertions
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_item_quantity_snapshots();

CREATE TEMP TABLE b1_count_line_assertions (
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  counted_quantity numeric(14,3) NOT NULL
);
CREATE TRIGGER b1_count_line_integer_guard
BEFORE INSERT ON pg_temp.b1_count_line_assertions
FOR EACH ROW EXECUTE FUNCTION public.guard_integer_inventory_count_line();

CREATE TEMP TABLE b1_receipt_line_assertions (
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric(14,3) NOT NULL
);
CREATE TRIGGER b1_receipt_line_integer_guard
BEFORE INSERT ON pg_temp.b1_receipt_line_assertions
FOR EACH ROW EXECUTE FUNCTION public.guard_integer_inventory_receipt_line();

DO $carril_b1_behavior$
DECLARE
  org_id uuid := pg_catalog.gen_random_uuid();
  integer_product_id uuid := pg_catalog.gen_random_uuid();
  fractional_product_id uuid := pg_catalog.gen_random_uuid();
  fractional_minimum_product_id uuid := pg_catalog.gen_random_uuid();
  snapshot_id uuid;
BEGIN
  INSERT INTO public.organizations (id, name, slug)
  VALUES (org_id, 'Carril B1 assertions', 'b1-' || pg_catalog.replace(org_id::text, '-', ''));

  INSERT INTO public.products
    (id, organization_id, sku, name, unit, price_usd, minimum_stock, quantity_mode)
  VALUES
    (integer_product_id, org_id, 'B1-INT', 'Integer assertion product', 'unidad', 1.0000, 0.000, 'integer'),
    (fractional_product_id, org_id, 'B1-FRAC', 'Fractional assertion product', 'kg', 1.0000, 0.000, 'fractional'),
    (fractional_minimum_product_id, org_id, 'B1-MIN', 'Fractional minimum assertion product', 'unidad', 1.0000, 0.500, 'fractional');

  -- 0.500 is rejected for integer sale lines; 1.250 is accepted for fractional.
  BEGIN
    INSERT INTO pg_temp.b1_sale_item_assertions
      (organization_id, product_id, unit_snapshot, quantity_mode_snapshot, quantity)
    VALUES (org_id, integer_product_id, 'unidad', 'integer', 0.500);
    RAISE EXCEPTION 'B1_INTEGER_SALE_FRACTION_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO pg_temp.b1_sale_item_assertions
    (organization_id, product_id, unit_snapshot, quantity_mode_snapshot, quantity)
  VALUES (org_id, fractional_product_id, 'kg', 'fractional', 1.250)
  RETURNING id INTO snapshot_id;

  -- The production BEFORE INSERT count guard rejects integer 0.500 and accepts fractional 1.250.
  BEGIN
    INSERT INTO pg_temp.b1_count_line_assertions VALUES (org_id, integer_product_id, 0.500);
    RAISE EXCEPTION 'B1_INTEGER_COUNT_FRACTION_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO pg_temp.b1_count_line_assertions VALUES (org_id, fractional_product_id, 1.250);

  -- The production receipt-line guard rejects integer 0.500 and accepts fractional 1.250.
  BEGIN
    INSERT INTO pg_temp.b1_receipt_line_assertions VALUES (org_id, integer_product_id, 0.500);
    RAISE EXCEPTION 'B1_INTEGER_RECEIPT_FRACTION_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO pg_temp.b1_receipt_line_assertions VALUES (org_id, fractional_product_id, 1.250);

  -- A forged mode snapshot must fail even when its quantity is a whole number.
  BEGIN
    INSERT INTO pg_temp.b1_sale_item_assertions
      (organization_id, product_id, unit_snapshot, quantity_mode_snapshot, quantity)
    VALUES (org_id, fractional_product_id, 'kg', 'integer', 1.000);
    RAISE EXCEPTION 'B1_FALSE_QUANTITY_MODE_SNAPSHOT_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Editing the product later must not rewrite the already captured sale unit/mode.
  UPDATE public.products SET unit='g' WHERE id=fractional_product_id;
  IF NOT EXISTS (
    SELECT 1 FROM pg_temp.b1_sale_item_assertions
     WHERE id=snapshot_id AND unit_snapshot='kg' AND quantity_mode_snapshot='fractional'
  ) THEN RAISE EXCEPTION 'B1_HISTORICAL_SALE_SNAPSHOT_CHANGED'; END IF;

  -- Fractional minimum stock blocks a fractional -> integer transition.
  BEGIN
    UPDATE public.products SET quantity_mode='integer'
     WHERE id=fractional_minimum_product_id;
    RAISE EXCEPTION 'B1_FRACTIONAL_MINIMUM_TRANSITION_ACCEPTED';
  EXCEPTION WHEN check_violation THEN
    IF pg_catalog.strpos(SQLERRM, 'INTEGER_PRODUCT_HAS_FRACTIONAL_MINIMUM_STOCK') = 0 THEN RAISE; END IF;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.products
     WHERE id=fractional_minimum_product_id AND quantity_mode='fractional'
  ) THEN RAISE EXCEPTION 'B1_FRACTIONAL_MINIMUM_PRODUCT_MODE_CHANGED'; END IF;
END;
$carril_b1_behavior$;

ROLLBACK;
