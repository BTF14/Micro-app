BEGIN;

DO $register_shift_role_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_ROLE_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
END;
$register_shift_role_preflight$;

-- The application authorization matrix already grants owner/admin/cashier
-- the ability to open and operate their own shift. Keep the database guard in
-- sync without weakening tenant, branch, register, membership or user checks.
CREATE OR REPLACE FUNCTION public.validate_register_shift_opening() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $validate_register_shift_opening$
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
  FROM public.organizations o
  JOIN public.branches b
    ON b.organization_id = o.id
   AND b.id = NEW.branch_id
  JOIN public.registers r
    ON r.organization_id = b.organization_id
   AND r.branch_id = b.id
   AND r.id = NEW.register_id
  JOIN public.branch_memberships bm
    ON bm.organization_id = b.organization_id
   AND bm.branch_id = b.id
   AND bm.user_id = NEW.cashier_user_id
  JOIN public.organization_members m
    ON m.organization_id = bm.organization_id
   AND m.user_id = bm.user_id
  JOIN public.app_users u
    ON u.id = m.user_id
  WHERE o.id = NEW.organization_id
    AND b.organization_id = NEW.organization_id
    AND r.organization_id = NEW.organization_id
  FOR UPDATE OF o, b, r, bm, m, u;

  -- Missing scope rows are left to composite FKs. Existing but inactive or
  -- unauthorized rows fail closed here.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF scope_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_REQUIRES_ACTIVE_CASHIER_SCOPE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$validate_register_shift_opening$;

-- An open shift remains bound to an eligible operator. Prevent deactivation
-- and role changes that would make an owner/admin/cashier shift inoperable.
CREATE OR REPLACE FUNCTION public.prevent_scope_deactivation_with_open_register_shift() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $prevent_scope_deactivation$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  has_open_shift boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'registers' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'branch_id')::uuid
          AND s.register_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'branches' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'branch_memberships' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.branch_id = (old_row ->> 'branch_id')::uuid
          AND s.cashier_user_id = (old_row ->> 'user_id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    IF (
      ((old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean)
      OR (
        (old_row ->> 'role') IN ('owner', 'admin', 'cashier')
        AND (new_row ->> 'role') NOT IN ('owner', 'admin', 'cashier')
      )
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
        WHERE s.organization_id = (old_row ->> 'organization_id')::uuid
          AND s.cashier_user_id = (old_row ->> 'user_id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'app_users' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
        WHERE s.cashier_user_id = (old_row ->> 'id')::uuid
          AND s.closed_at IS NULL
      ) INTO has_open_shift;
    END IF;
  ELSIF TG_TABLE_NAME = 'organizations' THEN
    IF (old_row ->> 'is_active')::boolean AND NOT (new_row ->> 'is_active')::boolean THEN
      SELECT EXISTS (
        SELECT 1 FROM public.register_shifts s
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
$prevent_scope_deactivation$;

COMMIT;
