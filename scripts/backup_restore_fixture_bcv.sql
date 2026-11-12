-- PR #287 synthetic business graph for backup/restore phase 2 (ledger projection + BCV checkout).
-- Run only after scripts/db/migrate.sh against the fixed disposable
-- PostgreSQL 18 database. All identities and business values are synthetic.
-- This fixture targets the PR #287 migration chain 0001-0022, including ledger projection, strict BCV effective date, sync-state gate and producer-role grants.

BEGIN;

INSERT INTO public.organizations (id, name, slug)
VALUES ('11111111-1111-4111-8111-111111111111', 'Synthetic Restore Shop', 'synthetic-restore-shop');

INSERT INTO public.app_users (id, email, display_name, google_sub, email_verified_at)
VALUES ('22222222-2222-4222-8222-222222222222',
        'backup-restore@example.invalid', 'Synthetic Restore Owner',
        'synthetic-backup-restore-sub', now());

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222', 'owner');

INSERT INTO public.auth_allowlist (email, added_by, note)
VALUES ('backup-restore@example.invalid', 'synthetic-test', 'synthetic backup/restore fixture');

UPDATE public.auth_bootstrap
   SET consumed_at = now(),
       consumed_by_email = 'backup-restore@example.invalid',
       created_organization_id = '11111111-1111-4111-8111-111111111111'
 WHERE id = true;

INSERT INTO public.auth_sessions (user_id, token_hash, expires_at)
VALUES ('22222222-2222-4222-8222-222222222222', repeat('a', 64), now() + interval '1 day');

INSERT INTO public.auth_rate_limits (key_hash, attempts)
VALUES (repeat('b', 64), 3);

INSERT INTO public.auth_bootstrap_attempts
  (handle_hash, state_hash, organization_name, organization_slug, expires_at)
VALUES
  (repeat('c', 64), repeat('d', 64), 'Synthetic Pending Bootstrap',
   'synthetic-pending-bootstrap', now() + interval '10 minutes');

-- A second independent tenant proves the restored fixture is not a single-tenant sample.
INSERT INTO public.organizations (id, name, slug)
VALUES ('14141414-1414-4414-8414-141414141414', 'Synthetic Restore Tenant B', 'synthetic-restore-tenant-b');

INSERT INTO public.app_users (id, email, display_name, google_sub, email_verified_at)
VALUES ('15151515-1515-4515-8515-151515151515',
        'backup-restore-tenant-b@example.invalid', 'Synthetic Tenant B Owner',
        'synthetic-backup-restore-sub-b', now());

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('14141414-1414-4414-8414-141414141414',
        '15151515-1515-4515-8515-151515151515', 'owner');

INSERT INTO public.auth_allowlist (email, added_by, note)
VALUES ('backup-restore-tenant-b@example.invalid', 'synthetic-test', 'second synthetic tenant');

INSERT INTO public.branches (id, organization_id, name, slug)
VALUES ('16161616-1616-4616-8616-161616161616',
        '14141414-1414-4414-8414-141414141414',
        'Synthetic Tenant B Branch', 'synthetic-tenant-b-branch');

INSERT INTO public.branch_memberships (organization_id, branch_id, user_id)
VALUES ('14141414-1414-4414-8414-141414141414',
        '16161616-1616-4616-8616-161616161616',
        '15151515-1515-4515-8515-151515151515');

INSERT INTO public.suppliers (id, organization_id, name)
VALUES ('17171717-1717-4717-8717-171717171717',
        '14141414-1414-4414-8414-141414141414', 'Synthetic Tenant B Supplier');

INSERT INTO public.products
  (id, organization_id, sku, name, cost_usd, price_usd, stock_quantity, minimum_stock, supplier_id)
VALUES ('18181818-1818-4818-8818-181818181818',
        '14141414-1414-4414-8414-141414141414',
        'SYN-RESTORE-B-001', 'Synthetic Tenant B Product', 2.0000, 5.0000, 0.000, 1.000,
        '17171717-1717-4717-8717-171717171717');

INSERT INTO public.warehouses (id, organization_id, branch_id, code, name)
VALUES ('19191919-1919-4919-8919-191919191919',
        '14141414-1414-4414-8414-141414141414',
        '16161616-1616-4616-8616-161616161616',
        'synthetic-tenant-b-main', 'Synthetic Tenant B Warehouse');

INSERT INTO public.inventory_counts
  (id, organization_id, branch_id, warehouse_id, count_type, reason, created_by)
VALUES ('20202020-2020-4020-8020-202020202020',
        '14141414-1414-4414-8414-141414141414',
        '16161616-1616-4616-8616-161616161616',
        '19191919-1919-4919-8919-191919191919',
        'opening', 'Synthetic Tenant B opening count',
        '15151515-1515-4515-8515-151515151515');

