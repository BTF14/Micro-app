-- BCV 0027: official prepublished effective dates for weekends and banking holidays.
-- Strictly additive after 0026. Historical sales remain NULL; new completed
-- sales capture operation_date and the BCV-published effective date separately.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.sales
  ADD COLUMN operation_date date,
  ADD COLUMN exchange_rate_effective_date date;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_completed_0027_date_snapshot_ck
  CHECK (
    status <> 'completed'
    OR (
      operation_date IS NOT NULL
      AND (
        (fx_source = 'bcv_official' AND exchange_rate_effective_date IS NOT NULL)
        OR (fx_source = 'manual_contingency' AND exchange_rate_effective_date IS NULL)
      )
    )
  ) NOT VALID;

CREATE FUNCTION public.select_bcv_rate_for_operation(p_operation_date date)
RETURNS TABLE(exchange_rate_id uuid, rate numeric, effective_date date, priority text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $select_bcv_rate_for_operation$
DECLARE
  sync_success_at timestamptz;
  sync_outcome text;
  sync_effective_date date;
  sync_error_code text;
  selected_id uuid;
  selected_rate numeric;
  selected_date date;
  selected_priority text;
  candidate_count bigint;
BEGIN
  IF p_operation_date IS NULL THEN RETURN; END IF;

  SELECT last_success_at,last_outcome,last_effective_date,last_error_code
    INTO sync_success_at,sync_outcome,sync_effective_date,sync_error_code
    FROM public.bcv_sync_state
   WHERE singleton = true
   FOR SHARE;
  IF NOT FOUND OR sync_success_at IS NULL OR sync_outcome IS NULL
    OR sync_outcome NOT IN ('inserted','unchanged')
    OR sync_error_code IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO candidate_count FROM public.exchange_rates er
   WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0 AND er.effective_date=p_operation_date;
  IF candidate_count > 1 THEN RETURN; END IF;
  SELECT er.id,er.rate,er.effective_date
    INTO selected_id,selected_rate,selected_date
    FROM public.exchange_rates er
   WHERE er.source='BCV_OFFICIAL_HTML_V1'
     AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
     AND er.effective_date=p_operation_date
   ORDER BY er.fetched_at DESC
   LIMIT 1;
  IF FOUND THEN
    selected_priority := 'today_exact';
  ELSE
    SELECT min(er.effective_date) INTO selected_date
      FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
       AND er.effective_date > p_operation_date AND er.effective_date <= p_operation_date + 5;
    IF selected_date IS NULL THEN RETURN; END IF;
    SELECT count(*) INTO candidate_count FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0 AND er.effective_date=selected_date;
    IF candidate_count <> 1 THEN RETURN; END IF;
    SELECT er.id,er.rate,er.effective_date INTO selected_id,selected_rate,selected_date
      FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0 AND er.effective_date=selected_date;

    IF EXTRACT(ISODOW FROM p_operation_date) IN (6,7) THEN
      selected_priority := 'weekend_prepublished';
    ELSE
      IF sync_success_at < (p_operation_date::timestamp AT TIME ZONE 'America/Caracas') THEN
        RETURN;
      END IF;
      selected_priority := 'weekday_same_day_sync';
    END IF;
  END IF;

  IF sync_effective_date IS NULL OR sync_effective_date < selected_date THEN
    RETURN;
  END IF;

  -- The append-only 0026 observation must certify this exact successful sync
  -- snapshot and cover the selected effective date; state alone is insufficient.
  IF NOT EXISTS (
    SELECT 1 FROM public.bcv_sync_success_observations obs
     WHERE obs.last_success_at = sync_success_at
       AND obs.last_outcome = sync_outcome
       AND obs.last_error_code IS NULL
       AND obs.last_effective_date = sync_effective_date
       AND obs.last_effective_date >= selected_date
       AND obs.validation_status = 'valid'
       AND obs.exchange_rate_id IS NOT NULL
       AND obs.rate_snapshot > 0
       AND obs.observed_at >= obs.last_success_at
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT selected_id,selected_rate,selected_date,selected_priority;
END;
$select_bcv_rate_for_operation$;
ALTER FUNCTION public.select_bcv_rate_for_operation(date) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.select_bcv_rate_for_operation(date) FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE FUNCTION public.capture_sales_bcv_0027_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $capture_sales_bcv_0027_snapshot$
DECLARE
  operation_at timestamptz;
  operation_day date;
  selected record;
  authorization_row public.fx_contingency_authorizations%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' OR (TG_OP='UPDATE' AND OLD.status='completed') THEN
    RETURN NEW;
  END IF;

  -- Global lock order remains BCV singleton -> branch FX authorization.
  PERFORM 1 FROM public.bcv_sync_state WHERE singleton=true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BCV_SYNC_STATE_ROW_MISSING' USING ERRCODE='23514'; END IF;

  IF NEW.fx_source='manual_contingency' THEN
    SELECT * INTO authorization_row
      FROM public.fx_contingency_authorizations
     WHERE organization_id=NEW.organization_id
       AND branch_id=NEW.branch_id
       AND id=NEW.fx_authorization_id
     FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'MANUAL_FX_AUTHORIZATION_NOT_ACTIVE' USING ERRCODE='23514'; END IF;
    operation_at := pg_catalog.clock_timestamp();
    operation_day := (operation_at AT TIME ZONE 'America/Caracas')::date;
    NEW.operation_date := operation_day;
    NEW.exchange_rate_effective_date := NULL;
    RETURN NEW;
  END IF;

  IF NEW.fx_source <> 'bcv_official' THEN
    RAISE EXCEPTION 'SALE_FX_SOURCE_INVALID' USING ERRCODE='23514';
  END IF;

  -- Capture exactly once, after the sync lock. The same frozen day is used by
  -- the application-independent selection helper and the deferred guard.
  operation_at := pg_catalog.clock_timestamp();
  operation_day := (operation_at AT TIME ZONE 'America/Caracas')::date;
  SELECT * INTO selected FROM public.select_bcv_rate_for_operation(operation_day);
  IF NOT FOUND OR NEW.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
    OR NEW.exchange_rate_snapshot IS DISTINCT FROM selected.rate THEN
    RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE='23514';
  END IF;
  NEW.operation_date := operation_day;
  NEW.exchange_rate_effective_date := selected.effective_date;
  RETURN NEW;
END;
$capture_sales_bcv_0027_snapshot$;
ALTER FUNCTION public.capture_sales_bcv_0027_snapshot() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.capture_sales_bcv_0027_snapshot() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE FUNCTION public.guard_sales_bcv_0027_snapshot_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $guard_sales_bcv_0027_snapshot_immutable$
BEGIN
  IF OLD.status='completed' AND (
    NEW.operation_date IS DISTINCT FROM OLD.operation_date
    OR NEW.exchange_rate_effective_date IS DISTINCT FROM OLD.exchange_rate_effective_date
  ) THEN
    RAISE EXCEPTION 'SALE_BCV_DATE_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$guard_sales_bcv_0027_snapshot_immutable$;
ALTER FUNCTION public.guard_sales_bcv_0027_snapshot_immutable() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.guard_sales_bcv_0027_snapshot_immutable() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE FUNCTION public.assert_sales_bcv_0027_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_sales_bcv_0027_snapshot$
DECLARE
  sale_row public.sales%ROWTYPE;
  selected record;
BEGIN
  SELECT * INTO sale_row FROM public.sales WHERE id=NEW.id AND organization_id=NEW.organization_id;
  IF NOT FOUND OR sale_row.status <> 'completed' THEN RETURN NULL; END IF;
  IF sale_row.operation_date IS NULL THEN
    RAISE EXCEPTION 'SALE_OPERATION_DATE_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF sale_row.fx_source='manual_contingency' THEN
    IF sale_row.exchange_rate_effective_date IS NOT NULL THEN
      RAISE EXCEPTION 'MANUAL_FX_MUST_NOT_HAVE_OFFICIAL_EFFECTIVE_DATE' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
  END IF;
  SELECT * INTO selected FROM public.select_bcv_rate_for_operation(sale_row.operation_date);
  IF NOT FOUND
    OR sale_row.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
    OR sale_row.exchange_rate_snapshot IS DISTINCT FROM selected.rate
    OR sale_row.exchange_rate_effective_date IS DISTINCT FROM selected.effective_date THEN
    RAISE EXCEPTION 'SALE_BCV_DATE_SNAPSHOT_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$assert_sales_bcv_0027_snapshot$;
ALTER FUNCTION public.assert_sales_bcv_0027_snapshot() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_sales_bcv_0027_snapshot() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE TRIGGER sales_00_capture_bcv_0027_snapshot
BEFORE UPDATE OF status ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.capture_sales_bcv_0027_snapshot();
CREATE TRIGGER sales_01_guard_bcv_0027_snapshot_immutable
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.guard_sales_bcv_0027_snapshot_immutable();
ALTER TABLE public.sales ENABLE ALWAYS TRIGGER sales_00_capture_bcv_0027_snapshot;
ALTER TABLE public.sales ENABLE ALWAYS TRIGGER sales_01_guard_bcv_0027_snapshot_immutable;

CREATE CONSTRAINT TRIGGER sales_99_assert_bcv_0027_snapshot
AFTER INSERT OR UPDATE ON public.sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.status='completed')
EXECUTE FUNCTION public.assert_sales_bcv_0027_snapshot();
ALTER TABLE public.sales ENABLE ALWAYS TRIGGER sales_99_assert_bcv_0027_snapshot;

-- Keep the pre-existing 0026 guard trigger attached; only evolve its policy.
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
  auth_row public.fx_contingency_authorizations%ROWTYPE;
  operation_time timestamptz;
  operation_date date;
  selected_rate record;
BEGIN
  target_org := NEW.organization_id;
  IF TG_TABLE_NAME = 'sales' THEN target_sale := NEW.id;
  ELSE target_sale := NEW.sale_id; END IF;

  SELECT * INTO sale_row FROM public.sales
   WHERE organization_id = target_org AND id = target_sale;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF sale_row.status = 'draft' THEN
    RAISE EXCEPTION 'SALE_DRAFT_MUST_NOT_COMMIT' USING ERRCODE = '23514';
  END IF;
  IF sale_row.status <> 'completed' THEN RETURN NULL; END IF;

  SELECT count(*), count(*) FILTER (WHERE product_id IS NULL),
         COALESCE(sum(line_total_usd), 0), COALESCE(sum(line_total_ves), 0)
    INTO line_count, null_product_count, line_usd, line_ves
    FROM public.sale_items WHERE organization_id = target_org AND sale_id = target_sale;
  IF line_count = 0 OR null_product_count <> 0 OR line_usd <> sale_row.subtotal_usd
    OR sale_row.total_usd <> sale_row.subtotal_usd OR line_ves <> sale_row.total_ves_snapshot THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LINES_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE currency <> sale_row.settlement_currency),
         COALESCE(sum(amount), 0), COALESCE(sum(usd_equivalent_snapshot), 0)
    INTO payment_count, wrong_currency_count, payment_amount, payment_usd
    FROM public.payments WHERE organization_id = target_org AND sale_id = target_sale;
  IF payment_count = 0 OR wrong_currency_count <> 0
    OR payment_amount <> (CASE sale_row.settlement_currency WHEN 'USD' THEN sale_row.total_usd ELSE sale_row.total_ves_snapshot END)
    OR payment_usd <> sale_row.total_usd THEN
    RAISE EXCEPTION 'COMPLETED_SALE_PAYMENTS_DO_NOT_RECONCILE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.organization_id = target_org AND p.sale_id = target_sale
       AND (p.received_by <> sale_row.created_by
         OR (p.currency = 'USD' AND p.usd_equivalent_snapshot <> p.amount)
         OR (p.currency = 'VES' AND p.exchange_rate_snapshot IS DISTINCT FROM sale_row.exchange_rate_snapshot))
  ) THEN
    RAISE EXCEPTION 'SALE_PAYMENT_SNAPSHOT_OR_ACTOR_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF sale_row.fx_source = 'bcv_official' THEN
    PERFORM 1 FROM public.bcv_sync_state WHERE singleton = true FOR SHARE;
    IF sale_row.fx_authorization_id IS NOT NULL
      OR sale_row.manual_fx_acknowledged_at IS NOT NULL
      OR sale_row.manual_fx_acknowledged_by_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'BCV_SALE_MUST_NOT_HAVE_MANUAL_FX_ACK' USING ERRCODE = '23514';
    END IF;
    operation_date := sale_row.operation_date;
    SELECT * INTO selected_rate
      FROM public.select_bcv_rate_for_operation(operation_date);
    IF operation_date IS NULL OR NOT FOUND
      OR sale_row.exchange_rate_id IS DISTINCT FROM selected_rate.exchange_rate_id
      OR sale_row.exchange_rate_effective_date IS DISTINCT FROM selected_rate.effective_date
      OR sale_row.exchange_rate_snapshot IS DISTINCT FROM selected_rate.rate THEN
      RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
    END IF;
  ELSIF sale_row.fx_source = 'manual_contingency' THEN
    PERFORM 1 FROM public.bcv_sync_state WHERE singleton = true FOR SHARE;
    IF sale_row.exchange_rate_id IS NOT NULL
      OR sale_row.fx_authorization_id IS NULL
      OR sale_row.manual_fx_acknowledged_at IS NULL
      OR sale_row.manual_fx_acknowledged_by_user_id IS DISTINCT FROM sale_row.created_by THEN
      RAISE EXCEPTION 'MANUAL_FX_SALE_ACK_OR_SOURCE_INVALID' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO auth_row
      FROM public.fx_contingency_authorizations auth
     WHERE auth.organization_id = sale_row.organization_id
       AND auth.branch_id = sale_row.branch_id
       AND auth.id = sale_row.fx_authorization_id
     FOR SHARE;
    operation_time := pg_catalog.clock_timestamp();
    operation_date := sale_row.operation_date;
    IF NOT FOUND OR auth_row.status <> 'active'
      OR auth_row.starts_at > operation_time OR auth_row.expires_at <= operation_time
      OR auth_row.rate IS DISTINCT FROM sale_row.exchange_rate_snapshot
      OR sale_row.manual_fx_acknowledged_at < auth_row.starts_at
      OR sale_row.manual_fx_acknowledged_at > operation_time THEN
      RAISE EXCEPTION 'MANUAL_FX_AUTHORIZATION_NOT_ACTIVE' USING ERRCODE = '23514';
    END IF;

    -- A recovery is proven by the durable observation time, not by
    -- last_success_at (which the producer may set with transaction-start NOW()).
    IF EXISTS (
      SELECT 1 FROM public.bcv_sync_success_observations obs
       WHERE obs.observed_at > auth_row.starts_at
         AND obs.last_outcome IN ('inserted', 'unchanged')
         AND obs.last_error_code IS NULL
         AND obs.validation_status = 'valid'
         AND obs.exchange_rate_id = (
           SELECT selected.exchange_rate_id
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND obs.last_effective_date = (
           SELECT selected.effective_date
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND obs.rate_snapshot = (
           SELECT selected.rate
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND (
           (obs.last_outcome = 'inserted' AND obs.rate_fetched_at > auth_row.starts_at)
           OR obs.last_outcome = 'unchanged'
         )
    ) THEN
      RAISE EXCEPTION 'MANUAL_FX_CONTINGENCY_BCV_RESTORED' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'SALE_FX_SOURCE_INVALID' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lock_open_register_shift(target_org, sale_row.branch_id, sale_row.created_by) active_shift
     WHERE active_shift.shift_id = sale_row.register_shift_id
  ) THEN
    RAISE EXCEPTION 'SALE_REQUIRES_OWN_OPEN_SHIFT_AND_ACTIVE_WAREHOUSE' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM public.warehouses w
   WHERE w.organization_id = target_org AND w.branch_id = sale_row.branch_id
     AND w.id = sale_row.warehouse_id AND w.is_active = true FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_REQUIRES_OWN_OPEN_SHIFT_AND_ACTIVE_WAREHOUSE' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sale_items si
     WHERE si.organization_id = target_org AND si.sale_id = target_sale
       AND NOT EXISTS (
         SELECT 1 FROM public.warehouse_inventory_movements m
          WHERE m.organization_id = target_org AND m.branch_id = sale_row.branch_id
            AND m.warehouse_id = sale_row.warehouse_id AND m.product_id = si.product_id
            AND m.movement_type = 'sale' AND m.reference_type = 'sale'
            AND m.reference_id = target_sale AND m.quantity_delta = -si.quantity
            AND m.actor_user_id = sale_row.created_by
       )
  ) THEN RAISE EXCEPTION 'COMPLETED_SALE_MISSING_INVENTORY_LEDGER_MOVEMENT' USING ERRCODE = '23514'; END IF;

  SELECT count(*) INTO movement_count FROM public.warehouse_inventory_movements
   WHERE organization_id = target_org AND branch_id = sale_row.branch_id
     AND warehouse_id = sale_row.warehouse_id AND movement_type = 'sale'
     AND reference_type = 'sale' AND reference_id = target_sale;
  IF movement_count <> line_count THEN
    RAISE EXCEPTION 'COMPLETED_SALE_LEDGER_MOVEMENT_COUNT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs a WHERE a.organization_id = target_org
      AND a.actor_user_id = sale_row.created_by AND a.action = 'sale.completed'
      AND a.entity_type = 'sale' AND a.entity_id = target_sale::text
  ) THEN RAISE EXCEPTION 'COMPLETED_SALE_AUDIT_EVENT_REQUIRED' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$assert_completed_sale_reconciled$;
