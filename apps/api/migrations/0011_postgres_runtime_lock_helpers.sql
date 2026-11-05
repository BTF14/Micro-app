BEGIN;

-- Narrow SECURITY DEFINER functions keep existing row-lock semantics without
-- UPDATE grants on otherwise read-only runtime tables. Runtime EXECUTE grants
-- are deliberately deferred to the explicit role/grants migration.

CREATE OR REPLACE FUNCTION public.lock_tenant_context(p_token_hash text, p_organization_id uuid)
RETURNS TABLE (user_id uuid, organization_id uuid, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $lock_tenant_context$
  SELECT u.id, o.id, m.role
  FROM public.auth_sessions s
  JOIN public.app_users u ON u.id = s.user_id
  JOIN public.organization_members m ON m.user_id = u.id
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE s.token_hash = p_token_hash
    AND s.revoked_at IS NULL
    AND s.expires_at > pg_catalog.now()
    AND u.is_active = true
    AND m.is_active = true
    AND o.is_active = true
    AND o.id = p_organization_id
  LIMIT 1
  FOR SHARE OF s, u, m, o;
$lock_tenant_context$;

CREATE OR REPLACE FUNCTION public.lock_branch_scopes(
  p_organization_id uuid, p_branch_ids uuid[],
  p_membership_branch_ids uuid[], p_membership_user_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $lock_branch_scopes$
DECLARE
  locked_count bigint;
  expected_memberships bigint;
BEGIN
  IF p_organization_id IS NULL OR p_branch_ids IS NULL
    OR p_membership_branch_ids IS NULL OR p_membership_user_ids IS NULL
    OR pg_catalog.cardinality(p_membership_branch_ids) <> pg_catalog.cardinality(p_membership_user_ids)
  THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.unnest(p_branch_ids) AS x(id) WHERE x.id IS NULL)
    OR EXISTS (SELECT x.id FROM pg_catalog.unnest(p_branch_ids) AS x(id)
               GROUP BY x.id HAVING pg_catalog.count(*) > 1)
  THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_membership_branch_ids, p_membership_user_ids) AS x(branch_id, user_id)
    WHERE x.branch_id IS NULL OR x.user_id IS NULL OR NOT (x.branch_id = ANY(p_branch_ids))
  ) OR EXISTS (
    SELECT x.branch_id, x.user_id
    FROM pg_catalog.unnest(p_membership_branch_ids, p_membership_user_ids) AS x(branch_id, user_id)
    GROUP BY x.branch_id, x.user_id HAVING pg_catalog.count(*) > 1
  ) THEN RETURN false; END IF;

  PERFORM b.id FROM public.branches b
  WHERE b.organization_id = p_organization_id
    AND b.id = ANY(p_branch_ids) AND b.is_active = true
  ORDER BY b.id ASC FOR SHARE OF b;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  IF locked_count <> pg_catalog.cardinality(p_branch_ids) THEN RETURN false; END IF;

  expected_memberships := pg_catalog.cardinality(p_membership_branch_ids);
  IF expected_memberships = 0 THEN RETURN true; END IF;

  PERFORM bm.branch_id
  FROM public.branch_memberships bm
  JOIN pg_catalog.unnest(p_membership_branch_ids, p_membership_user_ids) AS x(branch_id, user_id)
    ON x.branch_id = bm.branch_id AND x.user_id = bm.user_id
  WHERE bm.organization_id = p_organization_id AND bm.is_active = true
  ORDER BY bm.branch_id ASC, bm.user_id ASC FOR SHARE OF bm;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  RETURN locked_count = expected_memberships;
END;
$lock_branch_scopes$;

CREATE OR REPLACE FUNCTION public.lock_inventory_warehouses(
  p_organization_id uuid, p_warehouse_ids uuid[], p_branch_ids uuid[]
)
RETURNS SETOF uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $lock_inventory_warehouses$
BEGIN
  IF p_organization_id IS NULL OR p_warehouse_ids IS NULL OR p_branch_ids IS NULL
    OR pg_catalog.cardinality(p_warehouse_ids) <> pg_catalog.cardinality(p_branch_ids)
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_warehouse_ids, p_branch_ids) AS x(warehouse_id, branch_id)
      WHERE x.warehouse_id IS NULL OR x.branch_id IS NULL
    )
    OR EXISTS (
      SELECT x.warehouse_id FROM pg_catalog.unnest(p_warehouse_ids) AS x(warehouse_id)
      GROUP BY x.warehouse_id HAVING pg_catalog.count(*) > 1
    )
  THEN RETURN; END IF;

  RETURN QUERY
  SELECT w.id FROM public.warehouses w
  JOIN pg_catalog.unnest(p_warehouse_ids, p_branch_ids) AS x(warehouse_id, branch_id)
    ON x.warehouse_id = w.id AND x.branch_id = w.branch_id
  WHERE w.organization_id = p_organization_id AND w.is_active = true
  ORDER BY w.id ASC FOR UPDATE OF w;
