#!/usr/bin/env bash
set -euo pipefail
expected_source_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_source"
expected_restore_url="postgresql://microapp:microapp-test-only@localhost:5432/microapp_restore"
if [[ "${SOURCE_URL:-}" != "$expected_source_url" || "${RESTORE_URL:-}" != "$expected_restore_url" || "${RESTORE_DB_NAME:-}" != "microapp_restore" ]]; then
  echo "Refusing to run: connection targets must be the fixed disposable CI databases." >&2
  exit 2
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
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -f apps/api/migrations/0005_auth_bootstrap_attempts.sql
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO organizations (id, name, slug) VALUES ('11111111-1111-4111-8111-111111111111', 'Synthetic Restore Shop', 'synthetic-restore-shop');
INSERT INTO app_users (id, email, display_name, google_sub, email_verified_at) VALUES ('22222222-2222-4222-8222-222222222222', 'backup-restore@example.invalid', 'Synthetic Restore User', 'synthetic-backup-restore-sub', now());
INSERT INTO organization_members (organization_id, user_id, role) VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'owner');
INSERT INTO auth_allowlist (email, added_by, note) VALUES ('backup-restore@example.invalid', 'synthetic-test', 'synthetic backup/restore fixture');
UPDATE auth_bootstrap SET consumed_at=now(), consumed_by_email='backup-restore@example.invalid', created_organization_id='11111111-1111-4111-8111-111111111111' WHERE id=true;
INSERT INTO suppliers (id, organization_id, name) VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Synthetic Supplier');
INSERT INTO products (id, organization_id, sku, name, cost_usd, price_usd, stock_quantity, minimum_stock, supplier_id) VALUES ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'SYN-RESTORE-001', 'Synthetic Product', 2.0000, 5.0000, 8.000, 1.000, '33333333-3333-4333-8333-333333333333');
INSERT INTO exchange_rates (id, rate, source, effective_date) VALUES ('55555555-5555-4555-8555-555555555555', 36.500000, 'synthetic-restore-test', DATE '2026-10-29');
INSERT INTO sales (id, organization_id, idempotency_key, status, subtotal_usd, total_usd, exchange_rate_id, exchange_rate_snapshot, total_ves_snapshot, created_by, completed_at) VALUES ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', 'synthetic-backup-restore-sale-001', 'completed', 10.0000, 10.0000, '55555555-5555-4555-8555-555555555555', 36.500000, 365.00, '22222222-2222-4222-8222-222222222222', now());
INSERT INTO sale_items (id, organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves) VALUES ('77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'Synthetic Product', 'SYN-RESTORE-001', 2.000, 5.0000, 2.0000, 10.0000, 365.00);
INSERT INTO payments (id, organization_id, sale_id, method, currency, amount, usd_equivalent_snapshot, exchange_rate_snapshot, reference, received_by) VALUES ('88888888-8888-4888-8888-888888888888', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', 'cash', 'USD', 10.0000, 10.0000, 36.500000, 'synthetic-payment-001', '22222222-2222-4222-8222-222222222222');
INSERT INTO inventory_movements (id, organization_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, reference_type, reference_id, created_by) VALUES ('99999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', 'sale', -2.000, 2.0000, 'synthetic backup restore sale', 'sale', '66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222');
INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'synthetic.sale.completed', 'sale', '66666666-6666-4666-8666-666666666666', '{"fixture":"synthetic-backup-restore","version":1}'::jsonb);
INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ('22222222-2222-4222-8222-222222222222', repeat('b', 64), now() + interval '1 day');
INSERT INTO auth_rate_limits (key_hash, attempts) VALUES (repeat('c', 64), 3);
INSERT INTO auth_bootstrap_attempts (handle_hash, state_hash, organization_name, organization_slug, expires_at) VALUES (repeat('d', 64), repeat('e', 64), 'Synthetic Pending Bootstrap', 'synthetic-pending-bootstrap', now() + interval '10 minutes');
SQL

ephemeral="$(psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -Atq -F '|' -c 'SELECT (SELECT count(*) FROM auth_sessions), (SELECT count(*) FROM auth_rate_limits), (SELECT count(*) FROM auth_bootstrap_attempts)')"
[[ "$ephemeral" == "1|1|1" ]] || { echo "Synthetic ephemeral auth fixture missing." >&2; exit 1; }
psql "$SOURCE_URL" -X -v ON_ERROR_STOP=1 -c 'CREATE DATABASE microapp_restore' >/dev/null
bash scripts/tests/test_backup_role_privileges.sh
backup_url="postgresql://microapp_backup:backup-test-only@localhost:5432/microapp_source"
pg_dump "$backup_url" --no-owner --no-privileges --format=custom --exclude-table-data=public.auth_sessions --exclude-table-data=public.auth_rate_limits --exclude-table-data=public.auth_bootstrap_attempts --file="$tmpdir/backup.dump"

archive_list="$(pg_restore --list "$tmpdir/backup.dump")"
for table in auth_sessions auth_rate_limits auth_bootstrap_attempts; do
  grep -Eq "TABLE public ${table} " <<<"$archive_list" || {
    echo "Missing table definition for public.${table} in backup archive." >&2
    exit 1
  }
done
echo "PASS: archive contains DDL entries for all three ephemeral auth tables."

age-keygen -o "$tmpdir/age-key.txt" >/dev/null 2>"$tmpdir/age-keygen.log"
public_key="$(awk '/^# public key:/ {print $4}' "$tmpdir/age-key.txt")"
[[ "$public_key" =~ ^age1[[:alnum:]]+$ ]] || { echo "Temporary age public key invalid." >&2; exit 1; }
age -r "$public_key" -o "$tmpdir/backup.dump.age" "$tmpdir/backup.dump"
(cd "$tmpdir" && sha256sum backup.dump.age > backup.dump.age.sha256 && sha256sum --check backup.dump.age.sha256)
age -d -i "$tmpdir/age-key.txt" -o "$tmpdir/restored.dump" "$tmpdir/backup.dump.age"
restore_started_at="$SECONDS"
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$RESTORE_URL" "$tmpdir/restored.dump"
restore_elapsed_seconds=$((SECONDS - restore_started_at))

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
SELECT 'constraint_count|' || count(*)::text FROM information_schema.table_constraints WHERE table_schema='public' AND table_name=ANY(ARRAY['organizations','app_users','organization_members','auth_allowlist','auth_bootstrap','suppliers','products','exchange_rates','sales','sale_items','payments','inventory_movements','audit_logs']::text[]);
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
  if [[ "$label" == "schema_table_count" ]]; then
    [[ "$count" == "13" ]] || { echo "Expected 13 schema tables, got $count." >&2; exit 1; }
  elif [[ "$label" == "constraint_count" ]]; then
    [[ "$count" =~ ^[0-9]+$ ]] && (( count > 0 )) || { echo "No schema constraints found." >&2; exit 1; }
  else
    [[ "$count" == "1" ]] || { echo "Source manifest failed for $label (expected 1, got $count)." >&2; exit 1; }
  fi
done <<< "$source_manifest"
if [[ "$source_manifest" != "$restored_manifest" ]]; then
  echo "Restored manifest differs from source:" >&2
  diff -u <(printf '%s\n' "$source_manifest") <(printf '%s\n' "$restored_manifest") || true
  exit 1
fi
schema_manifest() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT 'table|' || c.relname || '|' || c.relkind::text || '|' || c.relpersistence::text
  || '|' || c.relispartition::text || '|' || c.relrowsecurity::text
  || '|' || c.relforcerowsecurity::text || '|' || COALESCE(array_to_string(c.reloptions, ','), '')
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
UNION ALL
SELECT 'sequence|' || c.relname || '|' || format_type(s.seqtypid, NULL)
  || '|' || s.seqstart::text || '|' || s.seqincrement::text || '|' || s.seqmin::text
  || '|' || s.seqmax::text || '|' || s.seqcache::text || '|' || s.seqcycle::text
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_sequence s ON s.seqrelid=c.oid
WHERE n.nspname='public'
UNION ALL
SELECT 'trigger|' || c.relname || '|' || t.tgname || '|' || pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
UNION ALL
SELECT 'policy|' || schemaname || '|' || tablename || '|' || policyname
  || '|' || permissive || '|' || roles::text || '|' || cmd
  || '|' || COALESCE(qual, '') || '|' || COALESCE(with_check, '')
FROM pg_policies
WHERE schemaname='public'
UNION ALL
SELECT 'column|' || table_name || '|' || column_name || '|' || ordinal_position::text
  || '|' || data_type || '|' || is_nullable || '|' || COALESCE(column_default, '')
  || '|' || COALESCE(character_maximum_length::text, '')
  || '|' || COALESCE(numeric_precision::text, '') || '|' || COALESCE(numeric_scale::text, '')
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name=ANY(ARRAY[
    'organizations','app_users','organization_members','auth_sessions','auth_rate_limits',
    'suppliers','products','exchange_rates','sales','sale_items','payments',
    'inventory_movements','audit_logs','auth_allowlist','auth_bootstrap','auth_bootstrap_attempts'
  ]::text[])
UNION ALL
SELECT 'constraint|' || tc.table_name || '|' || tc.constraint_name || '|' || tc.constraint_type
  || '|' || COALESCE(pg_get_constraintdef(con.oid), '')
FROM information_schema.table_constraints tc
JOIN pg_constraint con ON con.conname=tc.constraint_name
JOIN pg_namespace ns ON ns.oid=con.connamespace AND ns.nspname=tc.constraint_schema
WHERE tc.constraint_schema='public'
  AND tc.table_name=ANY(ARRAY[
    'organizations','app_users','organization_members','auth_sessions','auth_rate_limits',
    'suppliers','products','exchange_rates','sales','sale_items','payments',
    'inventory_movements','audit_logs','auth_allowlist','auth_bootstrap','auth_bootstrap_attempts'
  ]::text[])
UNION ALL
SELECT 'index|' || tablename || '|' || indexname || '|' || indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename=ANY(ARRAY[
    'organizations','app_users','organization_members','auth_sessions','auth_rate_limits',
    'suppliers','products','exchange_rates','sales','sale_items','payments',
    'inventory_movements','audit_logs','auth_allowlist','auth_bootstrap','auth_bootstrap_attempts'
  ]::text[])
ORDER BY 1;
SQL
}
source_schema_manifest="$(schema_manifest "$SOURCE_URL")"
restored_schema_manifest="$(schema_manifest "$RESTORE_URL")"
[[ "$source_schema_manifest" == "$restored_schema_manifest" ]] || {
  echo "Restored business/auth schema metadata differs from source." >&2
  diff -u <(printf '%s\\n' "$source_schema_manifest") <(printf '%s\\n' "$restored_schema_manifest") || true
  exit 1
}
echo "PASS: table, column, sequence, constraint, index, trigger and policy metadata match source."
ephemeral_schema_count="$(psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name=ANY(ARRAY['auth_sessions','auth_rate_limits','auth_bootstrap_attempts']::text[])")"
[[ "$ephemeral_schema_count" == "3" ]] || { echo "Expected all 3 ephemeral auth table definitions, got $ephemeral_schema_count." >&2; exit 1; }
ephemeral_rows="$(psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -Atq -F '|' -c 'SELECT (SELECT count(*) FROM auth_sessions), (SELECT count(*) FROM auth_rate_limits), (SELECT count(*) FROM auth_bootstrap_attempts)')"
[[ "$ephemeral_rows" == "0|0|0" ]] || { echo "Ephemeral auth rows were unexpectedly restored: $ephemeral_rows" >&2; exit 1; }
ephemeral_columns() {
  psql "$1" -X -v ON_ERROR_STOP=1 -Atq -F '|' -c "
    SELECT table_name, column_name, ordinal_position, data_type, is_nullable, COALESCE(column_default, '')
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name=ANY(ARRAY['auth_sessions','auth_rate_limits','auth_bootstrap_attempts']::text[])
    ORDER BY table_name, ordinal_position
  "
}
source_ephemeral_columns="$(ephemeral_columns "$SOURCE_URL")"
restored_ephemeral_columns="$(ephemeral_columns "$RESTORE_URL")"
[[ "$source_ephemeral_columns" == "$restored_ephemeral_columns" ]] || {
  echo "Ephemeral auth table column definitions differ after restore." >&2
  diff -u <(printf '%s\\n' "$source_ephemeral_columns") <(printf '%s\\n' "$restored_ephemeral_columns") || true
  exit 1
}
echo "PASS: all three ephemeral auth table definitions and columns are preserved."
echo "PASS: auth_sessions, auth_rate_limits and auth_bootstrap_attempts restore with zero rows."
echo "PASS: encrypted dump checksum and age decryption verified."
echo "PASS: 13 expected tables and the synthetic source/restore manifests match."
echo "PASS: sale, payment, stock movement and audit relationships are preserved."
echo "PASS: auth_sessions, auth_rate_limits and auth_bootstrap_attempts are excluded."
echo "Synthetic pg_restore operation elapsed seconds: ${restore_elapsed_seconds}."
echo "Synthetic end-to-end round-trip elapsed seconds: $((SECONDS - started_at))."
