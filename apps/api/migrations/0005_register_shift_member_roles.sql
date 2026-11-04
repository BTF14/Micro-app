-- Align register-shift opening with the approved role matrix.
-- Owner, Admin and Cashier may each own one shift; only that owner may close it.
-- A branch membership remains mandatory for every branch-scoped shift.

CREATE OR REPLACE FUNCTION validate_register_shift_opening() RETURNS trigger
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
    AND m.role IN ('owner', 'admin', 'cashier')
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

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF scope_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_REQUIRES_ACTIVE_MEMBER_SCOPE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- Keep a shift owner in an eligible role until their open shift is closed.
-- The original 0004 guard already prevents revoking/deactivating the owner;
-- this additive guard extends role-downgrade protection to Owner and Admin.
CREATE FUNCTION prevent_open_register_shift_owner_role_downgrade() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role IN ('owner', 'admin', 'cashier')
    AND NEW.role NOT IN ('owner', 'admin', 'cashier')
    AND EXISTS (
      SELECT 1
      FROM register_shifts s
      WHERE s.organization_id = OLD.organization_id
        AND s.cashier_user_id = OLD.user_id
        AND s.closed_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPEN_OWNER_ROLE_CANNOT_BE_DOWNGRADED'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_members_prevent_open_shift_owner_role_downgrade
BEFORE UPDATE OF role ON organization_members
FOR EACH ROW
EXECUTE FUNCTION prevent_open_register_shift_owner_role_downgrade();

COMMENT ON FUNCTION validate_register_shift_opening() IS
  'Requires active organization, branch, register, organization membership, branch membership and user; eligible roles are owner/admin/cashier.';
COMMENT ON FUNCTION prevent_open_register_shift_owner_role_downgrade() IS
  'Prevents an open shift owner from losing the owner/admin/cashier role required by the approved own-shift policy.';

COMMENT ON COLUMN register_shifts.cashier_user_id IS
  'Organization member who owns and operates this shift; approved eligible roles are owner, admin and cashier, and only this member may close it.';
