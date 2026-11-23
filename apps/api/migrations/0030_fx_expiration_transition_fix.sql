-- 0030: prevent PL/pgSQL from dereferencing unassigned selector records
-- on non-BCV expiry transitions; also fail closed before reading empty selector records.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE='23514';
  END IF;
  IF NEW.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_BCV_DATE_SNAPSHOT_INVALID' USING ERRCODE='23514';
  END IF;
  IF sale_row.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
    OR sale_row.exchange_rate_snapshot IS DISTINCT FROM selected.rate
    OR sale_row.exchange_rate_effective_date IS DISTINCT FROM selected.effective_date THEN
    RAISE EXCEPTION 'SALE_BCV_DATE_SNAPSHOT_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$assert_sales_bcv_0027_snapshot$;
ALTER FUNCTION public.assert_sales_bcv_0027_snapshot() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_sales_bcv_0027_snapshot() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

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
    IF operation_date IS NULL THEN
      RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
    END IF;
    IF sale_row.exchange_rate_id IS DISTINCT FROM selected_rate.exchange_rate_id
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
  IF NEW.operation_date IS NULL THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC' USING ERRCODE='23514';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC' USING ERRCODE='23514';
  END IF;
  IF NEW.exchange_rate_id IS DISTINCT FROM selected.exchange_rate_id
    OR NEW.exchange_rate_effective_date IS DISTINCT FROM selected.effective_date
    OR NEW.exchange_rate_snapshot IS DISTINCT FROM selected.rate THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$assert_sale_latest_bcv_sync_success$;
ALTER FUNCTION public.assert_sale_latest_bcv_sync_success() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

-- Preserve the 0027 selector evidence gate, but isolate it in a nested IF:
-- PL/pgSQL prepares SQL variable references before evaluating boolean short-circuit.
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
  selected_rate record;
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
    SELECT * INTO selected_rate
      FROM public.select_bcv_rate_for_operation(
        (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
      );
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FX_BCV_RECOVERY_NOT_ELIGIBLE' USING ERRCODE = '23514';
    END IF;
  END IF;
  SELECT * INTO auth_row FROM public.fx_contingency_authorizations
   WHERE organization_id = p_organization_id AND branch_id = p_branch_id
     AND id = p_authorization_id FOR UPDATE;
  IF NOT FOUND OR auth_row.status <> 'active' THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_NOT_ACTIVE' USING ERRCODE = '23514';
  END IF;
  IF p_new_status IN ('expired','bcv_restored') THEN
    IF p_actor_user_id IS DISTINCT FROM auth_row.authorized_by_user_id
      OR p_actor_role IS DISTINCT FROM auth_row.authorized_by_role THEN
      RAISE EXCEPTION 'FX_SYSTEM_TRANSITION_ACTOR_INVALID' USING ERRCODE = '23514';
    END IF;
    IF p_new_status = 'expired' AND pg_catalog.clock_timestamp() < auth_row.expires_at THEN
      RAISE EXCEPTION 'FX_AUTHORIZATION_NOT_EXPIRED' USING ERRCODE = '23514';
    END IF;
    IF p_new_status = 'bcv_restored' THEN
      IF NOT EXISTS (
        SELECT 1
          FROM public.bcv_sync_success_observations obs
          JOIN public.bcv_sync_state state ON state.singleton=true
         WHERE obs.observed_at > auth_row.starts_at
           AND obs.observed_at >= obs.last_success_at
           AND obs.last_success_at = state.last_success_at
           AND obs.last_outcome = state.last_outcome
           AND obs.last_effective_date = state.last_effective_date
           AND state.last_outcome IN ('inserted','unchanged')
           AND state.last_error_code IS NULL
           AND obs.last_outcome IN ('inserted','unchanged')
           AND obs.last_error_code IS NULL
           AND obs.validation_status = 'valid'
           AND obs.exchange_rate_id = selected_rate.exchange_rate_id
           AND obs.last_effective_date = selected_rate.effective_date
           AND obs.rate_snapshot = selected_rate.rate
           AND ((obs.last_outcome = 'inserted' AND obs.rate_fetched_at > auth_row.starts_at)
             OR obs.last_outcome = 'unchanged')
      ) THEN
        RAISE EXCEPTION 'FX_BCV_RECOVERY_EVIDENCE_MISSING' USING ERRCODE = '23514';
      END IF;
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

COMMIT;
