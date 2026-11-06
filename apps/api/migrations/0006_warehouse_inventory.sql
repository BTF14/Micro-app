BEGIN;

-- Warehouse-scoped inventory foundation.
-- Apply after migrations 0001-0005. No legacy stock backfill is performed here.
-- Opening quantities must enter through a confirmed physical/documented count.

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  code text NOT NULL CHECK (
    code = lower(trim(code))
    AND code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, branch_id, id),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES branches (organization_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX warehouses_org_branch_code_uq
  ON warehouses (organization_id, branch_id, lower(code));
CREATE INDEX warehouses_org_branch_active_idx
  ON warehouses (organization_id, branch_id, is_active, lower(name));

CREATE TABLE inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  count_type text NOT NULL CHECK (count_type IN ('opening', 'physical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  created_by uuid NOT NULL,
  idempotency_key text CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  request_hash text CHECK (request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$'),
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (organization_id, branch_id, warehouse_id, id),
  FOREIGN KEY (organization_id, branch_id, warehouse_id)
    REFERENCES warehouses (organization_id, branch_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, confirmed_by)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'confirmed' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
    OR (status <> 'confirmed' AND confirmed_by IS NULL AND confirmed_at IS NULL)
  ),
  CHECK (count_type <> 'opening' OR status <> 'cancelled')
);
CREATE UNIQUE INDEX inventory_counts_one_confirmed_opening_uq
  ON inventory_counts (organization_id, warehouse_id)
  WHERE count_type = 'opening' AND status = 'confirmed';
ALTER TABLE inventory_counts ADD CONSTRAINT inventory_counts_idempotency_pair_ck
  CHECK ((idempotency_key IS NULL AND request_hash IS NULL)
      OR (idempotency_key IS NOT NULL AND request_hash IS NOT NULL));
CREATE UNIQUE INDEX inventory_counts_idempotency_key_uq
  ON inventory_counts (organization_id, created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX inventory_counts_warehouse_history_idx
  ON inventory_counts (organization_id, warehouse_id, created_at DESC);

CREATE TABLE inventory_count_lines (
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  count_id uuid NOT NULL,
  product_id uuid NOT NULL,
  counted_quantity numeric(14,3) NOT NULL CHECK (counted_quantity >= 0),
  unit_cost_usd numeric(14,4) CHECK (unit_cost_usd IS NULL OR unit_cost_usd >= 0),
  expected_on_hand_quantity numeric(14,3) CHECK (expected_on_hand_quantity IS NULL OR expected_on_hand_quantity >= 0),
  expected_balance_version bigint CHECK (expected_balance_version IS NULL OR expected_balance_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, count_id, product_id),
  FOREIGN KEY (organization_id, branch_id, warehouse_id, count_id)
    REFERENCES inventory_counts (organization_id, branch_id, warehouse_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX inventory_count_lines_product_idx
  ON inventory_count_lines (organization_id, product_id, count_id);

CREATE TABLE inventory_balances (
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  product_id uuid NOT NULL,
  on_hand_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
  reserved_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (
    reserved_quantity >= 0 AND reserved_quantity <= on_hand_quantity
  ),
  balance_version bigint NOT NULL DEFAULT 1 CHECK (balance_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, warehouse_id, product_id),
  FOREIGN KEY (organization_id, branch_id, warehouse_id)
    REFERENCES warehouses (organization_id, branch_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX inventory_balances_branch_product_idx
  ON inventory_balances (organization_id, branch_id, product_id, warehouse_id);

-- Invalidate physical count snapshots on every stock/reservation mutation.
CREATE FUNCTION advance_inventory_balance_version() RETURNS trigger
LANGUAGE plpgsql
AS $advance_inventory_balance_version$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.balance_version := 1;
    RETURN NEW;
  END IF;
  IF ROW(NEW.on_hand_quantity, NEW.reserved_quantity)
      IS DISTINCT FROM ROW(OLD.on_hand_quantity, OLD.reserved_quantity) THEN
    NEW.balance_version := OLD.balance_version + 1;
  ELSE
    NEW.balance_version := OLD.balance_version;
  END IF;
  RETURN NEW;
END;
$advance_inventory_balance_version$;

CREATE TRIGGER inventory_balances_version
BEFORE INSERT OR UPDATE ON inventory_balances
FOR EACH ROW EXECUTE FUNCTION advance_inventory_balance_version();

CREATE FUNCTION prevent_inventory_balance_delete() RETURNS trigger
LANGUAGE plpgsql
AS $prevent_inventory_balance_delete$
BEGIN
  RAISE EXCEPTION 'INVENTORY_BALANCE_DELETE_FORBIDDEN' USING ERRCODE = '23514';
END;
$prevent_inventory_balance_delete$;

CREATE TRIGGER inventory_balances_no_delete
BEFORE DELETE ON inventory_balances
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_balance_delete();

CREATE TABLE warehouse_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  product_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (
    movement_type IN ('opening', 'count_adjustment', 'purchase_receipt', 'sale', 'customer_return', 'transfer_out', 'transfer_in', 'reversal')
  ),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  unit_cost_usd numeric(14,4) CHECK (unit_cost_usd IS NULL OR unit_cost_usd >= 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  count_id uuid,
  reference_type text,
  reference_id uuid,
  actor_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, branch_id, warehouse_id)
    REFERENCES warehouses (organization_id, branch_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, branch_id, warehouse_id, count_id)
    REFERENCES inventory_counts (organization_id, branch_id, warehouse_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_user_id)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (
    (movement_type IN ('opening', 'count_adjustment') AND count_id IS NOT NULL)
    OR (movement_type NOT IN ('opening', 'count_adjustment') AND count_id IS NULL)
  )
);
CREATE INDEX warehouse_inventory_movements_product_history_idx
  ON warehouse_inventory_movements (organization_id, warehouse_id, product_id, created_at DESC);
CREATE UNIQUE INDEX warehouse_inventory_movements_count_line_uq
  ON warehouse_inventory_movements (organization_id, count_id, product_id)
  WHERE count_id IS NOT NULL;
CREATE INDEX warehouse_inventory_movements_reference_idx
  ON warehouse_inventory_movements (organization_id, reference_type, reference_id);

-- Confirmed counts are immutable historical facts. Draft lines can only be
-- changed while their parent count remains draft.
CREATE FUNCTION guard_inventory_count_lifecycle() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'inventory_counts' THEN
    IF TG_OP = 'INSERT' THEN
      -- Counts must enter the lifecycle as drafts. A direct INSERT must not
      -- manufacture a confirmed/cancelled historical record.
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
    IF NEW.status = 'confirmed' AND (
      NEW.confirmed_by IS NULL OR NEW.confirmed_at IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM inventory_count_lines l
        WHERE l.organization_id = NEW.organization_id AND l.count_id = NEW.id
      )
    ) THEN
      RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_REQUIRES_ACTOR_TIME_AND_LINES' USING ERRCODE = '23514';
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

CREATE TRIGGER inventory_counts_guard
BEFORE INSERT OR UPDATE OR DELETE ON inventory_counts
FOR EACH ROW EXECUTE FUNCTION guard_inventory_count_lifecycle();
CREATE TRIGGER inventory_count_lines_guard
BEFORE INSERT OR UPDATE OR DELETE ON inventory_count_lines
FOR EACH ROW EXECUTE FUNCTION guard_inventory_count_lifecycle();

-- Count-derived ledger entries may only reference a confirmed count of the
-- matching kind. This protects the ledger even if a future caller bypasses
-- the application service.
CREATE FUNCTION validate_count_inventory_movement() RETURNS trigger
LANGUAGE plpgsql
AS $validate_count_inventory_movement$
DECLARE
  referenced_count_type text;
  referenced_count_status text;
BEGIN
  IF NEW.count_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count_type, status
    INTO referenced_count_type, referenced_count_status
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

  IF NOT EXISTS (
    SELECT 1 FROM inventory_count_lines l
    WHERE l.organization_id = NEW.organization_id
      AND l.count_id = NEW.count_id
      AND l.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_REQUIRES_COUNT_LINE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_count_inventory_movement$;

CREATE TRIGGER warehouse_inventory_movements_validate_count
BEFORE INSERT ON warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION validate_count_inventory_movement();

-- The ledger is append-only; corrections are compensating movements.
CREATE FUNCTION prevent_warehouse_inventory_movement_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'INVENTORY_LEDGER_APPEND_ONLY' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER warehouse_inventory_movements_append_only
BEFORE UPDATE OR DELETE ON warehouse_inventory_movements
FOR EACH ROW EXECUTE FUNCTION prevent_warehouse_inventory_movement_mutation();

COMMENT ON TABLE inventory_balances IS
  'Transactional materialized balance by organization, warehouse and product. balance_version increments on stock/reservation changes; rows cannot be deleted; reconcile against warehouse_inventory_movements.';
COMMENT ON TABLE warehouse_inventory_movements IS
  'Append-only warehouse inventory ledger. Never update/delete; record compensating movements.';
COMMENT ON TABLE inventory_counts IS
  'Absolute physical counts. Opening count must be formally confirmed before a warehouse receives initial stock.';

COMMIT;