END;
$lock_inventory_warehouses$;

-- The trigger validates count-line snapshots using SELECT FOR SHARE. SECURITY
-- DEFINER lets the runtime retain SELECT-only access to inventory_count_lines.
CREATE OR REPLACE FUNCTION public.validate_count_inventory_movement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $validate_count_inventory_movement$
DECLARE
  referenced_count_type text;
  referenced_count_status text;
  referenced_count_reason text;
  referenced_confirmed_by uuid;
  line_counted_quantity numeric(14,3);
  line_expected_on_hand_quantity numeric(14,3);
  line_unit_cost_usd numeric(14,4);
  expected_delta numeric(14,3);
BEGIN
  IF NEW.count_id IS NULL THEN RETURN NEW; END IF;

  SELECT count_type, status, reason, confirmed_by
    INTO referenced_count_type, referenced_count_status, referenced_count_reason, referenced_confirmed_by
    FROM public.inventory_counts
   WHERE organization_id = NEW.organization_id AND branch_id = NEW.branch_id
     AND warehouse_id = NEW.warehouse_id AND id = NEW.count_id
   FOR SHARE;

  IF NOT FOUND OR referenced_count_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_CONFIRMED_COUNT' USING ERRCODE = '23514';
  END IF;
  IF (NEW.movement_type = 'opening' AND referenced_count_type <> 'opening')
    OR (NEW.movement_type = 'count_adjustment' AND referenced_count_type <> 'physical') THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_COUNT_TYPE_MISMATCH' USING ERRCODE = '23514';
  END IF;

  SELECT counted_quantity, expected_on_hand_quantity, unit_cost_usd
    INTO line_counted_quantity, line_expected_on_hand_quantity, line_unit_cost_usd
    FROM public.inventory_count_lines
   WHERE organization_id = NEW.organization_id AND count_id = NEW.count_id
     AND product_id = NEW.product_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE' USING ERRCODE = '23514';
  END IF;
  IF NEW.actor_user_id IS DISTINCT FROM referenced_confirmed_by THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_MUST_MATCH_COUNT_CONFIRMER' USING ERRCODE = '23514';
  END IF;
  IF NEW.reason IS DISTINCT FROM referenced_count_reason THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REASON_MUST_MATCH_COUNT' USING ERRCODE = '23514';
  END IF;
  IF NEW.unit_cost_usd IS DISTINCT FROM line_unit_cost_usd THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_UNIT_COST_MUST_MATCH_COUNT_LINE' USING ERRCODE = '23514';
  END IF;
  IF NEW.movement_type = 'opening' THEN
    expected_delta := line_counted_quantity;
  ELSE
    IF line_expected_on_hand_quantity IS NULL THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_PHYSICAL_SNAPSHOT_REQUIRED' USING ERRCODE = '23514';
    END IF;
    expected_delta := line_counted_quantity - line_expected_on_hand_quantity;
  END IF;
  IF NEW.quantity_delta IS DISTINCT FROM expected_delta THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_DELTA_MUST_MATCH_COUNT_SNAPSHOT' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$validate_count_inventory_movement$;

REVOKE ALL ON FUNCTION public.lock_tenant_context(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_branch_scopes(uuid, uuid[], uuid[], uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_inventory_warehouses(uuid, uuid[], uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_count_inventory_movement() FROM PUBLIC;

COMMENT ON FUNCTION public.lock_tenant_context(text, uuid) IS
  'Locks active session, user, membership and organization rows for tenant revocation consistency; runtime access is granted explicitly.';
COMMENT ON FUNCTION public.lock_branch_scopes(uuid, uuid[], uuid[], uuid[]) IS
  'Locks branch rows in UUID order before active membership rows in branch/user order; runtime access is granted explicitly.';
COMMENT ON FUNCTION public.lock_inventory_warehouses(uuid, uuid[], uuid[]) IS
  'Locks active tenant/branch-scoped warehouse rows in UUID order; runtime access is granted explicitly.';
COMMENT ON FUNCTION public.validate_count_inventory_movement() IS
  'SECURITY DEFINER trigger validation of confirmed count, immutable line snapshot, actor, reason, cost and exact delta.';

COMMIT;
