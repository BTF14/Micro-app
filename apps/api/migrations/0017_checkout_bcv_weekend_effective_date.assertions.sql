-- Run after 0017_checkout_bcv_weekend_effective_date.sql on disposable PostgreSQL.
BEGIN;

DO $checkout_bcv_contract_assertions$
DECLARE
  helper_oid oid;
  trigger_oid oid;
  helper_definition text;
  helper_definition_lower text;
  trigger_definition text;
  saturday_date date;
  sunday_date date;
  weekday_date date;
BEGIN
  SELECT oid INTO helper_oid
    FROM pg_catalog.pg_proc
   WHERE oid = 'public.applicable_bcv_effective_date(timestamptz)'::regprocedure
     AND prosecdef = true
     AND proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
  IF helper_oid IS NULL THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_EFFECTIVE_DATE_HELPER_SECURITY_CONTRACT_INVALID';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(helper_oid) INTO helper_definition;
  -- pg_get_functiondef may normalize SQL keywords while deparsing the stored body.
  -- Compare a lowercase representation so this contract checks semantics, not casing.
  helper_definition_lower := pg_catalog.lower(helper_definition);
  IF pg_catalog.strpos(helper_definition_lower, 'isodow') = 0
    OR pg_catalog.strpos(helper_definition_lower, 'min(er.effective_date)') = 0
    OR pg_catalog.strpos(helper_definition_lower, 'effective_date > caracas_now::date') = 0
  THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_HELPER_WEEKEND_SELECTION_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(
      COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=helper_oid),
               pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=helper_oid)))
    ) acl
    WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
  ) OR pg_catalog.has_function_privilege('microapp_runtime',helper_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_HELPER_MUST_NOT_BE_PUBLIC_OR_RUNTIME_EXECUTABLE';
  END IF;
  IF NOT pg_catalog.has_function_privilege('microapp_migrator',helper_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_MIGRATOR_HELPER_EXECUTE_MISSING';
  END IF;

  SELECT oid INTO trigger_oid
    FROM pg_catalog.pg_proc
   WHERE oid = 'public.assert_completed_sale_reconciled()'::regprocedure
     AND prosecdef = true;
  IF trigger_oid IS NULL THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_RECONCILIATION_TRIGGER_SECURITY_DEFINER_REQUIRED';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(trigger_oid) INTO trigger_definition;
  IF pg_catalog.strpos(trigger_definition, 'applicable_bcv_effective_date') = 0
    OR pg_catalog.strpos(trigger_definition, 'validation_status = ''valid''') = 0
    OR pg_catalog.strpos(trigger_definition, 'FOR SHARE') = 0
    OR pg_catalog.strpos(pg_catalog.lower(trigger_definition), 'round(si.quantity * si.unit_price_usd, 4)') = 0
    OR pg_catalog.strpos(pg_catalog.lower(trigger_definition), 'round(si.line_total_usd * sale_row.exchange_rate_snapshot, 2)') = 0
  THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_TRIGGER_DATE_LOCK_OR_LINE_ARITHMETIC_CONTRACT_INVALID';
  END IF;

  INSERT INTO public.exchange_rates
    (base_currency,quote_currency,rate,source,effective_date,validation_status)
  VALUES
    ('USD','VES',895.10000000,'BCV_OFFICIAL_HTML_V1','2026-11-06','valid'),
    ('USD','VES',895.20000000,'BCV_OFFICIAL_HTML_V1','2026-11-09','stale'),
    ('USD','VES',895.30000000,'BCV_OFFICIAL_HTML_V1','2026-11-10','valid')
  ON CONFLICT (source,effective_date) DO UPDATE
    SET rate=EXCLUDED.rate,validation_status=EXCLUDED.validation_status;

  SELECT public.applicable_bcv_effective_date('2026-11-07 12:00:00-04'::timestamptz) INTO saturday_date;
  SELECT public.applicable_bcv_effective_date('2026-11-08 12:00:00-04'::timestamptz) INTO sunday_date;
  SELECT public.applicable_bcv_effective_date('2026-11-06 12:00:00-04'::timestamptz) INTO weekday_date;

  IF saturday_date <> DATE '2026-11-09' OR sunday_date <> DATE '2026-11-09'
    OR weekday_date <> DATE '2026-11-06' THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_EFFECTIVE_DATE_BEHAVIOR_INVALID';
  END IF;
END;
$checkout_bcv_contract_assertions$;

ROLLBACK;
