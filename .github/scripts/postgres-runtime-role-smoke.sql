BEGIN;
DO $runtime_login_smoke$
DECLARE
  v_org uuid;
  v_user uuid;
  v_product uuid;
  v_count uuid;
  v_sale uuid;
  v_unauthorized_count uuid;
  v_stale_count uuid;
  v_balance_version bigint;
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
  FROM public.lock_open_register_shift(
    '11111111-1111-4111-8111-111111111111'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid
  );
  IF v_rows <> 1 THEN RAISE EXCEPTION 'OPEN_REGISTER_SHIFT_DEFINER_HELPER_FAILED'; END IF;

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

  -- Runtime can read and create draft sales/children for idempotency replay.
  -- The lifecycle and deferred constraints still own finalization.
  INSERT INTO public.sales (
    organization_id,idempotency_key,status,subtotal_usd,total_usd,created_by,
    branch_id,register_shift_id,warehouse_id,settlement_currency,request_hash
  ) VALUES (
    '11111111-1111-4111-8111-111111111111','runtime-draft-smoke','draft',1,1,
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    (SELECT id FROM public.register_shifts WHERE organization_id='11111111-1111-4111-8111-111111111111' LIMIT 1),
    '55555555-5555-4555-8555-555555555555','USD',pg_catalog.repeat('a',64)
  ) RETURNING id INTO v_sale;
  INSERT INTO public.sale_items (
    organization_id,sale_id,product_id,product_name_snapshot,sku_snapshot,
    quantity,unit_price_usd,unit_cost_usd,line_total_usd,line_total_ves
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',v_sale,v_product,'Runtime Product','RUNTIME-SKU',
    1,1,1,1,1
  );
  INSERT INTO public.payments (
    organization_id,sale_id,method,currency,amount,usd_equivalent_snapshot,received_by
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',v_sale,'cash','USD',1,1,
    '22222222-2222-4222-8222-222222222222'
  );
  PERFORM 1 FROM public.sales WHERE id=v_sale;
  PERFORM 1 FROM public.sale_items WHERE sale_id=v_sale;
  PERFORM 1 FROM public.payments WHERE sale_id=v_sale;

  -- Full opening-count transaction: the append-only movement is the only
  -- stock write; its SECURITY DEFINER AFTER INSERT trigger creates the balance.
  INSERT INTO public.inventory_counts
    (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          'opening','Runtime role opening count','66666666-6666-4666-8666-666666666666')
  RETURNING id INTO v_count;

  INSERT INTO public.inventory_count_lines
    (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          v_count,v_product,2.000,2.000);

  UPDATE public.inventory_counts
     SET status='confirmed',confirmed_by='66666666-6666-4666-8666-666666666666',
         confirmed_at=pg_catalog.now()
   WHERE id=v_count;

  INSERT INTO public.warehouse_inventory_movements
    (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
     unit_cost_usd,reason,count_id,actor_user_id)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',v_product,'opening',2.000,
          2.000,'Runtime role opening count',v_count,
          '66666666-6666-4666-8666-666666666666');

  SELECT count(*) INTO v_rows
  FROM public.lock_inventory_balances(
    '11111111-1111-4111-8111-111111111111',
    ARRAY['55555555-5555-4555-8555-555555555555'::uuid],
    ARRAY['33333333-3333-4333-8333-333333333333'::uuid],
    ARRAY[v_product]
  );
  IF v_rows <> 1 THEN RAISE EXCEPTION 'BALANCE_DEFINER_LOCK_HELPER_FAILED'; END IF;

  SELECT on_hand_quantity INTO v_quantity
  FROM public.inventory_balances
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product;
  IF v_quantity <> 2.000 THEN RAISE EXCEPTION 'LEDGER_PROJECTION_OPENING_FAILED'; END IF;

  INSERT INTO public.warehouse_inventory_movements
    (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
     unit_cost_usd,reason,reference_type,reference_id,actor_user_id)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',v_product,'sale',-1.000,
          1.0000,'Runtime ledger projection smoke','sale',v_sale,
          '22222222-2222-4222-8222-222222222222');

  SELECT on_hand_quantity INTO v_quantity
  FROM public.inventory_balances
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product;
  IF v_quantity <> 1.000 THEN RAISE EXCEPTION 'LEDGER_PROJECTION_SALE_FAILED'; END IF;

  -- A cashier may create no inventory adjustment, even by forging a
  -- confirmed physical-count document directly through the runtime SQL role.
  SELECT balance_version INTO v_balance_version
  FROM public.inventory_balances
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product;
  INSERT INTO public.inventory_counts
    (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          'physical','Unauthorized cashier count smoke','66666666-6666-4666-8666-666666666666')
  RETURNING id INTO v_unauthorized_count;
  INSERT INTO public.inventory_count_lines
    (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
     expected_on_hand_quantity,expected_balance_version)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          v_unauthorized_count,v_product,1.000,1.0000,1.000,v_balance_version);
  BEGIN
    UPDATE public.inventory_counts
       SET status='confirmed',confirmed_by='22222222-2222-4222-8222-222222222222',
           confirmed_at=pg_catalog.now()
     WHERE id=v_unauthorized_count;
    RAISE EXCEPTION 'RUNTIME_CASHIER_CONFIRMED_INVENTORY_COUNT';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- A valid inventory actor cannot apply a physical count captured against
  -- an earlier balance version, even if the proposed delta would not underflow.
  INSERT INTO public.inventory_counts
    (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          'physical','Stale count snapshot smoke','66666666-6666-4666-8666-666666666666')
  RETURNING id INTO v_stale_count;
  INSERT INTO public.inventory_count_lines
    (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
     expected_on_hand_quantity,expected_balance_version)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555555',
          v_stale_count,v_product,2.000,2.0000,1.000,v_balance_version - 1);
  UPDATE public.inventory_counts
     SET status='confirmed',confirmed_by='66666666-6666-4666-8666-666666666666',
         confirmed_at=pg_catalog.now()
   WHERE id=v_stale_count;
  BEGIN
    INSERT INTO public.warehouse_inventory_movements
      (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
       unit_cost_usd,reason,count_id,actor_user_id)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '33333333-3333-4333-8333-333333333333',
            '55555555-5555-4555-8555-555555555555',v_product,'count_adjustment',1.000,
            2.0000,'Stale count snapshot smoke',v_stale_count,
            '66666666-6666-4666-8666-666666666666');
    RAISE EXCEPTION 'RUNTIME_APPLIED_STALE_INVENTORY_COUNT';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Source-less purchase receipts and reversals cannot manufacture stock changes.
  BEGIN
    INSERT INTO public.warehouse_inventory_movements
      (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
       reason,actor_user_id)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '33333333-3333-4333-8333-333333333333',
            '55555555-5555-4555-8555-555555555555',v_product,'purchase_receipt',4.000,
            'Runtime unauthorized receipt smoke','22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'RUNTIME_INSERTED_UNAUTHORIZED_PURCHASE_RECEIPT';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.warehouse_inventory_movements
      (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
       reason,actor_user_id)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '33333333-3333-4333-8333-333333333333',
            '55555555-5555-4555-8555-555555555555',v_product,'reversal',-4.000,
            'Runtime unauthorized reversal smoke','22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'RUNTIME_INSERTED_UNAUTHORIZED_REVERSAL';
  EXCEPTION WHEN check_violation THEN NULL; END;

  SELECT on_hand_quantity INTO v_quantity
  FROM public.inventory_balances
  WHERE organization_id='11111111-1111-4111-8111-111111111111'
    AND warehouse_id='55555555-5555-4555-8555-555555555555'
    AND product_id=v_product;
  IF v_quantity <> 1.000 THEN RAISE EXCEPTION 'REJECTED_MOVEMENT_CHANGED_BALANCE'; END IF;

  -- Runtime has no direct INSERT/UPDATE/DELETE/TRUNCATE path to balances.
  BEGIN
    INSERT INTO public.inventory_balances
      (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '33333333-3333-4333-8333-333333333333',
            '55555555-5555-4555-8555-555555555555',v_product,4.000);
    RAISE EXCEPTION 'RUNTIME_INSERTED_INVENTORY_BALANCE_DIRECTLY';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.inventory_balances SET on_hand_quantity=4.000
     WHERE organization_id='11111111-1111-4111-8111-111111111111'
       AND warehouse_id='55555555-5555-4555-8555-555555555555' AND product_id=v_product;
    RAISE EXCEPTION 'RUNTIME_UPDATED_INVENTORY_BALANCE_DIRECTLY';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.inventory_balances
     WHERE organization_id='11111111-1111-4111-8111-111111111111'
       AND warehouse_id='55555555-5555-4555-8555-555555555555' AND product_id=v_product;
    RAISE EXCEPTION 'RUNTIME_DELETED_INVENTORY_BALANCE_DIRECTLY';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'TRUNCATE public.inventory_balances';
    RAISE EXCEPTION 'RUNTIME_TRUNCATED_INVENTORY_BALANCES';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM 1 FROM public.bcv_sync_state WHERE singleton = true;
  PERFORM 1 FROM public.exchange_rates LIMIT 1;
  BEGIN UPDATE public.bcv_sync_state SET last_success_at=pg_catalog.now(), last_outcome='unchanged' WHERE singleton=true; RAISE EXCEPTION 'RUNTIME_FORGED_BCV_SYNC_SUCCESS'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.exchange_rates SET validation_status='valid' WHERE source='BCV_OFFICIAL_HTML_V1'; RAISE EXCEPTION 'RUNTIME_CHANGED_BCV_RATE_APPLICABILITY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date) VALUES ('USD','VES',1,'RUNTIME_FORGED_BCV','2026-11-10'); RAISE EXCEPTION 'RUNTIME_INSERTED_BCV_RATE'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Audit identity INSERT works without granting sequence access.
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES ('11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
          'runtime.role.smoke','test','runtime-role','{}'::jsonb);

  -- Runtime may read the append-only movement history, but never mutate it.
  PERFORM 1 FROM public.warehouse_inventory_movements LIMIT 1;
  BEGIN
    EXECUTE 'UPDATE public.warehouse_inventory_movements SET reason=''tampered''';
    RAISE EXCEPTION 'RUNTIME_UPDATED_INVENTORY_LEDGER';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'TRUNCATE public.warehouse_inventory_movements';
    RAISE EXCEPTION 'RUNTIME_TRUNCATED_INVENTORY_LEDGER';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Explicitly deny DDL, privilege escalation, unsupported reads and mutations.
  IF pg_catalog.to_regclass('public.inventory_balance_ledger_intents') IS NOT NULL THEN
    RAISE EXCEPTION 'OBSOLETE_BALANCE_LEDGER_INTENTS_TABLE_REMAINS';
  END IF;
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
    EXECUTE 'UPDATE public.sales SET subtotal_usd=0';
    RAISE EXCEPTION 'RUNTIME_UPDATED_PROTECTED_SALE_TOTAL';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$runtime_login_smoke$;
ROLLBACK;
