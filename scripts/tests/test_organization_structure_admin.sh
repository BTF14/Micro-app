#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_DATABASE_URL:?ADMIN_DATABASE_URL must target disposable PostgreSQL 18}"
: "${RUNTIME_DATABASE_URL:?RUNTIME_DATABASE_URL must be a direct microapp_runtime LOGIN}"
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }

org_a="11111111-1111-4111-8111-111111111111"
org_b="22222222-2222-4222-8222-222222222222"
owner="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
admin="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
cashier="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
inventory="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
other_owner="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.organizations (id,name,slug) VALUES
 ('$org_a','Structure Test A','structure-test-a'),
 ('$org_b','Structure Test B','structure-test-b');
INSERT INTO public.app_users (id,email,display_name) VALUES
 ('$owner','owner-a@example.test','Owner A'),
 ('$admin','admin-a@example.test','Admin A'),
 ('$cashier','cashier-a@example.test','Cashier A'),
 ('$inventory','inventory-a@example.test','Inventory A'),
 ('$other_owner','owner-b@example.test','Owner B');
INSERT INTO public.organization_members (organization_id,user_id,role,is_active) VALUES
 ('$org_a','$owner','owner',true),('$org_a','$admin','admin',true),
 ('$org_a','$cashier','cashier',true),('$org_a','$inventory','inventory',true),
 ('$org_b','$other_owner','owner',true);
INSERT INTO public.branches (organization_id,name,slug) VALUES ('$org_b','Foreign Branch','foreign-branch');
SQL

branch_id="$(psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT id FROM public.create_branch('$org_a','$owner','North Branch','North Branch')")"
[[ "$branch_id" =~ ^[0-9a-f-]{36}$ ]] || { echo "Owner branch creation failed." >&2; exit 1; }

warehouse_id="$(psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT id FROM public.create_warehouse('$org_a','$branch_id','$owner','Main Warehouse','Main Warehouse')")"
register_id="$(psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT id FROM public.create_register('$org_a','$branch_id','$owner','Main Register','Main Register')")"
[[ "$warehouse_id" =~ ^[0-9a-f-]{36}$ && "$register_id" =~ ^[0-9a-f-]{36}$ ]] || { echo "Owner warehouse/register creation failed." >&2; exit 1; }

psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.set_branch_membership_active('$org_a','$branch_id','$cashier','$owner',true)" >/dev/null
read_probe="$(psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*)=1 FROM public.branches WHERE organization_id='$org_a' AND id='$branch_id'")"
[[ "$read_probe" == "t" ]] || { echo "Runtime read probe failed." >&2; exit 1; }

expect_failure() {
  local expected="$1"; shift
  local output
  if output="$("$@" 2>&1)"; then
    echo "Expected PostgreSQL failure $expected but command succeeded." >&2
    exit 1
  fi
  printf '%s\n' "$output" | grep -F "$expected" >/dev/null || {
    printf '%s\n' "$output" >&2
    echo "Expected deterministic error $expected." >&2
    exit 1
  }
}

expect_failure "BRANCH_SLUG_ALREADY_EXISTS" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_branch('$org_a','$owner','Duplicate','north-branch')"
expect_failure "ORGANIZATION_OWNER_REQUIRED" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_branch('$org_a','$admin','Admin Attempt','admin-attempt')"
expect_failure "ORGANIZATION_OWNER_REQUIRED" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_branch('$org_a','$cashier','Cashier Attempt','cashier-attempt')"
expect_failure "ORGANIZATION_OWNER_REQUIRED" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_branch('$org_a','$inventory','Inventory Attempt','inventory-attempt')"

foreign_branch="$(psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT id FROM public.branches WHERE organization_id='$org_b' AND slug='foreign-branch'")"
expect_failure "BRANCH_NOT_ACTIVE_OR_OUT_OF_SCOPE" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_warehouse('$org_a','$foreign_branch','$owner','Foreign Warehouse','foreign-warehouse')"
expect_failure "BRANCH_NOT_ACTIVE_OR_OUT_OF_SCOPE" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_register('$org_a','$foreign_branch','$owner','Foreign Register','foreign-register')"

expect_failure "WAREHOUSE_CODE_ALREADY_EXISTS" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_warehouse('$org_a','$branch_id','$owner','Duplicate Warehouse','main-warehouse')"
expect_failure "REGISTER_CODE_ALREADY_EXISTS" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.create_register('$org_a','$branch_id','$owner','Duplicate Register','main-register')"

psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.register_shifts (organization_id,branch_id,register_id,cashier_user_id) VALUES ('$org_a','$branch_id','$register_id','$cashier')" >/dev/null
expect_failure "BRANCH_MEMBERSHIP_HAS_OPEN_REGISTER_SHIFT" psql "$RUNTIME_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT * FROM public.set_branch_membership_active('$org_a','$branch_id','$cashier','$owner',false)"

dml_probe="$(psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "
SELECT NOT EXISTS (
 SELECT 1 FROM unnest(ARRAY['public.branches','public.warehouses','public.registers','public.branch_memberships','public.organization_members']) AS t(name)
 WHERE has_table_privilege('microapp_runtime',t.name,'INSERT')
    OR has_table_privilege('microapp_runtime',t.name,'UPDATE')
    OR has_table_privilege('microapp_runtime',t.name,'DELETE')
    OR has_table_privilege('microapp_runtime',t.name,'TRUNCATE')
)")"
[[ "$dml_probe" == "t" ]] || { echo "Runtime direct DML privilege detected." >&2; exit 1; }

audit_probe="$(psql "$ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) >= 4 FROM public.audit_logs WHERE organization_id='$org_a' AND actor_user_id='$owner' AND action IN ('branch.created','warehouse.created','register.created','branch_membership.activated')")"
[[ "$audit_probe" == "t" ]] || { echo "Expected atomic audit events were not recorded." >&2; exit 1; }

echo "PASS: PostgreSQL 18 owner structure operations, role/tenant/branch denials, duplicate guards, open-shift protection, runtime reads and DML denial."
