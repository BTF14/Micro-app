BEGIN;
SET LOCAL lock_timeout = '5s';

DO $bcv_sync_state_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$bcv_sync_state_preflight$;

-- Operational state is separate from exchange_rates.fetched_at, which remains
-- the immutable retrieval timestamp of an individual effective-date row.
CREATE TABLE public.bcv_sync_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  attempt_id uuid,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_outcome text CHECK (last_outcome IN ('running', 'inserted', 'unchanged', 'older', 'failed')),
  last_error_code text CHECK (
    last_error_code IS NULL OR
    (length(last_error_code) <= 64 AND last_error_code ~ '^BCV_[A-Z0-9_]+$')
  ),
  last_effective_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.bcv_sync_state (singleton) VALUES (true);

REVOKE ALL ON TABLE public.bcv_sync_state FROM PUBLIC;
GRANT SELECT ON TABLE public.bcv_sync_state TO microapp_runtime;
-- Runtime is read-only. The isolated BCV producer LOGIN (migration 0022)
-- owns synchronization writes; a partially applied migration bundle must
-- never let the API runtime forge the last-success checkout gate.


-- Enforce the latest-successful-sync gate at the database boundary as well as
-- in the API. A runtime SQL writer must not complete a sale using a same-day
-- rate after a newer BCV attempt has failed or is still running.
CREATE FUNCTION public.assert_sale_latest_bcv_sync_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $assert_sale_latest_bcv_sync_success$
DECLARE
  sync_last_success_at timestamptz;
  sync_last_outcome text;
  sync_last_effective_date date;
  operation_date date := (pg_catalog.now() AT TIME ZONE 'America/Caracas')::date;
BEGIN
  IF NEW.status <> 'completed'
    OR (TG_OP = 'UPDATE' AND OLD.status = 'completed')
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
    OR sync_last_effective_date IS NULL
    OR sync_last_effective_date < operation_date
  THEN
    RAISE EXCEPTION 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$assert_sale_latest_bcv_sync_success$;

REVOKE ALL ON FUNCTION public.assert_sale_latest_bcv_sync_success() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER sales_latest_bcv_sync_success
AFTER INSERT OR UPDATE ON public.sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_sale_latest_bcv_sync_success();

COMMIT;
