-- Preserve the last durable BCV success observation when a later attempt fails or remains running.
-- No grants are broadened: runtime continues to reach this policy only through existing
-- SECURITY DEFINER triggers; the function remains unavailable for direct runtime execution.
BEGIN;

CREATE OR REPLACE FUNCTION public.select_bcv_rate_for_operation(p_operation_date date)
RETURNS TABLE(exchange_rate_id uuid, rate numeric, effective_date date, priority text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $select_bcv_rate_for_operation$
DECLARE
  sync_success_at timestamptz;
  sync_outcome text;
  sync_effective_date date;
  sync_error_code text;
  selected_id uuid;
  selected_rate numeric;
  selected_date date;
  selected_priority text;
  candidate_count bigint;
BEGIN
  IF p_operation_date IS NULL THEN RETURN; END IF;

  -- Preserve the producer/checkout lock order, but do not use the mutable
  -- latest-attempt outcome as evidence that an earlier successful rate vanished.
  PERFORM 1 FROM public.bcv_sync_state WHERE singleton = true FOR SHARE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO candidate_count FROM public.exchange_rates er
   WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid'
     AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
     AND er.effective_date=p_operation_date;
  IF candidate_count > 1 THEN RETURN; END IF;
  SELECT er.id,er.rate,er.effective_date
    INTO selected_id,selected_rate,selected_date
    FROM public.exchange_rates er
   WHERE er.source='BCV_OFFICIAL_HTML_V1'
     AND er.validation_status='valid' AND er.base_currency='USD' AND er.quote_currency='VES'
     AND er.rate > 0 AND er.effective_date=p_operation_date
   ORDER BY er.fetched_at DESC LIMIT 1;

  IF FOUND THEN
    selected_priority := 'today_exact';
  ELSE
    SELECT min(er.effective_date) INTO selected_date
      FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid'
       AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
       AND er.effective_date > p_operation_date AND er.effective_date <= p_operation_date + 5;
    IF selected_date IS NULL THEN RETURN; END IF;
    SELECT count(*) INTO candidate_count FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid'
       AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
       AND er.effective_date=selected_date;
    IF candidate_count <> 1 THEN RETURN; END IF;
    SELECT er.id,er.rate,er.effective_date INTO selected_id,selected_rate,selected_date
      FROM public.exchange_rates er
     WHERE er.source='BCV_OFFICIAL_HTML_V1' AND er.validation_status='valid'
       AND er.base_currency='USD' AND er.quote_currency='VES' AND er.rate > 0
       AND er.effective_date=selected_date;

    IF EXTRACT(ISODOW FROM p_operation_date) IN (6,7) THEN
      selected_priority := 'weekend_prepublished';
    ELSE
      selected_priority := 'weekday_same_day_sync';
    END IF;
  END IF;

  -- An append-only observation must certify a valid official BCV row whose
  -- effective date covers the selected operation date. A later successful
  -- prepublication (for example Monday) can cover Friday's exact stored rate;
  -- do not require the observation row ID/date to equal the selected Friday row.
  -- The observation's own row is still integrity-checked by ID, rate, date,
  -- fetched_at and valid status. It is independent of later mutable sync state.
  SELECT obs.last_success_at,obs.last_outcome,obs.last_effective_date,obs.last_error_code
    INTO sync_success_at,sync_outcome,sync_effective_date,sync_error_code
    FROM public.bcv_sync_success_observations obs
    JOIN public.exchange_rates er
      ON er.id=obs.exchange_rate_id
     AND er.source='BCV_OFFICIAL_HTML_V1'
     AND er.base_currency='USD' AND er.quote_currency='VES'
     AND er.rate=obs.rate_snapshot
     AND er.effective_date=obs.last_effective_date
     AND er.fetched_at=obs.rate_fetched_at
     AND er.validation_status='valid'
   WHERE obs.last_outcome IN ('inserted','unchanged')
     AND obs.last_error_code IS NULL
     AND obs.validation_status='valid'
     AND obs.last_effective_date >= selected_date
     AND obs.rate_fetched_at IS NOT NULL
     AND obs.observed_at >= obs.last_success_at
     AND obs.last_success_at <= pg_catalog.clock_timestamp()
   ORDER BY obs.observed_at DESC
   LIMIT 1;
  IF NOT FOUND OR sync_success_at IS NULL OR sync_error_code IS NOT NULL THEN RETURN; END IF;

  -- Weekday prepublication is not applicable: require that the successful
  -- observation occurred on or after today's Caracas operational boundary.
  IF selected_priority='weekday_same_day_sync'
     AND sync_success_at < (p_operation_date::timestamp AT TIME ZONE 'America/Caracas') THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT selected_id,selected_rate,selected_date,selected_priority;
END;
$select_bcv_rate_for_operation$;

ALTER FUNCTION public.select_bcv_rate_for_operation(date) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.select_bcv_rate_for_operation(date) FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

COMMIT;
