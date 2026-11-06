BEGIN;

DO $sales_checkout_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'SALES_CHECKOUT_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$sales_checkout_preflight$;

-- Additive checkout context. Existing historical rows remain untouched; the
-- NOT VALID completion check is enforced for every new/updated row.
ALTER TABLE public.sales
  ADD COLUMN branch_id uuid,
  ADD COLUMN register_shift_id uuid,
  ADD COLUMN warehouse_id uuid,
  ADD COLUMN settlement_currency char(3),
  ADD COLUMN request_hash text;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_settlement_currency_ck
    CHECK (settlement_currency IS NULL OR settlement_currency IN ('USD', 'VES')),
  ADD CONSTRAINT sales_request_hash_ck
    CHECK (request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT sales_completed_checkout_context_ck
    CHECK (
      status <> 'completed'
      OR (
        branch_id IS NOT NULL
        AND register_shift_id IS NOT NULL
        AND warehouse_id IS NOT NULL
        AND settlement_currency IN ('USD', 'VES')
        AND request_hash ~ '^[0-9a-f]{64}$'
      )
    ) NOT VALID;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_branch_scope_fk
    FOREIGN KEY (organization_id, branch_id)
    REFERENCES public.branches (organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_register_shift_scope_fk
    FOREIGN KEY (organization_id, branch_id, register_shift_id)
    REFERENCES public.register_shifts (organization_id, branch_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_warehouse_scope_fk
    FOREIGN KEY (organization_id, branch_id, warehouse_id)
    REFERENCES public.warehouses (organization_id, branch_id, id) ON DELETE RESTRICT;

CREATE INDEX sales_org_branch_created_idx
  ON public.sales (organization_id, branch_id, created_at DESC);
CREATE INDEX sales_org_shift_idx
  ON public.sales (organization_id, register_shift_id);

-- VES amounts are stored in a NUMERIC(14,4) column for USD compatibility,
-- but VES settlement is restricted to its approved two-decimal scale.
ALTER TABLE public.payments
  ADD CONSTRAINT payments_ves_amount_scale_ck
  CHECK (currency <> 'VES' OR amount = pg_catalog.round(amount, 2)) NOT VALID;

-- The runtime role cannot SELECT ... FOR SHARE directly on register_shifts:
-- PostgreSQL requires UPDATE privilege on a locked relation. This narrow
-- SECURITY DEFINER function preserves the lock without widening runtime grants.
CREATE FUNCTION public.lock_open_register_shift(
  p_organization_id uuid,
  p_branch_id uuid,
  p_user_id uuid
)
RETURNS TABLE (shift_id uuid, register_id uuid, opened_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_open_register_shift$
  SELECT s.id, s.register_id, s.opened_at
    FROM public.register_shifts s
    JOIN public.organizations o
      ON o.id = s.organization_id AND o.is_active = true
    JOIN public.branches b
      ON b.organization_id = s.organization_id
     AND b.id = s.branch_id AND b.is_active = true
    JOIN public.registers r
      ON r.organization_id = s.organization_id
     AND r.branch_id = s.branch_id
     AND r.id = s.register_id AND r.is_active = true
    JOIN public.app_users u
      ON u.id = s.cashier_user_id AND u.is_active = true
    JOIN public.organization_members m
      ON m.organization_id = s.organization_id
     AND m.user_id = s.cashier_user_id
     AND m.is_active = true
     AND m.role IN ('owner', 'admin', 'cashier')
    JOIN public.branch_memberships bm
      ON bm.organization_id = s.organization_id
     AND bm.branch_id = s.branch_id
     AND bm.user_id = s.cashier_user_id
     AND bm.is_active = true
   WHERE s.organization_id = p_organization_id
     AND s.branch_id = p_branch_id
     AND s.cashier_user_id = p_user_id
     AND s.closed_at IS NULL
   LIMIT 1
   FOR SHARE OF s;
$lock_open_register_shift$;

REVOKE ALL ON FUNCTION public.lock_open_register_shift(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_open_register_shift(uuid, uuid, uuid) TO microapp_runtime;

-- New sales must enter as drafts and may only transition once to completed.
-- All commercial snapshots and ownership fields are immutable during that
-- transition. Completed sales cannot be edited or deleted.
CREATE FUNCTION public.guard_sales_checkout_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_sales_checkout_lifecycle$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SALES_DELETE_FORBIDDEN' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'
      OR NEW.completed_at IS NOT NULL
      OR NEW.branch_id IS NULL
      OR NEW.register_shift_id IS NULL
      OR NEW.warehouse_id IS NULL
      OR NEW.settlement_currency IS NULL
      OR NEW.settlement_currency NOT IN ('USD', 'VES')
      OR NEW.request_hash IS NULL
      OR NEW.request_hash !~ '^[0-9a-f]{64}
      OR NEW.idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$'
    THEN
      RAISE EXCEPTION 'SALE_MUST_START_AS_VALID_DRAFT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status <> 'draft' OR NEW.status <> 'completed' OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'SALE_ONLY_ALLOWS_DRAFT_TO_COMPLETED_TRANSITION' USING ERRCODE = '23514';
  END IF;

  IF ROW(
    NEW.id, NEW.organization_id, NEW.sale_number, NEW.idempotency_key,
    NEW.subtotal_usd, NEW.total_usd, NEW.exchange_rate_id,
    NEW.exchange_rate_snapshot, NEW.total_ves_snapshot, NEW.created_by,
    NEW.created_at, NEW.branch_id, NEW.register_shift_id, NEW.warehouse_id,
    NEW.settlement_currency, NEW.request_hash
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.organization_id, OLD.sale_number, OLD.idempotency_key,
    OLD.subtotal_usd, OLD.total_usd, OLD.exchange_rate_id,
    OLD.exchange_rate_snapshot, OLD.total_ves_snapshot, OLD.created_by,
    OLD.created_at, OLD.branch_id, OLD.register_shift_id, OLD.warehouse_id,
    OLD.settlement_currency, OLD.request_hash
  ) THEN
    RAISE EXCEPTION 'SALE_SNAPSHOT_FIELDS_ARE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$guard_sales_checkout_lifecycle$;

CREATE TRIGGER sales_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.guard_sales_checkout_lifecycle();

-- Sale lines and payments are append-only while the parent sale is a draft.
-- Any correction after completion must be a future compensating workflow.
CREATE FUNCTION public.guard_sale_child_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_sale_child_lifecycle$
DECLARE
  parent_status text;
  parent_org uuid;
  parent_sale uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'COMPLETED_SALE_CHILDREN_ARE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME = 'sale_items' THEN
    parent_org := NEW.organization_id;
    parent_sale := NEW.sale_id;
  ELSE
    parent_org := NEW.organization_id;
    parent_sale := NEW.sale_id;
  END IF;

  SELECT s.status INTO parent_status
    FROM public.sales s
   WHERE s.organization_id = parent_org AND s.id = parent_sale
   FOR SHARE;

  IF NOT FOUND OR parent_status <> 'draft' THEN
    RAISE EXCEPTION 'SALE_CHILDREN_REQUIRE_DRAFT_PARENT' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$guard_sale_child_lifecycle$;

CREATE TRIGGER sale_items_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_child_lifecycle();
CREATE TRIGGER payments_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_child_lifecycle();

-- Deferred commit-time reconciliation: a completed sale is valid only when
-- its line snapshots, single-currency full payment, current BCV snapshot,
-- open owner shift, inventory ledger and audit event all agree.
CREATE FUNCTION public.assert_completed_sale_reconciled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_completed_sale_reconciled$
DECLARE
  target_org uuid;
  target_sale uuid;
  sale_row public.sales%ROWTYPE;
  line_count bigint;
  null_product_count bigint;
  line_usd numeric(14,4);
  line_ves numeric(16,2);
  payment_count bigint;
  wrong_currency_count bigint;
  payment_amount numeric(14,4);
  payment_usd numeric(14,4);
  movement_count bigint;
BEGIN
  target_org := NEW.organization_id;
  IF TG_TABLE_NAME = 'sales' THEN
    target_sale := NEW.id;
  ELSE
    target_sale := NEW.sale_id;
  END IF;

  SELECT * INTO sale_row
    FROM public.sales
   WHERE organization_id = target_org AND id = target_sale;

  IF NOT FOUND OR sale_row.status <> 'completed' THEN
    RETURN NULL;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE product_id IS NULL),
         COALESCE(sum(line_total_usd), 0),
         COALESCE(sum(line_total_ves), 0)
    INTO line_count, null_product_count, line_usd, line_ves
    FROM public.sale_items
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF line_count = 0 OR null_product_count <> 0
    OR line_usd <> sale_row.subtotal_usd
    OR sale_row.total_usd <> sale_row.subtotal_usd
    OR line_ves <> sale_row.total_ves_snapshot
  THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LINES_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE currency <> sale_row.settlement_currency),
         COALESCE(sum(amount), 0),
         COALESCE(sum(usd_equivalent_snapshot), 0)
    INTO payment_count, wrong_currency_count, payment_amount, payment_usd
    FROM public.payments
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF payment_count = 0 OR wrong_currency_count <> 0
    OR payment_amount <> CASE sale_row.settlement_currency
      WHEN 'USD' THEN sale_row.total_usd
      ELSE sale_row.total_ves_snapshot
    END
    OR payment_usd <> sale_row.total_usd
  THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENTS_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.organization_id = target_org AND p.sale_id = target_sale
       AND (
         p.received_by <> sale_row.created_by
         OR (p.currency = 'USD' AND p.usd_equivalent_snapshot <> p.amount)
         OR (p.currency = 'VES' AND p.exchange_rate_snapshot IS DISTINCT FROM sale_row.exchange_rate_snapshot)
       )
  ) THEN
    RAISE EXCEPTION 'SALE_PAYMENT_SNAPSHOT_OR_ACTOR_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.exchange_rates er
     WHERE er.id = sale_row.exchange_rate_id
       AND er.validation_status = 'valid'
       AND er.rate = sale_row.exchange_rate_snapshot
       AND er.effective_date = (pg_catalog.now() AT TIME ZONE 'America/Caracas')::date
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.register_shifts rs
      JOIN public.warehouses w
        ON w.organization_id = rs.organization_id
       AND w.branch_id = rs.branch_id
       AND w.id = sale_row.warehouse_id
       AND w.is_active = true
      JOIN public.branches b
        ON b.organization_id = rs.organization_id
       AND b.id = rs.branch_id
       AND b.is_active = true
     WHERE rs.organization_id = target_org
       AND rs.branch_id = sale_row.branch_id
       AND rs.id = sale_row.register_shift_id
       AND rs.cashier_user_id = sale_row.created_by
       AND rs.closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_OWN_OPEN_SHIFT_AND_ACTIVE_WAREHOUSE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.sale_items si
     WHERE si.organization_id = target_org AND si.sale_id = target_sale
       AND NOT EXISTS (
         SELECT 1
           FROM public.warehouse_inventory_movements m
          WHERE m.organization_id = target_org
            AND m.branch_id = sale_row.branch_id
            AND m.warehouse_id = sale_row.warehouse_id
            AND m.product_id = si.product_id
            AND m.movement_type = 'sale'
            AND m.reference_type = 'sale'
            AND m.reference_id = target_sale
            AND m.quantity_delta = -si.quantity
            AND m.actor_user_id = sale_row.created_by
       )
  ) THEN
    RAISE EXCEPTION 'COMPLETED_SALE_MISSING_INVENTORY_LEDGER_MOVEMENT' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO movement_count
    FROM public.warehouse_inventory_movements
   WHERE organization_id = target_org
     AND branch_id = sale_row.branch_id
     AND warehouse_id = sale_row.warehouse_id
     AND movement_type = 'sale'
     AND reference_type = 'sale'
     AND reference_id = target_sale;

  IF movement_count <> line_count THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LEDGER_MOVEMENT_COUNT_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs a
     WHERE a.organization_id = target_org
       AND a.actor_user_id = sale_row.created_by
       AND a.action = 'sale.completed'
       AND a.entity_type = 'sale'
       AND a.entity_id = target_sale::text
  ) THEN
    RAISE EXCEPTION 'COMPLETED_SALE_AUDIT_EVENT_REQUIRED' USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$assert_completed_sale_reconciled$;

