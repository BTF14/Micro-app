-- Run after 0021_bcv_sync_state.sql on disposable PostgreSQL.
BEGIN;

DO $bcv_sync_state_assertions$
DECLARE
  owner_name text;
  singleton_count integer;
  guard_function_oid oid;
  guard_function_definition text;
BEGIN
  SELECT r.rolname INTO owner_name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
   WHERE c.oid = 'public.bcv_sync_state'::regclass;
  IF owner_name <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_OWNER_MUST_BE_MIGRATOR';
  END IF;

  SELECT count(*) INTO singleton_count
    FROM public.bcv_sync_state
   WHERE singleton = true;
  IF singleton_count <> 1 THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_SINGLETON_ROW_MISSING';
  END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime', 'public.bcv_sync_state', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime', 'public.bcv_sync_state', 'attempt_id', 'UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime', 'public.bcv_sync_state', 'last_success_at', 'UPDATE')
  THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_RUNTIME_MINIMUM_PRIVILEGES_MISSING';
  END IF;

  IF pg_catalog.has_table_privilege('microapp_runtime', 'public.bcv_sync_state', 'INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.bcv_sync_state', 'DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.bcv_sync_state', 'TRUNCATE')
    OR pg_catalog.has_column_privilege('microapp_runtime', 'public.bcv_sync_state', 'singleton', 'UPDATE')
  THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_RUNTIME_PRIVILEGES_TOO_BROAD';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class c
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) acl
     WHERE c.oid = 'public.bcv_sync_state'::regclass
       AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'BCV_SYNC_STATE_MUST_NOT_BE_PUBLIC';
  END IF;

  SELECT p.oid INTO guard_function_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.assert_sale_latest_bcv_sync_success()'::regprocedure
     AND p.prosecdef = true
     AND p.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
  IF guard_function_oid IS NULL THEN
    RAISE EXCEPTION 'BCV_SYNC_SALE_GUARD_SECURITY_CONTRACT_INVALID';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(guard_function_oid)
    INTO guard_function_definition;
  IF pg_catalog.strpos(guard_function_definition, 'FOR SHARE') = 0
    OR pg_catalog.strpos(guard_function_definition, 'last_success_at') = 0
    OR pg_catalog.strpos(guard_function_definition, 'last_outcome') = 0
    OR pg_catalog.strpos(guard_function_definition, 'last_effective_date') = 0
    OR pg_catalog.strpos(guard_function_definition, 'America/Caracas') = 0
  THEN
    RAISE EXCEPTION 'BCV_SYNC_SALE_GUARD_DEFINITION_INVALID';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(
      COALESCE(
        (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = guard_function_oid),
        pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid = guard_function_oid))
      )
    ) acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) OR pg_catalog.has_function_privilege('microapp_runtime',guard_function_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'BCV_SYNC_SALE_GUARD_MUST_BE_TRIGGER_ONLY';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid = 'public.sales'::regclass
       AND t.tgname = 'sales_latest_bcv_sync_success'
       AND NOT t.tgisinternal
       AND t.tgenabled = 'O'
       AND t.tgdeferrable = true
       AND t.tginitdeferred = true
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%AFTER INSERT OR UPDATE%'
  ) THEN
    RAISE EXCEPTION 'BCV_SYNC_SALE_GUARD_DEFERRED_TRIGGER_MISSING';
  END IF;

END;
$bcv_sync_state_assertions$;

ROLLBACK;
