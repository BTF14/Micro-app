-- This script is expected to fail at COMMIT because the balance change has no ledger movement.
-- Fixture rows are synthetic and live only in the disposable CI database.
INSERT INTO organizations (id, name, slug)
VALUES ('a9000000-0000-4000-8000-000000000001', 'Deferred Ledger Guard', 'deferred-ledger-guard');
INSERT INTO app_users (id, email, display_name)
VALUES ('a9000000-0000-4000-8000-000000000002', 'deferred-ledger-guard@example.invalid', 'Deferred Ledger Guard');
INSERT INTO organization_members (organization_id, user_id, role)
VALUES ('a9000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000002', 'owner');
INSERT INTO branches (id, organization_id, name, slug)
VALUES ('a9000000-0000-4000-8000-000000000003', 'a9000000-0000-4000-8000-000000000001', 'Deferred Guard Branch', 'deferred-ledger-guard');
INSERT INTO warehouses (id, organization_id, branch_id, code, name)
VALUES ('a9000000-0000-4000-8000-000000000004', 'a9000000-0000-4000-8000-000000000001', 'deferred-guard', 'Deferred Guard Warehouse');
INSERT INTO products (id, organization_id, sku, name, price_usd)
VALUES ('a9000000-0000-4000-8000-000000000005', 'a9000000-0000-4000-8000-000000000001', 'DEFERRED-GUARD', 'Deferred Guard Product', 1);
INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
VALUES ('a9000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000003', 'a9000000-0000-4000-8000-000000000004', 'a9000000-0000-4000-8000-000000000005', 0);
BEGIN;
UPDATE inventory_balances SET on_hand_quantity = 1
 WHERE organization_id = 'a9000000-0000-4000-8000-000000000001'
   AND warehouse_id = 'a9000000-0000-4000-8000-000000000004'
   AND product_id = 'a9000000-0000-4000-8000-000000000005';
COMMIT;
