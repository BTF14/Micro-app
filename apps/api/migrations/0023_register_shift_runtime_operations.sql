BEGIN;

DO $register_shift_runtime_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_RUNTIME_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime') THEN
    RAISE EXCEPTION 'MICROAPP_RUNTIME_ROLE_REQUIRED';
  END IF;
END;
$register_shift_runtime_preflight$;

-- Runtime may read registers/shifts, but all writes go through these narrow
-- SECURITY DEFINER functions. Do not grant direct table INSERT/UPDATE.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.register_shifts FROM PUBLIC, microapp_runtime;

CREATE FUNCTION public.open_register_shift(
  p_organization_id uuid,
  p_branch_id uuid,
  p_register_id uuid,
  p_user_id uuid,
  p_opening_cash_usd numeric(14,4),
  p_opening_cash_ves numeric(16,2)
)
RETURNS TABLE (
  id uuid, organization_id uuid, branch_id uuid, register_id uuid,
  cashier_user_id uuid, opened_at timestamptz,
  opening_cash_usd numeric(14,4), opening_cash_ves numeric(16,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $open_register_shift$
BEGIN
  IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_register_id IS NULL OR p_user_id IS NULL
    OR p_opening_cash_usd IS NULL OR p_opening_cash_ves IS NULL
    OR p_opening_cash_usd < 0 OR p_opening_cash_ves < 0 THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPENING_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  -- The 0004/0007 trigger locks and validates active org/branch/register/user
  -- plus eligible owner/admin/cashier role and active branch membership.
  RETURN QUERY
  INSERT INTO public.register_shifts (
    organization_id, branch_id, register_id, cashier_user_id,
    opening_cash_usd, opening_cash_ves
  ) VALUES (
    p_organization_id, p_branch_id, p_register_id, p_user_id,
    p_opening_cash_usd, p_opening_cash_ves
  )
  RETURNING register_shifts.id, register_shifts.organization_id,
    register_shifts.branch_id, register_shifts.register_id,
    register_shifts.cashier_user_id, register_shifts.opened_at,
    register_shifts.opening_cash_usd, register_shifts.opening_cash_ves;
END;
$open_register_shift$;

CREATE FUNCTION public.close_register_shift(
  p_organization_id uuid,
  p_branch_id uuid,
  p_shift_id uuid,
  p_user_id uuid,
  p_closing_cash_usd numeric(14,4),
  p_closing_cash_ves numeric(16,2)
)
RETURNS TABLE (
  id uuid, organization_id uuid, branch_id uuid, register_id uuid,
  cashier_user_id uuid, opened_at timestamptz,
  opening_cash_usd numeric(14,4), opening_cash_ves numeric(16,2),
  closed_at timestamptz, closing_cash_usd numeric(14,4),
  closing_cash_ves numeric(16,2), closed_by_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $close_register_shift$
DECLARE
  target_shift_id uuid;
BEGIN
  IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_shift_id IS NULL OR p_user_id IS NULL
    OR p_closing_cash_usd IS NULL OR p_closing_cash_ves IS NULL
    OR p_closing_cash_usd < 0 OR p_closing_cash_ves < 0 THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_CLOSING_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Lock the shift first: concurrent close requests serialize here. The
  -- lifecycle/scope triggers prevent role, membership, user or register
  -- deactivation while an open shift exists.
  SELECT s.id INTO target_shift_id
    FROM public.register_shifts s
   WHERE s.organization_id = p_organization_id
     AND s.branch_id = p_branch_id
     AND s.id = p_shift_id
     AND s.cashier_user_id = p_user_id
     AND s.closed_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.organizations o
      JOIN public.branches b ON b.organization_id = o.id AND b.id = p_branch_id
      JOIN public.registers r ON r.organization_id = o.id AND r.branch_id = b.id
      JOIN public.app_users u ON u.id = p_user_id
      JOIN public.organization_members m ON m.organization_id = o.id AND m.user_id = u.id
      JOIN public.branch_memberships bm ON bm.organization_id = o.id AND bm.branch_id = b.id AND bm.user_id = u.id
     WHERE o.id = p_organization_id AND o.is_active
       AND b.is_active AND r.id = (SELECT s.register_id FROM public.register_shifts s WHERE s.id = target_shift_id)
       AND r.is_active AND u.is_active AND m.is_active
       AND m.role IN ('owner', 'admin', 'cashier') AND bm.is_active
  ) THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.register_shifts s
     SET closed_at = pg_catalog.clock_timestamp(),
         closing_cash_usd = p_closing_cash_usd,
         closing_cash_ves = p_closing_cash_ves,
         closed_by_user_id = p_user_id
   WHERE s.id = target_shift_id AND s.closed_at IS NULL
  RETURNING s.id, s.organization_id, s.branch_id, s.register_id,
    s.cashier_user_id, s.opened_at, s.opening_cash_usd, s.opening_cash_ves,
    s.closed_at, s.closing_cash_usd, s.closing_cash_ves, s.closed_by_user_id;
END;
$close_register_shift$;

REVOKE ALL ON FUNCTION public.open_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.close_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) TO microapp_runtime;

COMMENT ON FUNCTION public.open_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) IS
  'Opens a register shift for the authenticated member context after API authorization; table writes remain unavailable to runtime.';
COMMENT ON FUNCTION public.close_register_shift(uuid, uuid, uuid, uuid, numeric, numeric) IS
  'Atomically closes only the specified member-owned open shift; closing counts are physical USD/VES cash, not expected balance.';

COMMIT;
