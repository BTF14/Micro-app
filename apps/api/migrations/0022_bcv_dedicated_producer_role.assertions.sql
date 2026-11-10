BEGIN;
DO $assertions$
BEGIN
  -- Runtime keeps table-level read access but no effective table- or
  -- column-level INSERT/UPDATE privileges on either BCV table.
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_state','TRUNCATE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid='public.bcv_sync_state'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND (pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attname::text,'INSERT')
          OR pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attname::text,'UPDATE'))
    )
  THEN RAISE EXCEPTION 'BCV_RUNTIME_SYNC_STATE_MUST_BE_READ_ONLY'; END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','TRUNCATE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid='public.exchange_rates'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND (pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attname::text,'INSERT')
          OR pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attname::text,'UPDATE'))
    )
  THEN RAISE EXCEPTION 'BCV_RUNTIME_RATES_MUST_BE_READ_ONLY'; END IF;

  -- Producer uses only column-level access. It cannot read unrelated state,
  -- insert state rows, update the singleton key, or mutate rate history.
  IF pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_state','SELECT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_state','INSERT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_state','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_state','DELETE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_state','TRUNCATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','singleton','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','attempt_id','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_outcome','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','attempt_id','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_attempt_at','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_success_at','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_outcome','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_error_code','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','last_effective_date','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.bcv_sync_state','updated_at','UPDATE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid='public.bcv_sync_state'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND (
          (a.attname::text <> ALL(ARRAY['singleton','attempt_id','last_outcome']::text[])
            AND pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'SELECT'))
          OR pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'INSERT')
          OR (a.attname::text <> ALL(ARRAY['attempt_id','last_attempt_at','last_success_at','last_outcome','last_error_code','last_effective_date','updated_at']::text[])
            AND pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'UPDATE'))
        )
    )
  THEN RAISE EXCEPTION 'BCV_PRODUCER_SYNC_STATE_GRANTS_INVALID'; END IF;

  IF pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','SELECT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','INSERT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','DELETE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.exchange_rates','TRUNCATE')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','id','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','rate','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','source','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','effective_date','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','validation_status','SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','base_currency','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','quote_currency','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','rate','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','source','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','effective_date','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','fetched_at','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','validation_status','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_bcv_sync','public.exchange_rates','validation_status','UPDATE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid='public.exchange_rates'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND (
          (a.attname::text <> ALL(ARRAY['id','rate','source','effective_date','validation_status']::text[])
            AND pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'SELECT'))
          OR (a.attname::text <> ALL(ARRAY['base_currency','quote_currency','rate','source','effective_date','fetched_at','validation_status']::text[])
            AND pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'INSERT'))
          OR (a.attname::text <> 'validation_status'
            AND pg_catalog.has_column_privilege('microapp_bcv_sync',a.attrelid,a.attname::text,'UPDATE'))
        )
    )
    OR pg_catalog.has_schema_privilege('microapp_bcv_sync','public','CREATE')
    OR NOT pg_catalog.has_schema_privilege('microapp_bcv_sync','public','USAGE')
  THEN RAISE EXCEPTION 'BCV_PRODUCER_RATE_GRANTS_INVALID'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members
    WHERE roleid=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_bcv_sync')
       OR member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_bcv_sync')
  )
  THEN RAISE EXCEPTION 'BCV_PRODUCER_ROLE_MEMBERSHIP_FORBIDDEN'; END IF;

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
