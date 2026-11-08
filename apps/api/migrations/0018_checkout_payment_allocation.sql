BEGIN;
DO $checkout_payment_allocation_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'CHECKOUT_PAYMENT_ALLOCATION_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$checkout_payment_allocation_preflight$;

ALTER TABLE public.payments
  ADD COLUMN allocation_position smallint,
  ADD CONSTRAINT payments_allocation_position_ck
    CHECK (allocation_position IS NULL OR allocation_position BETWEEN 1 AND 10);

CREATE UNIQUE INDEX payments_checkout_allocation_position_uidx
  ON public.payments (organization_id, sale_id, allocation_position)
  WHERE allocation_position IS NOT NULL;

CREATE FUNCTION public.assert_completed_sale_payment_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_completed_sale_payment_allocation$
DECLARE
  target_org uuid;
  target_sale uuid;
  sale_row public.sales%ROWTYPE;
  payment_count bigint;
  positioned_count bigint;
  min_position smallint;
  max_position smallint;
  allocation_mismatch boolean;
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

  IF NOT FOUND OR sale_row.status <> 'completed' OR sale_row.branch_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*), count(allocation_position),
         min(allocation_position), max(allocation_position)
    INTO payment_count, positioned_count, min_position, max_position
    FROM public.payments
   WHERE organization_id = target_org AND sale_id = target_sale;

  IF payment_count = 0 OR positioned_count <> payment_count
    OR min_position <> 1 OR max_position <> payment_count
  THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENT_ALLOCATION_POSITIONS_INVALID' USING ERRCODE = '23514';
  END IF;

  IF sale_row.total_usd IS NULL OR sale_row.total_usd <= 0
    OR sale_row.total_ves_snapshot IS NULL OR sale_row.total_ves_snapshot <= 0 THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENT_ALLOCATION_TOTAL_INVALID' USING ERRCODE = '23514';
  END IF;

  WITH ordered_payments AS (
    SELECT p.allocation_position,
           p.currency,
           p.amount,
           p.usd_equivalent_snapshot,
           row_number() OVER (ORDER BY p.allocation_position) AS ordinal,
           count(*) OVER () AS payment_count,
           COALESCE(
             sum(
               CASE
                 WHEN p.currency = 'USD' THEN p.amount
                 ELSE pg_catalog.trunc(
                   p.amount * sale_row.total_usd / sale_row.total_ves_snapshot,
                   4
                 )
               END
             ) OVER (
               ORDER BY p.allocation_position
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
             ),
             0
           ) AS prior_expected_usd
      FROM public.payments p
     WHERE p.organization_id = target_org AND p.sale_id = target_sale
  )
  SELECT EXISTS (
    SELECT 1
      FROM ordered_payments p
     WHERE p.allocation_position <> p.ordinal
        OR p.usd_equivalent_snapshot <> CASE
             WHEN p.currency = 'USD' THEN p.amount
             WHEN p.ordinal = p.payment_count THEN sale_row.total_usd - p.prior_expected_usd
             ELSE pg_catalog.trunc(
               p.amount * sale_row.total_usd / sale_row.total_ves_snapshot,
               4
             )
           END
  )
    INTO allocation_mismatch;

  IF allocation_mismatch THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENT_USD_ALLOCATION_INVALID' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$assert_completed_sale_payment_allocation$;

REVOKE ALL ON FUNCTION public.assert_completed_sale_payment_allocation() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER sales_payment_allocation_reconciled
AFTER INSERT OR UPDATE ON public.sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_payment_allocation();

CREATE CONSTRAINT TRIGGER payments_payment_allocation_reconciled
AFTER INSERT OR UPDATE ON public.payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_completed_sale_payment_allocation();

COMMIT;
