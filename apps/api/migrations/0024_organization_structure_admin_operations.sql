BEGIN;

DO $organization_structure_admin_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime') THEN
    RAISE EXCEPTION 'MICROAPP_RUNTIME_ROLE_REQUIRED';
  END IF;
END;
$organization_structure_admin_preflight$;

-- Remove any broad table-write grants before exposing the narrow routines.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE
  public.branches, public.warehouses, public.registers,
  public.branch_memberships, public.organization_members
FROM PUBLIC, microapp_runtime;

CREATE FUNCTION public.create_branch(
  p_organization_id uuid, p_actor_user_id uuid, p_name text, p_slug text
) RETURNS TABLE(id uuid, organization_id uuid, name text, slug text, is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $create_branch$
DECLARE
  v_slug text;
  v_row public.branches%ROWTYPE;
BEGIN
  IF p_organization_id IS NULL OR p_actor_user_id IS NULL
    OR p_name IS NULL OR length(pg_catalog.btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_slug IS NULL OR length(pg_catalog.btrim(p_slug)) NOT BETWEEN 1 AND 80
    OR p_name ~ '[[:cntrl:]]' OR p_slug ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;
  v_slug := pg_catalog.trim(both '-' from pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(p_slug)), '[^a-z0-9]+', '-', 'g'));
  IF v_slug = '' OR length(v_slug) > 80 THEN
    RAISE EXCEPTION 'BRANCH_SLUG_INVALID' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.organizations o
   WHERE o.id = p_organization_id AND o.is_active
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organization_members m
  JOIN public.app_users u ON u.id = m.user_id
   WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_user_id
     AND m.role = 'owner' AND m.is_active AND u.is_active
   FOR UPDATE OF m, u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_REQUIRED' USING ERRCODE = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.branches b WHERE b.organization_id = p_organization_id AND b.slug = v_slug) THEN
    RAISE EXCEPTION 'BRANCH_SLUG_ALREADY_EXISTS' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.branches (organization_id, name, slug)
  VALUES (p_organization_id, pg_catalog.btrim(p_name), v_slug)
  RETURNING * INTO v_row;
  INSERT INTO public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_organization_id, p_actor_user_id, 'branch.created', 'branch', v_row.id::text,
    pg_catalog.jsonb_build_object('name', v_row.name, 'slug', v_row.slug));
  RETURN QUERY SELECT v_row.id, v_row.organization_id, v_row.name, v_row.slug, v_row.is_active;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'BRANCH_SLUG_ALREADY_EXISTS' USING ERRCODE = '23505';
END;
$create_branch$;

CREATE FUNCTION public.create_warehouse(
  p_organization_id uuid, p_branch_id uuid, p_actor_user_id uuid, p_name text, p_code text
) RETURNS TABLE(id uuid, organization_id uuid, branch_id uuid, name text, code text, is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $create_warehouse$
DECLARE
  v_code text;
  v_row public.warehouses%ROWTYPE;
BEGIN
  IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_actor_user_id IS NULL
    OR p_name IS NULL OR length(pg_catalog.btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_code IS NULL OR length(pg_catalog.btrim(p_code)) NOT BETWEEN 1 AND 80
    OR p_name ~ '[[:cntrl:]]' OR p_code ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;
  v_code := pg_catalog.trim(both '-' from pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(p_code)), '[^a-z0-9]+', '-', 'g'));
  IF v_code = '' OR length(v_code) > 80 THEN
    RAISE EXCEPTION 'WAREHOUSE_CODE_INVALID' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.organizations o
   WHERE o.id = p_organization_id AND o.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.branches b
   WHERE b.organization_id = p_organization_id AND b.id = p_branch_id AND b.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BRANCH_NOT_ACTIVE_OR_OUT_OF_SCOPE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organization_members m
  JOIN public.app_users u ON u.id = m.user_id
   WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_user_id
     AND m.role = 'owner' AND m.is_active AND u.is_active FOR UPDATE OF m, u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_REQUIRED' USING ERRCODE = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.warehouses w WHERE w.organization_id = p_organization_id
      AND w.branch_id = p_branch_id AND w.code = v_code) THEN
    RAISE EXCEPTION 'WAREHOUSE_CODE_ALREADY_EXISTS' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.warehouses (organization_id, branch_id, name, code)
  VALUES (p_organization_id, p_branch_id, pg_catalog.btrim(p_name), v_code)
  RETURNING * INTO v_row;
  INSERT INTO public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_organization_id, p_actor_user_id, 'warehouse.created', 'warehouse', v_row.id::text,
    pg_catalog.jsonb_build_object('branch_id', p_branch_id, 'name', v_row.name, 'code', v_row.code));
  RETURN QUERY SELECT v_row.id, v_row.organization_id, v_row.branch_id, v_row.name, v_row.code, v_row.is_active;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'WAREHOUSE_CODE_ALREADY_EXISTS' USING ERRCODE = '23505';
