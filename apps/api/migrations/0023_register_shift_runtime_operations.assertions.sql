-- Run after 0023_register_shift_runtime_operations.sql on disposable PostgreSQL 18.
BEGIN;
DO $register_shift_runtime_assertions$
DECLARE
  open_oid oid := pg_catalog.to_regprocedure('public.open_register_shift(uuid,uuid,uuid,uuid,numeric,numeric)');
  close_oid oid := pg_catalog.to_regprocedure('public.close_register_shift(uuid,uuid,uuid,uuid,numeric,numeric)');
  migrator_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
BEGIN
  IF open_oid IS NULL OR close_oid IS NULL THEN RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTIONS_MISSING'; END IF;
  IF (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = open_oid) <> migrator_oid
    OR (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = close_oid) <> migrator_oid THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTION_OWNER_INVALID';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = open_oid)
    OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = close_oid) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTION_MUST_BE_SECURITY_DEFINER';
  END IF;
  IF NOT (SELECT proconfig @> ARRAY['search_path=pg_catalog, public'] FROM pg_catalog.pg_proc WHERE oid = open_oid)
    OR NOT (SELECT proconfig @> ARRAY['search_path=pg_catalog, public'] FROM pg_catalog.pg_proc WHERE oid = close_oid) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTION_SEARCH_PATH_INVALID';
  END IF;
  IF NOT pg_catalog.has_function_privilege('microapp_runtime', open_oid, 'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime', close_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTION_EXECUTE_MISSING';
  END IF;
  IF pg_catalog.has_table_privilege('microapp_runtime', 'public.register_shifts', 'INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.register_shifts', 'UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.register_shifts', 'DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime', 'public.register_shifts', 'TRUNCATE') THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_DIRECT_WRITE_PRIVILEGE_FORBIDDEN';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE p.oid IN (open_oid, close_oid) AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_FUNCTION_PUBLIC_EXECUTE_FORBIDDEN';
  END IF;
END;
$register_shift_runtime_assertions$;
ROLLBACK;
