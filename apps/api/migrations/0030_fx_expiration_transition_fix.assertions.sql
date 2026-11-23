-- Run after migration 0030 on disposable PostgreSQL or Neon main.
BEGIN;
DO $fx_0030_assertions$
DECLARE
  fn oid;
  fn_def text;
  owner_name text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.capture_sales_bcv_0027_snapshot()'::regprocedure::oid,
    'public.assert_sales_bcv_0027_snapshot()'::regprocedure::oid,
    'public.assert_completed_sale_reconciled()'::regprocedure::oid,
    'public.assert_sale_latest_bcv_sync_success()'::regprocedure::oid,
    'public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)'::regprocedure::oid
  ] LOOP
    SELECT pg_catalog.pg_get_userbyid(proowner), pg_catalog.pg_get_functiondef(oid)
      INTO owner_name, fn_def FROM pg_catalog.pg_proc WHERE oid=fn;
    IF owner_name <> 'microapp_migrator'
       OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=fn)
       OR NOT (SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_catalog.pg_proc WHERE oid=fn) THEN
      RAISE EXCEPTION 'FX_0030_FUNCTION_SECURITY_CONTRACT_INVALID_%', fn::regprocedure;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
        (SELECT proacl FROM pg_catalog.pg_proc WHERE oid=fn),
        pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=fn))
      )) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    ) THEN
      RAISE EXCEPTION 'FX_0030_FUNCTION_PUBLIC_EXECUTE_%', fn::regprocedure;
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_functiondef(
    'public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)'::regprocedure
  ) INTO fn_def;
  IF pg_catalog.strpos(fn_def, 'selected_rate.exchange_rate_id') = 0
     OR pg_catalog.strpos(fn_def, 'public.select_bcv_rate_for_operation') = 0
     OR pg_catalog.strpos(fn_def, 'FX_BCV_RECOVERY_NOT_ELIGIBLE') = 0
     OR pg_catalog.strpos(fn_def, 'FX_BCV_RECOVERY_EVIDENCE_MISSING') = 0
     OR pg_catalog.strpos(fn_def, 'IF p_new_status = ''bcv_restored'' THEN') = 0 THEN
    RAISE EXCEPTION 'FX_0030_TRANSITION_RECOVERY_GUARD_MISSING';
  END IF;
  IF NOT pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.transition_fx_contingency_authorization(uuid,uuid,uuid,text,uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FX_0030_TRANSITION_RUNTIME_EXECUTE_MISSING';
  END IF;
  IF pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.capture_sales_bcv_0027_snapshot()',
    'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.assert_sales_bcv_0027_snapshot()',
    'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.assert_completed_sale_reconciled()',
    'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'microapp_runtime',
    'public.assert_sale_latest_bcv_sync_success()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FX_0030_TRIGGER_FUNCTION_RUNTIME_EXECUTE_BROADENED';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.capture_sales_bcv_0027_snapshot()'::regprocedure) INTO fn_def;
  IF pg_catalog.strpos(fn_def, 'SALE_REQUIRES_CURRENT_BCV_RATE') = 0
     OR pg_catalog.strpos(fn_def, 'selected.exchange_rate_id') = 0 THEN
    RAISE EXCEPTION 'FX_0030_CAPTURE_SELECTOR_GUARD_MISSING';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.assert_sales_bcv_0027_snapshot()'::regprocedure) INTO fn_def;
  IF pg_catalog.strpos(fn_def, 'SALE_BCV_DATE_SNAPSHOT_INVALID') = 0
     OR pg_catalog.strpos(fn_def, 'selected.exchange_rate_id') = 0 THEN
    RAISE EXCEPTION 'FX_0030_SNAPSHOT_SELECTOR_GUARD_MISSING';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.assert_completed_sale_reconciled()'::regprocedure) INTO fn_def;
  IF pg_catalog.strpos(fn_def, 'SALE_REQUIRES_CURRENT_BCV_RATE') = 0
     OR pg_catalog.strpos(fn_def, 'selected_rate.exchange_rate_id') = 0 THEN
    RAISE EXCEPTION 'FX_0030_RECONCILIATION_SELECTOR_GUARD_MISSING';
  END IF;
  SELECT pg_catalog.pg_get_functiondef('public.assert_sale_latest_bcv_sync_success()'::regprocedure) INTO fn_def;
  IF pg_catalog.strpos(fn_def, 'SALE_REQUIRES_LATEST_SUCCESSFUL_BCV_SYNC') = 0
     OR pg_catalog.strpos(fn_def, 'selected.exchange_rate_id') = 0 THEN
    RAISE EXCEPTION 'FX_0030_LATEST_SYNC_SELECTOR_GUARD_MISSING';
  END IF;
END;
$fx_0030_assertions$;
ROLLBACK;
