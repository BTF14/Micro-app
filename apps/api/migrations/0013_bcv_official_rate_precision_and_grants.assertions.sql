DO $bcv_runtime_grants_assertions$
DECLARE
  exchange_rate_precision_ok boolean;
  sales_snapshot_precision_ok boolean;
  payment_snapshot_precision_ok boolean;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) = 'numeric(18,8)'
    INTO exchange_rate_precision_ok
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.exchange_rates'::regclass
     AND a.attname = 'rate' AND NOT a.attisdropped;

  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) = 'numeric(18,8)'
    INTO sales_snapshot_precision_ok
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.sales'::regclass
     AND a.attname = 'exchange_rate_snapshot' AND NOT a.attisdropped;

  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) = 'numeric(18,8)'
    INTO payment_snapshot_precision_ok
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.payments'::regclass
     AND a.attname = 'exchange_rate_snapshot' AND NOT a.attisdropped;

  IF exchange_rate_precision_ok IS DISTINCT FROM true
    OR sales_snapshot_precision_ok IS DISTINCT FROM true
    OR payment_snapshot_precision_ok IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'BCV_RATE_PRECISION_MUST_BE_NUMERIC_18_8';
  END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.exchange_rates', 'SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.exchange_rates', 'INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.exchange_rates', 'UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.exchange_rates', 'DELETE')
  THEN
    RAISE EXCEPTION 'BCV_RUNTIME_EXCHANGE_RATE_GRANTS_INVALID';
  END IF;
END;
$bcv_runtime_grants_assertions$;