END;
$create_warehouse$;

CREATE FUNCTION public.create_register(
  p_organization_id uuid, p_branch_id uuid, p_actor_user_id uuid, p_name text, p_code text
) RETURNS TABLE(id uuid, organization_id uuid, branch_id uuid, name text, code text, is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $create_register$
DECLARE
  v_code text;
  v_row public.registers%ROWTYPE;
BEGIN
  IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_actor_user_id IS NULL
    OR p_name IS NULL OR length(pg_catalog.btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_code IS NULL OR length(pg_catalog.btrim(p_code)) NOT BETWEEN 1 AND 80
    OR p_name ~ '[[:cntrl:]]' OR p_code ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'ORGANIZATION_STRUCTURE_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;
  v_code := pg_catalog.trim(both '-' from pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(p_code)), '[^a-z0-9]+', '-', 'g'));
  IF v_code = '' OR length(v_code) > 80 THEN
    RAISE EXCEPTION 'REGISTER_CODE_INVALID' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.organizations o
   WHERE o.id = p_organization_id AND o.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.branches b
   WHERE b.organization_id = p_organization_id AND b.id = p_branch_id AND b.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BRANCH_NOT_ACTIVE_OR_OUT_OF_SCOPE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organization_members m
  JOIN public.app_users u ON u.id = m.user_id
   WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_user_id
     AND m.role = 'owner' AND m.is_active AND u.is_active FOR UPDATE OF m, u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_REQUIRED' USING ERRCODE = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.registers r WHERE r.organization_id = p_organization_id
      AND r.branch_id = p_branch_id AND r.code = v_code) THEN
    RAISE EXCEPTION 'REGISTER_CODE_ALREADY_EXISTS' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.registers (organization_id, branch_id, name, code)
  VALUES (p_organization_id, p_branch_id, pg_catalog.btrim(p_name), v_code)
  RETURNING * INTO v_row;
  INSERT INTO public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_organization_id, p_actor_user_id, 'register.created', 'register', v_row.id::text,
    pg_catalog.jsonb_build_object('branch_id', p_branch_id, 'name', v_row.name, 'code', v_row.code));
  RETURN QUERY SELECT v_row.id, v_row.organization_id, v_row.branch_id, v_row.name, v_row.code, v_row.is_active;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'REGISTER_CODE_ALREADY_EXISTS' USING ERRCODE = '23505';
END;
$create_register$;

