BEGIN;

DO $monetary_migration_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'MONETARY_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.sales'::regclass
      AND attname = 'discount_usd'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'LEGACY_DISCOUNT_COLUMN_NOT_FOUND';
  END IF;

  -- Never discard historical monetary meaning. If any existing sale has a
  -- discounted total, require an explicit, separately reviewed reconciliation.
  IF EXISTS (
    SELECT 1 FROM public.sales
    WHERE total_usd <> subtotal_usd
  ) THEN
    RAISE EXCEPTION 'LEGACY_DISCOUNTED_SALES_REQUIRE_MANUAL_RECONCILIATION';
  END IF;
END;
$monetary_migration_preflight$;

DO $drop_discount_constraints$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
      FROM pg_catalog.pg_constraint
     WHERE conrelid = 'public.sales'::regclass
       AND contype = 'c'
       AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%discount_usd%'
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER TABLE public.sales DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END;
$drop_discount_constraints$;

ALTER TABLE public.sales DROP COLUMN discount_usd;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_total_equals_subtotal
  CHECK (total_usd = subtotal_usd);

COMMIT;