REVOKE ALL ON FUNCTION public.assert_completed_sale_reconciled() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER sales_completed_reconciliation
AFTER INSERT OR UPDATE ON public.sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();
CREATE CONSTRAINT TRIGGER sale_items_completed_reconciliation
AFTER INSERT ON public.sale_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();
CREATE CONSTRAINT TRIGGER payments_completed_reconciliation
AFTER INSERT ON public.payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();

-- Runtime writes are restricted to creating draft documents/children and the
-- single finalization transition. The backend still derives every value.
GRANT SELECT, INSERT ON TABLE public.sales, public.sale_items, public.payments TO microapp_runtime;
GRANT UPDATE (status, completed_at) ON TABLE public.sales TO microapp_runtime;

COMMIT;

      OR NEW.idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$'
    THEN
      RAISE EXCEPTION 'SALE_MUST_START_AS_VALID_DRAFT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status <> 'draft' OR NEW.status <> 'completed' OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'SALE_ONLY_ALLOWS_DRAFT_TO_COMPLETED_TRANSITION' USING ERRCODE = '23514';
  END IF;

  IF ROW(
    NEW.id, NEW.organization_id, NEW.sale_number, NEW.idempotency_key,
    NEW.subtotal_usd, NEW.total_usd, NEW.exchange_rate_id,
    NEW.exchange_rate_snapshot, NEW.total_ves_snapshot, NEW.created_by,
    NEW.created_at, NEW.branch_id, NEW.register_shift_id, NEW.warehouse_id,
    NEW.settlement_currency, NEW.request_hash
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.organization_id, OLD.sale_number, OLD.idempotency_key,
    OLD.subtotal_usd, OLD.total_usd, OLD.exchange_rate_id,
    OLD.exchange_rate_snapshot, OLD.total_ves_snapshot, OLD.created_by,
    OLD.created_at, OLD.branch_id, OLD.register_shift_id, OLD.warehouse_id,
    OLD.settlement_currency, OLD.request_hash
  ) THEN
    RAISE EXCEPTION 'SALE_SNAPSHOT_FIELDS_ARE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$guard_sales_checkout_lifecycle$;

