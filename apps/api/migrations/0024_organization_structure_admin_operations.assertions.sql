-- Run after 0024_organization_structure_admin_operations.sql on disposable PostgreSQL 18.
BEGIN;
DO $organization_structure_admin_assertions$
DECLARE
  fn record;
  table_name text;
  fn_oid oid;
  migrator_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator');
  runtime_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime');
  signatures text[] := ARRAY[
    'public.create_branch(uuid,uuid,text,text)',
    'public.create_warehouse(uuid,uuid,uuid,text,text)',
    'public.create_register(uuid,uuid,uuid,text,text)',
    'public.set_branch_membership_active(uuid,uuid,uuid,uuid,boolean)'
  ];
  protected_tables text[] := ARRAY[
    'public.branches','public.warehouses','public.registers',
    'public.branch_memberships','public.organization_members'
  ];
BEGIN
  IF migrator_oid IS NULL OR runtime_oid IS NULL THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_REQUIRED_ROLES_MISSING';
  END IF;

  FOREACH table_name IN ARRAY signatures LOOP
    fn_oid := pg_catalog.to_regprocedure(table_name);
    IF fn_oid IS NULL THEN RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_FUNCTION_MISSING: %', table_name; END IF;
    IF (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = fn_oid) <> migrator_oid
      OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = fn_oid)
      OR NOT (SELECT proconfig @> ARRAY['search_path=pg_catalog, public'] FROM pg_catalog.pg_proc WHERE oid = fn_oid)
    THEN RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_FUNCTION_SECURITY_CONTRACT_INVALID: %', table_name; END IF;

    IF NOT pg_catalog.has_function_privilege('microapp_runtime', fn_oid, 'EXECUTE')
      OR EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn_oid),
          pg_catalog.acldefault('f', migrator_oid)
        )) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn_oid),
          pg_catalog.acldefault('f', migrator_oid)
        )) a WHERE a.grantee NOT IN (migrator_oid, runtime_oid)
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn_oid),
          pg_catalog.acldefault('f', migrator_oid)
        )) a WHERE a.grantee = runtime_oid AND a.privilege_type <> 'EXECUTE'
      )
    THEN RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_FUNCTION_ACL_INVALID: %', table_name; END IF;
  END LOOP;

  FOREACH table_name IN ARRAY protected_tables LOOP
    IF pg_catalog.has_table_privilege('microapp_runtime', table_name, 'INSERT')
      OR pg_catalog.has_table_privilege('microapp_runtime', table_name, 'UPDATE')
      OR pg_catalog.has_table_privilege('microapp_runtime', table_name, 'DELETE')
      OR pg_catalog.has_table_privilege('microapp_runtime', table_name, 'TRUNCATE')
    THEN RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_RUNTIME_DIRECT_DML_FORBIDDEN: %', table_name; END IF;
  END LOOP;

  IF pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[1])), 'branch.created') = 0
    OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[1])), 'branch_memberships') = 0
    OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[2])), 'warehouse.created') = 0
    OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[3])), 'register.created') = 0
    OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[4])), 'branch_membership.deactivated') = 0
    OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(signatures[4])), 'BRANCH_MEMBERSHIP_HAS_OPEN_REGISTER_SHIFT') = 0
  THEN RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_AUDIT_OR_OPEN_SHIFT_GUARD_MISSING'; END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_migrator','public.audit_logs','INSERT') THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_AUDIT_INSERT_OWNER_PRIVILEGE_MISSING';
  END IF;
END;
$organization_structure_admin_assertions$;
ROLLBACK;
