DO $main_restore_role_assertions$
DECLARE
  runtime_oid oid;
  migrator_oid oid;
  public_oid oid;
BEGIN
  SELECT oid INTO runtime_oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime';
  SELECT oid INTO migrator_oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator';
  SELECT oid INTO public_oid FROM pg_catalog.pg_namespace WHERE nspname='public';

  IF runtime_oid IS NULL OR migrator_oid IS NULL THEN
    RAISE EXCEPTION 'RESTORE_ROLE_ASSERTION_REQUIRES_RUNTIME_AND_MIGRATOR';
  END IF;
  IF pg_catalog.pg_has_role('microapp_runtime','microapp_migrator','MEMBER')
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_auth_members m
      WHERE m.member=runtime_oid
    )
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_auth_members m
      JOIN pg_catalog.pg_database d ON d.datname=current_database()
      WHERE m.roleid=runtime_oid
        AND (
          m.member <> d.datdba
          OR NOT m.admin_option
          OR m.inherit_option
          OR m.set_option
        )
    )
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_database d
      JOIN pg_catalog.pg_roles database_owner ON database_owner.oid=d.datdba
      WHERE d.datname=current_database()
        AND NOT database_owner.rolsuper
        AND (
          pg_catalog.pg_has_role(d.datdba,runtime_oid,'USAGE')
          OR pg_catalog.pg_has_role(d.datdba,runtime_oid,'SET')
        )
    )
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_ROLE_MEMBERSHIP_FORBIDDEN'; END IF;

  IF NOT pg_catalog.has_schema_privilege('microapp_runtime','public','USAGE')
    OR pg_catalog.has_schema_privilege('microapp_runtime','public','CREATE')
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_SCHEMA_PRIVILEGES_INVALID'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE relnamespace=public_oid AND relowner=runtime_oid
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE pronamespace=public_oid AND proowner=runtime_oid
  )
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_MUST_NOT_OWN_OBJECTS'; END IF;

  -- Final main-profile grants include the later checkout and BCV rate migrations.
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.sales','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.sales','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.sales','status','UPDATE')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.sales','completed_at','UPDATE')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.sale_items','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.sale_items','INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.payments','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.payments','INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.exchange_rates','INSERT')
    OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.exchange_rates','validation_status','UPDATE')
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_FINAL_CHECKOUT_OR_BCV_GRANTS_MISSING'; END IF;

  IF pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balance_ledger_intents','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balance_ledger_intents','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.branches','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.branch_memberships','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.warehouses','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_count_lines','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','TRUNCATE')
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_FORBIDDEN_PRIVILEGES_PRESENT'; END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.audit_logs','INSERT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.warehouse_inventory_movements','SELECT')
    OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.warehouse_inventory_movements','INSERT')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_tenant_context(text,uuid)','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_branch_scopes(uuid,uuid[],uuid[],uuid[])','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_inventory_warehouses(uuid,uuid[],uuid[])','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('microapp_runtime','public.lock_open_register_shift(uuid,uuid,uuid)','EXECUTE')
    OR pg_catalog.has_function_privilege('microapp_runtime','public.validate_count_inventory_movement()','EXECUTE')
  THEN RAISE EXCEPTION 'RESTORE_RUNTIME_FINAL_REQUIRED_GRANTS_INVALID'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) acl
    WHERE d.defaclrole=migrator_oid AND acl.grantee IN (0,runtime_oid)
  ) THEN RAISE EXCEPTION 'RESTORE_MIGRATOR_DEFAULT_ACL_LEAK'; END IF;
END;
$main_restore_role_assertions$;
