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
GRANT UPDATE (
  attempt_id,
  last_attempt_at,
  last_success_at,
  last_outcome,
  last_error_code,
  last_effective_date,
  updated_at
) ON TABLE public.bcv_sync_state TO microapp_runtime;

COMMIT;
