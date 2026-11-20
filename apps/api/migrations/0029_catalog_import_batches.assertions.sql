BEGIN;
DO $catalog_import_batches_assertions$
DECLARE
  runtime_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime');
  bcv_oid oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_bcv_sync');
  table_oid oid := pg_catalog.to_regclass('public.catalog_import_batches');
  fn_oid oid := pg_catalog.to_regprocedure('public.reject_catalog_import_batches_mutation()');
  acl_count integer;
  org_a uuid := pg_catalog.gen_random_uuid();
  org_b uuid := pg_catalog.gen_random_uuid();
  actor uuid := pg_catalog.gen_random_uuid();
  audit_a bigint;
  audit_b bigint;
  batch_id uuid;
BEGIN
  IF table_oid IS NULL THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_TABLE_MISSING'; END IF;
  IF (SELECT relowner FROM pg_catalog.pg_class WHERE oid=table_oid) <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_OWNER_INVALID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='u'
    AND pg_catalog.pg_get_constraintdef(oid) LIKE 'UNIQUE (organization_id, idempotency_key)%')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_IDEMPOTENCY_UNIQUE_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index i WHERE i.indrelid=table_oid AND i.indisvalid AND i.indisready
    AND pg_catalog.pg_get_indexdef(i.indexrelid) LIKE '%(organization_id, created_at DESC, id DESC)%')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_HISTORY_INDEX_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='u'
    AND pg_catalog.pg_get_constraintdef(oid) LIKE 'UNIQUE (organization_id, id)%')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_ORG_ID_UNIQUE_MISSING'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c') <> 9
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%idempotency_key%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%request_hash%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%status%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%total_rows%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%created_count%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%updated_count%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%unchanged_count%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%summary%')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='c' AND pg_catalog.pg_get_constraintdef(oid) LIKE '%created_count%updated_count%unchanged_count%total_rows%')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_CHECK_CONSTRAINTS_MISSING'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_constraint WHERE conrelid=table_oid AND contype='f'
      AND confrelid IN ('public.organizations'::regclass,'public.organization_members'::regclass,'public.audit_logs'::regclass)) <> 3
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_FOREIGN_KEYS_MISSING'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid=table_oid AND NOT tgisinternal AND tgenabled='A'
      AND tgname IN ('catalog_import_batches_10_append_only_rows','catalog_import_batches_20_append_only_truncate')) <> 2
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_APPEND_ONLY_TRIGGERS_NOT_ALWAYS_ENABLED'; END IF;
  IF fn_oid IS NULL OR (SELECT proowner FROM pg_catalog.pg_proc WHERE oid=fn_oid) <>
       (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='microapp_migrator')
     OR NOT ((SELECT proconfig FROM pg_catalog.pg_proc WHERE oid=fn_oid) @> ARRAY['search_path=pg_catalog'])
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_TRIGGER_FUNCTION_SECURITY_INVALID'; END IF;
  IF NOT pg_catalog.has_table_privilege(runtime_oid,table_oid,'SELECT')
     OR NOT pg_catalog.has_table_privilege(runtime_oid,table_oid,'INSERT')
     OR pg_catalog.has_table_privilege(runtime_oid,table_oid,'UPDATE')
     OR pg_catalog.has_table_privilege(runtime_oid,table_oid,'DELETE')
     OR pg_catalog.has_table_privilege(runtime_oid,table_oid,'TRUNCATE')
     OR pg_catalog.has_table_privilege(runtime_oid,table_oid,'TRIGGER')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_RUNTIME_PRIVILEGES_INVALID'; END IF;
  SELECT count(*) INTO acl_count FROM pg_catalog.aclexplode(COALESCE(
    (SELECT relacl FROM pg_catalog.pg_class WHERE oid=table_oid),
    pg_catalog.acldefault('r',(SELECT relowner FROM pg_catalog.pg_class WHERE oid=table_oid)))) acl
    WHERE acl.grantee=runtime_oid;
  IF acl_count <> 2 THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_RUNTIME_ACL_NOT_EXACT'; END IF;
  IF pg_catalog.has_table_privilege(bcv_oid,table_oid,'SELECT')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'INSERT')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'UPDATE')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'DELETE')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'TRUNCATE')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'REFERENCES')
     OR pg_catalog.has_table_privilege(bcv_oid,table_oid,'TRIGGER')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_BCV_PRIVILEGES_PRESENT'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
      (SELECT relacl FROM pg_catalog.pg_class WHERE oid=table_oid),
      pg_catalog.acldefault('r',(SELECT relowner FROM pg_catalog.pg_class WHERE oid=table_oid)))) acl
      WHERE acl.grantee IN (0,bcv_oid))
     OR EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
      (SELECT proacl FROM pg_catalog.pg_proc WHERE oid=fn_oid),
      pg_catalog.acldefault('f',(SELECT proowner FROM pg_catalog.pg_proc WHERE oid=fn_oid)))) acl
      WHERE acl.grantee IN (0,bcv_oid,runtime_oid) AND acl.privilege_type='EXECUTE')
  THEN RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_FUNCTION_OR_TABLE_ACL_LEAK'; END IF;

  INSERT INTO public.organizations (id,name,slug) VALUES
    (org_a,'Catalog import assertion A','catalog-import-assertion-'||pg_catalog.replace(org_a::text,'-','')),
    (org_b,'Catalog import assertion B','catalog-import-assertion-'||pg_catalog.replace(org_b::text,'-',''));
  INSERT INTO public.app_users (id,email,display_name)
    VALUES (actor,'catalog-import-'||pg_catalog.replace(actor::text,'-','')||'@example.invalid','Catalog import assertion actor');
  INSERT INTO public.organization_members (organization_id,user_id,role)
    VALUES (org_a,actor,'owner'),(org_b,actor,'owner');
  -- Explicit identity values keep the assertion transaction sequence-neutral:
  -- PostgreSQL sequence increments are not rolled back with the surrounding transaction.
  SELECT COALESCE(pg_catalog.max(id),0)+1 INTO audit_a FROM public.audit_logs;
  audit_b := audit_a+1;
  INSERT INTO public.audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,metadata)
    OVERRIDING SYSTEM VALUE
    VALUES (audit_a,org_a,actor,'catalog.import.applied','catalog_import_batch','assertion-a','{}'::jsonb);
  INSERT INTO public.audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,metadata)
    OVERRIDING SYSTEM VALUE
    VALUES (audit_b,org_b,actor,'catalog.import.applied','catalog_import_batch','assertion-b','{}'::jsonb);

  INSERT INTO public.catalog_import_batches
    (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id,summary)
  VALUES (org_a,'same-key-0029',pg_catalog.repeat('a',64),'applied',3,1,1,1,actor,audit_a,'{"source":"assertions"}')
  RETURNING id INTO batch_id;
  BEGIN
    INSERT INTO public.catalog_import_batches
      (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id)
    VALUES (org_a,'same-key-0029',pg_catalog.repeat('b',64),'applied',1,1,0,0,actor,audit_a);
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_DUPLICATE_IDEMPOTENCY_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  INSERT INTO public.catalog_import_batches
    (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id)
  VALUES (org_b,'same-key-0029',pg_catalog.repeat('c',64),'applied',1,1,0,0,actor,audit_b);

  BEGIN
    INSERT INTO public.catalog_import_batches
      (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id)
    VALUES (org_a,'bad-hash','not-a-sha256','applied',1,1,0,0,actor,audit_a);
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_INVALID_HASH_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.catalog_import_batches
      (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id)
    VALUES (org_a,'bad-total','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','applied',0,0,0,0,actor,audit_a);
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_INVALID_TOTAL_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.catalog_import_batches
      (organization_id,idempotency_key,request_hash,status,total_rows,created_count,updated_count,unchanged_count,actor_user_id,audit_log_id)
    VALUES (org_a,'bad-counts','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','applied',2,1,0,0,actor,audit_a);
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_INVALID_COUNTS_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.catalog_import_batches SET summary='{"mutated":true}'::jsonb WHERE id=batch_id;
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_UPDATE_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.catalog_import_batches WHERE id=batch_id;
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_DELETE_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$catalog_import_batches_assertions$;
ROLLBACK;
