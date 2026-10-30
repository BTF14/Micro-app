-- Run after 0003_branch_scope.sql on disposable PostgreSQL.
-- Proves branch and membership relations cannot cross organization boundaries.
BEGIN;

DO $$
DECLARE
  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  branch_a uuid;
BEGIN
  INSERT INTO organizations (name, slug)
    VALUES ('Branch Tenant A', 'branch-tenant-a') RETURNING id INTO org_a;
  INSERT INTO organizations (name, slug)
    VALUES ('Branch Tenant B', 'branch-tenant-b') RETURNING id INTO org_b;

  INSERT INTO app_users (email, display_name)
    VALUES ('branch-a@example.invalid', 'Branch User A') RETURNING id INTO user_a;
  INSERT INTO app_users (email, display_name)
    VALUES ('branch-b@example.invalid', 'Branch User B') RETURNING id INTO user_b;

  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (org_a, user_a, 'cashier'), (org_b, user_b, 'inventory');

  INSERT INTO branches (organization_id, name, slug)
    VALUES (org_a, 'A Main', 'a-main') RETURNING id INTO branch_a;
  INSERT INTO branches (organization_id, name, slug)
    VALUES (org_b, 'B Main', 'b-main');

  INSERT INTO branch_memberships (organization_id, branch_id, user_id)
    VALUES (org_a, branch_a, user_a);

  BEGIN
    INSERT INTO branch_memberships (organization_id, branch_id, user_id)
      VALUES (org_b, branch_a, user_b);
    RAISE EXCEPTION 'FAIL: branch membership accepted a branch from another organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO branch_memberships (organization_id, branch_id, user_id)
      VALUES (org_a, branch_a, user_b);
    RAISE EXCEPTION 'FAIL: branch membership accepted a user outside the organization';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO branches (organization_id, name, slug)
      VALUES (org_a, 'Duplicate slug', 'a-main');
    RAISE EXCEPTION 'FAIL: duplicate branch slug accepted within one organization';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RAISE NOTICE 'Branch scope constraint assertions passed.';
END $$;

ROLLBACK;
