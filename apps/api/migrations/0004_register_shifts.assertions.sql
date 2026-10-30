-- Run after 0004_register_shifts.sql on disposable PostgreSQL 18.
-- Verifies tenant scope, cashier assignment, one-open-shift indexes and lifecycle guards.
BEGIN;

DO $$
DECLARE
  org_a uuid;
  org_b uuid;
  user_cashier_a uuid;
  user_cashier_b uuid;
  user_inventory uuid;
  user_cashier_other uuid;
  branch_a uuid;
  branch_b uuid;
  register_a uuid;
  register_b uuid;
  register_other uuid;
  shift_a uuid;
  shift_b uuid;
BEGIN
  INSERT INTO organizations (name, slug)
    VALUES ('Shift Tenant A', 'shift-tenant-a') RETURNING id INTO org_a;
  INSERT INTO organizations (name, slug)
    VALUES ('Shift Tenant B', 'shift-tenant-b') RETURNING id INTO org_b;

  INSERT INTO app_users (email, display_name)
    VALUES ('shift-cashier-a@example.invalid', 'Shift Cashier A') RETURNING id INTO user_cashier_a;
  INSERT INTO app_users (email, display_name)
    VALUES ('shift-cashier-b@example.invalid', 'Shift Cashier B') RETURNING id INTO user_cashier_b;
  INSERT INTO app_users (email, display_name)
    VALUES ('shift-inventory@example.invalid', 'Shift Inventory') RETURNING id INTO user_inventory;
  INSERT INTO app_users (email, display_name)
    VALUES ('shift-cashier-other@example.invalid', 'Other Tenant Cashier') RETURNING id INTO user_cashier_other;

  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES
      (org_a, user_cashier_a, 'cashier'),
      (org_a, user_cashier_b, 'cashier'),
      (org_a, user_inventory, 'inventory'),
      (org_b, user_cashier_other, 'cashier');

  INSERT INTO branches (organization_id, name, slug)
    VALUES (org_a, 'Shift Branch A', 'shift-branch-a') RETURNING id INTO branch_a;
  INSERT INTO branches (organization_id, name, slug)
    VALUES (org_b, 'Shift Branch B', 'shift-branch-b') RETURNING id INTO branch_b;

  INSERT INTO branch_memberships (organization_id, branch_id, user_id)
    VALUES
      (org_a, branch_a, user_cashier_a),
      (org_a, branch_a, user_cashier_b),
      (org_a, branch_a, user_inventory),
      (org_b, branch_b, user_cashier_other);

  INSERT INTO registers (organization_id, branch_id, name, code)
    VALUES (org_a, branch_a, 'Front register', 'front-1') RETURNING id INTO register_a;
  INSERT INTO registers (organization_id, branch_id, name, code)
    VALUES (org_a, branch_a, 'Back register', 'back-1') RETURNING id INTO register_b;
  INSERT INTO registers (organization_id, branch_id, name, code)
    VALUES (org_b, branch_b, 'Other tenant register', 'front-1') RETURNING id INTO register_other;

  -- Register codes are unique within a branch.
  BEGIN
    INSERT INTO registers (organization_id, branch_id, name, code)
      VALUES (org_a, branch_a, 'Duplicate register', 'front-1');
    RAISE EXCEPTION 'FAIL: duplicate register code accepted within one branch';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- A register cannot be attached to another tenant's branch.
  BEGIN
    INSERT INTO registers (organization_id, branch_id, name, code)
      VALUES (org_a, branch_b, 'Cross-tenant register', 'cross-1');
    RAISE EXCEPTION 'FAIL: register accepted a branch from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  -- Cashier must have a branch assignment and current cashier role.
  BEGIN
    INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
      VALUES (org_a, branch_a, register_a, user_cashier_other);
    RAISE EXCEPTION 'FAIL: shift accepted a cashier from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
      VALUES (org_a, branch_a, register_a, user_inventory);
    RAISE EXCEPTION 'FAIL: shift accepted a non-cashier organization role';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  UPDATE branch_memberships
    SET is_active = false
    WHERE organization_id = org_a AND branch_id = branch_a AND user_id = user_cashier_a;
  BEGIN
    INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
      VALUES (org_a, branch_a, register_a, user_cashier_a);
    RAISE EXCEPTION 'FAIL: shift accepted an inactive branch assignment';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  UPDATE branch_memberships
    SET is_active = true
    WHERE organization_id = org_a AND branch_id = branch_a AND user_id = user_cashier_a;

  -- Negative physical cash counts are rejected.
  BEGIN
    INSERT INTO register_shifts (
      organization_id, branch_id, register_id, cashier_user_id, opening_cash_usd
    ) VALUES (org_a, branch_a, register_a, user_cashier_a, -1);
    RAISE EXCEPTION 'FAIL: negative opening cash accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO register_shifts (
    organization_id, branch_id, register_id, cashier_user_id,
    opening_cash_usd, opening_cash_ves
  ) VALUES (
    org_a, branch_a, register_a, user_cashier_a, 10.2500, 100.00
  ) RETURNING id INTO shift_a;

  -- Only one open shift per register, even with another cashier.
  BEGIN
    INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
      VALUES (org_a, branch_a, register_a, user_cashier_b);
    RAISE EXCEPTION 'FAIL: second open shift accepted for the same register';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Only one open shift per cashier/organization, even on another register.
  BEGIN
    INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
      VALUES (org_a, branch_a, register_b, user_cashier_a);
    RAISE EXCEPTION 'FAIL: second open shift accepted for the same cashier';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Open shift identity and opening counts cannot be changed or deleted.
  BEGIN
    UPDATE register_shifts SET cashier_user_id = user_cashier_b WHERE id = shift_a;
    RAISE EXCEPTION 'FAIL: open shift cashier was changed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE register_shifts SET opening_cash_usd = 20 WHERE id = shift_a;
    RAISE EXCEPTION 'FAIL: open shift opening count was changed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    DELETE FROM register_shifts WHERE id = shift_a;
    RAISE EXCEPTION 'FAIL: open shift was deleted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- Scope components cannot be deactivated or revoked while a shift is open.
  BEGIN
    UPDATE registers SET is_active = false WHERE id = register_a;
    RAISE EXCEPTION 'FAIL: register deactivated with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE branches SET is_active = false WHERE organization_id = org_a AND id = branch_a;
    RAISE EXCEPTION 'FAIL: branch deactivated with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE branch_memberships SET is_active = false
      WHERE organization_id = org_a AND branch_id = branch_a AND user_id = user_cashier_a;
    RAISE EXCEPTION 'FAIL: branch assignment revoked with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE organization_members SET is_active = false
      WHERE organization_id = org_a AND user_id = user_cashier_a;
    RAISE EXCEPTION 'FAIL: organization membership deactivated with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE organization_members SET role = 'inventory'
      WHERE organization_id = org_a AND user_id = user_cashier_a;
    RAISE EXCEPTION 'FAIL: cashier role changed with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE app_users SET is_active = false WHERE id = user_cashier_a;
    RAISE EXCEPTION 'FAIL: cashier user deactivated with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE organizations SET is_active = false WHERE id = org_a;
    RAISE EXCEPTION 'FAIL: organization deactivated with an open shift';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- Close is one complete transition by the assigned cashier.
  UPDATE register_shifts
    SET closed_at = clock_timestamp(),
        closing_cash_usd = 12.5000,
        closing_cash_ves = 125.00,
        closed_by_user_id = user_cashier_a
    WHERE id = shift_a;

  -- A closed shift is immutable and cannot be deleted.
  BEGIN
    UPDATE register_shifts SET closing_cash_usd = 13 WHERE id = shift_a;
    RAISE EXCEPTION 'FAIL: closed shift was updated';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    DELETE FROM register_shifts WHERE id = shift_a;
    RAISE EXCEPTION 'FAIL: closed shift was deleted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- The same cashier and register can be reused after the prior shift closes.
  INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
    VALUES (org_a, branch_a, register_a, user_cashier_a)
    RETURNING id INTO shift_b;

  UPDATE register_shifts
    SET closed_at = clock_timestamp(),
        closing_cash_usd = 0,
        closing_cash_ves = 0,
        closed_by_user_id = user_cashier_a
    WHERE id = shift_b;

  -- Deactivation/revocation becomes possible after all shifts are closed.
  UPDATE registers SET is_active = false WHERE id = register_a;
  UPDATE branches SET is_active = false WHERE organization_id = org_a AND id = branch_a;
  UPDATE branch_memberships SET is_active = false
    WHERE organization_id = org_a AND branch_id = branch_a AND user_id = user_cashier_a;
  UPDATE organization_members SET role = 'inventory', is_active = false
    WHERE organization_id = org_a AND user_id = user_cashier_a;
  UPDATE app_users SET is_active = false WHERE id = user_cashier_a;
  UPDATE organizations SET is_active = false WHERE id = org_a;

  RAISE NOTICE 'Register and shift lifecycle assertions passed.';
END $$;

ROLLBACK;
