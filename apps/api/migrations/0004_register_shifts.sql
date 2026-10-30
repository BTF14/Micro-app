-- Additive register and individual cashier shift model.
-- Apply only after 0001_initial.sql, 0002_google_identity.sql and 0003_branch_scope.sql.
-- CI validates this migration on disposable PostgreSQL 18. Never use Neon main as a test database.

CREATE TABLE registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  code text NOT NULL CHECK (
    code = lower(trim(code))
    AND code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, branch_id, id),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES branches (organization_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX registers_org_branch_code_uq
  ON registers (organization_id, branch_id, lower(code));
CREATE INDEX registers_org_branch_active_idx
  ON registers (organization_id, branch_id, is_active, lower(name));

CREATE TABLE register_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  register_id uuid NOT NULL,
  cashier_user_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_cash_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (opening_cash_usd >= 0),
  opening_cash_ves numeric(16,2) NOT NULL DEFAULT 0 CHECK (opening_cash_ves >= 0),
  closed_at timestamptz,
  closing_cash_usd numeric(14,4) CHECK (closing_cash_usd IS NULL OR closing_cash_usd >= 0),
  closing_cash_ves numeric(16,2) CHECK (closing_cash_ves IS NULL OR closing_cash_ves >= 0),
  closed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, branch_id, id),
  FOREIGN KEY (organization_id, branch_id, register_id)
    REFERENCES registers (organization_id, branch_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, branch_id, cashier_user_id)
    REFERENCES branch_memberships (organization_id, branch_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, closed_by_user_id)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (
    (closed_at IS NULL
      AND closing_cash_usd IS NULL
      AND closing_cash_ves IS NULL
      AND closed_by_user_id IS NULL)
    OR
    (closed_at IS NOT NULL
      AND closed_at >= opened_at
      AND closing_cash_usd IS NOT NULL
      AND closing_cash_ves IS NOT NULL
      AND closed_by_user_id IS NOT NULL
      AND closed_by_user_id = cashier_user_id)
  )
);

-- The partial unique indexes are the final concurrency guard. They guarantee
-- one open shift per register and one open shift per cashier/organization.
CREATE UNIQUE INDEX register_shifts_one_open_per_register_uq
  ON register_shifts (organization_id, branch_id, register_id)
  WHERE closed_at IS NULL;
CREATE UNIQUE INDEX register_shifts_one_open_per_cashier_uq
  ON register_shifts (organization_id, cashier_user_id)
  WHERE closed_at IS NULL;
CREATE INDEX register_shifts_org_register_history_idx
  ON register_shifts (organization_id, register_id, opened_at DESC);
CREATE INDEX register_shifts_org_cashier_history_idx
  ON register_shifts (organization_id, cashier_user_id, opened_at DESC);

-- Lock the relevant scope rows while opening a shift. This serializes an opening
-- against concurrent deactivation/revocation of its organization, branch,
-- register, organization membership, user, or branch assignment.
CREATE FUNCTION validate_register_shift_opening() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  scope_is_active boolean;
BEGIN
  SELECT (
    o.is_active
    AND b.is_active
    AND r.is_active
    AND bm.is_active
    AND m.is_active
    AND m.role = 'cashier'
    AND u.is_active
  )
  INTO scope_is_active
  FROM organizations o
  JOIN branches b
    ON b.organization_id = o.id
   AND b.id = NEW.branch_id
  JOIN registers r
    ON r.organization_id = b.organization_id
   AND r.branch_id = b.id
   AND r.id = NEW.register_id
  JOIN branch_memberships bm
    ON bm.organization_id = b.organization_id
   AND bm.branch_id = b.id
   AND bm.user_id = NEW.cashier_user_id
  JOIN organization_members m
    ON m.organization_id = bm.organization_id
   AND m.user_id = bm.user_id
  JOIN app_users u
    ON u.id = m.user_id
  WHERE o.id = NEW.organization_id
    AND b.organization_id = NEW.organization_id
    AND r.organization_id = NEW.organization_id
  FOR UPDATE OF o, b, r, bm, m, u;

  IF NOT FOUND OR scope_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_REQUIRES_ACTIVE_CASHIER_SCOPE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER register_shifts_10_validate_opening
