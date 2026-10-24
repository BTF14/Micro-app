-- Run after 0001_initial.sql and 0002_google_identity.sql against a
-- disposable PostgreSQL database. Verifies allowlist/bootstrap constraints.
BEGIN;

DO $$
DECLARE
  dummy uuid;
BEGIN
  -- Allowlist emails are unique case-insensitively.
  INSERT INTO auth_allowlist (email, added_by) VALUES ('Owner@Example.com', 'owner-cli');
  BEGIN
    INSERT INTO auth_allowlist (email, added_by) VALUES ('owner@example.com', 'owner-cli');
    RAISE EXCEPTION 'expected duplicate allowlist email to be rejected';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- A second bootstrap sentinel row must be rejected: only id = true may exist.
  BEGIN
    INSERT INTO auth_bootstrap (id) VALUES (false);
    RAISE EXCEPTION 'expected non-sentinel bootstrap row to be rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- Partial consumption state (only some of the three fields set) must be rejected.
  BEGIN
    UPDATE auth_bootstrap SET consumed_at = now() WHERE id = true;
    RAISE EXCEPTION 'expected partial bootstrap consumption to be rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- google_sub must be unique across users.
  INSERT INTO app_users (email, display_name, google_sub) VALUES ('a@example.test', 'User A', 'sub-123') RETURNING id INTO dummy;
  BEGIN
    INSERT INTO app_users (email, display_name, google_sub) VALUES ('b@example.test', 'User B', 'sub-123');
    RAISE EXCEPTION 'expected duplicate google_sub to be rejected';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RAISE NOTICE 'All 0002 assertions passed.';
END $$;

ROLLBACK;
