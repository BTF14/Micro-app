BEGIN;
SET LOCAL lock_timeout = '5s';
DO $preflight$
DECLARE producer pg_catalog.pg_roles%ROWTYPE; runtime_oid oid;
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'BCV_PRODUCER_MIGRATION_REQUIRES_MIGRATOR';
  END IF;
  SELECT * INTO producer FROM pg_catalog.pg_roles WHERE rolname='microapp_bcv_sync';
  SELECT oid INTO runtime_oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime';
  IF producer.rolname IS NULL OR NOT producer.rolcanlogin OR producer.rolsuper
    OR producer.rolcreatedb OR producer.rolcreaterole OR producer.rolreplication
    OR producer.rolbypassrls OR producer.rolinherit OR runtime_oid IS NULL
  THEN RAISE EXCEPTION 'MICROAPP_BCV_SYNC_ROLE_ATTRIBUTES_INVALID'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=producer.oid OR member=producer.oid)
  THEN RAISE EXCEPTION 'MICROAPP_BCV_SYNC_ROLE_MEMBERSHIP_FORBIDDEN'; END IF;
END;
$preflight$;

-- Runtime can read the BCV state/rates, but all direct table- and
-- column-level writes are removed. The checkout lock is exposed separately.
REVOKE ALL ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE INSERT (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE UPDATE (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
GRANT SELECT ON TABLE public.bcv_sync_state TO microapp_runtime;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.exchange_rates FROM microapp_runtime;
REVOKE INSERT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_runtime;
REVOKE UPDATE (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_runtime;

-- Normalize a pre-existing producer LOGIN before granting the narrow contract.
-- Table-level REVOKE does not remove independent column ACLs, so reset those
-- explicitly as well. The producer never needs table-level SELECT/INSERT.
REVOKE ALL ON TABLE public.bcv_sync_state FROM microapp_bcv_sync;
REVOKE SELECT (last_attempt_at,last_success_at,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_bcv_sync;
REVOKE INSERT (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_bcv_sync;
REVOKE UPDATE (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_bcv_sync;

REVOKE ALL ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE SELECT (base_currency,quote_currency,fetched_at,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE INSERT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE UPDATE (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE CREATE ON SCHEMA public FROM microapp_bcv_sync;
GRANT USAGE ON SCHEMA public TO microapp_bcv_sync;

-- Grant only columns actually read/written by syncBcvOfficialRate() and
-- persistBcvOfficialRate(). RETURNING id and ON CONFLICT require SELECT on
-- id/source/effective_date; no other rate metadata is needed by the producer.
GRANT SELECT (singleton,attempt_id,last_outcome)
  ON TABLE public.bcv_sync_state TO microapp_bcv_sync;
GRANT UPDATE (attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state TO microapp_bcv_sync;
GRANT SELECT (id,rate,source,effective_date,validation_status)
  ON TABLE public.exchange_rates TO microapp_bcv_sync;
GRANT INSERT (base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status)
  ON TABLE public.exchange_rates TO microapp_bcv_sync;
GRANT UPDATE (validation_status) ON TABLE public.exchange_rates TO microapp_bcv_sync;

-- PostgreSQL requires UPDATE privilege to take FOR SHARE locks. Expose only
-- the read-and-lock operation to the API runtime, not direct row mutation.
CREATE FUNCTION public.lock_bcv_sync_state()
RETURNS TABLE (last_success_at timestamptz, last_outcome text, last_effective_date date)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $lock_bcv_sync_state$
  SELECT state.last_success_at, state.last_outcome, state.last_effective_date
    FROM public.bcv_sync_state AS state
   WHERE state.singleton = true
   FOR SHARE;
$lock_bcv_sync_state$;
REVOKE ALL ON FUNCTION public.lock_bcv_sync_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_bcv_sync_state() TO microapp_runtime;
COMMIT;