ALTER FUNCTION public.assert_completed_sale_reconciled() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_completed_sale_reconciled() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE OR REPLACE FUNCTION public.assert_sale_latest_bcv_sync_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_sale_latest_bcv_sync_success$
DECLARE selected record;
BEGIN
  IF NEW.status <> 'completed'
    OR (TG_OP='UPDATE' AND OLD.status='completed')
    OR NEW.fx_source <> 'bcv_official' THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM public.bcv_sync_state WHERE singleton=true FOR SHARE;
  -- The shared lock serializes last_success_at, last_outcome, last_effective_date and last_error_code with producer updates.
  -- operation_date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date is captured by the BEFORE trigger after this FOR SHARE lock.
  SELECT * INTO selected FROM public.select_bcv_rate_for_operation(NEW.operation_date);
  IF NEW.operation_date IS NULL OR NOT FOUND
    OR NEW.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
    OR NEW.exchange_rate_effective_date IS DISTINCT FROM selected.effective_date
    OR NEW.exchange_rate_snapshot IS DISTINCT FROM selected.rate THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$assert_sale_latest_bcv_sync_success$;
ALTER FUNCTION public.assert_sale_latest_bcv_sync_success() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

-- 0026's system transition remains BCV -> FX and requires a durable observation.
CREATE OR REPLACE FUNCTION public.transition_fx_contingency_authorization(
  p_organization_id uuid, p_branch_id uuid, p_authorization_id uuid,
  p_new_status text, p_actor_user_id uuid, p_actor_role text, p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $transition_fx_contingency_authorization$
DECLARE
  auth_row public.fx_contingency_authorizations%ROWTYPE;
  event_kind text;
  operation_date date;
BEGIN
  IF p_new_status NOT IN ('revoked', 'expired', 'bcv_restored')
     OR p_actor_role NOT IN ('owner', 'admin')
     OR p_reason IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_TRANSITION_INVALID' USING ERRCODE = '23514';
  END IF;
  -- User-initiated revocation locks actor and delegated branch scope before
  -- taking the FX authorization row lock. System transitions use BCV -> FX.
  IF p_new_status = 'revoked' THEN
    PERFORM 1
      FROM public.organizations org
      JOIN public.organization_members member
        ON member.organization_id = org.id AND member.user_id = p_actor_user_id
      JOIN public.app_users actor ON actor.id = member.user_id
     WHERE org.id = p_organization_id AND org.is_active
       AND member.is_active AND member.role = p_actor_role AND actor.is_active
     FOR SHARE OF org, member, actor;
    IF NOT FOUND THEN RAISE EXCEPTION 'FX_TRANSITION_ACTOR_INVALID' USING ERRCODE = '23514'; END IF;
    IF p_actor_role = 'admin' THEN
      PERFORM 1
        FROM public.branch_memberships bm
        JOIN public.fx_contingency_delegations d
          ON d.organization_id = bm.organization_id AND d.branch_id = bm.branch_id
         AND d.user_id = bm.user_id AND d.status = 'active'
       WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id
         AND bm.user_id = p_actor_user_id AND bm.is_active
       FOR SHARE OF bm, d;
      IF NOT FOUND THEN RAISE EXCEPTION 'FX_ADMIN_DELEGATION_REQUIRED' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  IF p_new_status = 'bcv_restored' THEN
    PERFORM 1 FROM public.bcv_sync_state state
     WHERE state.singleton = true
     FOR SHARE;
  END IF;
  SELECT * INTO auth_row FROM public.fx_contingency_authorizations
   WHERE organization_id = p_organization_id AND branch_id = p_branch_id
     AND id = p_authorization_id FOR UPDATE;
  IF NOT FOUND OR auth_row.status <> 'active' THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_NOT_ACTIVE' USING ERRCODE = '23514';
  END IF;
  IF p_new_status='bcv_restored' THEN
    operation_date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date;
  END IF;
  IF p_new_status IN ('expired','bcv_restored') THEN
    IF p_actor_user_id IS DISTINCT FROM auth_row.authorized_by_user_id
      OR p_actor_role IS DISTINCT FROM auth_row.authorized_by_role THEN
      RAISE EXCEPTION 'FX_SYSTEM_TRANSITION_ACTOR_INVALID' USING ERRCODE = '23514';
    END IF;
    IF p_new_status = 'expired' AND pg_catalog.clock_timestamp() < auth_row.expires_at THEN
      RAISE EXCEPTION 'FX_AUTHORIZATION_NOT_EXPIRED' USING ERRCODE = '23514';
    END IF;
    IF p_new_status = 'bcv_restored' AND NOT EXISTS (
      SELECT 1 FROM public.bcv_sync_success_observations obs
       WHERE obs.observed_at > auth_row.starts_at
         AND obs.last_outcome IN ('inserted','unchanged')
         AND obs.last_error_code IS NULL
         AND obs.validation_status = 'valid'
         AND obs.exchange_rate_id = (
           SELECT selected.exchange_rate_id
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND obs.last_effective_date = (
           SELECT selected.effective_date
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND obs.rate_snapshot = (
           SELECT selected.rate
             FROM public.select_bcv_rate_for_operation(operation_date) selected
         )
         AND ((obs.last_outcome = 'inserted' AND obs.rate_fetched_at > auth_row.starts_at)
           OR obs.last_outcome = 'unchanged')
    ) THEN
      RAISE EXCEPTION 'FX_BCV_RECOVERY_EVIDENCE_MISSING' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members member
      JOIN public.app_users actor ON actor.id = member.user_id AND actor.is_active
      JOIN public.organizations org ON org.id = member.organization_id AND org.is_active
      WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
        AND member.is_active AND member.role = p_actor_role
    ) THEN RAISE EXCEPTION 'FX_TRANSITION_ACTOR_INVALID' USING ERRCODE = '23514'; END IF;
    IF p_actor_role = 'admin' AND NOT EXISTS (
      SELECT 1 FROM public.branch_memberships bm
      JOIN public.fx_contingency_delegations d
        ON d.organization_id = bm.organization_id AND d.branch_id = bm.branch_id
       AND d.user_id = bm.user_id AND d.status = 'active'
      WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id
        AND bm.user_id = p_actor_user_id AND bm.is_active
    ) THEN RAISE EXCEPTION 'FX_ADMIN_DELEGATION_REQUIRED' USING ERRCODE = '23514'; END IF;
  END IF;
  UPDATE public.fx_contingency_authorizations
     SET status = p_new_status,
         revoked_at = CASE WHEN p_new_status = 'revoked' THEN pg_catalog.clock_timestamp() ELSE NULL END
   WHERE organization_id = p_organization_id AND branch_id = p_branch_id AND id = p_authorization_id;
  event_kind := CASE p_new_status WHEN 'bcv_restored' THEN 'bcv_restored' ELSE p_new_status END;
  PERFORM public.append_fx_contingency_event(
    p_organization_id, p_branch_id, p_authorization_id, event_kind,
    p_actor_user_id, p_actor_role, pg_catalog.jsonb_build_object('reason', p_reason)
  );
END;
$transition_fx_contingency_authorization$;
ALTER FUNCTION public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text) TO microapp_runtime;

-- Manual contingency is unavailable whenever 0027 finds any applicable official row,
-- including an eligible prepublication on weekends or bank holidays.
CREATE OR REPLACE FUNCTION public.create_fx_contingency_authorization(
  p_organization_id uuid, p_branch_id uuid, p_rate numeric,
  p_reference_rate_value numeric, p_reference_exchange_rate_id uuid,
  p_reason text, p_expires_at timestamptz, p_actor_user_id uuid,
  p_actor_role text, p_elevated_confirmation_reason text DEFAULT NULL,
  p_event_type text DEFAULT 'authorized'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $create_fx_contingency_authorization$
DECLARE
  authorization_id uuid;
  starts_time timestamptz;
  calculated_bps integer;
  operation_date date;
  reference_effective_date date;
  reference_fetched_at timestamptz;
  selected_bcv record;
BEGIN
  IF p_rate IS NULL OR p_rate <= 0 OR p_reference_rate_value IS NULL OR p_reference_rate_value <= 0
     OR p_reason IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 1000
     OR p_event_type NOT IN ('authorized', 'renewed')
     OR p_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_INPUT_INVALID' USING ERRCODE = '23514';
  END IF;
  calculated_bps := pg_catalog.ceil(
    pg_catalog.abs(p_rate - p_reference_rate_value) / p_reference_rate_value * 10000
  )::integer;
  IF pg_catalog.abs(p_rate - p_reference_rate_value) * 10000 > p_reference_rate_value * 2000 THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_DEVIATION_LIMIT_EXCEEDED' USING ERRCODE = '23514';
  END IF;
  IF pg_catalog.abs(p_rate - p_reference_rate_value) * 10000 > p_reference_rate_value * 500 AND (
    p_elevated_confirmation_reason IS NULL
    OR pg_catalog.length(pg_catalog.btrim(p_elevated_confirmation_reason)) NOT BETWEEN 1 AND 500
  ) THEN
    RAISE EXCEPTION 'FX_ELEVATED_CONFIRMATION_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF pg_catalog.abs(p_rate - p_reference_rate_value) * 10000 <= p_reference_rate_value * 500
     AND p_elevated_confirmation_reason IS NOT NULL THEN
    RAISE EXCEPTION 'FX_ELEVATED_CONFIRMATION_NOT_APPLICABLE' USING ERRCODE = '23514';
  END IF;
  PERFORM 1
    FROM public.organizations org
    JOIN public.organization_members member
      ON member.organization_id = org.id AND member.user_id = p_actor_user_id
    JOIN public.app_users actor ON actor.id = member.user_id
   WHERE org.id = p_organization_id AND org.is_active
     AND member.is_active AND member.role = p_actor_role AND actor.is_active
   FOR SHARE OF org, member, actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_AUTHORIZATION_ACTOR_INVALID' USING ERRCODE = '23514'; END IF;
  PERFORM 1 FROM public.branches branch
   WHERE branch.organization_id = p_organization_id AND branch.id = p_branch_id
     AND branch.is_active
   FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_AUTHORIZATION_BRANCH_INACTIVE' USING ERRCODE = '23514'; END IF;
  IF p_actor_role = 'admin' THEN
    PERFORM 1
      FROM public.branch_memberships bm
      JOIN public.fx_contingency_delegations d
        ON d.organization_id = bm.organization_id AND d.branch_id = bm.branch_id
       AND d.user_id = bm.user_id AND d.status = 'active'
     WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id
       AND bm.user_id = p_actor_user_id AND bm.is_active
     FOR SHARE OF bm, d;
    IF NOT FOUND THEN RAISE EXCEPTION 'FX_ADMIN_DELEGATION_REQUIRED' USING ERRCODE = '23514'; END IF;
  END IF;
  PERFORM 1 FROM public.bcv_sync_state state
   WHERE state.singleton = true
   FOR SHARE;
  starts_time := pg_catalog.clock_timestamp();
  operation_date := (starts_time AT TIME ZONE 'America/Caracas')::date;
  IF p_expires_at <= starts_time OR p_expires_at > starts_time + interval '24 hours'
     OR p_expires_at > (((starts_time AT TIME ZONE 'America/Caracas')::date + 1)::timestamp AT TIME ZONE 'America/Caracas') THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_EXPIRY_INVALID' USING ERRCODE = '23514';
  END IF;
  SELECT er.effective_date, er.fetched_at
    INTO reference_effective_date, reference_fetched_at
    FROM public.exchange_rates er
   WHERE er.id = p_reference_exchange_rate_id
     AND er.source = 'BCV_OFFICIAL_HTML_V1'
     AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
     AND er.rate = p_reference_rate_value
     AND er.validation_status = 'valid'
     AND er.effective_date <= operation_date
     AND NOT EXISTS (
       SELECT 1 FROM public.exchange_rates newer
        WHERE newer.source = 'BCV_OFFICIAL_HTML_V1'
          AND newer.base_currency='USD' AND newer.quote_currency='VES' AND newer.rate > 0
          AND newer.validation_status = 'valid'
          AND newer.effective_date <= operation_date
          AND (newer.effective_date > er.effective_date
            OR (newer.effective_date = er.effective_date AND newer.fetched_at > er.fetched_at))
     );
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_REFERENCE_RATE_NOT_APPLICABLE_OR_NOT_LATEST' USING ERRCODE = '23514'; END IF;

  SELECT * INTO selected_bcv
    FROM public.select_bcv_rate_for_operation(operation_date);
  IF FOUND THEN
    RAISE EXCEPTION 'BCV_RATE_ALREADY_AVAILABLE' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.fx_contingency_authorizations (
    organization_id, branch_id, rate, reference_rate_value,
    reference_exchange_rate_id, reference_effective_date, deviation_bps, reason, starts_at,
    expires_at, authorized_by_user_id, authorized_by_role, elevated_confirmation_at,
    elevated_confirmation_reason, status
  ) VALUES (
    p_organization_id, p_branch_id, p_rate, p_reference_rate_value,
    p_reference_exchange_rate_id, reference_effective_date, calculated_bps, p_reason, starts_time,
    p_expires_at, p_actor_user_id, p_actor_role,
    CASE WHEN calculated_bps > 500 THEN starts_time ELSE NULL END,
    p_elevated_confirmation_reason, 'active'
  ) RETURNING id INTO authorization_id;

  PERFORM public.append_fx_contingency_event(
    p_organization_id, p_branch_id, authorization_id, p_event_type,
    p_actor_user_id, p_actor_role,
    pg_catalog.jsonb_build_object(
      'rate', p_rate, 'reference_rate_value', p_reference_rate_value,
      'reference_exchange_rate_id', p_reference_exchange_rate_id,
      'reference_effective_date', reference_effective_date,
      'deviation_bps', calculated_bps, 'reason', p_reason,
      'starts_at', starts_time, 'expires_at', p_expires_at
    )
  );
  RETURN authorization_id;
END;
$create_fx_contingency_authorization$;
ALTER FUNCTION public.create_fx_contingency_authorization(uuid,uuid,numeric,numeric,uuid,text,timestamptz,uuid,text,text,text) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.create_fx_contingency_authorization(uuid,uuid,numeric,numeric,uuid,text,timestamptz,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_fx_contingency_authorization(uuid,uuid,numeric,numeric,uuid,text,timestamptz,uuid,text,text,text) TO microapp_runtime;

COMMIT;
