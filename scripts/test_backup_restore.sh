#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${SOURCE_URL:-}" || -z "${RESTORE_URL:-}" || "${RESTORE_DB_NAME:-}" != "microapp_restore" ]]; then
  echo "Required test DB environment is missing or unsafe." >&2; exit 2
fi
source_db="$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()')"
if [[ "$source_db" != "microapp_source" ]]; then
  echo "Refusing to run against a database other than microapp_source." >&2; exit 2
fi
started_at="$SECONDS"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -f apps/api/migrations/0001_initial.sql
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -f apps/api/migrations/0002_google_identity.sql
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO organizations (id, name, slug) VALUES ('11111111-1111-4111-8111-111111111111', 'Synthetic Restore Shop', 'synthetic-restore-shop');
INSERT INTO app_users (id, email, display_name, google_sub, email_verified_at) VALUES ('22222222-2222-4222-8222-222222222222', 'backup-restore@example.invalid', 'Synthetic Restore User', 'synthetic-backup-restore-sub', now());
INSERT INTO organization_members (organization_id, user_id, role) VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'owner');
INSERT INTO auth_allowlist (email, added_by, note) VALUES ('backup-restore@example.invalid', 'synthetic-test', 'synthetic backup/restore fixture');
UPDATE auth_bootstrap SET consumed_at=now(), consumed_by_email='backup-restore@example.invalid', created_organization_id='11111111-1111-4111-8111-111111111111' WHERE id=true;
INSERT INTO suppliers (id, organization_id, name) VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Synthetic Supplier');
INSERT INTO products (id, organization_id, sku, name, cost_usd, price_usd, stock_quantity, minimum_stock, supplier_id) VALUES ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'SYN-RESTORE-001', 'Synthetic Product', 2.0000, 5.0000, 8.000, 1.000, '33333333-3333-4333-8333-333333333333');
INSERT INTO exchange_rates (id, rate, source, effective_date) VALUES ('55555555-5555-4555-8555-555555555555', 36.500000, 'synthetic-restore-test', DATE '2026-10-29');
INSERT INTO sales (id, organization_id, idempotency_key, status, subtotal_usd, discount_usd, total_usd, exchange_rate_id, exchange_rate_snapshot, total_ves_snapshot, created_by, completed_at) VALUES ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', 'synthetic-backup-restore-sale-001', 'completed', 10.0000, 0.0000, 10.0000, '55555555-5555-4555-8555-555555555555', 36.500000, 365.00, '22222222-2222-4222-8222-222222222222', now());
INSERT INTO sale_items (id, organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves) VALUES ('77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'Synthetic Product', 'SYN-RESTORE-001', 2.000, 5.0000, 2.0000, 10.0000, 365.00);
INSERT INTO payments (id, organization_id, sale_id, method, currency, amount, usd_equivalent_snapshot, exchange_rate_snapshot, reference, received_by) VALUES ('88888888-8888-4888-8888-888888888888', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', 'cash', 'USD', 10.0000, 10.0000, 36.500000, 'synthetic-payment-001', '22222222-2222-4222-8222-222222222222');
INSERT INTO inventory_movements (id, organization_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, reference_type, reference_id, created_by) VALUES ('99999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', 'sale', -2.000, 2.0000, 'synthetic backup restore sale', 'sale', '66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222');
INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'synthetic.sale.completed', 'sale', '66666666-6666-4666-8666-666666666666', '{"fixture":"synthetic-backup-restore","version":1}'::jsonb);
INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ('22222222-2222-4222-8222-222222222222', repeat('b', 64), now() + interval '1 day');
INSERT INTO auth_rate_limits (key_hash, attempts) VALUES (repeat('c', 64), 3);
SQL

ephemeral="$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atq -F '|' -c 'SELECT (SELECT count(*) FROM auth_sessions), (SELECT count(*) FROM auth_rate_limits)')"
[[ "$ephemeral" == "1|1" ]] || { echo "Synthetic ephemeral auth fixture missing." >&2; exit 1; }
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c 'CREATE DATABASE microapp_restore' >/dev/null
pg_dump "$SOURCE_URL" --no-owner --no-privileges --format=custom --exclude-table=public.auth_sessions --exclude-table=public.auth_rate_limits --file="$tmpdir/backup.dump"

age-keygen -o "$tmpdir/age-key.txt" >/dev/null 2>"$tmpdir/age-keygen.log"
public_key="$(awk '/^# public key:/ {print $4}' "$tmpdir/age-key.txt")"
[[ "$public_key" =~ ^age1[[:alnum:]]+$ ]] || { echo "Temporary age public key invalid." >&2; exit 1; }
age -r "$public_key" -o "$tmpdir/backup.dump.age" "$tmpdir/backup.dump"
(cd "$tmpdir" && sha256sum backup.dump.age > backup.dump.age.sha256 && sha256sum --check backup.dump.age.sha256)
age -d -i "$tmpdir/age-key.txt" -o "$tmpdir/restored.dump" "$tmpdir/backup.dump.age"
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$RESTORE_URL" "$tmpdir/restored.dump"

manifest() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT 'organizations|' || count(*)::text FROM organizations WHERE id='11111111-1111-4111-8111-111111111111';
SELECT 'app_users|' || count(*)::text FROM app_users WHERE id='22222222-2222-4222-8222-222222222222' AND email='backup-restore@example.invalid';
SELECT 'organization_members|' || count(*)::text FROM organization_members WHERE organization_id='11111111-1111-4111-8111-111111111111' AND user_id='22222222-2222-4222-8222-222222222222' AND role='owner';
SELECT 'auth_allowlist|' || count(*)::text FROM auth_allowlist WHERE lower(email)='backup-restore@example.invalid';
SELECT 'auth_bootstrap|' || count(*)::text FROM auth_bootstrap WHERE id=true AND consumed_by_email='backup-restore@example.invalid' AND created_organization_id='11111111-1111-4111-8111-111111111111';
SELECT 'suppliers|' || count(*)::text FROM suppliers WHERE id='33333333-3333-4333-8333-333333333333';
SELECT 'products|' || count(*)::text FROM products WHERE id='44444444-4444-4444-8444-444444444444' AND stock_quantity=8.000 AND price_usd=5.0000;
SELECT 'exchange_rates|' || count(*)::text FROM exchange_rates WHERE id='55555555-5555-4555-8555-555555555555' AND rate=36.500000 AND source='synthetic-restore-test';
SELECT 'sales|' || count(*)::text FROM sales WHERE id='66666666-6666-4666-8666-666666666666' AND status='completed' AND total_usd=10.0000 AND total_ves_snapshot=365.00;
SELECT 'sale_items|' || count(*)::text FROM sale_items WHERE id='77777777-7777-4777-8777-777777777777' AND sale_id='66666666-6666-4666-8666-666666666666' AND quantity=2.000 AND line_total_usd=10.0000;
SELECT 'payments|' || count(*)::text FROM payments WHERE id='88888888-8888-4888-8888-888888888888' AND sale_id='66666666-6666-4666-8666-666666666666' AND amount=10.0000;
SELECT 'inventory_movements|' || count(*)::text FROM inventory_movements WHERE id='99999999-9999-4999-8999-999999999999' AND product_id='44444444-4444-4444-8444-444444444444' AND quantity_delta=-2.000;
SELECT 'audit_logs|' || count(*)::text FROM audit_logs WHERE organization_id='11111111-1111-4111-8111-111111111111' AND actor_user_id='22222222-2222-4222-8222-222222222222' AND action='synthetic.sale.completed' AND entity_id='66666666-6666-4666-8666-666666666666';
SELECT 'schema_table_count|' || count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name=ANY(ARRAY['organizations','app_users','organization_members','auth_allowlist','auth_bootstrap','suppliers','products','exchange_rates','sales','sale_items','payments','inventory_movements','audit_logs']::text[]);
SELECT 'sale_item_relationship|' || count(*)::text FROM sale_items i JOIN sales s ON s.organization_id=i.organization_id AND s.id=i.sale_id JOIN products p ON p.organization_id=i.organization_id AND p.id=i.product_id WHERE i.id='77777777-7777-4777-8777-777777777777' AND s.total_usd=10.0000 AND p.stock_quantity=8.000;
SELECT 'payment_relationship|' || count(*)::text FROM payments p JOIN sales s ON s.organization_id=p.organization_id AND s.id=p.sale_id JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=p.received_by WHERE p.id='88888888-8888-4888-8888-888888888888';
SELECT 'movement_relationship|' || count(*)::text FROM inventory_movements im JOIN products p ON p.organization_id=im.organization_id AND p.id=im.product_id JOIN organization_members m ON m.organization_id=im.organization_id AND m.user_id=im.created_by WHERE im.id='99999999-9999-4999-8999-999999999999';
SELECT 'audit_relationship|' || count(*)::text FROM audit_logs a JOIN organization_members m ON m.organization_id=a.organization_id AND m.user_id=a.actor_user_id WHERE a.action='synthetic.sale.completed' AND a.entity_id='66666666-6666-4666-8666-666666666666';
SQL
}
source_manifest="$(manifest "$SOURCE_URL")"
restored_manifest="$(manifest "$RESTORE_URL")"
while IFS='|' read -r label count; do
  expected=1
  [[ "$label" != "schema_table_count" ]] || expected=13
  [[ "$count" == "$expected" ]] || { echo "Source manifest failed for $label (expected $expected, got $count)." >&2; exit 1; }
done <<< "$source_manifest"
if [[ "$source_manifest" != "$restored_manifest" ]]; then
  echo "Restored manifest differs from source:" >&2
  diff -u <(printf '%s\n' "$source_manifest") <(printf '%s\n' "$restored_manifest") || true
  exit 1
fi
excluded="$(psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT (to_regclass('public.auth_sessions') IS NULL AND to_regclass('public.auth_rate_limits') IS NULL)")"
[[ "$excluded" == "t" ]] || { echo "Ephemeral auth tables were unexpectedly restored." >&2; exit 1; }
echo "PASS: encrypted dump checksum and age decryption verified."
echo "PASS: 13 expected tables and the synthetic source/restore manifests match."
echo "PASS: sale, payment, stock movement and audit relationships are preserved."
echo "PASS: auth_sessions and auth_rate_limits are excluded."
echo "Synthetic round-trip elapsed seconds: $((SECONDS - started_at))."
