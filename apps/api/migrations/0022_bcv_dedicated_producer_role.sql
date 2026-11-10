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

REVOKE ALL ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE UPDATE (attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
GRANT SELECT ON TABLE public.bcv_sync_state TO microapp_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.exchange_rates FROM microapp_runtime;
REVOKE UPDATE (validation_status) ON TABLE public.exchange_rates FROM microapp_runtime;

GRANT SELECT, INSERT ON TABLE public.exchange_rates TO microapp_bcv_sync;
GRANT UPDATE (validation_status) ON TABLE public.exchange_rates TO microapp_bcv_sync;
GRANT SELECT ON TABLE public.bcv_sync_state TO microapp_bcv_sync;
GRANT UPDATE (attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state TO microapp_bcv_sync;

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
