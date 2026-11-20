BEGIN;
SET LOCAL lock_timeout = '5s';

DO $carril_b1_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'CARRIL_B1_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime' AND rolcanlogin)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator' AND rolcanlogin) THEN
    RAISE EXCEPTION 'CARRIL_B1_RUNTIME_ROLES_MISSING';
  END IF;
END;
$carril_b1_preflight$;

-- Product mode is explicit. Default integer is safe only after the conservative
-- historical backfill below has classified every known fractional use.
ALTER TABLE public.products
  ADD COLUMN quantity_mode text NOT NULL DEFAULT 'integer'
  CONSTRAINT products_quantity_mode_ck CHECK (quantity_mode IN ('integer', 'fractional'));

UPDATE public.products p
   SET quantity_mode = 'fractional'
 WHERE lower(pg_catalog.btrim(p.unit)) IN (
   'kg','kilogramo','kilogramos','g','gr','gramo','gramos','lb','libra','libras',
   'oz','onza','onzas','l','lt','litro','litros','ml','mililitro','mililitros',
   'm','mt','metro','metros','cm','centimetro','centimetros','granel'
 )
 OR p.minimum_stock <> pg_catalog.trunc(p.minimum_stock)
 OR EXISTS (
   SELECT 1 FROM public.inventory_balances b
    WHERE b.organization_id=p.organization_id AND b.product_id=p.id
      AND (b.on_hand_quantity <> pg_catalog.trunc(b.on_hand_quantity)
        OR b.reserved_quantity <> pg_catalog.trunc(b.reserved_quantity))
 )
 OR EXISTS (
   SELECT 1 FROM public.warehouse_inventory_movements m
    WHERE m.organization_id=p.organization_id AND m.product_id=p.id
      AND m.quantity_delta <> pg_catalog.trunc(m.quantity_delta)
 )
 OR EXISTS (
   SELECT 1 FROM public.inventory_count_lines l
    WHERE l.organization_id=p.organization_id AND l.product_id=p.id
      AND l.counted_quantity <> pg_catalog.trunc(l.counted_quantity)
 )
 OR EXISTS (
   SELECT 1 FROM public.inventory_receipt_lines l
    WHERE l.organization_id=p.organization_id AND l.product_id=p.id
      AND l.quantity <> pg_catalog.trunc(l.quantity)
 )
 OR EXISTS (
   SELECT 1 FROM public.sale_items si
    WHERE si.organization_id=p.organization_id AND si.product_id=p.id
      AND si.quantity <> pg_catalog.trunc(si.quantity)
 );

ALTER TABLE public.products
  ADD CONSTRAINT products_integer_minimum_stock_ck
  CHECK (quantity_mode <> 'integer' OR minimum_stock = pg_catalog.trunc(minimum_stock));

-- Preserve historical unit/mode at line creation. A null product_id is
-- possible in the legacy schema; the best available historical fallback is
-- the neutral unit and a mode compatible with the stored quantity.
ALTER TABLE public.sale_items
  ADD COLUMN unit_snapshot text,
  ADD COLUMN quantity_mode_snapshot text;

UPDATE public.sale_items si
   SET unit_snapshot = COALESCE(p.unit, 'unidad'),
       quantity_mode_snapshot = CASE
         WHEN p.quantity_mode = 'fractional'
           OR si.quantity <> pg_catalog.trunc(si.quantity)
         THEN 'fractional'
         ELSE 'integer'
       END
  FROM public.products p
 WHERE p.organization_id=si.organization_id AND p.id=si.product_id;

UPDATE public.sale_items
   SET unit_snapshot = COALESCE(unit_snapshot, 'unidad'),
       quantity_mode_snapshot = COALESCE(
         quantity_mode_snapshot,
         CASE WHEN quantity <> pg_catalog.trunc(quantity) THEN 'fractional' ELSE 'integer' END
       );

ALTER TABLE public.sale_items
  ALTER COLUMN unit_snapshot SET NOT NULL,
  ALTER COLUMN quantity_mode_snapshot SET NOT NULL,
  ADD CONSTRAINT sale_items_unit_snapshot_nonempty_ck
    CHECK (pg_catalog.length(pg_catalog.btrim(unit_snapshot)) > 0),
  ADD CONSTRAINT sale_items_quantity_mode_snapshot_ck
    CHECK (quantity_mode_snapshot IN ('integer', 'fractional')),
  ADD CONSTRAINT sale_items_integer_quantity_snapshot_ck
    CHECK (quantity_mode_snapshot <> 'integer' OR quantity = pg_catalog.trunc(quantity));

