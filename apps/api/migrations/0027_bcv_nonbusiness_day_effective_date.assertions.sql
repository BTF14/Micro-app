-- Run after migration 0027 on disposable PostgreSQL 18.
BEGIN;
DO $bcv_0027_assertions$
DECLARE fn oid; fn_def text; owner_name text; trigger_count integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.sales'::regclass AND attname='operation_date' AND NOT attisdropped AND atttypid='date'::regtype)
 OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.sales'::regclass AND attname='exchange_rate_effective_date' AND NOT attisdropped AND atttypid='date'::regtype)
 THEN RAISE EXCEPTION 'BCV_0027_DUAL_DATE_COLUMNS_MISSING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.sales'::regclass AND conname='sales_completed_0027_date_snapshot_ck' AND contype='c' AND NOT convalidated)
 THEN RAISE EXCEPTION 'BCV_0027_HISTORICAL_COMPATIBLE_CHECK_MISSING'; END IF;
 SELECT count(*) INTO trigger_count FROM pg_trigger WHERE tgrelid='public.sales'::regclass AND NOT tgisinternal AND tgenabled='A'
 AND tgname IN('sales_00_capture_bcv_0027_snapshot','sales_01_guard_bcv_0027_snapshot_immutable','sales_99_assert_bcv_0027_snapshot');
 IF trigger_count<>3 THEN RAISE EXCEPTION 'BCV_0027_ENABLE_ALWAYS_TRIGGERS_MISSING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.sales'::regclass AND tgname='sales_99_assert_bcv_0027_snapshot' AND strpos(pg_get_triggerdef(oid),'INSERT')>0)
 THEN RAISE EXCEPTION 'BCV_0027_DIRECT_INSERT_ASSERTION_TRIGGER_MISSING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.sales'::regclass AND tgname='sales_00_capture_bcv_0027_snapshot' AND strpos(pg_get_triggerdef(oid),'BEFORE INSERT OR UPDATE OF status')>0)
 THEN RAISE EXCEPTION 'BCV_0027_CAPTURE_TRIGGER_MUST_COVER_DIRECT_INSERT_AND_STATUS_UPDATE'; END IF;
 FOREACH fn IN ARRAY ARRAY[
 'public.select_bcv_rate_for_operation(date)'::regprocedure::oid,
 'public.capture_sales_bcv_0027_snapshot()'::regprocedure::oid,
 'public.guard_sales_bcv_0027_snapshot_immutable()'::regprocedure::oid,
 'public.assert_sales_bcv_0027_snapshot()'::regprocedure::oid,
 'public.assert_sale_latest_bcv_sync_success()'::regprocedure::oid,
 'public.assert_completed_sale_reconciled()'::regprocedure::oid
 ] LOOP
 SELECT pg_get_userbyid(proowner),pg_get_functiondef(oid) INTO owner_name,fn_def FROM pg_proc WHERE oid=fn;
 IF owner_name<>'microapp_migrator' OR NOT(SELECT prosecdef FROM pg_proc WHERE oid=fn)
 OR NOT(SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc WHERE oid=fn)
 THEN RAISE EXCEPTION 'BCV_0027_FUNCTION_SECURITY_CONTRACT_INVALID_%',fn::regprocedure; END IF;
 IF has_function_privilege('microapp_runtime',fn,'EXECUTE') OR has_function_privilege('microapp_bcv_sync',fn,'EXECUTE')
 OR EXISTS(SELECT 1 FROM aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid=fn),acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=fn)))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'BCV_0027_TRIGGER_ONLY_FUNCTION_ACL_INVALID_%',fn::regprocedure; END IF;
 END LOOP;
 SELECT pg_get_functiondef('public.select_bcv_rate_for_operation(date)'::regprocedure) INTO fn_def;
 IF strpos(fn_def,'weekend_prepublished')=0 OR strpos(fn_def,'weekday_same_day_sync')=0 OR strpos(fn_def,'p_operation_date + 5')=0 OR strpos(fn_def,'America/Caracas')=0 OR strpos(fn_def,'FOR SHARE')=0 OR strpos(fn_def,'base_currency')=0 OR strpos(fn_def,'rate > 0')=0 OR strpos(fn_def,'bcv_sync_success_observations')=0 OR strpos(fn_def,'obs.last_success_at')=0 OR strpos(fn_def,'obs.last_effective_date')=0
 THEN RAISE EXCEPTION 'BCV_0027_SELECTION_POLICY_DEFINITION_INVALID'; END IF;
 SELECT pg_get_functiondef('public.assert_completed_sale_reconciled()'::regprocedure) INTO fn_def;
 IF strpos(fn_def,'public.select_bcv_rate_for_operation')=0 OR strpos(fn_def,'operation_date')=0 OR strpos(fn_def,'exchange_rate_effective_date')=0
 OR strpos(fn_def,'COMPLETED_SALE_LINES_DO_NOT_RECONCILE')=0 OR strpos(fn_def,'COMPLETED_SALE_PAYMENTS_DO_NOT_RECONCILE')=0
 OR strpos(fn_def,'COMPLETED_SALE_MISSING_INVENTORY_LEDGER_MOVEMENT')=0 OR strpos(fn_def,'COMPLETED_SALE_AUDIT_EVENT_REQUIRED')=0
 THEN RAISE EXCEPTION 'BCV_0027_EXISTING_0026_RECONCILIATION_NOT_PRESERVED'; END IF;
 IF has_table_privilege('microapp_runtime','public.bcv_sync_state','UPDATE')
 OR has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','SELECT')
 OR has_table_privilege('microapp_bcv_sync','public.bcv_sync_success_observations','INSERT')
 OR has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','INSERT')
 OR has_table_privilege('microapp_runtime','public.bcv_sync_success_observations','UPDATE')
 THEN RAISE EXCEPTION 'BCV_0027_ROLE_PRIVILEGES_WERE_BROADENED'; END IF;
 fn := 'public.create_fx_contingency_authorization(uuid,uuid,numeric,numeric,uuid,text,timestamptz,uuid,text,text,text)'::regprocedure::oid;
 SELECT pg_get_userbyid(proowner),pg_get_functiondef(oid) INTO owner_name,fn_def FROM pg_proc WHERE oid=fn;
 IF owner_name<>'microapp_migrator' OR NOT(SELECT prosecdef FROM pg_proc WHERE oid=fn)
   OR NOT(SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc WHERE oid=fn)
   OR NOT has_function_privilege('microapp_runtime',fn,'EXECUTE')
 THEN RAISE EXCEPTION 'BCV_0027_CONTINGENCY_FUNCTION_SECURITY_CONTRACT_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid=fn),acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=fn)))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'BCV_0027_CONTINGENCY_FUNCTION_PUBLIC_EXECUTE'; END IF;
 IF strpos(fn_def,'public.select_bcv_rate_for_operation(operation_date)')=0 OR strpos(fn_def,'BCV_RATE_ALREADY_AVAILABLE')=0
 THEN RAISE EXCEPTION 'BCV_0027_CONTINGENCY_MUST_DEFER_TO_APPLICABLE_OFFICIAL_RATE'; END IF;
 IF NOT has_function_privilege('microapp_runtime','public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'BCV_0026_TRANSITION_RUNTIME_EXECUTE_WAS_REMOVED'; END IF;
 fn := 'public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)'::regprocedure::oid;
 SELECT pg_get_userbyid(proowner),pg_get_functiondef(oid) INTO owner_name,fn_def FROM pg_proc WHERE oid=fn;
 IF owner_name<>'microapp_migrator' OR NOT(SELECT prosecdef FROM pg_proc WHERE oid=fn)
   OR NOT(SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc WHERE oid=fn)
   OR strpos(fn_def,'public.select_bcv_rate_for_operation')=0
   OR strpos(fn_def,'FX_BCV_RECOVERY_NOT_ELIGIBLE')=0
   OR strpos(fn_def,'selected_rate.exchange_rate_id')=0
   OR EXISTS(SELECT 1 FROM aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid=fn),acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=fn)))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'BCV_0027_CONTINGENCY_RECOVERY_TRANSITION_NOT_SELECTOR_GATED'; END IF;
END;
$bcv_0027_assertions$;
ROLLBACK;
