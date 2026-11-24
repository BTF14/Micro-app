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
  -- PostgreSQL 16+ can grant the role creator ADMIN OPTION on a role it creates.
  -- Permit only the current database's direct owner as an incoming member, and
  -- only with ADMIN OPTION (no inheritance and no SET ROLE). All outgoing
  -- memberships remain forbidden. Superusers inherently bypass role membership
  -- checks, so effective USAGE/SET checks apply to non-superuser database owners.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members m
    WHERE m.member = producer.oid
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_database d ON d.datname = current_database()
    WHERE m.roleid = producer.oid
      AND (
        m.member <> d.datdba
        OR NOT m.admin_option
        OR m.inherit_option
        OR m.set_option
      )
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_database d
    JOIN pg_catalog.pg_roles database_owner ON database_owner.oid = d.datdba
    WHERE d.datname = current_database()
      AND NOT database_owner.rolsuper
      AND (
        pg_catalog.pg_has_role(d.datdba, producer.oid, 'USAGE')
        OR pg_catalog.pg_has_role(d.datdba, producer.oid, 'SET')
      )
  )
  THEN RAISE EXCEPTION 'MICROAPP_BCV_SYNC_ROLE_MEMBERSHIP_FORBIDDEN'; END IF;
  -- Schema ACLs are provisioned by the schema owner, not this migration role.
  -- Fail closed rather than pretending the table owner can revoke schema grants.
  IF NOT pg_catalog.has_schema_privilege('microapp_bcv_sync','public','USAGE')
    OR pg_catalog.has_schema_privilege('microapp_bcv_sync','public','CREATE')
  THEN RAISE EXCEPTION 'MICROAPP_BCV_SYNC_SCHEMA_PRIVILEGES_INVALID'; END IF;
END;
$preflight$;

-- Runtime can read the BCV state/rates, but all direct table- and
-- column-level writes are removed. The checkout lock is exposed separately.
-- These are private application tables. Remove any accidental PUBLIC
-- table ACLs and independent column ACLs before granting named principals.
REVOKE ALL ON TABLE public.bcv_sync_state, public.exchange_rates FROM PUBLIC;
REVOKE SELECT (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM PUBLIC;
REVOKE INSERT (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM PUBLIC;
REVOKE UPDATE (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM PUBLIC;
REVOKE REFERENCES (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM PUBLIC;
REVOKE SELECT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM PUBLIC;
REVOKE INSERT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM PUBLIC;
REVOKE UPDATE (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM PUBLIC;
REVOKE REFERENCES (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM PUBLIC;

REVOKE ALL ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE INSERT (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE UPDATE (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
REVOKE REFERENCES (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_runtime;
GRANT SELECT ON TABLE public.bcv_sync_state TO microapp_runtime;

REVOKE ALL ON TABLE public.exchange_rates FROM microapp_runtime;
GRANT SELECT ON TABLE public.exchange_rates TO microapp_runtime;
REVOKE INSERT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_runtime;
REVOKE UPDATE (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_runtime;
REVOKE REFERENCES (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
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
REVOKE REFERENCES (singleton,attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at)
  ON TABLE public.bcv_sync_state FROM microapp_bcv_sync;

REVOKE ALL ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE SELECT (base_currency,quote_currency,fetched_at,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE INSERT (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE UPDATE (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;
REVOKE REFERENCES (id,base_currency,quote_currency,rate,source,effective_date,fetched_at,validation_status,created_at)
  ON TABLE public.exchange_rates FROM microapp_bcv_sync;

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