BEFORE INSERT ON register_shifts
FOR EACH ROW EXECUTE FUNCTION validate_register_shift_opening();

-- A shift is an append-only lifecycle record: INSERT creates it open; the only
-- permitted UPDATE is the single complete close transition. No shift is deleted.
CREATE FUNCTION guard_register_shift_lifecycle() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_DELETE_FORBIDDEN'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.closed_at IS NOT NULL
      OR NEW.closing_cash_usd IS NOT NULL
      OR NEW.closing_cash_ves IS NOT NULL
      OR NEW.closed_by_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'REGISTER_SHIFT_MUST_BE_CREATED_OPEN'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_CLOSED_IS_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  IF ROW(
    NEW.id,
    NEW.organization_id,
    NEW.branch_id,
    NEW.register_id,
    NEW.cashier_user_id,
    NEW.opened_at,
    NEW.opening_cash_usd,
    NEW.opening_cash_ves,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.organization_id,
    OLD.branch_id,
    OLD.register_id,
    OLD.cashier_user_id,
    OLD.opened_at,
    OLD.opening_cash_usd,
    OLD.opening_cash_ves,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPENING_FIELDS_ARE_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.closed_at IS NULL
    OR NEW.closing_cash_usd IS NULL
    OR NEW.closing_cash_ves IS NULL
    OR NEW.closed_by_user_id IS NULL
    OR NEW.closed_by_user_id IS DISTINCT FROM NEW.cashier_user_id THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_CLOSE_MUST_BE_COMPLETE_AND_BY_CASHIER'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER register_shifts_20_guard_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON register_shifts
FOR EACH ROW EXECUTE FUNCTION guard_register_shift_lifecycle();

-- Do not deactivate/revoke a scope component while one of its shifts is open.
-- The trigger uses JSON row images so the same function can safely serve the
-- tables whose primary-key column names differ.
CREATE FUNCTION prevent_scope_deactivation_with_open_register_shift() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  has_open_shift boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'registers' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'branch_id')::uuid
          AND s.register_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'branches' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'branch_memberships' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'branch_id')::uuid
          AND s.cashier_user_id = (old_row ->> 'user_id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    IF (
      ((old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean)
      OR ((old_row ->> 'role') = 'cashier' AND (new_row ->> 'role') <> 'cashier')
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.cashier_user_id = (old_row ->> 'user_id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'app_users' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.cashier_user_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'organizations' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM register_shifts s
        WHERE s.organization_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  END IF;

  IF has_open_shift THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPEN_SCOPE_CANNOT_BE_DEACTIVATED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER registers_prevent_deactivation_with_open_shift
BEFORE UPDATE OF is_active ON registers
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

CREATE TRIGGER branches_prevent_deactivation_with_open_shift
BEFORE UPDATE OF is_active ON branches
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

CREATE TRIGGER branch_memberships_prevent_revocation_with_open_shift
BEFORE UPDATE OF is_active ON branch_memberships
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

CREATE TRIGGER organization_members_prevent_deactivation_with_open_shift
BEFORE UPDATE OF is_active, role ON organization_members
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

CREATE TRIGGER app_users_prevent_deactivation_with_open_shift
BEFORE UPDATE OF is_active ON app_users
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

CREATE TRIGGER organizations_prevent_deactivation_with_open_shift
BEFORE UPDATE OF is_active ON organizations
FOR EACH ROW EXECUTE FUNCTION prevent_scope_deactivation_with_open_register_shift();

COMMENT ON TABLE registers IS
  'Cash registers/terminals owned by one organization and branch.';

COMMENT ON TABLE register_shifts IS
  'Immutable cashier/register shift lifecycle; USD and VES physical cash counts are stored separately.';
