-- Run after 0009_inventory_count_ledger_validation.sql on disposable PostgreSQL 18.
BEGIN;
DO $$
DECLARE
  org_id uuid;
  actor_id uuid;
  other_actor_id uuid;
  branch_id uuid;
  opening_warehouse_id uuid;
  physical_warehouse_id uuid;
  bad_opening_warehouse_id uuid;
  v_product_id uuid;
  opening_count_id uuid;
  physical_count_id uuid;
  bad_opening_count_id uuid;
  status_value text;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES ('Count Ledger Validation', 'count-ledger-validation')
  RETURNING id INTO org_id;

  INSERT INTO app_users (email, display_name)
  VALUES ('count-ledger-owner@example.invalid', 'Count Ledger Owner')
  RETURNING id INTO actor_id;
  INSERT INTO app_users (email, display_name)
  VALUES ('count-ledger-other@example.invalid', 'Count Ledger Other')
  RETURNING id INTO other_actor_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (org_id, actor_id, 'owner'), (org_id, other_actor_id, 'admin');

  INSERT INTO branches (organization_id, name, slug)
  VALUES (org_id, 'Count Ledger Branch', 'count-ledger-branch')
  RETURNING id INTO branch_id;

  INSERT INTO warehouses (organization_id, branch_id, code, name)
  VALUES (org_id, branch_id, 'opening', 'Opening Warehouse')
  RETURNING id INTO opening_warehouse_id;
  INSERT INTO warehouses (organization_id, branch_id, code, name)
  VALUES (org_id, branch_id, 'physical', 'Physical Warehouse')
  RETURNING id INTO physical_warehouse_id;
  INSERT INTO warehouses (organization_id, branch_id, code, name)
  VALUES (org_id, branch_id, 'bad-opening', 'Invalid Opening Warehouse')
  RETURNING id INTO bad_opening_warehouse_id;

  INSERT INTO products (organization_id, sku, name, price_usd)
  VALUES (org_id, 'COUNT-LEDGER-1', 'Count Ledger Product', 10)
  RETURNING id INTO v_product_id;

  -- Opening movement must exactly match the opening count and its metadata.
  INSERT INTO inventory_counts
    (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
  VALUES (org_id, branch_id, opening_warehouse_id, 'opening', 'Opening snapshot reason', actor_id)
  RETURNING id INTO opening_count_id;
  INSERT INTO inventory_count_lines
    (organization_id, branch_id, warehouse_id, count_id, product_id, counted_quantity, unit_cost_usd)
  VALUES (org_id, branch_id, opening_warehouse_id, opening_count_id, v_product_id, 5, 2.5000);

  UPDATE inventory_counts
     SET status = 'confirmed', confirmed_by = actor_id, confirmed_at = clock_timestamp()
   WHERE organization_id = org_id AND id = opening_count_id;

  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
    VALUES (org_id, branch_id, opening_warehouse_id, v_product_id, 'opening', 4, 2.5000, 'Opening snapshot reason', opening_count_id, actor_id);
    RAISE EXCEPTION 'FAIL: mismatched opening delta accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
    VALUES (org_id, branch_id, opening_warehouse_id, v_product_id, 'opening', 5, 2.5000, 'Opening snapshot reason', opening_count_id, other_actor_id);
    RAISE EXCEPTION 'FAIL: wrong count actor accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
    VALUES (org_id, branch_id, opening_warehouse_id, v_product_id, 'opening', 5, 2.5000, 'Forged reason', opening_count_id, actor_id);
    RAISE EXCEPTION 'FAIL: wrong count reason accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
    VALUES (org_id, branch_id, opening_warehouse_id, v_product_id, 'opening', 5, 2.5001, 'Opening snapshot reason', opening_count_id, actor_id);
    RAISE EXCEPTION 'FAIL: wrong count unit cost accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO warehouse_inventory_movements
    (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
  VALUES (org_id, branch_id, opening_warehouse_id, v_product_id, 'opening', 5, 2.5000, 'Opening snapshot reason', opening_count_id, actor_id);

  -- Opening counts must not carry a physical stock/version snapshot.
  INSERT INTO inventory_counts
    (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
  VALUES (org_id, branch_id, bad_opening_warehouse_id, 'opening', 'Invalid opening snapshot', actor_id)
  RETURNING id INTO bad_opening_count_id;
  INSERT INTO inventory_count_lines
    (organization_id, branch_id, warehouse_id, count_id, product_id, counted_quantity,
     expected_on_hand_quantity, expected_balance_version)
  VALUES (org_id, branch_id, bad_opening_warehouse_id, bad_opening_count_id, v_product_id, 1, 0, 0);
  BEGIN
    UPDATE inventory_counts
       SET status = 'confirmed', confirmed_by = actor_id, confirmed_at = clock_timestamp()
     WHERE organization_id = org_id AND id = bad_opening_count_id;
    RAISE EXCEPTION 'FAIL: opening count with physical snapshot confirmed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  SELECT status INTO status_value FROM inventory_counts WHERE id = bad_opening_count_id;
  IF status_value <> 'draft' THEN
    RAISE EXCEPTION 'FAIL: invalid opening count did not remain draft';
  END IF;

  -- Physical count confirmation requires both snapshot values.
  INSERT INTO inventory_counts
    (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
  VALUES (org_id, branch_id, physical_warehouse_id, 'physical', 'Physical snapshot reason', actor_id)
  RETURNING id INTO physical_count_id;
  INSERT INTO inventory_count_lines
    (organization_id, branch_id, warehouse_id, count_id, product_id, counted_quantity, unit_cost_usd)
  VALUES (org_id, branch_id, physical_warehouse_id, physical_count_id, v_product_id, 12, NULL);

  BEGIN
    UPDATE inventory_counts
       SET status = 'confirmed', confirmed_by = actor_id, confirmed_at = clock_timestamp()
     WHERE organization_id = org_id AND id = physical_count_id;
    RAISE EXCEPTION 'FAIL: physical count without snapshot confirmed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  SELECT status INTO status_value FROM inventory_counts WHERE id = physical_count_id;
  IF status_value <> 'draft' THEN
    RAISE EXCEPTION 'FAIL: physical count without snapshot did not remain draft';
  END IF;

  UPDATE inventory_count_lines
     SET expected_on_hand_quantity = 0, expected_balance_version = 0
   WHERE organization_id = org_id AND count_id = physical_count_id AND product_id = v_product_id;

  UPDATE inventory_counts
     SET status = 'confirmed', confirmed_by = actor_id, confirmed_at = clock_timestamp()
   WHERE organization_id = org_id AND id = physical_count_id;

  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
    VALUES (org_id, branch_id, physical_warehouse_id, v_product_id, 'count_adjustment', 11, NULL, 'Physical snapshot reason', physical_count_id, actor_id);
    RAISE EXCEPTION 'FAIL: mismatched physical delta accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO warehouse_inventory_movements
    (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
  VALUES (org_id, branch_id, physical_warehouse_id, v_product_id, 'count_adjustment', 12, NULL, 'Physical snapshot reason', physical_count_id, actor_id);
END $$;
ROLLBACK;
