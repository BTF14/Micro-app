DO $$
DECLARE function_oid oid;
BEGIN
  SELECT 'public.lock_tenant_context(text,uuid)'::regprocedure INTO function_oid;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=function_oid AND p.prosecdef AND 'search_path=pg_catalog'=ANY(p.proconfig))
    THEN RAISE EXCEPTION 'LOCK_TENANT_CONTEXT_SECURITY_CONTRACT_FAILED'; END IF;
  SELECT 'public.lock_branch_scopes(uuid,uuid[],uuid[],uuid[])'::regprocedure INTO function_oid;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=function_oid AND p.prosecdef AND 'search_path=pg_catalog'=ANY(p.proconfig))
    THEN RAISE EXCEPTION 'LOCK_BRANCH_SCOPES_SECURITY_CONTRACT_FAILED'; END IF;
  SELECT 'public.lock_inventory_warehouses(uuid,uuid[],uuid[])'::regprocedure INTO function_oid;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=function_oid AND p.prosecdef AND 'search_path=pg_catalog'=ANY(p.proconfig))
    THEN RAISE EXCEPTION 'LOCK_INVENTORY_WAREHOUSES_SECURITY_CONTRACT_FAILED'; END IF;
  SELECT 'public.validate_count_inventory_movement()'::regprocedure INTO function_oid;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=function_oid AND p.prosecdef AND 'search_path=pg_catalog'=ANY(p.proconfig))
    THEN RAISE EXCEPTION 'COUNT_MOVEMENT_TRIGGER_SECURITY_CONTRACT_FAILED'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
    WHERE p.oid IN (
      'public.lock_tenant_context(text,uuid)'::regprocedure,
      'public.lock_branch_scopes(uuid,uuid[],uuid[],uuid[])'::regprocedure,
      'public.lock_inventory_warehouses(uuid,uuid[],uuid[])'::regprocedure,
      'public.validate_count_inventory_movement()'::regprocedure
    ) AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
  ) THEN RAISE EXCEPTION 'PUBLIC_EXECUTE_MUST_BE_REVOKED'; END IF;
END;
$$;
