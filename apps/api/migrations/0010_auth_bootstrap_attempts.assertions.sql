-- Run after 0010_auth_bootstrap_attempts.sql on disposable PostgreSQL 18.
BEGIN;

INSERT INTO auth_bootstrap_attempts (
  handle_hash, state_hash, organization_name, organization_slug, expires_at
) VALUES (
  repeat('a', 64), repeat('b', 64), 'Bootstrap Assertions', 'bootstrap-assertions', now() + interval '10 minutes'
);

DO $bootstrap_handoff_assertions$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth_bootstrap_attempts
    WHERE handle_hash = repeat('a', 64)
      AND state_hash = repeat('b', 64)
      AND organization_name = 'Bootstrap Assertions'
      AND organization_slug = 'bootstrap-assertions'
      AND consumed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'FAIL: valid one-time bootstrap handoff was not stored';
  END IF;

  BEGIN
    INSERT INTO auth_bootstrap_attempts (
      handle_hash, state_hash, organization_name, organization_slug, expires_at
    ) VALUES (
      repeat('c', 64), repeat('b', 64), 'Duplicate State', 'duplicate-state', now() + interval '10 minutes'
    );
    RAISE EXCEPTION 'FAIL: duplicate OAuth state hash was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO auth_bootstrap_attempts (
      handle_hash, state_hash, organization_name, organization_slug, expires_at
    ) VALUES (
      'not-a-hash', repeat('d', 64), 'Invalid Hash', 'invalid-hash', now() + interval '10 minutes'
    );
    RAISE EXCEPTION 'FAIL: malformed handle hash was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO auth_bootstrap_attempts (
      handle_hash, state_hash, organization_name, organization_slug, expires_at
    ) VALUES (
      repeat('e', 64), repeat('f', 64), 'Invalid Slug', 'INVALID_SLUG', now() + interval '10 minutes'
    );
    RAISE EXCEPTION 'FAIL: malformed organization slug was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  IF EXISTS (
    SELECT 1
    FROM pg_class c,
         LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
    WHERE c.oid = 'public.auth_bootstrap_attempts'::regclass
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'FAIL: PUBLIC has privileges on bootstrap handoff table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auth_bootstrap_attempts'
      AND column_name IN ('token', 'bootstrap_token', 'raw_token')
  ) THEN
    RAISE EXCEPTION 'FAIL: raw bootstrap secret column exists';
  END IF;
END;
$bootstrap_handoff_assertions$;

ROLLBACK;