CREATE TRIGGER sales_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.guard_sales_checkout_lifecycle();

-- Sale lines and payments are append-only while the parent sale is a draft.
-- Any correction after completion must be a future compensating workflow.
CREATE FUNCTION public.guard_sale_child_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_sale_child_lifecycle$
DECLARE
  parent_status text;
  parent_org uuid;
  parent_sale uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'COMPLETED_SALE_CHILDREN_ARE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME = 'sale_items' THEN
    parent_org := NEW.organization_id;
    parent_sale := NEW.sale_id;
  ELSE
    parent_org := NEW.organization_id;
    parent_sale := NEW.sale_id;
  END IF;

  SELECT s.status INTO parent_status
    FROM public.sales s
   WHERE s.organization_id = parent_org AND s.id = parent_sale
   FOR SHARE;

  IF NOT FOUND OR parent_status <> 'draft' THEN
    RAISE EXCEPTION 'SALE_CHILDREN_REQUIRE_DRAFT_PARENT' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$guard_sale_child_lifecycle$;

CREATE TRIGGER sale_items_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_child_lifecycle();
CREATE TRIGGER payments_checkout_lifecycle_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_child_lifecycle();

-- Deferred commit-time reconciliation: a completed sale is valid only when
-- its line snapshots, single-currency full payment, current BCV snapshot,
-- open owner shift, inventory ledger and audit event all agree.
CREATE FUNCTION public.assert_completed_sale_reconciled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_completed_sale_reconciled$
DECLARE
  target_org uuid;
  target_sale uuid;
  sale_row public.sales%ROWTYPE;
  line_count bigint;
  null_product_count bigint;
  line_usd numeric(14,4);
  line_ves numeric(16,2);
  payment_count bigint;
  wrong_currency_count bigint;
  payment_amount numeric(14,4);
  payment_usd numeric(14,4);
  movement_count bigint;
