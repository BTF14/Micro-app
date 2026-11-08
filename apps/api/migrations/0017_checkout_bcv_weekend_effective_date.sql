BEGIN;

DO $checkout_bcv_migration_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$checkout_bcv_migration_preflight$;

-- Select the nearest future BCV effective date on Caracas weekends. MIN is
-- intentionally computed without filtering validation_status: if that nearest
-- row is stale, the sale trigger rejects it rather than skipping to a later rate.
CREATE FUNCTION public.applicable_bcv_effective_date(p_now timestamptz)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $applicable_bcv_effective_date$
  WITH local_clock AS (
    SELECT p_now AT TIME ZONE 'America/Caracas' AS caracas_now
  )
  SELECT CASE
    WHEN EXTRACT(ISODOW FROM caracas_now) IN (6, 7) THEN (
      SELECT MIN(er.effective_date)
        FROM public.exchange_rates er
       WHERE er.source = 'BCV_OFFICIAL_HTML_V1'
         AND er.effective_date > caracas_now::date
    )
    ELSE caracas_now::date
  END
    FROM local_clock;
$applicable_bcv_effective_date$;

REVOKE ALL ON FUNCTION public.applicable_bcv_effective_date(timestamptz) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.assert_completed_sale_reconciled()
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

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF sale_row.status = 'draft' THEN
    RAISE EXCEPTION 'SALE_DRAFT_MUST_NOT_COMMIT' USING ERRCODE = '23514';
  END IF;
  IF sale_row.status <> 'completed' THEN
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
  IF EXISTS (
    SELECT 1
      FROM public.sale_items si
     WHERE si.organization_id = target_org
       AND si.sale_id = target_sale
       AND (
         si.line_total_usd <> pg_catalog.round(si.quantity * si.unit_price_usd, 4)
         OR si.line_total_ves <> pg_catalog.round(si.line_total_usd * sale_row.exchange_rate_snapshot, 2)
       )
  ) THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LINE_ARITHMETIC_INVALID' USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE currency <> sale_row.settlement_currency),
         COALESCE(sum(amount), 0),
         COALESCE(sum(usd_equivalent_snapshot), 0)
    INTO payment_count, wrong_currency_count, payment_amount, payment_usd
    FROM public.payments
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF payment_count = 0 OR wrong_currency_count <> 0
    OR payment_amount <> (CASE sale_row.settlement_currency
      WHEN 'USD' THEN sale_row.total_usd
      ELSE sale_row.total_ves_snapshot
    END)
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

  PERFORM 1
    FROM public.exchange_rates er
   WHERE er.id = sale_row.exchange_rate_id
     AND er.source = 'BCV_OFFICIAL_HTML_V1'
     AND er.validation_status = 'valid'
     AND er.rate = sale_row.exchange_rate_snapshot
     AND er.effective_date = public.applicable_bcv_effective_date(pg_catalog.now())
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.lock_open_register_shift(
        target_org, sale_row.branch_id, sale_row.created_by
      ) AS active_shift
     WHERE active_shift.shift_id = sale_row.register_shift_id
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_OWN_OPEN_SHIFT_AND_ACTIVE_WAREHOUSE' USING ERRCODE = '23514';
  END IF;

  PERFORM 1 FROM public.warehouses w
   WHERE w.organization_id = target_org
     AND w.branch_id = sale_row.branch_id
     AND w.id = sale_row.warehouse_id
     AND w.is_active = true
   FOR SHARE;
  IF NOT FOUND THEN
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

COMMIT;
