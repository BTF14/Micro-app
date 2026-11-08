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
CREATE TRIGGER aaa_warehouse_inventory_movements_lock_warehouse
BEFORE INSERT ON public.warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.lock_inventory_movement_warehouse();

-- A balance projection is only safe when every movement is backed by a
-- database-verifiable business document. Counts retain their existing strict
-- validator; checkout sales must match a draft sale line exactly. Other
-- movement types remain unavailable until their source-document workflows
-- and authorization contracts exist.
CREATE FUNCTION public.validate_inventory_movement_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $validate_inventory_movement_source$
DECLARE
  count_type text;
  count_status text;
  line_expected_on_hand numeric(14,3);
  line_expected_version bigint;
  current_on_hand numeric(14,3);
  current_balance_version bigint;
  sale_branch_id uuid;
  sale_warehouse_id uuid;
  sale_actor_id uuid;
  sale_status text;
  sale_quantity numeric(14,3);
  sale_unit_cost numeric(14,4);
BEGIN
  IF NEW.movement_type IN ('opening', 'count_adjustment') THEN
    IF NEW.count_id IS NULL
      OR NEW.reference_type IS NOT NULL
      OR NEW.reference_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'COUNT_MOVEMENT_MUST_REFERENCE_CONFIRMED_COUNT_ONLY'
        USING ERRCODE = '23514';
    END IF;

    SELECT c.count_type, c.status
      INTO count_type, count_status
      FROM public.inventory_counts AS c
     WHERE c.organization_id = NEW.organization_id
       AND c.branch_id = NEW.branch_id
       AND c.warehouse_id = NEW.warehouse_id
       AND c.id = NEW.count_id
     FOR SHARE;

    IF NOT FOUND OR count_status <> 'confirmed'
      OR (NEW.movement_type = 'opening' AND count_type <> 'opening')
      OR (NEW.movement_type = 'count_adjustment' AND count_type <> 'physical')
    THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_MATCHING_CONFIRMED_COUNT'
        USING ERRCODE = '23514';
    END IF;

    SELECT line.expected_on_hand_quantity, line.expected_balance_version
      INTO line_expected_on_hand, line_expected_version
      FROM public.inventory_count_lines AS line
     WHERE line.organization_id = NEW.organization_id
       AND line.count_id = NEW.count_id
       AND line.product_id = NEW.product_id
     FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.movement_type = 'opening' THEN
      IF EXISTS (
        SELECT 1 FROM public.inventory_balances AS balance
         WHERE balance.organization_id = NEW.organization_id
           AND balance.branch_id = NEW.branch_id
           AND balance.warehouse_id = NEW.warehouse_id
           AND balance.product_id = NEW.product_id
      ) THEN
        RAISE EXCEPTION 'INVENTORY_OPENING_MOVEMENT_REQUIRES_EMPTY_PRODUCT_BALANCE'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      current_on_hand := 0.000;
      current_balance_version := 0;
      SELECT balance.on_hand_quantity, balance.balance_version
        INTO current_on_hand, current_balance_version
        FROM public.inventory_balances AS balance
       WHERE balance.organization_id = NEW.organization_id
         AND balance.branch_id = NEW.branch_id
         AND balance.warehouse_id = NEW.warehouse_id
         AND balance.product_id = NEW.product_id
       FOR UPDATE;

      IF NOT FOUND THEN
        current_on_hand := 0.000;
        current_balance_version := 0;
      END IF;

      IF line_expected_on_hand IS DISTINCT FROM current_on_hand
        OR line_expected_version IS DISTINCT FROM current_balance_version
      THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_SNAPSHOT_STALE'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.movement_type <> 'sale'
    OR NEW.count_id IS NOT NULL
    OR NEW.reference_type IS DISTINCT FROM 'sale'
    OR NEW.reference_id IS NULL
    OR NEW.quantity_delta >= 0
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_TYPE_NOT_AUTHORIZED'
      USING ERRCODE = '23514';
  END IF;

  SELECT s.branch_id, s.warehouse_id, s.created_by, s.status
    INTO sale_branch_id, sale_warehouse_id, sale_actor_id, sale_status
    FROM public.sales AS s
   WHERE s.organization_id = NEW.organization_id
     AND s.id = NEW.reference_id
   FOR UPDATE;

  IF NOT FOUND
    OR sale_status <> 'draft'
    OR sale_branch_id IS DISTINCT FROM NEW.branch_id
    OR sale_warehouse_id IS DISTINCT FROM NEW.warehouse_id
    OR sale_actor_id IS DISTINCT FROM NEW.actor_user_id
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_SOURCE_SCOPE_INVALID'
      USING ERRCODE = '23514';
  END IF;

  SELECT item.quantity, item.unit_cost_usd
    INTO sale_quantity, sale_unit_cost
    FROM public.sale_items AS item
   WHERE item.organization_id = NEW.organization_id
     AND item.sale_id = NEW.reference_id
     AND item.product_id = NEW.product_id
   FOR SHARE;

  IF NOT FOUND
    OR NEW.quantity_delta IS DISTINCT FROM -sale_quantity
    OR NEW.unit_cost_usd IS DISTINCT FROM sale_unit_cost
  THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_MUST_MATCH_SALE_LINE'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.warehouse_inventory_movements AS existing
     WHERE existing.organization_id = NEW.organization_id
       AND existing.movement_type = 'sale'
       AND existing.reference_type = 'sale'
       AND existing.reference_id = NEW.reference_id
       AND existing.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'INVENTORY_SALE_MOVEMENT_ALREADY_RECORDED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_inventory_movement_source$;