BEGIN
  target_org := NEW.organization_id;
  IF TG_TABLE_NAME = 'sales' THEN
    target_sale := NEW.id;
  ELSE
    target_sale := NEW.sale_id;
  END IF;

  SELECT * INTO sale_row
    FROM public.sales
   WHERE organization_id = target_org AND id = target_sale;

  IF NOT FOUND OR sale_row.status <> 'completed' THEN
    RETURN NULL;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE product_id IS NULL),
         COALESCE(sum(line_total_usd), 0),
         COALESCE(sum(line_total_ves), 0)
    INTO line_count, null_product_count, line_usd, line_ves
    FROM public.sale_items
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF line_count = 0 OR null_product_count <> 0
    OR line_usd <> sale_row.subtotal_usd
    OR sale_row.total_usd <> sale_row.subtotal_usd
    OR line_ves <> sale_row.total_ves_snapshot
  THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LINES_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE currency <> sale_row.settlement_currency),
         COALESCE(sum(amount), 0),
         COALESCE(sum(usd_equivalent_snapshot), 0)
    INTO payment_count, wrong_currency_count, payment_amount, payment_usd
    FROM public.payments
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF payment_count = 0 OR wrong_currency_count <> 0
    OR payment_amount <> CASE sale_row.settlement_currency
      WHEN 'USD' THEN sale_row.total_usd
      ELSE sale_row.total_ves_snapshot
    END
    OR payment_usd <> sale_row.total_usd
  THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENTS_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.organization_id = target_org AND p.sale_id = target_sale
       AND (
         p.received_by <> sale_row.created_by
         OR (p.currency = 'USD' AND p.usd_equivalent_snapshot <> p.amount)
         OR (p.currency = 'VES' AND p.exchange_rate_snapshot IS DISTINCT FROM sale_row.exchange_rate_snapshot)
       )
  ) THEN
    RAISE EXCEPTION 'SALE_PAYMENT_SNAPSHOT_OR_ACTOR_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.exchange_rates er
     WHERE er.id = sale_row.exchange_rate_id
       AND er.validation_status = 'valid'
       AND er.rate = sale_row.exchange_rate_snapshot
       AND er.effective_date = (pg_catalog.now() AT TIME ZONE 'America/Caracas')::date
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.register_shifts rs
      JOIN public.warehouses w
        ON w.organization_id = rs.organization_id
       AND w.branch_id = rs.branch_id
       AND w.id = sale_row.warehouse_id
       AND w.is_active = true
      JOIN public.branches b
        ON b.organization_id = rs.organization_id
       AND b.id = rs.branch_id
       AND b.is_active = true
     WHERE rs.organization_id = target_org
       AND rs.branch_id = sale_row.branch_id
       AND rs.id = sale_row.register_shift_id
       AND rs.cashier_user_id = sale_row.created_by
       AND rs.closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_OWN_OPEN_SHIFT_AND_ACTIVE_WAREHOUSE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.sale_items si
     WHERE si.organization_id = target_org AND si.sale_id = target_sale
       AND NOT EXISTS (
         SELECT 1
           FROM public.warehouse_inventory_movements m
          WHERE m.organization_id = target_org
            AND m.branch_id = sale_row.branch_id
            AND m.warehouse_id = sale_row.warehouse_id
            AND m.product_id = si.product_id
            AND m.movement_type = 'sale'
            AND m.reference_type = 'sale'
            AND m.reference_id = target_sale
            AND m.quantity_delta = -si.quantity
            AND m.actor_user_id = sale_row.created_by
       )
  ) THEN
    RAISE EXCEPTION 'COMPLETED_SALE_MISSING_INVENTORY_LEDGER_MOVEMENT' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO movement_count
    FROM public.warehouse_inventory_movements
   WHERE organization_id = target_org
     AND branch_id = sale_row.branch_id
     AND warehouse_id = sale_row.warehouse_id
     AND movement_type = 'sale'
     AND reference_type = 'sale'
     AND reference_id = target_sale;

  IF movement_count <> line_count THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LEDGER_MOVEMENT_COUNT_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs a
     WHERE a.organization_id = target_org
       AND a.actor_user_id = sale_row.created_by
       AND a.action = 'sale.completed'
       AND a.entity_type = 'sale'
       AND a.entity_id = target_sale::text
  ) THEN
    RAISE EXCEPTION 'COMPLETED_SALE_AUDIT_EVENT_REQUIRED' USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$assert_completed_sale_reconciled$;

REVOKE ALL ON FUNCTION public.assert_completed_sale_reconciled() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER sales_completed_reconciliation
AFTER INSERT OR UPDATE ON public.sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();
CREATE CONSTRAINT TRIGGER sale_items_completed_reconciliation
AFTER INSERT ON public.sale_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();
CREATE CONSTRAINT TRIGGER payments_completed_reconciliation
AFTER INSERT ON public.payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_reconciled();

-- Runtime writes are restricted to creating draft documents/children and the
-- single finalization transition. The backend still derives every value.
GRANT SELECT, INSERT ON TABLE public.sales, public.sale_items, public.payments TO microapp_runtime;
GRANT UPDATE (status, completed_at) ON TABLE public.sales TO microapp_runtime;

COMMIT;
