BEGIN;
DO $inventory_receipt_assertions$
DECLARE fn_oid oid; validator_oid oid; fn_def text; validator_def text;
BEGIN
 IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipts','SELECT')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipts','INSERT')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipts','UPDATE')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipts','DELETE')
  OR NOT pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipt_lines','SELECT')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipt_lines','INSERT')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipt_lines','UPDATE')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_receipt_lines','DELETE')
 THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_TABLE_PRIVILEGES_INVALID'; END IF;
 IF pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','INSERT')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','UPDATE')
  OR pg_catalog.has_table_privilege('microapp_runtime','public.inventory_balances','DELETE')
 THEN RAISE EXCEPTION 'RUNTIME_MUST_NOT_MUTATE_INVENTORY_BALANCES'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl
   WHERE a.attrelid='public.inventory_balances'::regclass AND a.attnum>0 AND NOT a.attisdropped
    AND acl.grantee=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime')
    AND acl.privilege_type IN('INSERT','UPDATE','DELETE'))
 THEN RAISE EXCEPTION 'RUNTIME_COLUMN_LEVEL_BALANCE_WRITE_PRIVILEGE_INVALID'; END IF;
 SELECT p.oid INTO fn_oid FROM pg_catalog.pg_proc p
  WHERE p.oid='public.create_inventory_receipt(uuid,uuid,uuid,uuid,text,text,text,jsonb)'::regprocedure
   AND p.prosecdef AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
   AND p.proconfig @> ARRAY['search_path=pg_catalog, public'];
 IF fn_oid IS NULL OR NOT pg_catalog.has_function_privilege('microapp_runtime',fn_oid,'EXECUTE')
  OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=fn_oid),
   pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=fn_oid)))) a
   WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'INVENTORY_RECEIPT_FUNCTION_SECURITY_CONTRACT_INVALID'; END IF;
 SELECT pg_catalog.pg_get_functiondef(fn_oid) INTO fn_def;
 IF pg_catalog.strpos(fn_def,'FOR UPDATE')=0 OR pg_catalog.strpos(fn_def,'INVENTORY_RECEIPT_IDEMPOTENCY_CONFLICT')=0
  OR pg_catalog.strpos(fn_def,'request_payload')=0
  OR pg_catalog.strpos(fn_def,'inventory.receipt.created')=0 OR pg_catalog.strpos(fn_def,'purchase_receipt')=0
  OR pg_catalog.strpos(fn_def,'branch_memberships')=0 THEN
  RAISE EXCEPTION 'INVENTORY_RECEIPT_FUNCTION_DEFINITION_INVALID'; END IF;
 SELECT p.oid INTO validator_oid FROM pg_catalog.pg_proc p
  WHERE p.oid='public.validate_inventory_movement_source()'::regprocedure AND p.prosecdef
   AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
   AND p.proconfig @> ARRAY['search_path=pg_catalog'];
 IF validator_oid IS NULL THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_SECURITY_CONTRACT_INVALID'; END IF;
 SELECT pg_catalog.pg_get_functiondef(validator_oid) INTO validator_def;
 IF pg_catalog.strpos(validator_def,'INVENTORY_RECEIPT_MOVEMENT_MUST_MATCH_RECEIPT_LINE')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_MOVEMENT_SOURCE_TYPE_NOT_AUTHORIZED')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_SALE_MOVEMENT_MUST_MATCH_SALE_LINE')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_COUNT_SNAPSHOT_STALE')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_MOVEMENT_ACTOR_NOT_AUTHORIZED')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_MOVEMENT_ACTOR_BRANCH_SCOPE_INVALID')=0
  OR pg_catalog.strpos(validator_def,'INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID')=0
  OR pg_catalog.strpos(validator_def,'COUNT_MOVEMENT_MUST_REFERENCE_CONFIRMED_COUNT_ONLY')=0
 THEN RAISE EXCEPTION 'INVENTORY_MOVEMENT_SOURCE_VALIDATOR_COMPATIBILITY_INVALID'; END IF;
END;
$inventory_receipt_assertions$;
ROLLBACK;
