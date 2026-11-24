-- Additive branch identity and membership scope.
-- Apply only after 0001_initial.sql and 0002_google_identity.sql.
-- This migration has NOT been applied to Neon main.

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, slug)
);

CREATE INDEX branches_org_active_name_idx
  ON branches (organization_id, is_active, lower(name));

CREATE TABLE branch_memberships (
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, branch_id, user_id),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES branches (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX branch_memberships_user_active_idx
  ON branch_memberships (organization_id, user_id, is_active, branch_id);
CREATE INDEX branch_memberships_branch_active_idx
  ON branch_memberships (organization_id, branch_id, is_active, user_id);