REVOKE ALL ON FUNCTION public.validate_inventory_movement_source() FROM PUBLIC, microapp_runtime;

-- A count document is a valid stock source only when its creator and confirmer
-- are currently authorized for inventory adjustment at this branch. Owner/Admin
-- have organization-wide branch scope; Inventory must have active branch scope.
CREATE FUNCTION public.validate_inventory_count_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $validate_inventory_count_confirmation$
BEGIN
  IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  PERFORM 1
    FROM public.organizations AS org
    JOIN public.branches AS branch
      ON branch.organization_id = org.id
     AND branch.id = NEW.branch_id
     AND branch.is_active = true
    JOIN public.warehouses AS warehouse
      ON warehouse.organization_id = branch.organization_id
     AND warehouse.branch_id = branch.id
     AND warehouse.id = NEW.warehouse_id
     AND warehouse.is_active = true
    JOIN public.organization_members AS confirmer
      ON confirmer.organization_id = org.id
     AND confirmer.user_id = NEW.confirmed_by
     AND confirmer.is_active = true
     AND confirmer.role IN ('owner', 'admin', 'inventory')
    JOIN public.app_users AS confirmer_user
      ON confirmer_user.id = confirmer.user_id
     AND confirmer_user.is_active = true
    JOIN public.organization_members AS creator
      ON creator.organization_id = org.id
     AND creator.user_id = NEW.created_by
     AND creator.is_active = true
     AND creator.role IN ('owner', 'admin', 'inventory')
    JOIN public.app_users AS creator_user
      ON creator_user.id = creator.user_id
     AND creator_user.is_active = true
   WHERE org.id = NEW.organization_id
     AND org.is_active = true
     AND (
       confirmer.role IN ('owner', 'admin')
       OR EXISTS (
         SELECT 1 FROM public.branch_memberships AS membership
          WHERE membership.organization_id = NEW.organization_id
            AND membership.branch_id = NEW.branch_id
            AND membership.user_id = confirmer.user_id
            AND membership.is_active = true
       )
     )
     AND (
       creator.role IN ('owner', 'admin')
       OR EXISTS (
         SELECT 1 FROM public.branch_memberships AS membership
          WHERE membership.organization_id = NEW.organization_id
            AND membership.branch_id = NEW.branch_id
            AND membership.user_id = creator.user_id
            AND membership.is_active = true
       )
     )
   ;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMER_NOT_AUTHORIZED'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.count_type = 'opening' AND EXISTS (
    SELECT 1 FROM public.inventory_balances AS balance
     WHERE balance.organization_id = NEW.organization_id
       AND balance.branch_id = NEW.branch_id
       AND balance.warehouse_id = NEW.warehouse_id
  ) THEN
    RAISE EXCEPTION 'INVENTORY_OPENING_COUNT_REQUIRES_EMPTY_WAREHOUSE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_inventory_count_confirmation$;

REVOKE ALL ON FUNCTION public.validate_inventory_count_confirmation() FROM PUBLIC, microapp_runtime;

CREATE TRIGGER z_inventory_counts_validate_confirmation
BEFORE UPDATE OF status ON public.inventory_counts
FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_count_confirmation();

-- Run after the warehouse mutex but before count validation and balance projection.
CREATE TRIGGER aab_warehouse_inventory_movements_validate_source
BEFORE INSERT ON public.warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_movement_source();

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
  ON TABLE public.inventory_balances FROM PUBLIC, microapp_runtime;
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
    JOIN pg_catalog.generate_subscripts(p_warehouse_ids, 1) AS target(position)
      ON p_warehouse_ids[target.position] = balance.warehouse_id
     AND p_branch_ids[target.position] = balance.branch_id
   WHERE balance.organization_id = p_organization_id
     AND (p_product_ids IS NULL OR balance.product_id = ANY(p_product_ids))
   ORDER BY balance.warehouse_id ASC, balance.product_id ASC
   FOR UPDATE OF balance;
END;
$lock_inventory_balances$;

REVOKE ALL ON FUNCTION public.lock_inventory_balances(uuid, uuid[], uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_inventory_balances(uuid, uuid[], uuid[], uuid[]) TO microapp_runtime;

COMMENT ON FUNCTION public.validate_inventory_movement_source() IS
  'Fail-closed source authorization: count movements use confirmed count validation; sale movements must match a draft sale line and actor; unsupported source types are rejected.';

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
