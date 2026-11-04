-- Run after 0005_warehouse_inventory.sql on disposable PostgreSQL 18.
BEGIN;
DO $$
DECLARE
  org_a uuid; org_b uuid; user_a uuid; user_b uuid;
  branch_a uuid; branch_b uuid; warehouse_a uuid; warehouse_b uuid;
  product_a uuid; product_b uuid; count_a uuid; count_b uuid;
BEGIN
  INSERT INTO organizations (name, slug) VALUES ('Inventory Tenant A','inventory-tenant-a') RETURNING id INTO org_a;
  INSERT INTO organizations (name, slug) VALUES ('Inventory Tenant B','inventory-tenant-b') RETURNING id INTO org_b;
  INSERT INTO app_users (email,display_name) VALUES ('inventory-a@example.invalid','Inventory A') RETURNING id INTO user_a;
  INSERT INTO app_users (email,display_name) VALUES ('inventory-b@example.invalid','Inventory B') RETURNING id INTO user_b;
  INSERT INTO organization_members (organization_id,user_id,role) VALUES (org_a,user_a,'owner'),(org_b,user_b,'owner');
  INSERT INTO branches (organization_id,name,slug) VALUES (org_a,'Inventory A','inventory-a') RETURNING id INTO branch_a;
  INSERT INTO branches (organization_id,name,slug) VALUES (org_b,'Inventory B','inventory-b') RETURNING id INTO branch_b;
  INSERT INTO warehouses (organization_id,branch_id,code,name) VALUES (org_a,branch_a,'main','Main warehouse') RETURNING id INTO warehouse_a;
  INSERT INTO warehouses (organization_id,branch_id,code,name) VALUES (org_b,branch_b,'main','Other warehouse') RETURNING id INTO warehouse_b;
  INSERT INTO products (organization_id,sku,name,price_usd) VALUES (org_a,'INV-A','Inventory product A',10) RETURNING id INTO product_a;
  INSERT INTO products (organization_id,sku,name,price_usd) VALUES (org_b,'INV-B','Inventory product B',10) RETURNING id INTO product_b;

  BEGIN
    INSERT INTO warehouses (organization_id,branch_id,code,name) VALUES (org_a,branch_b,'cross','Cross tenant');
    RAISE EXCEPTION 'FAIL: cross-tenant warehouse accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  BEGIN
    BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,reason,count_id,actor_user_id)
    VALUES (org_a,branch_a,warehouse_a,product_a,'opening',1,'Wrong count type',count_b,user_a);
    RAISE EXCEPTION 'FAIL: opening movement accepted for physical count';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO inventory_balances (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity)
    VALUES (org_a,branch_a,warehouse_a,product_b,5);
    RAISE EXCEPTION 'FAIL: cross-tenant product balance accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  INSERT INTO inventory_counts (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES (org_a,branch_a,warehouse_a,'opening','Initial physical count',user_a) RETURNING id INTO count_a;
  INSERT INTO inventory_count_lines (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity)
  VALUES (org_a,branch_a,warehouse_a,count_a,product_a,12.500);

  INSERT INTO inventory_counts (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
  VALUES (org_a,branch_a,warehouse_a,'physical','Second count draft',user_a) RETURNING id INTO count_b;
  INSERT INTO inventory_count_lines (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity)
  VALUES (org_a,branch_a,warehouse_a,count_b,product_a,13.000);
  BEGIN
    INSERT INTO warehouse_inventory_movements
      (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,reason,count_id,actor_user_id)
    VALUES (org_a,branch_a,warehouse_a,product_a,'opening',1,'Draft count must not post',count_b,user_a);
    RAISE EXCEPTION 'FAIL: draft count posted to ledger';
  EXCEPTION WHEN check_violation THEN NULL; END;

  UPDATE inventory_counts SET status='confirmed',confirmed_by=user_a,confirmed_at=clock_timestamp()
  WHERE id=count_a;
  UPDATE inventory_counts SET status='confirmed',confirmed_by=user_a,confirmed_at=clock_timestamp()
  WHERE id=count_b;
  BEGIN
    INSERT INTO inventory_counts (organization_id,branch_id,warehouse_id,count_type,reason,created_by, status,confirmed_by,confirmed_at)
    VALUES (org_a,branch_a,warehouse_a,'opening','Duplicate opening',user_a,'confirmed',user_a,clock_timestamp());
    RAISE EXCEPTION 'FAIL: second opening count accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN
    UPDATE inventory_count_lines SET counted_quantity=1 WHERE count_id=count_a;
    RAISE EXCEPTION 'FAIL: confirmed count line changed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO inventory_count_lines (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity)
    VALUES (org_a,branch_a,warehouse_a,count_a,product_a,3);
    RAISE EXCEPTION 'FAIL: line added to confirmed count';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE inventory_count_lines SET count_id=count_a WHERE count_id=count_b;
    RAISE EXCEPTION 'FAIL: draft line moved into confirmed count';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM inventory_counts WHERE id=count_a;
    RAISE EXCEPTION 'FAIL: confirmed count deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO inventory_balances (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity)
  VALUES (org_a,branch_a,warehouse_a,product_a,12.500);
  INSERT INTO warehouse_inventory_movements
    (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,reason,count_id,actor_user_id)
  VALUES (org_a,branch_a,warehouse_a,product_a,'opening',12.500,'Opening count',count_a,user_a);
  BEGIN
    UPDATE warehouse_inventory_movements SET quantity_delta=99 WHERE count_id=count_a;
    RAISE EXCEPTION 'FAIL: ledger movement updated';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM warehouse_inventory_movements WHERE count_id=count_a;
    RAISE EXCEPTION 'FAIL: ledger movement deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO inventory_balances (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity)
    VALUES (org_a,branch_a,warehouse_a,product_a,-1);
    RAISE EXCEPTION 'FAIL: negative stock accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
