BEGIN;
DO $assertions$
BEGIN
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','TRUNCATE')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.bcv_sync_state','last_success_at','UPDATE')
  THEN RAISE EXCEPTION 'BCV_RUNTIME_SYNC_STATE_MUST_BE_READ_ONLY'; END IF;
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','DELETE')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.exchange_rates','validation_status','UPDATE')
  THEN RAISE EXCEPTION 'BCV_RUNTIME_RATES_MUST_BE_READ_ONLY'; END IF;
  IF NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_success_at','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_outcome','UPDATE')
    OR NOT pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','validation_status','UPDATE')
    OR pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','rate','UPDATE')
    OR pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','effective_date','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','DELETE')
  THEN RAISE EXCEPTION 'BCV_PRODUCER_GRANTS_INVALID'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.lock_bcv_sync_state()'::regprocedure
      AND p.prosecdef=true
      AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
      AND 'search_path=pg_catalog'=ANY(p.proconfig)
  ) OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_bcv_sync_state()','EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_bcv_sync','public.lock_bcv_sync_state()','EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid='public.lock_bcv_sync_state()'::regprocedure),
          pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid='public.lock_bcv_sync_state()'::regprocedure)))
      ) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    )
  THEN RAISE EXCEPTION 'BCV_LOCK_HELPER_SECURITY_CONTRACT_INVALID'; END IF;
END;
$assertions$;
ROLLBACK;
