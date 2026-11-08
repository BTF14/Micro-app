BEGIN;
SET LOCAL lock_timeout = '5s';

DO $inventory_projection_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'MIGRATION_MUST_RUN_AS_MICROAPP_MIGRATOR';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime' AND rolcanlogin)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator' AND rolcanlogin)
  THEN
    RAISE EXCEPTION 'INVENTORY_PROJECTION_RUNTIME_ROLES_MISSING';
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_balance_ledger_intents) THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_LEDGER_INTENTS_NOT_EMPTY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_counts
    WHERE count_type='opening' AND status='confirmed'
    GROUP BY organization_id, branch_id, warehouse_id
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'INVENTORY_CONFIRMED_OPENING_COUNT_DUPLICATES_EXIST';
  END IF;
END;
$inventory_projection_preflight$;

-- The old intent-pairing model requires runtime to mutate both the projection
-- and the ledger. Replace it with the ledger as the only runtime write path.
DROP TRIGGER IF EXISTS inventory_balances_ledger_intent ON public.inventory_balances;
DROP TRIGGER IF EXISTS warehouse_inventory_movements_require_balance_intent ON public.warehouse_inventory_movements;
DROP TRIGGER IF EXISTS inventory_balance_ledger_intent_complete ON public.inventory_balance_ledger_intents;
DROP FUNCTION IF EXISTS public.record_inventory_balance_ledger_intent();
DROP FUNCTION IF EXISTS public.consume_inventory_balance_ledger_intent();
DROP FUNCTION IF EXISTS public.assert_inventory_balance_ledger_intent_consumed();
DROP TABLE public.inventory_balance_ledger_intents;

-- A zero-valued opening count intentionally creates no balance row. Preserve
-- the one-time opening invariant independently of the existence of a balance.
CREATE UNIQUE INDEX inventory_counts_one_confirmed_opening_per_warehouse_uidx
  ON public.inventory_counts (organization_id, branch_id, warehouse_id)
  WHERE count_type='opening' AND status='confirmed';

-- Every ledger insert must acquire the warehouse mutex before count-line
-- validation and balance projection. This makes the application lock order a
-- database invariant even for direct runtime INSERTs into the append-only ledger.
CREATE FUNCTION public.lock_inventory_movement_warehouse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_inventory_movement_warehouse$
BEGIN
  PERFORM 1
    FROM public.warehouses AS warehouse
   WHERE warehouse.organization_id = NEW.organization_id
     AND warehouse.branch_id = NEW.branch_id
     AND warehouse.id = NEW.warehouse_id
     AND warehouse.is_active = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_SCOPE_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$lock_inventory_movement_warehouse$;

REVOKE ALL ON FUNCTION public.lock_inventory_movement_warehouse() FROM PUBLIC, microapp_runtime;

-- PostgreSQL fires same-event triggers in name order; this prefix guarantees
-- the warehouse lock precedes validate_count_inventory_movement().
CREATE TRIGGER warehouse_inventory_movements_00_lock_warehouse
BEFORE INSERT ON public.warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.lock_inventory_movement_warehouse();