CREATE FUNCTION public.set_branch_membership_active(
  p_organization_id uuid, p_branch_id uuid, p_user_id uuid, p_actor_user_id uuid, p_is_active boolean
) RETURNS TABLE(organization_id uuid, branch_id uuid, user_id uuid, is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $set_branch_membership_active$
DECLARE
  v_previous boolean;
BEGIN
  IF p_organization_id IS NULL OR p_branch_id IS NULL OR p_user_id IS NULL
    OR p_actor_user_id IS NULL OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'BRANCH_MEMBERSHIP_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Lock order matches register-shift opening (organization -> branch -> member
  -- scope). The opening trigger locks these same rows before inserting a shift.
  PERFORM 1 FROM public.organizations o
   WHERE o.id = p_organization_id AND o.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_NOT_ACTIVE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.branches b
   WHERE b.organization_id = p_organization_id AND b.id = p_branch_id AND b.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BRANCH_NOT_ACTIVE_OR_OUT_OF_SCOPE' USING ERRCODE = '42501'; END IF;
  SELECT bm.is_active INTO v_previous
    FROM public.branch_memberships bm
   WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id
     AND bm.user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BRANCH_MEMBERSHIP_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  PERFORM 1 FROM public.organization_members target
  JOIN public.app_users tu ON tu.id = target.user_id
   WHERE target.organization_id = p_organization_id AND target.user_id = p_user_id
     AND target.is_active AND tu.is_active FOR UPDATE OF target, tu;
  IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_MEMBER_NOT_ACTIVE_OR_OUT_OF_SCOPE' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organization_members actor
  JOIN public.app_users au ON au.id = actor.user_id
   WHERE actor.organization_id = p_organization_id AND actor.user_id = p_actor_user_id
     AND actor.role = 'owner' AND actor.is_active AND au.is_active FOR UPDATE OF actor, au;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_REQUIRED' USING ERRCODE = '42501'; END IF;

  IF NOT p_is_active AND v_previous THEN
    IF EXISTS (SELECT 1 FROM public.register_shifts s
      WHERE s.organization_id = p_organization_id AND s.branch_id = p_branch_id
        AND s.cashier_user_id = p_user_id AND s.closed_at IS NULL) THEN
      RAISE EXCEPTION 'BRANCH_MEMBERSHIP_HAS_OPEN_REGISTER_SHIFT' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_previous IS DISTINCT FROM p_is_active THEN
    UPDATE public.branch_memberships bm SET is_active = p_is_active, updated_at = pg_catalog.clock_timestamp()
     WHERE bm.organization_id = p_organization_id AND bm.branch_id = p_branch_id AND bm.user_id = p_user_id;
    INSERT INTO public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (p_organization_id, p_actor_user_id,
      CASE WHEN p_is_active THEN 'branch_membership.activated' ELSE 'branch_membership.deactivated' END,
      'branch_membership', p_user_id::text,
      pg_catalog.jsonb_build_object('branch_id', p_branch_id, 'user_id', p_user_id,
        'previous_is_active', v_previous, 'is_active', p_is_active));
  END IF;
  RETURN QUERY SELECT p_organization_id, p_branch_id, p_user_id, p_is_active;
END;
$set_branch_membership_active$;

ALTER FUNCTION public.create_branch(uuid, uuid, text, text) OWNER TO microapp_migrator;
ALTER FUNCTION public.create_warehouse(uuid, uuid, uuid, text, text) OWNER TO microapp_migrator;
ALTER FUNCTION public.create_register(uuid, uuid, uuid, text, text) OWNER TO microapp_migrator;
ALTER FUNCTION public.set_branch_membership_active(uuid, uuid, uuid, uuid, boolean) OWNER TO microapp_migrator;

REVOKE ALL ON FUNCTION public.create_branch(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_warehouse(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_register(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_branch_membership_active(uuid, uuid, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_branch(uuid, uuid, text, text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.create_warehouse(uuid, uuid, uuid, text, text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.create_register(uuid, uuid, uuid, text, text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.set_branch_membership_active(uuid, uuid, uuid, uuid, boolean) TO microapp_runtime;

COMMENT ON FUNCTION public.create_branch(uuid, uuid, text, text) IS 'Creates an organization branch for an active owner; writes and audit event are atomic.';
COMMENT ON FUNCTION public.create_warehouse(uuid, uuid, uuid, text, text) IS 'Creates a warehouse in an active branch for an active owner; writes and audit event are atomic.';
COMMENT ON FUNCTION public.create_register(uuid, uuid, uuid, text, text) IS 'Creates a register in an active branch for an active owner; writes and audit event are atomic.';
COMMENT ON FUNCTION public.set_branch_membership_active(uuid, uuid, uuid, uuid, boolean) IS 'Activates/deactivates an existing branch assignment; rejects deactivation while the member owns an open shift.';

COMMIT;
