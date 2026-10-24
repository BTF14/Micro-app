-- Google sign-in + allowlist identity policy.
-- Decisions D1-D8 approved by the owner on 2026-10-24; see
-- docs/sdd/auth-policy-decision-record.md for the full record.
-- This migration has not been applied to Neon main. Review and test on an isolated branch first.

-- Google identity linkage on the existing user record. Nullable: a user row
-- created by the one-time bootstrap is immediately linked, but the column
-- stays optional so the table does not assume every future identity source
-- is Google.
ALTER TABLE app_users ADD COLUMN google_sub text UNIQUE;
ALTER TABLE app_users ADD COLUMN email_verified_at timestamptz;

-- D1/D2: allowlist of exact, pre-authorized emails. Administered only by
-- direct, audited writes from an authenticated operator (there is no
-- self-service UI yet). Missing or inactive rows must deny access, never
-- open it.
CREATE TABLE auth_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(trim(email)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  added_by text NOT NULL CHECK (length(trim(added_by)) > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX auth_allowlist_email_lower_uq ON auth_allowlist (lower(email));
CREATE INDEX auth_allowlist_active_lower_idx ON auth_allowlist (lower(email)) WHERE is_active = true;

-- D3: explicit, single-use administrative bootstrap. A single sentinel row
-- (id is always true) is sealed the first time it is consumed, so the
-- bootstrap path can never create a second organization/owner even if the
-- bootstrap secret leaks or is reused.
CREATE TABLE auth_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  consumed_at timestamptz,
  consumed_by_email text,
  created_organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
  CHECK (
    (consumed_at IS NULL AND consumed_by_email IS NULL AND created_organization_id IS NULL)
    OR
    (consumed_at IS NOT NULL AND consumed_by_email IS NOT NULL AND created_organization_id IS NOT NULL)
  )
);
INSERT INTO auth_bootstrap (id) VALUES (true);
