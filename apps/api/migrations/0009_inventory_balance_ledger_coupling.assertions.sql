-- Run after 0009_inventory_balance_ledger_coupling.sql on disposable PostgreSQL 18.
BEGIN;
DO $$
DECLARE org_id uuid; actor_id uuid; branch_id uuid; branch_b uuid; warehouse_a uuid; warehouse_b uuid; warehouse_branch_b uuid;
  product_a uuid; product_b uuid; org_b uuid; actor_b uuid; tenant_branch_b uuid; tenant_warehouse_b uuid; tenant_product_b uuid;
  v_balance_version bigint; remaining_intents bigint;
BEGIN
  INSERT INTO organizations (name, slug) VALUES ('Balance Ledger Coupling', 'balance-ledger-coupling') RETURNING id INTO org_id;
  INSERT INTO app_users (email, display_name) VALUES ('balance-ledger-owner@example.invalid', 'Balance Ledger Owner') RETURNING id INTO actor_id;
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (org_id, actor_id, 'owner');
  INSERT INTO branches (organization_id, name, slug) VALUES (org_id, 'Balance Ledger Branch', 'balance-ledger-branch') RETURNING id INTO branch_id;
  INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES (org_id, branch_id, 'warehouse-a', 'Warehouse A') RETURNING id INTO warehouse_a;
  INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES (org_id, branch_id, 'warehouse-b', 'Warehouse B') RETURNING id INTO warehouse_b;
  INSERT INTO products (organization_id, sku, name, price_usd) VALUES (org_id, 'BAL-LEDGER-A', 'Balance Ledger A', 10) RETURNING id INTO product_a;
  INSERT INTO products (organization_id, sku, name, price_usd) VALUES (org_id, 'BAL-LEDGER-B', 'Balance Ledger B', 10) RETURNING id INTO product_b;
  INSERT INTO branches (organization_id, name, slug) VALUES (org_id, 'Balance Ledger Branch B', 'balance-ledger-branch-b') RETURNING id INTO branch_b;
  INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES (org_id, branch_b, 'warehouse-branch-b', 'Warehouse Branch B') RETURNING id INTO warehouse_branch_b;
  INSERT INTO organizations (name, slug) VALUES ('Balance Ledger Tenant B', 'balance-ledger-tenant-b') RETURNING id INTO org_b;
  INSERT INTO app_users (email, display_name) VALUES ('balance-ledger-tenant-b@example.invalid', 'Balance Ledger Tenant B') RETURNING id INTO actor_b;
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (org_b, actor_b, 'owner');
  INSERT INTO branches (organization_id, name, slug) VALUES (org_b, 'Tenant B Branch', 'tenant-b-branch') RETURNING id INTO tenant_branch_b;
  INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES (org_b, tenant_branch_b, 'tenant-b-warehouse', 'Tenant B Warehouse') RETURNING id INTO tenant_warehouse_b;
  INSERT INTO products (organization_id, sku, name, price_usd) VALUES (org_b, 'BAL-LEDGER-TENANT-B', 'Tenant B Product', 10) RETURNING id INTO tenant_product_b;

  INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
  VALUES (org_id, branch_id, warehouse_a, product_a, 0);

  BEGIN
    INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
    VALUES (org_id, branch_id, warehouse_a, product_b, 1);
    SET CONSTRAINTS inventory_balance_ledger_intent_complete IMMEDIATE;
    RAISE EXCEPTION 'FAIL: non-zero balance insert without a ledger movement was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  SET CONSTRAINTS inventory_balance_ledger_intent_complete DEFERRED;

  BEGIN
    TRUNCATE TABLE inventory_balances;
    RAISE EXCEPTION 'FAIL: inventory balances truncate was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    TRUNCATE TABLE warehouse_inventory_movements;
    RAISE EXCEPTION 'FAIL: inventory ledger truncate was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_a, 'purchase_receipt', 1, 'Unpaired movement', actor_id);
    RAISE EXCEPTION 'FAIL: movement without balance change was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 1 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_a, 'purchase_receipt', 2, 'Wrong delta', actor_id);
    RAISE EXCEPTION 'FAIL: mismatched movement delta was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 3 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_b, 'purchase_receipt', 3, 'Wrong product', actor_id);
    RAISE EXCEPTION 'FAIL: movement for wrong product was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 4 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_b, product_a, 'purchase_receipt', 4, 'Wrong warehouse', actor_id);
    RAISE EXCEPTION 'FAIL: movement for wrong warehouse was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 1 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_a, 'reversal', -1, 'Wrong signed delta', actor_id);
    RAISE EXCEPTION 'FAIL: movement with opposite signed delta was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 3 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_b, warehouse_branch_b, product_a, 'purchase_receipt', 3, 'Wrong branch', actor_id);
    RAISE EXCEPTION 'FAIL: movement for wrong branch was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 4 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_b, tenant_branch_b, tenant_warehouse_b, tenant_product_b, 'purchase_receipt', 4, 'Wrong tenant', actor_b);
    RAISE EXCEPTION 'FAIL: movement for wrong tenant was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_balances SET on_hand_quantity = 3 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_a, 'purchase_receipt', 3, 'First movement', actor_id);
    INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
    VALUES (org_id, branch_id, warehouse_a, product_a, 'purchase_receipt', 3, 'Duplicate movement', actor_id);
    RAISE EXCEPTION 'FAIL: duplicate movement consumed one balance intent';
  EXCEPTION WHEN check_violation THEN NULL; END;

  UPDATE inventory_balances SET on_hand_quantity = 5 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
  INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
  VALUES (org_id, branch_id, warehouse_a, product_a, 'purchase_receipt', 5, 'Matched balance receipt', actor_id);
  -- Signed negative deltas are paired exactly for physical adjustments.
  UPDATE inventory_balances SET on_hand_quantity = 3 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
  INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
  VALUES (org_id, branch_id, warehouse_a, product_a, 'reversal', -2, 'Matched negative adjustment', actor_id);
  UPDATE inventory_balances SET reserved_quantity = 2 WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;
  UPDATE inventory_balances SET on_hand_quantity = 3, updated_at = clock_timestamp()
   WHERE organization_id = org_id AND warehouse_id = warehouse_a AND product_id = product_a;

  INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
  VALUES (org_id, branch_id, warehouse_a, product_b, 2);
  INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
  VALUES (org_id, branch_id, warehouse_a, product_b, 'purchase_receipt', 2, 'Second product receipt', actor_id);

  SET CONSTRAINTS inventory_balance_ledger_intent_complete IMMEDIATE;
  SELECT count(*) INTO remaining_intents FROM inventory_balance_ledger_intents;
  IF remaining_intents <> 0 THEN RAISE EXCEPTION 'FAIL: consumed balance ledger intents were not cleaned up'; END IF;
  SET CONSTRAINTS inventory_balance_ledger_intent_complete DEFERRED;
  SELECT ib.balance_version INTO v_balance_version FROM inventory_balances ib
   WHERE ib.organization_id = org_id AND ib.warehouse_id = warehouse_a AND ib.product_id = product_a;
  IF v_balance_version <> 4 THEN RAISE EXCEPTION 'FAIL: balance version changed unexpectedly, got %', v_balance_version; END IF;
END $$;
ROLLBACK;