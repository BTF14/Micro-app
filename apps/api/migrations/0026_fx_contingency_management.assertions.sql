-- Run after 0026_fx_contingency_management.sql on disposable PostgreSQL 18.
-- This script is intentionally transactional and leaves no test mutations.
BEGIN;

DO $fx_contingency_assertions$
DECLARE
  owner_name text;
  function_oid oid;
  function_definition text;
  function_owner text;
  function_security_definer boolean;
  default_expression text;
  trigger_count integer;
  old_completion_checks integer;
BEGIN
  -- Core table ownership remains with the isolated migrator.
  SELECT r.rolname INTO owner_name
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
   WHERE c.oid = 'public.bcv_sync_success_observations'::regclass;
  IF owner_name <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'BCV_OBSERVATION_TABLE_OWNER_INVALID';
  END IF;

  -- Observation ACL is SELECT-only for runtime and completely absent for producer/PUBLIC.
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','TRUNCATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','TRIGGER')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','SELECT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','INSERT')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','DELETE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','TRUNCATE')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class rel CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(rel.relacl,pg_catalog.acldefault('r',rel.relowner))) acl WHERE rel.oid='public.bcv_sync_success_observations'::regclass AND acl.grantee=0)
  THEN RAISE EXCEPTION 'BCV_OBSERVATION_ACL_INVALID'; END IF;

  SELECT count(*) INTO trigger_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.bcv_sync_success_observations'::regclass
     AND NOT t.tgisinternal AND t.tgenabled = 'A'
     AND t.tgname IN (
       'bcv_sync_success_observations_10_append_only_rows',
       'bcv_sync_success_observations_20_append_only_truncate'
     );
  IF trigger_count <> 2 THEN RAISE EXCEPTION 'BCV_OBSERVATION_ENABLE_ALWAYS_TRIGGERS_MISSING'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.fx_user_pin_credentials'::regclass
       AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%iterations = 100000%'
  ) THEN RAISE EXCEPTION 'FX_PIN_V1_ITERATIONS_MUST_MATCH_WORKERS_RUNTIME'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid='public.fx_contingency_authorizations'::regclass
       AND attname='reference_effective_date' AND NOT attisdropped
  ) THEN RAISE EXCEPTION 'FX_REFERENCE_EFFECTIVE_DATE_SNAPSHOT_MISSING'; END IF;

  SELECT count(*) INTO trigger_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.fx_contingency_events'::regclass
     AND NOT t.tgisinternal AND t.tgenabled = 'A'
     AND t.tgname IN ('fx_contingency_events_10_append_only_rows','fx_contingency_events_20_append_only_truncate');
  IF trigger_count <> 2 THEN RAISE EXCEPTION 'FX_EVENTS_ENABLE_ALWAYS_TRIGGERS_MISSING'; END IF;

  SELECT p.oid INTO function_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.assert_sale_latest_bcv_sync_success()'::regprocedure
     AND p.prosecdef
     AND p.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
  IF function_oid IS NULL THEN RAISE EXCEPTION 'BCV_SALE_GUARD_SECURITY_CONTRACT_INVALID'; END IF;
  SELECT pg_catalog.pg_get_functiondef(function_oid) INTO function_definition;
  IF pg_catalog.strpos(function_definition, 'clock_timestamp') = 0
    OR pg_catalog.strpos(function_definition, 'FOR SHARE') = 0
    OR pg_catalog.strpos(function_definition, 'fx_source') = 0
    OR pg_catalog.strpos(function_definition, 'America/Caracas') = 0
  THEN RAISE EXCEPTION 'BCV_SALE_GUARD_DEFINITION_INVALID'; END IF;
  IF pg_catalog.has_function_privilege('microapp_runtime',function_oid,'EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_bcv_sync',function_oid,'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=function_oid),
          pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=function_oid)))
      ) acl WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    )
  THEN RAISE EXCEPTION 'BCV_SALE_GUARD_MUST_BE_TRIGGER_ONLY'; END IF;

  IF pg_catalog.strpos(function_definition, 'FROM public.bcv_sync_state') = 0
    OR pg_catalog.strpos(function_definition, 'FROM public.fx_contingency_authorizations auth') = 0
    OR pg_catalog.strpos(function_definition, 'operation_time := pg_catalog.clock_timestamp()') = 0
    OR pg_catalog.strpos(function_definition, 'FROM public.bcv_sync_state')
       > pg_catalog.strpos(function_definition, 'FROM public.fx_contingency_authorizations auth')
    OR pg_catalog.strpos(function_definition, 'FROM public.fx_contingency_authorizations auth')
       > pg_catalog.strpos(function_definition, 'operation_time := pg_catalog.clock_timestamp()')
  THEN RAISE EXCEPTION 'MANUAL_FX_CLOCK_MUST_BE_CAPTURED_AFTER_BCV_AND_FX_LOCKS'; END IF;

  IF pg_catalog.strpos(function_definition, 'reference_effective_date')
     = 0 THEN RAISE EXCEPTION 'FX_REFERENCE_EFFECTIVE_DATE_SNAPSHOT_MISSING'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.fx_contingency_authorizations'::regclass
       AND contype='c'
       AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%* 2000%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.fx_contingency_authorizations'::regclass
       AND contype='c'
       AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%* 500%'
  ) THEN
    RAISE EXCEPTION 'FX_DEVIATION_LIMITS_MUST_USE_EXACT_DECIMAL_COMPARISONS';
  END IF;

  SELECT p.oid INTO function_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.capture_bcv_sync_success_observation()'::regprocedure
     AND p.prosecdef
     AND p.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
  IF function_oid IS NULL THEN RAISE EXCEPTION 'BCV_OBSERVATION_CAPTURE_FUNCTION_SECURITY_INVALID'; END IF;
  SELECT pg_catalog.pg_get_functiondef(function_oid) INTO function_definition;
  IF pg_catalog.strpos(function_definition, 'clock_timestamp') = 0 THEN
    RAISE EXCEPTION 'BCV_OBSERVATION_TIME_MUST_USE_CLOCK_TIMESTAMP';
  END IF;
  IF pg_catalog.has_function_privilege('microapp_runtime',function_oid,'EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_bcv_sync',function_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'BCV_OBSERVATION_CAPTURE_MUST_BE_TRIGGER_ONLY';
  END IF;

  SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO default_expression
    FROM pg_catalog.pg_attrdef d
    JOIN pg_catalog.pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
   WHERE d.adrelid='public.fx_contingency_authorizations'::regclass AND a.attname='starts_at';
  IF default_expression IS NULL OR default_expression NOT ILIKE '%clock_timestamp%' THEN
    RAISE EXCEPTION 'FX_AUTHORIZATION_STARTS_AT_MUST_USE_CLOCK_TIMESTAMP';
  END IF;

  SELECT p.oid INTO function_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.assert_completed_sale_reconciled()'::regprocedure
     AND p.prosecdef
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator');
  IF function_oid IS NULL THEN RAISE EXCEPTION 'COMPLETED_SALE_GUARD_SECURITY_CONTRACT_INVALID'; END IF;
  SELECT pg_catalog.pg_get_functiondef(function_oid) INTO function_definition;
  IF pg_catalog.strpos(function_definition,'obs.observed_at > auth_row.starts_at')=0
    OR pg_catalog.strpos(function_definition,'obs.last_success_at > auth_row.starts_at')>0
    OR pg_catalog.strpos(function_definition,'obs.rate_fetched_at > auth_row.starts_at')=0
    OR pg_catalog.strpos(function_definition,'obs.last_outcome = ''unchanged''')=0
  THEN RAISE EXCEPTION 'BCV_RECOVERY_OBSERVATION_CONTRACT_INVALID'; END IF;

  IF pg_catalog.pg_get_constraintdef((
      SELECT oid FROM pg_catalog.pg_constraint
       WHERE conrelid='public.sales'::regclass AND conname='sales_fx_ack_contract_ck'
    )) NOT ILIKE '%manual_fx_acknowledged_by_user_id = created_by%'
    OR pg_catalog.pg_get_constraintdef((
      SELECT oid FROM pg_catalog.pg_constraint
       WHERE conrelid='public.sales'::regclass AND conname='sales_fx_ack_contract_ck'
    )) NOT ILIKE '%fx_source%'
  THEN RAISE EXCEPTION 'SALES_MANUAL_ACK_ACTOR_CONTRACT_INVALID'; END IF;

  SELECT count(*) INTO trigger_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.bcv_sync_state'::regclass
     AND t.tgname='bcv_sync_success_observation_capture'
     AND NOT t.tgisinternal
     AND (t.tgtype & 16) = 16 AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1;
  IF trigger_count <> 1 THEN RAISE EXCEPTION 'BCV_SUCCESS_OBSERVATION_CAPTURE_TRIGGER_MISSING'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
     WHERE schemaname='public' AND indexname='fx_contingency_authorizations_one_active_per_branch'
       AND indexdef ILIKE '%WHERE (status = ''active''::text)%'
  ) THEN RAISE EXCEPTION 'FX_AUTHORIZATION_ACTIVE_UNIQUE_INDEX_MISSING'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.sales'::regclass AND conname='sales_fx_ack_contract_ck'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.sales'::regclass AND conname='sales_completed_fx_snapshot_ck'
  ) THEN RAISE EXCEPTION 'SALES_FX_SOURCE_OR_ACK_CONSTRAINT_MISSING'; END IF;

  SELECT count(*) INTO old_completion_checks
    FROM pg_catalog.pg_constraint
   WHERE conrelid='public.sales'::regclass AND contype='c'
     AND conname <> 'sales_completed_fx_snapshot_ck'
     AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%exchange_rate_id IS NOT NULL%'
     AND pg_catalog.pg_get_constraintdef(oid) ILIKE '%status%completed%';
  IF old_completion_checks <> 0 THEN
    RAISE EXCEPTION 'LEGACY_SALES_COMPLETION_CHECK_WAS_NOT_REPLACED';
  END IF;

  FOREACH function_oid IN ARRAY ARRAY[
    'public.lock_active_fx_contingency_authorization(uuid,uuid)'::regprocedure::oid,
    'public.lock_branch_fx_contingency_authorization(uuid,uuid)'::regprocedure::oid,
    'public.lock_active_fx_contingency_authorization_for_transition(uuid,uuid)'::regprocedure::oid,
    'public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)'::regprocedure::oid
  ] LOOP
    SELECT pg_catalog.pg_get_userbyid(p.proowner),p.prosecdef
      INTO function_owner,function_security_definer
      FROM pg_catalog.pg_proc p WHERE p.oid=function_oid;
    IF function_owner <> 'microapp_migrator' OR NOT function_security_definer
      OR NOT pg_catalog.has_function_privilege('microapp_runtime',function_oid,'EXECUTE')
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc proc,
          LATERAL pg_catalog.aclexplode(COALESCE(proc.proacl,pg_catalog.acldefault('f',proc.proowner))) acl
         WHERE proc.oid=function_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
      ) THEN
      RAISE EXCEPTION 'FX_AUTHORIZATION_LOCK_HELPER_CONTRACT_INVALID';
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.fx_user_pin_credentials','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_user_pin_credentials','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_user_pin_credentials','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_user_pin_credentials','DELETE')
    OR pg_catalog.has_table_privilege('microapp_bcv_sync','public.fx_user_pin_credentials','SELECT')
    OR NOT pg_catalog.has_function_privilege(
      'microapp_runtime',
      'public.set_fx_user_pin_credential(uuid,uuid,uuid,text,integer,bytea,bytea)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'FX_PIN_CREDENTIAL_LEAST_PRIVILEGE_INVALID';
  END IF;

  IF pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_authorizations','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_authorizations','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_delegations','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_delegations','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_events','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_events','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_events','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.fx_contingency_events','TRUNCATE')
  THEN RAISE EXCEPTION 'FX_EVENTS_RUNTIME_MUST_USE_NARROW_APPEND_FUNCTION'; END IF;
  IF pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.append_fx_contingency_event(uuid,uuid,uuid,text,uuid,text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FX_EVENT_APPEND_HELPER_MUST_NOT_BE_RUNTIME_CALLABLE';
  END IF;
END;
$fx_contingency_assertions$;

ROLLBACK;
