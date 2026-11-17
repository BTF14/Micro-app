BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'FX_CONTINGENCY_MIGRATION_REQUIRES_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'microapp_bcv_sync') THEN
    RAISE EXCEPTION 'FX_CONTINGENCY_REQUIRED_ROLES_MISSING';
  END IF;
END;
$preflight$;

-- Individual PIN credentials. The API stores only a salted KDF output and
-- versioned parameters; plaintext PINs and peppers never enter PostgreSQL.
CREATE TABLE public.fx_user_pin_credentials (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kdf_version text NOT NULL CHECK (kdf_version IN ('pbkdf2-sha256-v1')),
  iterations integer NOT NULL CHECK (iterations = 100000),
  salt bytea NOT NULL CHECK (pg_catalog.octet_length(salt) BETWEEN 16 AND 64),
  pin_hash bytea NOT NULL CHECK (pg_catalog.octet_length(pin_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (organization_id, user_id),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE TABLE public.fx_contingency_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  granted_by_user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'fx.contingency.authorize'
    CHECK (permission = 'fx.contingency.authorize'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  revoked_at timestamptz,
  UNIQUE (organization_id, branch_id, id),
  FOREIGN KEY (organization_id, branch_id, user_id)
    REFERENCES public.branch_memberships (organization_id, branch_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, granted_by_user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX fx_contingency_delegations_active_uq
  ON public.fx_contingency_delegations (organization_id, branch_id, user_id)
  WHERE status = 'active';

CREATE TABLE public.fx_contingency_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  rate numeric(18,8) NOT NULL CHECK (rate > 0),
  reference_rate_value numeric(18,8) NOT NULL CHECK (reference_rate_value > 0),
  reference_exchange_rate_id uuid NOT NULL REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
  reference_effective_date date NOT NULL,
  deviation_bps integer NOT NULL CHECK (deviation_bps BETWEEN 0 AND 2000),
  reason text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(reason)) BETWEEN 1 AND 1000),
  starts_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  expires_at timestamptz NOT NULL,
  authorized_by_user_id uuid NOT NULL,
  authorized_by_role text NOT NULL CHECK (authorized_by_role IN ('owner','admin')),
  elevated_confirmation_at timestamptz,
  elevated_confirmation_reason text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'bcv_restored')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (organization_id, branch_id, id),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES public.branches (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, authorized_by_user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (expires_at > starts_at
    AND expires_at <= starts_at + interval '24 hours'
    AND expires_at <= (((starts_at AT TIME ZONE 'America/Caracas')::date + 1)::timestamp AT TIME ZONE 'America/Caracas')),
  CHECK (reference_effective_date <= (starts_at AT TIME ZONE 'America/Caracas')::date),
  CHECK (
    deviation_bps = pg_catalog.round(
      pg_catalog.abs(rate - reference_rate_value) / reference_rate_value * 10000
    )::integer
  ),
  CHECK (pg_catalog.abs(rate - reference_rate_value) * 10000 <= reference_rate_value * 2000),
  CHECK (
    (pg_catalog.abs(rate - reference_rate_value) * 10000 <= reference_rate_value * 500
      AND elevated_confirmation_at IS NULL AND elevated_confirmation_reason IS NULL)
    OR
    (pg_catalog.abs(rate - reference_rate_value) * 10000 > reference_rate_value * 500
      AND elevated_confirmation_at IS NOT NULL
      AND elevated_confirmation_reason IS NOT NULL
      AND pg_catalog.length(pg_catalog.btrim(elevated_confirmation_reason)) BETWEEN 1 AND 500)
  ),
  CHECK (
    (status IN ('active', 'expired', 'bcv_restored') AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX fx_contingency_authorizations_one_active_per_branch
  ON public.fx_contingency_authorizations (organization_id, branch_id)
  WHERE status = 'active';
CREATE INDEX fx_contingency_authorizations_expiry_idx
  ON public.fx_contingency_authorizations (expires_at)
  WHERE status = 'active';

CREATE TABLE public.fx_contingency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  authorization_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'authorized', 'renewed', 'revoked', 'expired', 'bcv_restored'
  )),
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('owner', 'admin')),
  event_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_catalog.jsonb_typeof(details) = 'object'),
  FOREIGN KEY (organization_id, branch_id, authorization_id)
    REFERENCES public.fx_contingency_authorizations (organization_id, branch_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX fx_contingency_events_history_idx
  ON public.fx_contingency_events (organization_id, branch_id, event_at DESC, id DESC);

-- Durable evidence of a successful BCV sync. bcv_sync_state is mutable and a
-- later failed attempt overwrites last_outcome; exchange_rates.fetched_at is
-- immutable for unchanged rows. This append-only observation preserves both.
CREATE TABLE public.bcv_sync_success_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id uuid,
  observed_at timestamptz NOT NULL,
  last_success_at timestamptz NOT NULL,
  last_outcome text NOT NULL CHECK (last_outcome IN ('inserted', 'unchanged')),
  last_error_code text,
  last_effective_date date NOT NULL,
  exchange_rate_id uuid REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
  rate_snapshot numeric(18,8),
  rate_fetched_at timestamptz,
  validation_status text CHECK (validation_status IS NULL OR validation_status IN ('valid', 'stale')),
  CHECK (
    (exchange_rate_id IS NULL AND rate_snapshot IS NULL AND rate_fetched_at IS NULL AND validation_status IS NULL)
    OR
    (exchange_rate_id IS NOT NULL AND rate_snapshot > 0 AND rate_fetched_at IS NOT NULL AND validation_status IS NOT NULL)
  )
);
CREATE INDEX bcv_sync_success_observations_effective_idx
  ON public.bcv_sync_success_observations (last_effective_date, observed_at DESC);

CREATE FUNCTION public.reject_fx_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $reject_fx_append_only_mutation$
BEGIN
  RAISE EXCEPTION 'FX_APPEND_ONLY: % is forbidden', TG_OP USING ERRCODE = '23514';
END;
$reject_fx_append_only_mutation$;
REVOKE ALL ON FUNCTION public.reject_fx_append_only_mutation() FROM PUBLIC;

CREATE TRIGGER fx_contingency_events_10_append_only_rows
BEFORE UPDATE OR DELETE ON public.fx_contingency_events
FOR EACH ROW EXECUTE FUNCTION public.reject_fx_append_only_mutation();
CREATE TRIGGER fx_contingency_events_20_append_only_truncate
BEFORE TRUNCATE ON public.fx_contingency_events
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_fx_append_only_mutation();
ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_10_append_only_rows;
ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_20_append_only_truncate;

CREATE TRIGGER bcv_sync_success_observations_10_append_only_rows
BEFORE UPDATE OR DELETE ON public.bcv_sync_success_observations
FOR EACH ROW EXECUTE FUNCTION public.reject_fx_append_only_mutation();
CREATE TRIGGER bcv_sync_success_observations_20_append_only_truncate
BEFORE TRUNCATE ON public.bcv_sync_success_observations
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_fx_append_only_mutation();
ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_10_append_only_rows;
ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_20_append_only_truncate;

CREATE FUNCTION public.capture_bcv_sync_success_observation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $capture_bcv_sync_success_observation$
DECLARE
  rate_row public.exchange_rates%ROWTYPE;
BEGIN
  IF NEW.last_success_at IS DISTINCT FROM OLD.last_success_at
     AND NEW.last_outcome IN ('inserted', 'unchanged')
     AND NEW.last_error_code IS NULL
     AND NEW.last_effective_date IS NOT NULL THEN
    SELECT * INTO rate_row
      FROM public.exchange_rates
     WHERE source = 'BCV_OFFICIAL_HTML_V1'
       AND effective_date = NEW.last_effective_date
     LIMIT 1;
    INSERT INTO public.bcv_sync_success_observations (
      attempt_id, observed_at, last_success_at, last_outcome, last_error_code,
      last_effective_date, exchange_rate_id, rate_snapshot, rate_fetched_at, validation_status
    ) VALUES (
      NEW.attempt_id, pg_catalog.clock_timestamp(), NEW.last_success_at,
      NEW.last_outcome, NEW.last_error_code, NEW.last_effective_date,
      rate_row.id, rate_row.rate, rate_row.fetched_at, rate_row.validation_status
    );
  END IF;
  RETURN NEW;
END;
$capture_bcv_sync_success_observation$;
ALTER FUNCTION public.capture_bcv_sync_success_observation() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.capture_bcv_sync_success_observation() FROM PUBLIC;
CREATE TRIGGER bcv_sync_success_observation_capture
AFTER UPDATE ON public.bcv_sync_state
FOR EACH ROW EXECUTE FUNCTION public.capture_bcv_sync_success_observation();

-- The sync producer cannot read, write, truncate, or administer the evidence
-- table. Runtime receives SELECT only; insertion is performed by the definer
-- trigger above.
REVOKE ALL ON TABLE public.bcv_sync_success_observations FROM PUBLIC, microapp_bcv_sync, microapp_runtime;
REVOKE ALL ON TABLE public.fx_contingency_events FROM PUBLIC, microapp_runtime, microapp_bcv_sync;
GRANT SELECT ON TABLE public.bcv_sync_success_observations TO microapp_runtime;
GRANT SELECT, INSERT ON TABLE public.fx_contingency_events TO microapp_runtime;

-- Keep the producer's existing narrow 0022 contract unchanged.
REVOKE ALL ON TABLE public.fx_user_pin_credentials, public.fx_contingency_delegations,
  public.fx_contingency_authorizations FROM PUBLIC, microapp_runtime, microapp_bcv_sync;
GRANT SELECT ON TABLE public.fx_user_pin_credentials TO microapp_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.fx_user_pin_credentials FROM microapp_runtime;
GRANT SELECT ON TABLE public.fx_contingency_delegations, public.fx_contingency_authorizations TO microapp_runtime;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.fx_contingency_delegations, public.fx_contingency_authorizations FROM microapp_runtime;

-- Add source-aware sale snapshots. Existing rows are explicitly classified as
-- BCV; no historical sale is rewritten or revalued.
ALTER TABLE public.sales
  ADD COLUMN fx_source text NOT NULL DEFAULT 'bcv_official',
  ADD COLUMN fx_authorization_id uuid,
  ADD COLUMN manual_fx_acknowledged_at timestamptz,
  ADD COLUMN manual_fx_acknowledged_by_user_id uuid;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_fx_source_ck
    CHECK (fx_source IN ('bcv_official', 'manual_contingency')),
  ADD CONSTRAINT sales_fx_ack_contract_ck
    CHECK (
      (fx_source = 'manual_contingency'
        AND manual_fx_acknowledged_at IS NOT NULL
        AND manual_fx_acknowledged_by_user_id = created_by)
      OR
      (fx_source = 'bcv_official'
        AND manual_fx_acknowledged_at IS NULL
        AND manual_fx_acknowledged_by_user_id IS NULL)
    ),
  ADD CONSTRAINT sales_fx_authorization_scope_fk
    FOREIGN KEY (organization_id, branch_id, fx_authorization_id)
    REFERENCES public.fx_contingency_authorizations (organization_id, branch_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_fx_ack_actor_fk
    FOREIGN KEY (organization_id, manual_fx_acknowledged_by_user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_org_branch_id_uq UNIQUE (organization_id, branch_id, id);

-- Replace only the original unnamed completion CHECK after verifying exactly
-- one catalog match. Never assume PostgreSQL's generated constraint name.
DO $replace_sales_completion_check$
DECLARE
  matches text[];
  old_name text;
BEGIN
  SELECT array_agg(con.conname ORDER BY con.conname)
    INTO matches
    FROM pg_catalog.pg_constraint con
   WHERE con.conrelid = 'public.sales'::regclass
     AND con.contype = 'c'
     AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%exchange_rate_id IS NOT NULL%'
     AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%status%completed%';
  IF COALESCE(pg_catalog.cardinality(matches), 0) <> 1 THEN
    RAISE EXCEPTION 'SALES_COMPLETION_CHECK_EXPECTED_EXACTLY_ONE_FOUND_%',
      COALESCE(pg_catalog.cardinality(matches), 0);
  END IF;
  old_name := matches[1];
  EXECUTE pg_catalog.format('ALTER TABLE public.sales DROP CONSTRAINT %I', old_name);
END;
$replace_sales_completion_check$;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_completed_fx_snapshot_ck
  CHECK (
    status <> 'completed'
    OR (
      completed_at IS NOT NULL
      AND exchange_rate_snapshot IS NOT NULL
      AND total_ves_snapshot IS NOT NULL
      AND (
        (fx_source = 'bcv_official'
          AND exchange_rate_id IS NOT NULL
          AND fx_authorization_id IS NULL
          AND manual_fx_acknowledged_at IS NULL
          AND manual_fx_acknowledged_by_user_id IS NULL)
        OR
        (fx_source = 'manual_contingency'
          AND exchange_rate_id IS NULL
          AND fx_authorization_id IS NOT NULL
          AND manual_fx_acknowledged_at IS NOT NULL
          AND manual_fx_acknowledged_by_user_id = created_by)
      )
    )
  ) NOT VALID;
ALTER TABLE public.sales VALIDATE CONSTRAINT sales_completed_fx_snapshot_ck;

-- Preserve 0021's trigger-only SECURITY DEFINER contract, including owner and
-- lack of PUBLIC/runtime EXECUTE. The manual branch is enforced by the
-- completed-sale reconciliation trigger below.
CREATE OR REPLACE FUNCTION public.assert_sale_latest_bcv_sync_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_sale_latest_bcv_sync_success$
DECLARE
  sync_last_success_at timestamptz;
  sync_last_outcome text;
  sync_last_effective_date date;
  operation_date date;
BEGIN
  IF NEW.status <> 'completed'
    OR (TG_OP = 'UPDATE' AND OLD.status = 'completed')
    OR NEW.fx_source <> 'bcv_official'
  THEN
    RETURN NULL;
  END IF;

  SELECT last_success_at, last_outcome, last_effective_date
    INTO sync_last_success_at, sync_last_outcome, sync_last_effective_date
    FROM public.bcv_sync_state
   WHERE singleton = true
   FOR SHARE;

  operation_date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date;
  IF NOT FOUND
    OR sync_last_success_at IS NULL
    OR sync_last_outcome IS NULL
    OR sync_last_outcome NOT IN ('inserted', 'unchanged')
    OR sync_last_effective_date IS DISTINCT FROM operation_date
  THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$assert_sale_latest_bcv_sync_success$;
ALTER FUNCTION public.assert_sale_latest_bcv_sync_success() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM microapp_runtime;
REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM microapp_bcv_sync;


-- Audit events are inserted through one narrow SECURITY DEFINER entry point.
-- The runtime role receives no direct INSERT privilege on the append-only table.
CREATE FUNCTION public.append_fx_contingency_event(
  p_organization_id uuid,
  p_branch_id uuid,
  p_authorization_id uuid,
  p_event_type text,
  p_actor_user_id uuid,
  p_actor_role text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $append_fx_contingency_event$
DECLARE event_id uuid;
BEGIN
  IF p_event_type NOT IN ('authorized', 'renewed', 'revoked', 'expired', 'bcv_restored')
     OR p_actor_role NOT IN ('owner', 'admin')
     OR p_details IS NULL OR pg_catalog.jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'FX_EVENT_ARGUMENTS_INVALID' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members member
     WHERE member.organization_id = p_organization_id
       AND member.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'FX_EVENT_ACTOR_SCOPE_INVALID' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.fx_contingency_events (
    organization_id, branch_id, authorization_id, event_type, actor_user_id, actor_role, details
  ) VALUES (
    p_organization_id, p_branch_id, p_authorization_id, p_event_type,
    p_actor_user_id, p_actor_role, p_details
  ) RETURNING id INTO event_id;
  RETURN event_id;
END;
$append_fx_contingency_event$;
ALTER FUNCTION public.append_fx_contingency_event(uuid,uuid,uuid,text,uuid,text,jsonb) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.append_fx_contingency_event(uuid,uuid,uuid,text,uuid,text,jsonb) FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.fx_contingency_events FROM microapp_runtime;

-- The checkout lifecycle guard must treat FX source, authorization and cashier
-- acknowledgement as immutable snapshots once a draft is finalized.
CREATE OR REPLACE FUNCTION public.guard_sales_checkout_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $guard_sales_checkout_lifecycle$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SALES_DELETE_FORBIDDEN' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.completed_at IS NOT NULL
      OR NEW.branch_id IS NULL OR NEW.register_shift_id IS NULL
      OR NEW.warehouse_id IS NULL OR NEW.settlement_currency IS NULL
      OR NEW.settlement_currency NOT IN ('USD', 'VES')
      OR NEW.request_hash IS NULL OR pg_catalog.length(NEW.request_hash) <> 64
      OR NEW.request_hash ~ '[^0-9a-f]'
      OR pg_catalog.length(NEW.idempotency_key) NOT BETWEEN 1 AND 128
      OR NEW.idempotency_key ~ '[^A-Za-z0-9._:-]'
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
    NEW.settlement_currency, NEW.request_hash, NEW.fx_source,
    NEW.fx_authorization_id, NEW.manual_fx_acknowledged_at,
    NEW.manual_fx_acknowledged_by_user_id
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.organization_id, OLD.sale_number, OLD.idempotency_key,
    OLD.subtotal_usd, OLD.total_usd, OLD.exchange_rate_id,
    OLD.exchange_rate_snapshot, OLD.total_ves_snapshot, OLD.created_by,
    OLD.created_at, OLD.branch_id, OLD.register_shift_id, OLD.warehouse_id,
    OLD.settlement_currency, OLD.request_hash, OLD.fx_source,
    OLD.fx_authorization_id, OLD.manual_fx_acknowledged_at,
    OLD.manual_fx_acknowledged_by_user_id
  ) THEN
    RAISE EXCEPTION 'SALE_SNAPSHOT_FIELDS_ARE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard_sales_checkout_lifecycle$;

-- Reconciliation retains every pre-existing line/payment/inventory/audit
-- invariant and branches only the source-specific FX validation.
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
    PERFORM 1 FROM public.exchange_rates er
     WHERE er.id = sale_row.exchange_rate_id
       AND er.source = 'BCV_OFFICIAL_HTML_V1'
       AND er.validation_status = 'valid'
       AND er.rate = sale_row.exchange_rate_snapshot
       AND er.effective_date = (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
     FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SALE_REQUIRES_CURRENT_BCV_RATE' USING ERRCODE = '23514';
    END IF;
    operation_time := pg_catalog.clock_timestamp();
    operation_date := (operation_time AT TIME ZONE 'America/Caracas')::date;
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
    operation_date := (operation_time AT TIME ZONE 'America/Caracas')::date;
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
         AND obs.last_effective_date = operation_date
         AND obs.validation_status = 'valid'
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
REVOKE ALL ON FUNCTION public.assert_completed_sale_reconciled() FROM PUBLIC;



CREATE FUNCTION public.transition_fx_contingency_authorization(
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
         AND obs.last_effective_date = (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
         AND obs.validation_status = 'valid'
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

CREATE FUNCTION public.set_fx_contingency_delegation(
  p_organization_id uuid, p_branch_id uuid, p_user_id uuid,
  p_actor_user_id uuid, p_actor_role text, p_revoke boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $set_fx_contingency_delegation$
DECLARE delegation_id uuid;
BEGIN
  IF p_actor_role <> 'owner' THEN
    RAISE EXCEPTION 'FX_DELEGATION_OWNER_REQUIRED' USING ERRCODE = '23514';
  END IF;
  PERFORM 1
    FROM public.organization_members member
    JOIN public.app_users actor ON actor.id = member.user_id
   WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
     AND member.is_active AND member.role = 'owner' AND actor.is_active
   FOR SHARE OF member, actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_DELEGATION_ACTOR_INVALID' USING ERRCODE = '23514'; END IF;
  PERFORM 1 FROM public.branches branch
   WHERE branch.organization_id = p_organization_id AND branch.id = p_branch_id AND branch.is_active
   FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_DELEGATION_BRANCH_INVALID' USING ERRCODE = '23514'; END IF;
  PERFORM 1
    FROM public.branch_memberships bm
    JOIN public.organization_members member
      ON member.organization_id = bm.organization_id AND member.user_id = bm.user_id
   WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id
     AND bm.user_id = p_user_id AND bm.is_active
     AND member.is_active AND member.role = 'admin'
   FOR SHARE OF bm, member;
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_DELEGATE_MUST_BE_ACTIVE_BRANCH_ADMIN' USING ERRCODE = '23514'; END IF;

  IF p_revoke THEN
    UPDATE public.fx_contingency_delegations
       SET status = 'revoked', revoked_at = pg_catalog.clock_timestamp()
     WHERE organization_id = p_organization_id AND branch_id = p_branch_id
       AND user_id = p_user_id AND status = 'active'
     RETURNING id INTO delegation_id;
    IF delegation_id IS NULL THEN RAISE EXCEPTION 'FX_DELEGATION_NOT_ACTIVE' USING ERRCODE = '23514'; END IF;
  ELSE
    INSERT INTO public.fx_contingency_delegations (
      organization_id, branch_id, user_id, granted_by_user_id
    ) VALUES (p_organization_id, p_branch_id, p_user_id, p_actor_user_id)
    RETURNING id INTO delegation_id;
  END IF;
  INSERT INTO public.audit_logs (organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES (
    p_organization_id,p_actor_user_id,
    CASE WHEN p_revoke THEN 'fx.delegation.revoked' ELSE 'fx.delegation.granted' END,
    'fx_contingency_delegation',delegation_id::text,
    pg_catalog.jsonb_build_object('branch_id',p_branch_id,'delegate_user_id',p_user_id)
  );
  RETURN delegation_id;
END;
$set_fx_contingency_delegation$;
ALTER FUNCTION public.set_fx_contingency_delegation(uuid,uuid,uuid,uuid,text,boolean) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.set_fx_contingency_delegation(uuid,uuid,uuid,uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_fx_contingency_delegation(uuid,uuid,uuid,uuid,text,boolean) TO microapp_runtime;



CREATE FUNCTION public.create_fx_contingency_authorization(
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
BEGIN
  IF p_rate IS NULL OR p_rate <= 0 OR p_reference_rate_value IS NULL OR p_reference_rate_value <= 0
     OR p_reason IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 1000
     OR p_event_type NOT IN ('authorized', 'renewed')
     OR p_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_INPUT_INVALID' USING ERRCODE = '23514';
  END IF;
  calculated_bps := pg_catalog.round(
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
     AND er.rate = p_reference_rate_value
     AND er.validation_status = 'valid'
     AND er.effective_date <= operation_date
     AND NOT EXISTS (
       SELECT 1 FROM public.exchange_rates newer
        WHERE newer.source = 'BCV_OFFICIAL_HTML_V1'
          AND newer.validation_status = 'valid'
          AND newer.effective_date <= operation_date
          AND (newer.effective_date > er.effective_date
            OR (newer.effective_date = er.effective_date AND newer.fetched_at > er.fetched_at))
     );
  IF NOT FOUND THEN RAISE EXCEPTION 'FX_REFERENCE_RATE_NOT_APPLICABLE_OR_NOT_LATEST' USING ERRCODE = '23514'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1'
       AND er.effective_date=operation_date
       AND er.validation_status='valid'
  ) THEN
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
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.fx_contingency_authorizations FROM microapp_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.fx_contingency_delegations FROM microapp_runtime;



CREATE FUNCTION public.set_fx_user_pin_credential(
  p_organization_id uuid, p_user_id uuid, p_actor_user_id uuid, p_kdf_version text,
  p_iterations integer, p_salt bytea, p_pin_hash bytea
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $set_fx_user_pin_credential$
BEGIN
  IF p_actor_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FX_PIN_SELF_SERVICE_ONLY' USING ERRCODE = '23514';
  END IF;
  IF p_kdf_version <> 'pbkdf2-sha256-v1'
     OR p_iterations <> 100000
     OR pg_catalog.octet_length(p_salt) NOT BETWEEN 16 AND 64
     OR pg_catalog.octet_length(p_pin_hash) <> 32 THEN
    RAISE EXCEPTION 'FX_PIN_CREDENTIAL_FORMAT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members member
    JOIN public.app_users actor ON actor.id=member.user_id
    JOIN public.organizations org ON org.id=member.organization_id
    WHERE member.organization_id=p_organization_id AND member.user_id=p_user_id
      AND member.is_active AND actor.is_active AND org.is_active
      AND member.role IN ('owner','admin')
  ) THEN RAISE EXCEPTION 'FX_PIN_ACTOR_SCOPE_INVALID' USING ERRCODE = '23514'; END IF;
  INSERT INTO public.fx_user_pin_credentials (
    organization_id,user_id,kdf_version,iterations,salt,pin_hash
  ) VALUES (
    p_organization_id,p_user_id,p_kdf_version,p_iterations,p_salt,p_pin_hash
  )
  ON CONFLICT (organization_id,user_id) DO UPDATE
    SET kdf_version=EXCLUDED.kdf_version,iterations=EXCLUDED.iterations,
        salt=EXCLUDED.salt,pin_hash=EXCLUDED.pin_hash,
        updated_at=pg_catalog.clock_timestamp();
END;
$set_fx_user_pin_credential$;
ALTER FUNCTION public.set_fx_user_pin_credential(uuid,uuid,uuid,text,integer,bytea,bytea) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.set_fx_user_pin_credential(uuid,uuid,uuid,text,integer,bytea,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_fx_user_pin_credential(uuid,uuid,uuid,text,integer,bytea,bytea) TO microapp_runtime;


CREATE FUNCTION public.lock_fx_user_pin_credential(
  p_organization_id uuid, p_user_id uuid
)
RETURNS TABLE(kdf_version text,iterations integer,salt_base64 text,hash_base64 text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_fx_user_pin_credential$
  SELECT credential.kdf_version,credential.iterations,
         pg_catalog.encode(credential.salt,'base64'),
         pg_catalog.encode(credential.pin_hash,'base64')
    FROM public.fx_user_pin_credentials credential
   WHERE credential.organization_id=p_organization_id
     AND credential.user_id=p_user_id
   FOR SHARE
$lock_fx_user_pin_credential$;
ALTER FUNCTION public.lock_fx_user_pin_credential(uuid,uuid) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.lock_fx_user_pin_credential(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_fx_user_pin_credential(uuid,uuid) TO microapp_runtime;


CREATE FUNCTION public.lock_active_fx_contingency_authorization(
  p_organization_id uuid, p_branch_id uuid
)
RETURNS TABLE(id uuid,rate numeric(18,8),starts_at timestamptz,expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_active_fx_contingency_authorization$
  SELECT a.id,a.rate,a.starts_at,a.expires_at
    FROM public.fx_contingency_authorizations a
   WHERE a.organization_id=p_organization_id AND a.branch_id=p_branch_id
     AND a.status='active'
     AND a.starts_at <= pg_catalog.clock_timestamp()
     AND a.expires_at > pg_catalog.clock_timestamp()
   ORDER BY a.starts_at DESC
   LIMIT 1
   FOR SHARE
$lock_active_fx_contingency_authorization$;
ALTER FUNCTION public.lock_active_fx_contingency_authorization(uuid,uuid) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.lock_active_fx_contingency_authorization(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_active_fx_contingency_authorization(uuid,uuid) TO microapp_runtime;

CREATE FUNCTION public.lock_active_fx_contingency_authorization_for_transition(
  p_organization_id uuid, p_branch_id uuid
)
RETURNS TABLE(
  id uuid,starts_at timestamptz,expires_at timestamptz,
  authorized_by_user_id uuid,authorized_by_role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_active_fx_contingency_authorization_for_transition$
  SELECT a.id,a.starts_at,a.expires_at,a.authorized_by_user_id,a.authorized_by_role
    FROM public.fx_contingency_authorizations a
   WHERE a.organization_id=p_organization_id AND a.branch_id=p_branch_id
     AND a.status='active'
     AND a.starts_at <= pg_catalog.clock_timestamp()
     AND a.expires_at > pg_catalog.clock_timestamp()
   ORDER BY a.starts_at DESC
   LIMIT 1
   FOR UPDATE
$lock_active_fx_contingency_authorization_for_transition$;
ALTER FUNCTION public.lock_active_fx_contingency_authorization_for_transition(uuid,uuid) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.lock_active_fx_contingency_authorization_for_transition(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_active_fx_contingency_authorization_for_transition(uuid,uuid) TO microapp_runtime;

CREATE FUNCTION public.lock_branch_fx_contingency_authorization(
  p_organization_id uuid, p_branch_id uuid
)
RETURNS TABLE(
  id uuid,starts_at timestamptz,expires_at timestamptz,
  authorized_by_user_id uuid,authorized_by_role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_branch_fx_contingency_authorization$
  SELECT a.id,a.starts_at,a.expires_at,a.authorized_by_user_id,a.authorized_by_role
    FROM public.fx_contingency_authorizations a
   WHERE a.organization_id=p_organization_id AND a.branch_id=p_branch_id
     AND a.status='active'
   ORDER BY a.starts_at DESC
   LIMIT 1
   FOR UPDATE
$lock_branch_fx_contingency_authorization$;
ALTER FUNCTION public.lock_branch_fx_contingency_authorization(uuid,uuid) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.lock_branch_fx_contingency_authorization(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_branch_fx_contingency_authorization(uuid,uuid) TO microapp_runtime;

COMMIT;
