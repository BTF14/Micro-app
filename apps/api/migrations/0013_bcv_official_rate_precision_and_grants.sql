BEGIN;

DO $bcv_migration_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'BCV_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$bcv_migration_preflight$;

-- BCV publishes USD/VES with up to eight decimal places. Preserve the
-- published precision in the canonical rate and every historical snapshot.
ALTER TABLE public.exchange_rates
  ALTER COLUMN rate TYPE numeric(18,8);
ALTER TABLE public.sales
  ALTER COLUMN exchange_rate_snapshot TYPE numeric(18,8);
ALTER TABLE public.payments
  ALTER COLUMN exchange_rate_snapshot TYPE numeric(18,8);

-- The scheduled Worker uses the least-privilege runtime login. It can read
-- and append rate rows, and mark validation_status stale on a detected conflict;
-- it cannot rewrite rate values, effective dates, or delete history.
GRANT SELECT, INSERT ON TABLE public.exchange_rates TO microapp_runtime;
GRANT UPDATE (validation_status) ON TABLE public.exchange_rates TO microapp_runtime;

COMMIT;
