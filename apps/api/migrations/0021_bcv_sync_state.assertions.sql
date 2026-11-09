-- Run after 0021_bcv_sync_state.sql on disposable PostgreSQL.
BEGIN;

DO $bcv_sync_state_assertions$
DECLARE
  owner_name text;
  singleton_count integer;
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
END;
$bcv_sync_state_assertions$;

ROLLBACK;
