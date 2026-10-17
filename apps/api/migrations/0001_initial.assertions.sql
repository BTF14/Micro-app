-- Run after 0001_initial.sql against a disposable PostgreSQL database.
-- Verifies that database constraints reject cross-organization references.
BEGIN;

DO $$
DECLARE
  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  supplier_a uuid;
  product_a uuid;
  product_b uuid;
  rate_id uuid;
  sale_a uuid;
  sale_b uuid;
BEGIN
  INSERT INTO organizations (name, slug) VALUES ('Tenant A', 'tenant-a') RETURNING id INTO org_a;
  INSERT INTO organizations (name, slug) VALUES ('Tenant B', 'tenant-b') RETURNING id INTO org_b;

  INSERT INTO app_users (email, display_name) VALUES ('tenant-a@example.invalid', 'Tenant A User') RETURNING id INTO user_a;
  INSERT INTO app_users (email, display_name) VALUES ('tenant-b@example.invalid', 'Tenant B User') RETURNING id INTO user_b;
  INSERT INTO organization_members (organization_id, user_id, role) VALUES
    (org_a, user_a, 'owner'), (org_b, user_b, 'owner');

  INSERT INTO suppliers (organization_id, name) VALUES (org_a, 'Supplier A') RETURNING id INTO supplier_a;
  INSERT INTO products (organization_id, sku, name, price_usd, supplier_id)
    VALUES (org_a, 'SKU-A', 'Product A', 1, supplier_a) RETURNING id INTO product_a;
  INSERT INTO products (organization_id, sku, name, price_usd)
    VALUES (org_b, 'SKU-B', 'Product B', 1) RETURNING id INTO product_b;

  BEGIN
    INSERT INTO products (organization_id, sku, name, price_usd, supplier_id)
      VALUES (org_b, 'SKU-CROSS', 'Cross-tenant supplier link', 1, supplier_a);
    RAISE EXCEPTION 'FAIL: product accepted a supplier from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  INSERT INTO exchange_rates (rate, source, effective_date)
    VALUES (36.5, 'test', CURRENT_DATE) RETURNING id INTO rate_id;

  INSERT INTO sales (
    organization_id, idempotency_key, subtotal_usd, total_usd, exchange_rate_id,
    exchange_rate_snapshot, total_ves_snapshot, created_by, status, completed_at
  ) VALUES (
    org_a, 'sale-a', 1, 1, rate_id, 36.5, 36.5, user_a, 'completed', now()
  ) RETURNING id INTO sale_a;

  INSERT INTO sales (
    organization_id, idempotency_key, subtotal_usd, total_usd, exchange_rate_id,
    exchange_rate_snapshot, total_ves_snapshot, created_by, status, completed_at
  ) VALUES (
    org_b, 'sale-b', 1, 1, rate_id, 36.5, 36.5, user_b, 'completed', now()
  ) RETURNING id INTO sale_b;

  BEGIN
    INSERT INTO sales (
      organization_id, idempotency_key, subtotal_usd, total_usd, created_by
    ) VALUES (org_b, 'invalid-member', 1, 1, user_a);
    RAISE EXCEPTION 'FAIL: sale accepted a user who is not a member of its organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO sale_items (
      organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot,
      quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves
    ) VALUES (org_b, sale_a, product_b, 'Cross-tenant sale', 'SKU-B', 1, 1, 0, 1, 36.5);
    RAISE EXCEPTION 'FAIL: sale item accepted a sale from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO sale_items (
      organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot,
      quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves
    ) VALUES (org_a, sale_a, product_b, 'Cross-tenant product', 'SKU-B', 1, 1, 0, 1, 36.5);
    RAISE EXCEPTION 'FAIL: sale item accepted a product from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO inventory_movements (
      organization_id, product_id, movement_type, quantity_delta, reason, created_by
    ) VALUES (org_a, product_b, 'adjustment', 1, 'cross-tenant test', user_a);
    RAISE EXCEPTION 'FAIL: inventory movement accepted a product from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  RAISE NOTICE 'Tenant isolation constraint assertions passed.';
END $$;

ROLLBACK;
