-- Run after 0020_bcv_effective_date_strict.sql on disposable PostgreSQL.
BEGIN;

DO $checkout_bcv_strict_effective_date_assertions$
DECLARE
  helper_oid oid;
  helper_definition text;
  friday_date date;
  saturday_date date;
  sunday_date date;
  monday_date date;
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
  IF pg_catalog.strpos(helper_definition, 'America/Caracas') = 0
    OR pg_catalog.strpos(helper_definition, 'caracas_now::date') > 0
    OR pg_catalog.strpos(helper_definition, 'MIN(er.effective_date)') > 0
  THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_STRICT_EFFECTIVE_DATE_FUNCTION_INVALID';
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

  SELECT public.applicable_bcv_effective_date('2026-11-06 12:00:00-04'::timestamptz) INTO friday_date;
  SELECT public.applicable_bcv_effective_date('2026-11-07 12:00:00-04'::timestamptz) INTO saturday_date;
  SELECT public.applicable_bcv_effective_date('2026-11-08 12:00:00-04'::timestamptz) INTO sunday_date;
  SELECT public.applicable_bcv_effective_date('2026-11-09 12:00:00-04'::timestamptz) INTO monday_date;

  IF friday_date <> DATE '2026-11-06'
    OR saturday_date <> DATE '2026-11-07'
    OR sunday_date <> DATE '2026-11-08'
    OR monday_date <> DATE '2026-11-09' THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_RATE_MUST_NOT_BE_USED_BEFORE_EFFECTIVE_DATE';
  END IF;
END;
$checkout_bcv_strict_effective_date_assertions$;

ROLLBACK;