INSERT INTO public.inventory_count_lines
  (organization_id, branch_id, warehouse_id, count_id, product_id,
   counted_quantity, unit_cost_usd)
VALUES ('14141414-1414-4414-8414-141414141414',
        '16161616-1616-4616-8616-161616161616',
        '19191919-1919-4919-8919-191919191919',
        '20202020-2020-4020-8020-202020202020',
        '18181818-1818-4818-8818-181818181818', 5.000, 2.0000);

UPDATE public.inventory_counts
   SET status = 'confirmed', confirmed_by = '15151515-1515-4515-8515-151515151515',
       confirmed_at = now()
 WHERE id = '20202020-2020-4020-8020-202020202020';

INSERT INTO public.warehouse_inventory_movements
  (id, organization_id, branch_id, warehouse_id, product_id, movement_type,
   quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
VALUES ('21212121-2121-4121-8121-212121212121',
        '14141414-1414-4414-8414-141414141414',
        '16161616-1616-4616-8616-161616161616',
        '19191919-1919-4919-8919-191919191919',
        '18181818-1818-4818-8818-181818181818', 'opening',
        5.000, 2.0000, 'Synthetic Tenant B opening count',
        '20202020-2020-4020-8020-202020202020',
        '15151515-1515-4515-8515-151515151515');

INSERT INTO public.branches (id, organization_id, name, slug)
VALUES ('33333333-3333-4333-8333-333333333333',
        '11111111-1111-4111-8111-111111111111',
        'Synthetic Main Branch', 'synthetic-main-branch');

INSERT INTO public.branch_memberships (organization_id, branch_id, user_id)
VALUES ('11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222');

INSERT INTO public.registers (id, organization_id, branch_id, name, code)
VALUES ('44444444-4444-4444-8444-444444444444',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        'Synthetic Register', 'synthetic-register');

INSERT INTO public.register_shifts
  (id, organization_id, branch_id, register_id, cashier_user_id, opening_cash_usd, opening_cash_ves)
VALUES ('55555555-5555-4555-8555-555555555555',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
        '22222222-2222-4222-8222-222222222222', 20.0000, 0.00);

INSERT INTO public.suppliers (id, organization_id, name)
VALUES ('66666666-6666-4666-8666-666666666666',
        '11111111-1111-4111-8111-111111111111', 'Synthetic Supplier');

INSERT INTO public.products
  (id, organization_id, sku, name, cost_usd, price_usd, stock_quantity, minimum_stock, supplier_id)
VALUES ('77777777-7777-4777-8777-777777777777',
        '11111111-1111-4111-8111-111111111111',
        'SYN-RESTORE-001', 'Synthetic Product', 2.0000, 5.0000, 0.000, 1.000,
        '66666666-6666-4666-8666-666666666666');

INSERT INTO public.exchange_rates
  (id, base_currency, quote_currency, rate, source, effective_date, validation_status)
VALUES ('88888888-8888-4888-8888-888888888888', 'USD', 'VES', 250.123456,
        'BCV_OFFICIAL_HTML_V1',
        (now() AT TIME ZONE 'America/Caracas')::date, 'valid');

-- Synthetic sentinel only: the source marker is required by the checkout guard;
-- the numeric value is fabricated for disposable CI and is NOT an official BCV quote.
UPDATE public.bcv_sync_state
   SET attempt_id = '88888888-8888-4888-8888-888888888887',
       last_attempt_at = now(),
       last_success_at = now(),
       last_outcome = 'inserted',
       last_error_code = NULL,
       last_effective_date = (now() AT TIME ZONE 'America/Caracas')::date,
       updated_at = now()
 WHERE singleton = true;

INSERT INTO public.warehouses (id, organization_id, branch_id, code, name)
VALUES ('99999999-9999-4999-8999-999999999999',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        'synthetic-main', 'Synthetic Main Warehouse');

-- Opening count: 10 units. The immutable ledger movement projects the balance through migration 0019's AFTER INSERT trigger.
INSERT INTO public.inventory_counts
  (id, organization_id, branch_id, warehouse_id, count_type, reason, created_by)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        'opening', 'Synthetic opening count', '22222222-2222-4222-8222-222222222222');

INSERT INTO public.inventory_count_lines
  (organization_id, branch_id, warehouse_id, count_id, product_id,
   counted_quantity, unit_cost_usd)
