-- Server-side, one-time OAuth bootstrap handoff.
-- The browser receives only a random opaque handle; the organization details
-- and OAuth-state binding remain server-side. The raw BOOTSTRAP_TOKEN is never
-- persisted here or serialized into a browser cookie.
BEGIN;

CREATE TABLE auth_bootstrap_attempts (
  handle_hash char(64) PRIMARY KEY
    CHECK (handle_hash ~ '^[a-f0-9]{64}$'),
  state_hash char(64) NOT NULL UNIQUE
    CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  organization_name text NOT NULL
    CHECK (length(trim(organization_name)) BETWEEN 2 AND 120),
  organization_slug text NOT NULL
    CHECK (length(organization_slug) <= 80 AND organization_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX auth_bootstrap_attempts_expiry_idx
  ON auth_bootstrap_attempts (expires_at)
  WHERE consumed_at IS NULL;

REVOKE ALL ON TABLE auth_bootstrap_attempts FROM PUBLIC;

COMMIT;