CREATE FUNCTION public.project_inventory_movement_to_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $project_inventory_movement_to_balance$
BEGIN
  IF NEW.quantity_delta > 0 THEN
    INSERT INTO public.inventory_balances
      (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
    VALUES
      (NEW.organization_id, NEW.branch_id, NEW.warehouse_id, NEW.product_id, NEW.quantity_delta)
    ON CONFLICT (organization_id, warehouse_id, product_id)
    DO UPDATE
      SET on_hand_quantity = public.inventory_balances.on_hand_quantity + EXCLUDED.on_hand_quantity,
          updated_at = pg_catalog.now();
  ELSE
    UPDATE public.inventory_balances AS balance
       SET on_hand_quantity = balance.on_hand_quantity + NEW.quantity_delta,
           updated_at = pg_catalog.now()
     WHERE balance.organization_id = NEW.organization_id
       AND balance.branch_id = NEW.branch_id
       AND balance.warehouse_id = NEW.warehouse_id
       AND balance.product_id = NEW.product_id
       AND balance.on_hand_quantity + NEW.quantity_delta >= balance.reserved_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_WOULD_BREACH_AVAILABLE_STOCK'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$project_inventory_movement_to_balance$;

REVOKE ALL ON FUNCTION public.project_inventory_movement_to_balance() FROM PUBLIC, microapp_runtime;

CREATE TRIGGER warehouse_inventory_movements_project_balance
AFTER INSERT ON public.warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.project_inventory_movement_to_balance();

-- Defense in depth: even a future accidental grant cannot turn balances back
-- into an independently writable source of truth. Nested projection-trigger
-- writes are allowed; direct INSERT/UPDATE statements are rejected.
CREATE FUNCTION public.guard_direct_inventory_balance_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_direct_inventory_balance_write$
BEGIN
  IF pg_catalog.pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_WRITES_MUST_ORIGINATE_FROM_LEDGER'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$guard_direct_inventory_balance_write$;

REVOKE ALL ON FUNCTION public.guard_direct_inventory_balance_write() FROM PUBLIC, microapp_runtime;

CREATE TRIGGER inventory_balances_direct_write_guard
BEFORE INSERT OR UPDATE ON public.inventory_balances
FOR EACH ROW EXECUTE FUNCTION public.guard_direct_inventory_balance_write();

-- Runtime keeps SELECT but loses every direct balance mutation privilege.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER
  ON TABLE public.inventory_balances FROM microapp_runtime;
REVOKE UPDATE (on_hand_quantity, reserved_quantity, balance_version, updated_at)
  ON TABLE public.inventory_balances FROM microapp_runtime;
REVOKE INSERT (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity,
                reserved_quantity, balance_version, updated_at)
  ON TABLE public.inventory_balances FROM microapp_runtime;

-- SELECT ... FOR UPDATE requires UPDATE privilege. Expose only this scoped
-- SECURITY DEFINER helper; it re-locks the warehouse scope and then locks
-- existing balances in deterministic (warehouse, product) order.
CREATE FUNCTION public.lock_inventory_balances(
  p_organization_id uuid,
  p_warehouse_ids uuid[],
  p_branch_ids uuid[],
  p_product_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  warehouse_id uuid,
  product_id uuid,
  on_hand_quantity numeric(14,3),
  reserved_quantity numeric(14,3),
  balance_version bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_inventory_balances$
DECLARE
  locked_warehouse_count bigint;
BEGIN
  IF p_organization_id IS NULL OR p_warehouse_ids IS NULL OR p_branch_ids IS NULL
    OR pg_catalog.cardinality(p_warehouse_ids) = 0
    OR pg_catalog.cardinality(p_warehouse_ids) <> pg_catalog.cardinality(p_branch_ids)
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_warehouse_ids) AS x(id) WHERE x.id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_branch_ids) AS x(id) WHERE x.id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_warehouse_ids) AS x(id)
      GROUP BY x.id HAVING pg_catalog.count(*) > 1
    )
    OR (p_product_ids IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_product_ids) AS x(id) WHERE x.id IS NULL
    ))
    OR (p_product_ids IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_product_ids) AS x(id)
      GROUP BY x.id HAVING pg_catalog.count(*) > 1
    ))
  THEN
    RETURN;
  END IF;

  IF p_product_ids IS NOT NULL AND pg_catalog.cardinality(p_product_ids) = 0 THEN
    RETURN;
  END IF;

  SELECT pg_catalog.count(*)
    INTO locked_warehouse_count
    FROM public.lock_inventory_warehouses(
      p_organization_id, p_warehouse_ids, p_branch_ids
    );

  IF locked_warehouse_count <> pg_catalog.cardinality(p_warehouse_ids) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT balance.warehouse_id, balance.product_id, balance.on_hand_quantity,
         balance.reserved_quantity, balance.balance_version
    FROM public.inventory_balances AS balance
    JOIN pg_catalog.unnest(p_warehouse_ids, p_branch_ids)
      AS target(warehouse_id, branch_id)
      ON target.warehouse_id = balance.warehouse_id
     AND target.branch_id = balance.branch_id
   WHERE balance.organization_id = p_organization_id
     AND (p_product_ids IS NULL OR balance.product_id = ANY(p_product_ids))
   ORDER BY balance.warehouse_id ASC, balance.product_id ASC
   FOR UPDATE OF balance;
END;
$lock_inventory_balances$;

REVOKE ALL ON FUNCTION public.lock_inventory_balances(uuid, uuid[], uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_inventory_balances(uuid, uuid[], uuid[], uuid[]) TO microapp_runtime;

COMMENT ON FUNCTION public.lock_inventory_movement_warehouse() IS
  'SECURITY DEFINER BEFORE INSERT guard: lock and validate the active tenant/branch warehouse before count validation and balance projection.';
COMMENT ON FUNCTION public.project_inventory_movement_to_balance() IS
  'SECURITY DEFINER AFTER INSERT projection: append-only inventory movements are the only runtime-authorized source of on-hand balance changes.';
COMMENT ON FUNCTION public.guard_direct_inventory_balance_write() IS
  'Rejects direct balance INSERT/UPDATE; only nested writes from the ledger projection trigger are allowed.';
COMMENT ON FUNCTION public.lock_inventory_balances(uuid, uuid[], uuid[], uuid[]) IS
  'Locks tenant/branch-scoped existing balance rows in deterministic order without granting runtime UPDATE on inventory_balances.';
COMMENT ON INDEX public.inventory_counts_one_confirmed_opening_per_warehouse_uidx IS
  'A confirmed opening count is unique per tenant, branch and warehouse, including all-zero counts with no balance rows.';

COMMIT;
