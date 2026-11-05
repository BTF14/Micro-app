BEGIN;
DO $runtime_login_smoke$
DECLARE
  v_org uuid;
  v_user uuid;
  v_product uuid;
  v_count uuid;
  v_token_hash text := pg_catalog.repeat('a',64);
  v_handle_hash text := pg_catalog.repeat('b',64);
  v_state_hash text := pg_catalog.repeat('c',64);
  v_locked boolean;
  v_rows integer;
  v_quantity numeric(14,3);
BEGIN
  IF current_user <> 'microapp_runtime' THEN
    RAISE EXCEPTION 'SMOKE_MUST_USE_ACTUAL_RUNTIME_LOGIN';
  END IF;

  -- Runtime principal can create the first-organization bootstrap records.
  INSERT INTO public.organizations(name,slug)
  VALUES ('Runtime Created Org','runtime-created-org') RETURNING id INTO v_org;
  INSERT INTO public.app_users(email,display_name)
  VALUES ('runtime-created@example.invalid','Runtime Created User') RETURNING id INTO v_user;
  INSERT INTO public.organization_members(organization_id,user_id,role)
  VALUES (v_org,v_user,'owner');

  UPDATE public.auth_bootstrap
     SET consumed_at=pg_catalog.now(), consumed_by_email='runtime-created@example.invalid',
         created_organization_id=v_org
   WHERE id=true AND consumed_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'BOOTSTRAP_SENTINEL_UPDATE_FAILED'; END IF;

  -- Session creation, definer-based tenant locks, and revocation.
  INSERT INTO public.auth_sessions(user_id,token_hash,expires_at)
  VALUES (v_user,v_token_hash,pg_catalog.now()+interval '1 hour');
  SELECT count(*) INTO v_rows
  FROM public.lock_tenant_context(v_token_hash,v_org);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'TENANT_LOCK_HELPER_FAILED'; END IF;
  UPDATE public.auth_sessions SET revoked_at=pg_catalog.now()
   WHERE token_hash=v_token_hash AND revoked_at IS NULL;

  -- OAuth bootstrap handoff insert/read/lock/consume/cleanup.
  INSERT INTO public.auth_bootstrap_attempts
    (handle_hash,state_hash,organization_name,organization_slug,expires_at)
  VALUES (v_handle_hash,v_state_hash,'Runtime Org','runtime-org',pg_catalog.now()+interval '10 minutes');
  PERFORM 1 FROM public.auth_bootstrap_attempts
   WHERE handle_hash=v_handle_hash AND state_hash=v_state_hash FOR UPDATE;
  UPDATE public.auth_bootstrap_attempts SET consumed_at=pg_catalog.now()
   WHERE handle_hash=v_handle_hash;
  DELETE FROM public.auth_bootstrap_attempts WHERE handle_hash=v_handle_hash;

  -- Atomic rate-limit upsert, including RETURNING's SELECT-column requirements.
  INSERT INTO public.auth_rate_limits(key_hash,window_started_at,attempts,updated_at)
  VALUES (pg_catalog.repeat('d',64),pg_catalog.now(),1,pg_catalog.now())
  ON CONFLICT(key_hash) DO UPDATE
    SET window_started_at=EXCLUDED.window_started_at,
        attempts=public.auth_rate_limits.attempts+1,
        updated_at=pg_catalog.now();
  PERFORM key_hash,window_started_at,attempts FROM public.auth_rate_limits
   WHERE key_hash=pg_catalog.repeat('d',64);
  DELETE FROM public.auth_rate_limits WHERE updated_at < pg_catalog.now()+interval '1 day';

  -- The helper functions lock the rows without exposing UPDATE on these tables.
  SELECT public.lock_branch_scopes(
    '11111111-1111-4111-8111-111111111111'::uuid,
    ARRAY['33333333-3333-4333-8333-333333333333'::uuid],
    ARRAY[]::uuid[], ARRAY[]::uuid[]
  ) INTO v_locked;
  IF v_locked IS DISTINCT FROM true THEN RAISE EXCEPTION 'BRANCH_LOCK_HELPER_FAILED'; END IF;

  SELECT count(*) INTO v_rows
  FROM public.lock_inventory_warehouses(
    '11111111-1111-4111-8111-111111111111'::uuid,
    ARRAY['55555555-5555-4555-8555-555555555555'::uuid],
    ARRAY['33333333-3333-4333-8333-333333333333'::uuid]
  );
  IF v_rows <> 1 THEN RAISE EXCEPTION 'WAREHOUSE_LOCK_HELPER_FAILED'; END IF;

  -- Catalog INSERT/UPDATE with only the reviewed patch columns.
  INSERT INTO public.products(organization_id,sku,name,price_usd,cost_usd)
  VALUES ('11111111-1111-4111-8111-111111111111','RUNTIME-SKU','Runtime Product',10,2)
  RETURNING id INTO v_product;
  UPDATE public.products SET price_usd=11,updated_at=pg_catalog.now()
   WHERE organization_id='11111111-1111-4111-8111-111111111111' AND id=v_product;

  -- Full opening-count transaction: lifecycle trigger, count-line validator,
  -- balance version trigger, and private balance/ledger pairing all execute
  -- under the real non-owner runtime login.
  INSERT INTO public.inventory_counts
    (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          'opening','Runtime role opening count','22222222-2222-4222-8222-222222222222')
  RETURNING id INTO v_count;

  INSERT INTO public.inventory_count_lines
    (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          v_count,v_product,2.000,2.000);

  UPDATE public.inventory_counts
     SET status='confirmed',confirmed_by='22222222-2222-4222-8222-222222222222',
         confirmed_at=pg_catalog.now()
   WHERE id=v_count;

  INSERT INTO public.inventory_balances
    (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',v_product,2.000);

  INSERT INTO public.warehouse_inventory_movements
    (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
     unit_cost_usd,reason,count_id,actor_user_id)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',v_product,'opening',2.000,
          2.000,'Runtime role opening count',v_count,
          '22222222-2222-4222-8222-222222222222');

  SELECT on_hand_quantity INTO v_quantity
  FROM public.inventory_balances
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product
  FOR UPDATE;
  IF v_quantity <> 2.000 THEN RAISE EXCEPTION 'BALANCE_READ_OR_LOCK_FAILED'; END IF;

  UPDATE public.inventory_balances SET on_hand_quantity=3.000,updated_at=pg_catalog.now()
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product;
  INSERT INTO public.warehouse_inventory_movements
    (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
     reason,actor_user_id)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',v_product,'purchase_receipt',1.000,
          'Runtime balance ledger smoke','22222222-2222-4222-8222-222222222222');

  -- Audit identity INSERT works without granting sequence access.
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
          'runtime.role.smoke','test','runtime-role','{}'::jsonb);

  -- Explicitly deny DDL, privilege escalation, unsupported reads and mutations.
  BEGIN
    EXECUTE 'SELECT * FROM public.inventory_balance_ledger_intents';
    RAISE EXCEPTION 'RUNTIME_READ_PRIVATE_LEDGER_INTENTS';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'SELECT * FROM public.audit_logs';
    RAISE EXCEPTION 'RUNTIME_READ_AUDIT_LOGS';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'UPDATE public.inventory_count_lines SET counted_quantity=99';
    RAISE EXCEPTION 'RUNTIME_UPDATED_COUNT_LINES';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'UPDATE public.branches SET is_active=false';
    RAISE EXCEPTION 'RUNTIME_UPDATED_BRANCHES';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'UPDATE public.warehouses SET is_active=false';
    RAISE EXCEPTION 'RUNTIME_UPDATED_WAREHOUSES';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'UPDATE public.audit_logs SET action=''tampered''';
    RAISE EXCEPTION 'RUNTIME_UPDATED_AUDIT_LOGS';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'DELETE FROM public.warehouse_inventory_movements';
    RAISE EXCEPTION 'RUNTIME_DELETED_INVENTORY_LEDGER';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'TRUNCATE public.audit_logs';
    RAISE EXCEPTION 'RUNTIME_TRUNCATED_AUDIT_LOGS';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'CREATE TABLE public.runtime_role_must_not_create(id integer)';
    RAISE EXCEPTION 'RUNTIME_CREATED_TABLE';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'CREATE SCHEMA runtime_role_must_not_create';
    RAISE EXCEPTION 'RUNTIME_CREATED_SCHEMA';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- PostgreSQL may warn and no-op rather than raise when a role without
  -- grant option attempts GRANT. Assert the attempt did not add a PUBLIC ACL.
  EXECUTE 'GRANT SELECT ON public.products TO PUBLIC';
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) acl
    WHERE c.oid='public.products'::regclass
      AND acl.grantee=0 AND acl.privilege_type='SELECT'
  ) THEN RAISE EXCEPTION 'RUNTIME_GRANTED_PRIVILEGE'; END IF;
  BEGIN
    EXECUTE 'ALTER TABLE public.products DISABLE TRIGGER ALL';
    RAISE EXCEPTION 'RUNTIME_ALTERED_TRIGGER';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'SET ROLE microapp_migrator';
    RAISE EXCEPTION 'RUNTIME_ESCALATED_TO_MIGRATOR';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'SELECT * FROM public.sales';
    RAISE EXCEPTION 'RUNTIME_READ_UNSUPPORTED_SALES_TABLE';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$runtime_login_smoke$;
ROLLBACK;
