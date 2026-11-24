BEGIN;

CREATE OR REPLACE FUNCTION guard_inventory_count_lifecycle() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'inventory_counts' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'draft' THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_MUST_START_AS_DRAFT' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
      IF OLD.status <> 'draft' THEN
        RAISE EXCEPTION 'CONFIRMED_INVENTORY_COUNT_IMMUTABLE' USING ERRCODE = '23514';
      END IF;
      RETURN OLD;
    END IF;

    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'CONFIRMED_INVENTORY_COUNT_IMMUTABLE' USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'confirmed' THEN
      IF NEW.confirmed_by IS NULL OR NEW.confirmed_at IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM inventory_count_lines l
          WHERE l.organization_id = NEW.organization_id AND l.count_id = NEW.id
        ) THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_REQUIRES_ACTOR_TIME_AND_LINES'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.count_type = 'physical' AND EXISTS (
        SELECT 1 FROM inventory_count_lines l
        WHERE l.organization_id = NEW.organization_id
          AND l.count_id = NEW.id
          AND (l.expected_on_hand_quantity IS NULL OR l.expected_balance_version IS NULL)
      ) THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_PHYSICAL_SNAPSHOT_REQUIRED'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.count_type = 'opening' AND EXISTS (
        SELECT 1 FROM inventory_count_lines l
        WHERE l.organization_id = NEW.organization_id
          AND l.count_id = NEW.id
          AND (l.expected_on_hand_quantity IS NOT NULL OR l.expected_balance_version IS NOT NULL)
      ) THEN
        RAISE EXCEPTION 'INVENTORY_COUNT_OPENING_MUST_NOT_HAVE_PHYSICAL_SNAPSHOT'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM 1 FROM inventory_counts c
    WHERE c.organization_id = NEW.organization_id
      AND c.id = NEW.count_id
      AND c.status = 'draft'
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_COUNT_LINES_REQUIRE_DRAFT_COUNT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1 FROM inventory_counts c
  WHERE c.organization_id = OLD.organization_id
    AND c.id = OLD.count_id
    AND c.status = 'draft'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONFIRMED_INVENTORY_COUNT_LINES_IMMUTABLE' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
    AND ROW(NEW.organization_id, NEW.branch_id, NEW.warehouse_id, NEW.count_id)
      IS DISTINCT FROM ROW(OLD.organization_id, OLD.branch_id, OLD.warehouse_id, OLD.count_id) THEN
    PERFORM 1 FROM inventory_counts c
    WHERE c.organization_id = NEW.organization_id
      AND c.branch_id = NEW.branch_id
      AND c.warehouse_id = NEW.warehouse_id
      AND c.id = NEW.count_id
      AND c.status = 'draft'
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_COUNT_LINES_REQUIRE_DRAFT_TARGET' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_count_inventory_movement() RETURNS trigger
LANGUAGE plpgsql
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
  IF NEW.count_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count_type, status, reason, confirmed_by
    INTO referenced_count_type, referenced_count_status, referenced_count_reason, referenced_confirmed_by
    FROM inventory_counts
   WHERE organization_id = NEW.organization_id
     AND branch_id = NEW.branch_id
     AND warehouse_id = NEW.warehouse_id
     AND id = NEW.count_id
   FOR SHARE;

  IF NOT FOUND OR referenced_count_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_CONFIRMED_COUNT'
      USING ERRCODE = '23514';
  END IF;

  IF (NEW.movement_type = 'opening' AND referenced_count_type <> 'opening')
    OR (NEW.movement_type = 'count_adjustment' AND referenced_count_type <> 'physical') THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_COUNT_TYPE_MISMATCH'
      USING ERRCODE = '23514';
  END IF;

  SELECT counted_quantity, expected_on_hand_quantity, unit_cost_usd
    INTO line_counted_quantity, line_expected_on_hand_quantity, line_unit_cost_usd
    FROM inventory_count_lines
   WHERE organization_id = NEW.organization_id
     AND count_id = NEW.count_id
     AND product_id = NEW.product_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.actor_user_id IS DISTINCT FROM referenced_confirmed_by THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_ACTOR_MUST_MATCH_COUNT_CONFIRMER'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reason IS DISTINCT FROM referenced_count_reason THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REASON_MUST_MATCH_COUNT'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.unit_cost_usd IS DISTINCT FROM line_unit_cost_usd THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_UNIT_COST_MUST_MATCH_COUNT_LINE'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.movement_type = 'opening' THEN
    expected_delta := line_counted_quantity;
  ELSE
    IF line_expected_on_hand_quantity IS NULL THEN
      RAISE EXCEPTION 'INVENTORY_MOVEMENT_PHYSICAL_SNAPSHOT_REQUIRED'
        USING ERRCODE = '23514';
    END IF;
    expected_delta := line_counted_quantity - line_expected_on_hand_quantity;
  END IF;

  IF NEW.quantity_delta IS DISTINCT FROM expected_delta THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_DELTA_MUST_MATCH_COUNT_SNAPSHOT'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_count_inventory_movement$;

COMMENT ON FUNCTION guard_inventory_count_lifecycle() IS
  'Confirmed physical counts require expected quantity/version snapshots; opening counts must not carry physical snapshots.';
COMMENT ON FUNCTION validate_count_inventory_movement() IS
  'Count-derived ledger entries must match confirmed count type, exact delta, actor, reason and unit cost.';

COMMIT;
