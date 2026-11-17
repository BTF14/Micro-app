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
  iterations integer NOT NULL CHECK (iterations BETWEEN 100000 AND 1000000),
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
  reference_exchange_rate_id uuid REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
  deviation_bps integer NOT NULL CHECK (deviation_bps BETWEEN 0 AND 2000),
  reason text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(reason)) BETWEEN 1 AND 1000),
  starts_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  expires_at timestamptz NOT NULL,
  authorized_by_user_id uuid NOT NULL,
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
  CHECK (expires_at > starts_at AND expires_at <= starts_at + interval '24 hours'),
  CHECK (
    deviation_bps = pg_catalog.round(
      pg_catalog.abs(rate - reference_rate_value) / reference_rate_value * 10000
    )::integer
  ),
  CHECK (
    (deviation_bps <= 500 AND elevated_confirmation_at IS NULL AND elevated_confirmation_reason IS NULL)
    OR
    (deviation_bps > 500 AND elevated_confirmation_at IS NOT NULL
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
REVOKE ALL ON TABLE public.bcv_sync_success_observations FROM PUBLIC, microapp_bcv_sync;
REVOKE ALL ON TABLE public.fx_contingency_events FROM PUBLIC;
GRANT SELECT ON TABLE public.bcv_sync_success_observations TO microapp_runtime;
GRANT SELECT, INSERT ON TABLE public.fx_contingency_events TO microapp_runtime;

-- Keep the producer's existing narrow 0022 contract unchanged.
REVOKE ALL ON TABLE public.fx_user_pin_credentials, public.fx_contingency_delegations,
  public.fx_contingency_authorizations FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.fx_user_pin_credentials,
  public.fx_contingency_delegations, public.fx_contingency_authorizations TO microapp_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.fx_contingency_events_id_seq TO microapp_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.bcv_sync_success_observations_id_seq TO microapp_runtime;

-- Add source-aware sale snapshots. Existing rows are explicitly classified as
-- BCV; no historical sale is rewritten or revalued.
ALTER TABLE public.sales
  ADD COLUMN fx_source text NOT NULL DEFAULT 'bcv_official',
  ADD COLUMN fx_authorization_id uuid,
  ADD COLUMN manual_fx_acknowledged_at timestamptz,
  ADD COLUMN manual_fx_acknowledged_by_user_id uuid;
ALTER TABLE public.sales ALTER COLUMN fx_source DROP DEFAULT;

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
  operation_date date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date;
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

COMMIT;
