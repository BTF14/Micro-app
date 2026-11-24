BEGIN;
SET LOCAL lock_timeout = '5s';

DO $checkout_bcv_effective_date_policy_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'CHECKOUT_BCV_POLICY_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$checkout_bcv_effective_date_policy_preflight$;

-- A rate published in advance is not applicable before its explicit
-- effective_date. This deliberately returns the Caracas operation date for
-- every weekday, weekend and holiday; if BCV has no row for that date,
-- checkout fails closed rather than substituting an older or future rate.
CREATE OR REPLACE FUNCTION public.applicable_bcv_effective_date(p_now timestamptz)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $applicable_bcv_effective_date$
  SELECT (p_now AT TIME ZONE 'America/Caracas')::date;
$applicable_bcv_effective_date$;

REVOKE ALL ON FUNCTION public.applicable_bcv_effective_date(timestamptz) FROM PUBLIC;

COMMIT;