VALUES ('11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '77777777-7777-4777-8777-777777777777', 10.000, 2.0000);

UPDATE public.inventory_counts
   SET status = 'confirmed', confirmed_by = '22222222-2222-4222-8222-222222222222',
       confirmed_at = now()
 WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

INSERT INTO public.warehouse_inventory_movements
  (id, organization_id, branch_id, warehouse_id, product_id, movement_type,
   quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        '77777777-7777-4777-8777-777777777777', 'opening',
        10.000, 2.0000, 'Synthetic opening count',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '22222222-2222-4222-8222-222222222222');

-- Physical count: expected 10 at balance version 1, observed 11.
INSERT INTO public.inventory_counts
  (id, organization_id, branch_id, warehouse_id, count_type, reason, created_by)
VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        'physical', 'Synthetic physical count', '22222222-2222-4222-8222-222222222222');

INSERT INTO public.inventory_count_lines
  (organization_id, branch_id, warehouse_id, count_id, product_id,
   counted_quantity, unit_cost_usd, expected_on_hand_quantity, expected_balance_version)
VALUES ('11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '77777777-7777-4777-8777-777777777777', 11.000, 2.0000, 10.000, 1);

UPDATE public.inventory_counts
   SET status = 'confirmed', confirmed_by = '22222222-2222-4222-8222-222222222222',
       confirmed_at = now()
 WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

INSERT INTO public.warehouse_inventory_movements
  (id, organization_id, branch_id, warehouse_id, product_id, movement_type,
   quantity_delta, unit_cost_usd, reason, count_id, actor_user_id)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        '77777777-7777-4777-8777-777777777777', 'count_adjustment',
        1.000, 2.0000, 'Synthetic physical count',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '22222222-2222-4222-8222-222222222222');

-- PR #287 checkout contract: exact Caracas-effective BCV date and latest successful
-- sync state, one settlement currency, ordered payment allocation, open own shift,
-- active warehouse, ledger-projected stock movement and matching completion audit.
INSERT INTO public.sales
  (id, organization_id, idempotency_key, status, subtotal_usd, total_usd,
   exchange_rate_id, exchange_rate_snapshot, total_ves_snapshot, created_by,
   branch_id, register_shift_id, warehouse_id, settlement_currency, request_hash)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '11111111-1111-4111-8111-111111111111',
        'synthetic-backup-restore-sale-001', 'draft', 10.0000, 10.0000,
        '88888888-8888-4888-8888-888888888888', 250.123456, 2501.23,
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        '55555555-5555-4555-8555-555555555555',
        '99999999-9999-4999-8999-999999999999',
        'USD', repeat('e', 64));

INSERT INTO public.sale_items
  (id, organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot,
   quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff',
        '11111111-1111-4111-8111-111111111111',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '77777777-7777-4777-8777-777777777777',
        'Synthetic Product', 'SYN-RESTORE-001',
        2.000, 5.0000, 2.0000, 10.0000, 2501.23);

INSERT INTO public.payments
  (id, organization_id, sale_id, method, currency, amount,
   usd_equivalent_snapshot, exchange_rate_snapshot, reference, received_by, allocation_position)
VALUES ('12121212-1212-4212-8212-121212121212',
        '11111111-1111-4111-8111-111111111111',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        'cash', 'USD', 10.0000, 10.0000, 250.123456,
        'synthetic-backup-restore-payment-001',
        '22222222-2222-4222-8222-222222222222', 1);

-- Pair the sale stock decrement with its immutable ledger movement.
INSERT INTO public.warehouse_inventory_movements
  (id, organization_id, branch_id, warehouse_id, product_id, movement_type,
   quantity_delta, unit_cost_usd, reason, reference_type, reference_id, actor_user_id)
VALUES ('13131313-1313-4313-8313-131313131313',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '99999999-9999-4999-8999-999999999999',
        '77777777-7777-4777-8777-777777777777', 'sale',
        -2.000, 2.0000, 'Synthetic sale checkout',
        'sale', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '22222222-2222-4222-8222-222222222222');

INSERT INTO public.audit_logs
  (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
VALUES ('11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'sale.completed', 'sale', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '{"fixture":"synthetic-backup-restore","version":2}'::jsonb);

UPDATE public.sales
   SET status = 'completed', completed_at = now()
 WHERE organization_id = '11111111-1111-4111-8111-111111111111'
   AND id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

-- Close the synthetic cashier shift after the checkout. This exercises the
-- complete immutable cash-close transition and its referential integrity.
UPDATE public.register_shifts
   SET closed_at = now(),
       closing_cash_usd = 30.0000,
       closing_cash_ves = 0.00,
       closed_by_user_id = '22222222-2222-4222-8222-222222222222'
 WHERE organization_id = '11111111-1111-4111-8111-111111111111'
   AND id = '55555555-5555-4555-8555-555555555555';

COMMIT;