-- Product updates cannot switch to integer while any branch projection is
-- fractional. API additionally returns a domain-specific 409 before UPDATE.
CREATE FUNCTION public.guard_product_quantity_mode_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_product_quantity_mode_transition$
BEGIN
  IF NEW.quantity_mode = 'integer'
     AND (TG_OP = 'INSERT' OR OLD.quantity_mode IS DISTINCT FROM 'integer') THEN
    IF NEW.minimum_stock <> pg_catalog.trunc(NEW.minimum_stock) THEN
      RAISE EXCEPTION 'INTEGER_PRODUCT_MINIMUM_STOCK_MUST_BE_WHOLE'
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.inventory_balances b
       WHERE b.organization_id=NEW.organization_id AND b.product_id=NEW.id
         AND (b.on_hand_quantity <> pg_catalog.trunc(b.on_hand_quantity)
           OR b.reserved_quantity <> pg_catalog.trunc(b.reserved_quantity))
    ) THEN
      RAISE EXCEPTION 'INTEGER_PRODUCT_HAS_FRACTIONAL_INVENTORY_BALANCE'
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1
        FROM public.inventory_count_lines l
        JOIN public.inventory_counts c
          ON c.organization_id=l.organization_id AND c.id=l.count_id
       WHERE l.organization_id=NEW.organization_id AND l.product_id=NEW.id
         AND c.status='draft'
         AND l.counted_quantity <> pg_catalog.trunc(l.counted_quantity)
    ) THEN
      RAISE EXCEPTION 'INTEGER_PRODUCT_HAS_FRACTIONAL_PENDING_COUNT'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard_product_quantity_mode_transition$;
ALTER FUNCTION public.guard_product_quantity_mode_transition() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.guard_product_quantity_mode_transition() FROM PUBLIC, microapp_runtime;
CREATE TRIGGER products_quantity_mode_transition_guard
BEFORE INSERT OR UPDATE OF quantity_mode, minimum_stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_quantity_mode_transition();

-- The trigger name sorts after the existing lifecycle trigger. Both remain
-- BEFORE INSERT guards; the lifecycle still rejects children of non-draft sales.
CREATE FUNCTION public.guard_sale_item_quantity_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $guard_sale_item_quantity_snapshots$
DECLARE
  product_unit text;
  product_quantity_mode text;
BEGIN
  SELECT p.unit, p.quantity_mode
    INTO product_unit, product_quantity_mode
    FROM public.products p
   WHERE p.organization_id=NEW.organization_id AND p.id=NEW.product_id
   FOR SHARE;
  IF NOT FOUND
     OR NEW.unit_snapshot IS DISTINCT FROM product_unit
     OR NEW.quantity_mode_snapshot IS DISTINCT FROM product_quantity_mode THEN
    RAISE EXCEPTION 'SALE_ITEM_QUANTITY_SNAPSHOT_MUST_MATCH_PRODUCT'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard_sale_item_quantity_snapshots$;
ALTER FUNCTION public.guard_sale_item_quantity_snapshots() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.guard_sale_item_quantity_snapshots() FROM PUBLIC, microapp_runtime;
CREATE TRIGGER zzz_sale_items_quantity_snapshot_guard
BEFORE INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_item_quantity_snapshots();

-- Actual schema object is inventory_count_lines (not inventory_count_items).
CREATE FUNCTION public.guard_integer_inventory_count_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $guard_integer_inventory_count_line$
DECLARE mode text;
BEGIN
  SELECT p.quantity_mode INTO mode
    FROM public.products p
   WHERE p.organization_id=NEW.organization_id AND p.id=NEW.product_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_PRODUCT_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF mode='integer' AND NEW.counted_quantity <> pg_catalog.trunc(NEW.counted_quantity) THEN
    RAISE EXCEPTION 'INTEGER_PRODUCT_COUNT_QUANTITY_MUST_BE_WHOLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard_integer_inventory_count_line$;
ALTER FUNCTION public.guard_integer_inventory_count_line() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.guard_integer_inventory_count_line() FROM PUBLIC, microapp_runtime;
CREATE TRIGGER inventory_count_lines_integer_quantity_guard
BEFORE INSERT ON public.inventory_count_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_integer_inventory_count_line();

-- The current receipt RPC is create_inventory_receipt(); this line-level
-- guard runs inside that transaction and also covers future SECURITY DEFINER
-- callers without granting runtime direct table writes.
CREATE FUNCTION public.guard_integer_inventory_receipt_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $guard_integer_inventory_receipt_line$
DECLARE mode text;
BEGIN
  SELECT p.quantity_mode INTO mode
    FROM public.products p
   WHERE p.organization_id=NEW.organization_id AND p.id=NEW.product_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_RECEIPT_PRODUCT_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF mode='integer' AND NEW.quantity <> pg_catalog.trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'INTEGER_PRODUCT_RECEIPT_QUANTITY_MUST_BE_WHOLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard_integer_inventory_receipt_line$;
ALTER FUNCTION public.guard_integer_inventory_receipt_line() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.guard_integer_inventory_receipt_line() FROM PUBLIC, microapp_runtime;
CREATE TRIGGER inventory_receipt_lines_integer_quantity_guard
BEFORE INSERT ON public.inventory_receipt_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_integer_inventory_receipt_line();

-- Runtime may change only the new mode column; existing product grants remain narrow.
GRANT UPDATE (quantity_mode) ON TABLE public.products TO microapp_runtime;

COMMIT;
