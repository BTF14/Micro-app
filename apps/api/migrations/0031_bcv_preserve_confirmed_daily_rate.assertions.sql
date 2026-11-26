-- Run after migration 0031 on disposable PostgreSQL 18.
BEGIN;
DO $bcv_0031_assertions$
DECLARE
  fn oid := 'public.select_bcv_rate_for_operation(date)'::regprocedure::oid;
  fn_def text;
  owner_name text;
BEGIN
  SELECT pg_catalog.pg_get_userbyid(proowner), pg_catalog.pg_get_functiondef(oid)
    INTO owner_name, fn_def FROM pg_catalog.pg_proc WHERE oid=fn;
  IF owner_name <> 'microapp_migrator'
     OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=fn)
     OR NOT (SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_catalog.pg_proc WHERE oid=fn) THEN
    RAISE EXCEPTION 'BCV_0031_SELECTOR_SECURITY_CONTRACT_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
      (SELECT proacl FROM pg_catalog.pg_proc WHERE oid=fn),
      pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=fn))
    )) acl
    WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
  ) OR pg_catalog.has_function_privilege('microapp_runtime',fn,'EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_bcv_sync',fn,'EXECUTE') THEN
    RAISE EXCEPTION 'BCV_0031_SELECTOR_EXECUTE_PRIVILEGE_BROADENED';
  END IF;
  IF pg_catalog.strpos(fn_def,'FOR SHARE')=0
     OR pg_catalog.strpos(fn_def,'bcv_sync_success_observations')=0
     OR pg_catalog.strpos(fn_def,'obs.last_effective_date >= selected_date')=0
     OR pg_catalog.strpos(fn_def,'weekday_same_day_sync')=0
     OR pg_catalog.strpos(fn_def,'America/Caracas')=0
     OR pg_catalog.strpos(fn_def,'sync_success_at < (p_operation_date::timestamp AT TIME ZONE')=0
     OR pg_catalog.strpos(fn_def,'clock_timestamp()')=0
     OR pg_catalog.strpos(fn_def,'sync_state.last_outcome')>0
     OR pg_catalog.strpos(fn_def,'sync_state.last_error_code')>0 THEN
    RAISE EXCEPTION 'BCV_0031_DURABLE_OBSERVATION_POLICY_INVALID';
  END IF;
  IF pg_catalog.strpos(fn_def,'obs.exchange_rate_id=selected_id')>0
     OR pg_catalog.strpos(fn_def,'obs.last_effective_date=selected_date')>0 THEN
    RAISE EXCEPTION 'BCV_0031_OBSERVATION_MUST_COVER_SELECTED_DATE_NOT_MATCH_EXACTLY';
  END IF;
END;
$bcv_0031_assertions$;
ROLLBACK;
