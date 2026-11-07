DO $runtime_role_assertions$
DECLARE
  runtime_oid oid;
  migrator_oid oid;
  public_oid oid;
BEGIN
  SELECT oid INTO runtime_oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime';
  SELECT oid INTO migrator_oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator';
  SELECT oid INTO public_oid FROM pg_catalog.pg_namespace WHERE nspname='public';
  IF runtime_oid IS NULL OR migrator_oid IS NULL THEN
    RAISE EXCEPTION 'RUNTIME_ROLE_ASSERTION_REQUIRES_BOTH_LOGIN_ROLES';
  END IF;

  IF pg_catalog.pg_has_role('microapp_runtime','microapp_migrator','MEMBER') THEN
    RAISE EXCEPTION 'RUNTIME_ROLE_INHERITS_MIGRATOR';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relnamespace=public_oid AND relowner=runtime_oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE pronamespace=public_oid AND proowner=runtime_oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE oid=public_oid AND nspowner=runtime_oid)
  THEN RAISE EXCEPTION 'RUNTIME_MUST_NOT_OWN_APPLICATION_OBJECTS'; END IF;

  IF NOT pg_catalog.has_schema_privilege('microapp_runtime','public','USAGE')
    OR pg_catalog.has_schema_privilege('microapp_runtime','public','CREATE')
  THEN RAISE EXCEPTION 'RUNTIME_SCHEMA_PRIVILEGES_INVALID'; END IF;

  IF NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_tenant_context(text,uuid)','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_branch_scopes(uuid,uuid[],uuid[],uuid[])','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_inventory_warehouses(uuid,uuid[],uuid[])','EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_runtime','public.validate_count_inventory_movement()','EXECUTE')
  THEN RAISE EXCEPTION 'RUNTIME_LOCK_HELPER_EXECUTE_PRIVILEGES_INVALID'; END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.auth_sessions','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.auth_sessions','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.auth_sessions','revoked_at','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.auth_rate_limits','updated_at','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.auth_rate_limits','DELETE')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.auth_bootstrap_attempts','DELETE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.products','price_usd','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.inventory_counts','status','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','on_hand_quantity','UPDATE')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.warehouse_inventory_movements','INSERT')
  THEN RAISE EXCEPTION 'RUNTIME_REQUIRED_PRIVILEGES_MISSING'; END IF;

  IF pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','TRUNCATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_count_lines','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.warehouses','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.branches','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.branch_memberships','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balance_ledger_intents','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balance_ledger_intents','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.sales','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.payments','SELECT')
  THEN RAISE EXCEPTION 'RUNTIME_FORBIDDEN_PRIVILEGES_PRESENT'; END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) acl
    WHERE d.defaclrole=migrator_oid
      AND acl.grantee IN (0,runtime_oid)
  ) THEN RAISE EXCEPTION 'MIGRATOR_DEFAULT_PRIVILEGES_LEAK_TO_PUBLIC_OR_RUNTIME'; END IF;
END;
$runtime_role_assertions$;
