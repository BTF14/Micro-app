BEGIN;
DO $inventory_ledger_balance_projection_assertions$
DECLARE
  projection_oid oid;
  lock_oid oid;
  warehouse_lock_oid oid;
  projection_def text;
  lock_def text;
  warehouse_lock_def text;
  index_predicate text;
BEGIN
  IF pg_catalog.to_regclass('public.inventory_balance_ledger_intents') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.record_inventory_balance_ledger_intent()') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.consume_inventory_balance_ledger_intent()') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.assert_inventory_balance_ledger_intent_consumed()') IS NOT NULL
  THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_LEDGER_INTENT_PAIRING_MUST_BE_REPLACED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
     WHERE rolname='microapp_runtime'
       AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR NOT rolcanlogin)
  ) OR pg_catalog.pg_has_role('microapp_runtime','microapp_migrator','MEMBER')
  THEN
    RAISE EXCEPTION 'RUNTIME_ROLE_MUST_REMAIN_UNPRIVILEGED_AND_SEPARATE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
     WHERE oid='public.inventory_balances'::regclass
       AND relowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime')
  ) THEN
    RAISE EXCEPTION 'RUNTIME_MUST_NOT_OWN_INVENTORY_BALANCES';
  END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','SELECT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','INSERT')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','UPDATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','DELETE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','TRUNCATE')
    OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','TRIGGER')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','on_hand_quantity','INSERT')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','on_hand_quantity','UPDATE')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','reserved_quantity','UPDATE')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','balance_version','UPDATE')
    OR pg_catalog.has_column_privilege('microapp_runtime','public.inventory_balances','updated_at','UPDATE')
  THEN
    RAISE EXCEPTION 'RUNTIME_MUST_NOT_MUTATE_INVENTORY_BALANCES';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class c
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(c.relacl, pg_catalog.acldefault('r',c.relowner))
      ) acl
     WHERE c.oid='public.inventory_balances'::regclass
       AND acl.grantee=0
       AND acl.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER')
  ) THEN
    RAISE EXCEPTION 'PUBLIC_MUST_NOT_MUTATE_INVENTORY_BALANCES';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid='public.inventory_balances'::regclass
       AND a.attnum > 0 AND NOT a.attisdropped
       AND (
         pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attnum,'INSERT')
         OR pg_catalog.has_column_privilege('microapp_runtime',a.attrelid,a.attnum,'UPDATE')
       )
  ) THEN
    RAISE EXCEPTION 'RUNTIME_MUST_HAVE_NO_COLUMN_LEVEL_BALANCE_WRITE_PRIVILEGES';
  END IF;

  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.warehouse_inventory_movements','INSERT') THEN
    RAISE EXCEPTION 'RUNTIME_MUST_APPEND_MOVEMENTS_TO_PROJECT_BALANCES';
  END IF;

  SELECT p.oid INTO warehouse_lock_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.lock_inventory_movement_warehouse()'::regprocedure
     AND p.prosecdef=true
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     AND p.proconfig @> ARRAY['search_path=pg_catalog'];
  IF warehouse_lock_oid IS NULL THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_LOCK_SECURITY_CONTRACT_INVALID';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(warehouse_lock_oid) INTO warehouse_lock_def;
  IF pg_catalog.strpos(warehouse_lock_def,'FOR UPDATE')=0
    OR pg_catalog.strpos(warehouse_lock_def,'is_active')=0
    OR pg_catalog.strpos(warehouse_lock_def,'organization_id')=0
    OR pg_catalog.strpos(warehouse_lock_def,'branch_id')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_LOCK_DEFINITION_INVALID';
  END IF;
  IF pg_catalog.has_function_privilege('microapp_runtime',warehouse_lock_oid,'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid),
                 pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid)))
      ) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_LOCK_MUST_BE_TRIGGER_ONLY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.warehouse_inventory_movements'::regclass
       AND t.tgname='aaa_warehouse_inventory_movements_lock_warehouse'
       AND NOT t.tgisinternal AND t.tgenabled='O'
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%BEFORE INSERT%'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_LOCK_TRIGGER_MISSING';
  END IF;

  SELECT p.oid INTO projection_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.project_inventory_movement_to_balance()'::regprocedure
     AND p.prosecdef=true
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     AND p.proconfig @> ARRAY['search_path=pg_catalog'];
  IF projection_oid IS NULL THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_PROJECTION_SECURITY_DEFINER_CONTRACT_INVALID';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(projection_oid) INTO projection_def;
  IF pg_catalog.strpos(projection_def,'reserved_quantity')=0
    OR pg_catalog.strpos(projection_def,'INVENTORY_MOVEMENT_WOULD_BREACH_AVAILABLE_STOCK')=0
    OR pg_catalog.strpos(projection_def,'ON CONFLICT')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_PROJECTION_DEFINITION_INVALID';
  END IF;

  IF pg_catalog.has_function_privilege('microapp_runtime',projection_oid,'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=projection_oid),
                 pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=projection_oid)))
      ) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_PROJECTION_FUNCTION_MUST_NOT_BE_CALLABLE_DIRECTLY';
  END IF;

  IF (
    SELECT t.tgname
      FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.warehouse_inventory_movements'::regclass
       AND NOT t.tgisinternal
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%BEFORE INSERT%'
     ORDER BY t.tgname COLLATE "C"
     LIMIT 1
  ) IS DISTINCT FROM 'aaa_warehouse_inventory_movements_lock_warehouse' THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_WAREHOUSE_LOCK_MUST_RUN_BEFORE_VALIDATION';
  END IF;

  -- Runtime movement inserts must be source-authorized before projection.
  SELECT p.oid INTO warehouse_lock_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.validate_inventory_movement_source()'::regprocedure
     AND p.prosecdef=true
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     AND p.proconfig @> ARRAY['search_path=pg_catalog'];
  IF warehouse_lock_oid IS NULL THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_SECURITY_CONTRACT_INVALID';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(warehouse_lock_oid) INTO warehouse_lock_def;
  IF pg_catalog.strpos(warehouse_lock_def,'INVENTORY_MOVEMENT_SOURCE_TYPE_NOT_AUTHORIZED')=0
    OR pg_catalog.strpos(warehouse_lock_def,'INVENTORY_SALE_MOVEMENT_MUST_MATCH_SALE_LINE')=0
    OR pg_catalog.strpos(warehouse_lock_def,'INVENTORY_COUNT_SNAPSHOT_STALE')=0
    OR pg_catalog.strpos(warehouse_lock_def,'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED')=0
    OR pg_catalog.strpos(warehouse_lock_def,'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID')=0
    OR pg_catalog.strpos(warehouse_lock_def,'branch_memberships')=0
    OR pg_catalog.strpos(warehouse_lock_def,'NOWAIT')=0
    OR pg_catalog.strpos(warehouse_lock_def,'COUNT_MOVEMENT_MUST_REFERENCE_CONFIRMED_COUNT_ONLY')=0
    OR pg_catalog.strpos(warehouse_lock_def,'FOR UPDATE')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_DEFINITION_INVALID';
  END IF;
  IF pg_catalog.has_function_privilege('microapp_runtime',warehouse_lock_oid,'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid),
                 pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid)))
      ) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_MUST_BE_TRIGGER_ONLY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.warehouse_inventory_movements'::regclass
       AND t.tgname='aab_warehouse_inventory_movements_validate_source'
       AND NOT t.tgisinternal AND t.tgenabled='O'
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%BEFORE INSERT%'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_TRIGGER_MISSING';
  END IF;

  SELECT p.oid INTO warehouse_lock_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.validate_inventory_count_confirmation()'::regprocedure
     AND p.prosecdef=true
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     AND p.proconfig @> ARRAY['search_path=pg_catalog'];
  IF warehouse_lock_oid IS NULL THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_SECURITY_CONTRACT_INVALID';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(warehouse_lock_oid) INTO warehouse_lock_def;
  IF pg_catalog.strpos(warehouse_lock_def,'INVENTORY_COUNT_CONFIRMER_NOT_AUTHORIZED')=0
    OR pg_catalog.strpos(warehouse_lock_def,'branch_memberships')=0
    OR pg_catalog.strpos(warehouse_lock_def,'owner')=0
    OR pg_catalog.strpos(warehouse_lock_def,'inventory')=0
    OR pg_catalog.strpos(warehouse_lock_def,'is_active')=0
    OR pg_catalog.strpos(warehouse_lock_def,'confirmer')=0
    OR pg_catalog.strpos(warehouse_lock_def,'INVENTORY_OPENING_COUNT_REQUIRES_EMPTY_WAREHOUSE')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_DEFINITION_INVALID';
  END IF;
  IF pg_catalog.has_function_privilege('microapp_runtime',warehouse_lock_oid,'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid),
                 pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=warehouse_lock_oid)))
      ) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_MUST_BE_TRIGGER_ONLY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.inventory_counts'::regclass
       AND t.tgname='z_inventory_counts_validate_confirmation'
       AND NOT t.tgisinternal AND t.tgenabled='O'
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%BEFORE UPDATE%'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_COUNT_CONFIRMATION_TRIGGER_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.warehouse_inventory_movements'::regclass
       AND t.tgname='warehouse_inventory_movements_project_balance'
       AND NOT t.tgisinternal AND t.tgenabled='O'
       AND pg_catalog.pg_get_triggerdef(t.oid) ILIKE '%AFTER INSERT%'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_MOVEMENT_BALANCE_PROJECTION_TRIGGER_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid='public.inventory_balances'::regclass
       AND t.tgname='inventory_balances_direct_write_guard'
       AND NOT t.tgisinternal AND t.tgenabled='O'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_DIRECT_WRITE_GUARD_MISSING';
  END IF;

  SELECT p.oid INTO lock_oid
    FROM pg_catalog.pg_proc p
   WHERE p.oid='public.lock_inventory_balances(uuid,uuid[],uuid[],uuid[])'::regprocedure
     AND p.prosecdef=true
     AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     AND p.proconfig @> ARRAY['search_path=pg_catalog'];
  IF lock_oid IS NULL OR NOT pg_catalog.has_function_privilege('microapp_runtime',lock_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_LOCK_HELPER_SECURITY_CONTRACT_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(
      COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=lock_oid),
               pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=lock_oid)))
    ) acl
    WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_LOCK_HELPER_MUST_NOT_BE_PUBLIC';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(lock_oid) INTO lock_def;
  IF pg_catalog.strpos(lock_def,'lock_inventory_warehouses')=0
    OR pg_catalog.strpos(lock_def,'FOR UPDATE')=0
    OR pg_catalog.strpos(lock_def,'p_branch_ids')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_BALANCE_LOCK_HELPER_DEFINITION_INVALID';
  END IF;

  SELECT pg_catalog.pg_get_expr(i.indpred,i.indrelid)
    INTO index_predicate
    FROM pg_catalog.pg_index i
   WHERE i.indexrelid='public.inventory_counts_one_confirmed_opening_per_warehouse_uidx'::regclass
     AND i.indisunique;
  IF index_predicate IS NULL
    OR pg_catalog.strpos(index_predicate,'opening')=0
    OR pg_catalog.strpos(index_predicate,'confirmed')=0
  THEN
    RAISE EXCEPTION 'INVENTORY_CONFIRMED_OPENING_COUNT_UNIQUENESS_MISSING';
  END IF;
END;
$inventory_ledger_balance_projection_assertions$;
ROLLBACK;
