-- Owner organization management, invitation provisioning, audited forced shift closure and bounded auth-session retention.
-- Apply only through the numbered migration runner on an isolated PostgreSQL 18 database.
BEGIN;

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (
    length(btrim(email)) BETWEEN 3 AND 320
    AND email = lower(btrim(email))
    AND email !~ '[[:cntrl:]]'
  ),
  role text NOT NULL CHECK (role IN ('admin','cashier','inventory')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  note text,
  invited_by_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  accepted_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status='pending' AND accepted_user_id IS NULL AND accepted_at IS NULL AND revoked_at IS NULL AND revoked_by_user_id IS NULL)
    OR (status='accepted' AND accepted_user_id IS NOT NULL AND accepted_at IS NOT NULL AND revoked_at IS NULL AND revoked_by_user_id IS NULL)
    OR (status='revoked' AND accepted_user_id IS NULL AND accepted_at IS NULL AND revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX organization_invitations_pending_email_uq
  ON public.organization_invitations (organization_id, lower(email)) WHERE status='pending';
CREATE INDEX organization_invitations_pending_email_idx
  ON public.organization_invitations (lower(email), organization_id) WHERE status='pending';
REVOKE ALL ON TABLE public.organization_invitations FROM PUBLIC, microapp_runtime;
GRANT SELECT ON TABLE public.organization_invitations TO microapp_runtime;

ALTER TABLE public.register_shifts
  ADD COLUMN force_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN force_close_reason text,
  ADD CONSTRAINT register_shifts_force_close_state_check CHECK (
    (force_closed = false AND force_close_reason IS NULL)
    OR (force_closed = true AND closed_at IS NOT NULL
        AND force_close_reason IS NOT NULL
        AND length(btrim(force_close_reason)) BETWEEN 3 AND 300
        AND force_close_reason !~ '[[:cntrl:]]')
  );

-- Replace the legacy 0004 CHECK that required every close to be performed by
-- the cashier. The trigger below now enforces cashier-only normal close and
-- owner/admin-only forced close.
DO $drop_legacy_shift_close_check$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname FROM pg_catalog.pg_constraint c
     WHERE c.conrelid='public.register_shifts'::regclass AND c.contype='c'
       AND pg_catalog.pg_get_constraintdef(c.oid) LIKE '%closed_by_user_id = cashier_user_id%'
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.register_shifts DROP CONSTRAINT %I',constraint_name);
  END LOOP;
END;
$drop_legacy_shift_close_check$;
ALTER TABLE public.register_shifts
  ADD CONSTRAINT register_shifts_close_state_check CHECK (
    (closed_at IS NULL AND closing_cash_usd IS NULL AND closing_cash_ves IS NULL AND closed_by_user_id IS NULL)
    OR (closed_at IS NOT NULL AND closed_at >= opened_at
        AND closing_cash_usd IS NOT NULL AND closing_cash_ves IS NOT NULL
        AND closed_by_user_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.guard_register_shift_lifecycle() RETURNS trigger
LANGUAGE plpgsql
AS $guard_register_shift_lifecycle$
DECLARE
  actor_is_admin boolean;
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_DELETE_FORBIDDEN' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.closed_at IS NOT NULL OR NEW.closing_cash_usd IS NOT NULL
      OR NEW.closing_cash_ves IS NOT NULL OR NEW.closed_by_user_id IS NOT NULL
      OR NEW.force_closed IS DISTINCT FROM false OR NEW.force_close_reason IS NOT NULL THEN
      RAISE EXCEPTION 'REGISTER_SHIFT_MUST_BE_CREATED_OPEN' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_CLOSED_IS_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF ROW(NEW.id,NEW.organization_id,NEW.branch_id,NEW.register_id,NEW.cashier_user_id,
         NEW.opened_at,NEW.opening_cash_usd,NEW.opening_cash_ves,NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.id,OLD.organization_id,OLD.branch_id,OLD.register_id,OLD.cashier_user_id,
         OLD.opened_at,OLD.opening_cash_usd,OLD.opening_cash_ves,OLD.created_at) THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_OPENING_FIELDS_ARE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF NEW.closed_at IS NULL OR NEW.closing_cash_usd IS NULL OR NEW.closing_cash_ves IS NULL
     OR NEW.closed_by_user_id IS NULL THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_CLOSE_MUST_BE_COMPLETE' USING ERRCODE='23514';
  END IF;
  IF NEW.force_closed THEN
    IF NEW.force_close_reason IS NULL OR length(btrim(NEW.force_close_reason)) NOT BETWEEN 3 AND 300
       OR NEW.force_close_reason ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'REGISTER_SHIFT_FORCE_CLOSE_REASON_INVALID' USING ERRCODE='23514';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.app_users u ON u.id=m.user_id
      WHERE m.organization_id=NEW.organization_id AND m.user_id=NEW.closed_by_user_id
        AND m.role IN ('owner','admin') AND m.is_active AND u.is_active
    ) INTO actor_is_admin;
    IF NOT actor_is_admin THEN
      RAISE EXCEPTION 'REGISTER_SHIFT_FORCE_CLOSE_REQUIRES_OWNER_OR_ADMIN' USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.force_close_reason IS NOT NULL OR NEW.closed_by_user_id IS DISTINCT FROM NEW.cashier_user_id THEN
      RAISE EXCEPTION 'REGISTER_SHIFT_CLOSE_MUST_BE_BY_CASHIER' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard_register_shift_lifecycle$;
ALTER FUNCTION public.guard_register_shift_lifecycle() OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.rename_organization(
  p_organization_id uuid, p_actor_user_id uuid, p_name text, p_slug text
) RETURNS TABLE(id uuid,name text,slug text,is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $rename_organization$
DECLARE v_name text; v_slug text; v_old_name text; v_old_slug text;
BEGIN
  v_name:=btrim(p_name); v_slug:=lower(btrim(p_slug));
  PERFORM 1 FROM public.organizations o WHERE o.id=p_organization_id AND o.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_RENAME_FORBIDDEN' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.organization_members m
    JOIN public.app_users u ON u.id=m.user_id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id
     AND m.role='owner' AND m.is_active AND u.is_active FOR UPDATE OF m,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_RENAME_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF p_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 OR v_name ~ '[[:cntrl:]]'
     OR p_slug IS NULL OR length(v_slug) NOT BETWEEN 1 AND 80
     OR v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'ORGANIZATION_RENAME_INPUT_INVALID' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.organizations o WHERE o.slug=v_slug AND o.id<>p_organization_id) THEN
    RAISE EXCEPTION 'ORGANIZATION_SLUG_ALREADY_EXISTS' USING ERRCODE='23505';
  END IF;
  SELECT o.name,o.slug INTO v_old_name,v_old_slug FROM public.organizations o WHERE o.id=p_organization_id;
  UPDATE public.organizations o SET name=v_name,slug=v_slug,updated_at=pg_catalog.clock_timestamp()
   WHERE o.id=p_organization_id;
  RETURN QUERY SELECT o.id,o.name,o.slug,o.is_active FROM public.organizations o WHERE o.id=p_organization_id;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES(p_organization_id,p_actor_user_id,'organization.renamed','organization',p_organization_id::text,
    pg_catalog.jsonb_build_object('old_name',v_old_name,'old_slug',v_old_slug,'new_name',v_name,'new_slug',v_slug));
END;
$rename_organization$;
ALTER FUNCTION public.rename_organization(uuid,uuid,text,text) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.invite_organization_member(
 p_organization_id uuid,p_actor_user_id uuid,p_email text,p_role text,p_note text
) RETURNS TABLE(invitation_id uuid,user_id uuid,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $invite_organization_member$
DECLARE v_email text; v_user public.app_users%ROWTYPE; v_member public.organization_members%ROWTYPE; v_inv uuid;
BEGIN
  PERFORM 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id
     AND m.role='owner' AND m.is_active AND u.is_active FOR UPDATE OF m,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_MANAGEMENT_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF p_role IS NULL OR p_role NOT IN ('admin','cashier','inventory') THEN RAISE EXCEPTION 'ORGANIZATION_INVITATION_ROLE_INVALID' USING ERRCODE='22023'; END IF;
  v_email:=lower(btrim(p_email));
  IF p_email IS NULL OR length(v_email) NOT BETWEEN 3 AND 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR v_email ~ '[[:cntrl:]]' OR (p_note IS NOT NULL AND (length(p_note)>500 OR p_note ~ '[[:cntrl:]]')) THEN
    RAISE EXCEPTION 'ORGANIZATION_INVITATION_EMAIL_INVALID' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.auth_allowlist(email,is_active,added_by,note)
  VALUES(v_email,true,p_actor_user_id::text,p_note)
  ON CONFLICT (lower(email)) DO UPDATE SET is_active=true,updated_at=pg_catalog.clock_timestamp();
  SELECT * INTO v_user FROM public.app_users u WHERE lower(u.email)=v_email FOR UPDATE;
  IF FOUND THEN
    IF v_user.google_sub IS NULL THEN RAISE EXCEPTION 'INVITED_USER_REQUIRES_GOOGLE_LINK' USING ERRCODE='23514'; END IF;
    IF NOT v_user.is_active THEN RAISE EXCEPTION 'INVITED_USER_INACTIVE' USING ERRCODE='42501'; END IF;
    SELECT * INTO v_member FROM public.organization_members m
     WHERE m.organization_id=p_organization_id AND m.user_id=v_user.id FOR UPDATE;
    IF FOUND THEN
      IF v_member.role='owner' THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_ROLE_IMMUTABLE' USING ERRCODE='42501'; END IF;
      IF v_member.is_active THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_ALREADY_ACTIVE' USING ERRCODE='23505'; END IF;
      UPDATE public.organization_members SET role=p_role,is_active=true,updated_at=pg_catalog.clock_timestamp()
       WHERE organization_id=p_organization_id AND user_id=v_user.id;
      INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
      VALUES(p_organization_id,p_actor_user_id,'organization_member.reactivated','organization_member',v_user.id::text,
        pg_catalog.jsonb_build_object('email',v_email,'role',p_role));
    ELSE
      INSERT INTO public.organization_members(organization_id,user_id,role,is_active)
      VALUES(p_organization_id,v_user.id,p_role,true);
      INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
      VALUES(p_organization_id,p_actor_user_id,'organization_member.added','organization_member',v_user.id::text,
        pg_catalog.jsonb_build_object('email',v_email,'role',p_role));
    END IF;
    RETURN QUERY SELECT NULL::uuid,v_user.id,'accepted'::text;
  ELSE
    INSERT INTO public.organization_invitations(organization_id,email,role,note,invited_by_user_id)
    VALUES(p_organization_id,v_email,p_role,p_note,p_actor_user_id) RETURNING id INTO v_inv;
    INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
    VALUES(p_organization_id,p_actor_user_id,'organization_invitation.created','organization_invitation',v_inv::text,
      pg_catalog.jsonb_build_object('email',v_email,'role',p_role,'note',p_note));
    RETURN QUERY SELECT v_inv,NULL::uuid,'pending'::text;
  END IF;
END;
$invite_organization_member$;
ALTER FUNCTION public.invite_organization_member(uuid,uuid,text,text,text) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.set_organization_member_access(
 p_organization_id uuid,p_actor_user_id uuid,p_target_user_id uuid,p_role text,p_is_active boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $set_organization_member_access$
DECLARE v_email text; v_old_role text; v_old_active boolean;
BEGIN
  PERFORM 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id
     AND m.role='owner' AND m.is_active AND u.is_active FOR UPDATE OF m,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_MANAGEMENT_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF p_role NOT IN ('admin','cashier','inventory') THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_ROLE_INVALID' USING ERRCODE='22023'; END IF;
  IF p_target_user_id=p_actor_user_id THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_SELF_MODIFICATION_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT u.email,m.role,m.is_active INTO v_email,v_old_role,v_old_active
    FROM public.app_users u JOIN public.organization_members m ON m.user_id=u.id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_target_user_id FOR UPDATE OF u,m;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_old_role='owner' THEN RAISE EXCEPTION 'ORGANIZATION_OWNER_ROLE_IMMUTABLE' USING ERRCODE='42501'; END IF;
  IF (NOT p_is_active OR (v_old_role='cashier' AND p_role<>'cashier')) AND EXISTS(
    SELECT 1 FROM public.register_shifts s WHERE s.organization_id=p_organization_id
     AND s.cashier_user_id=p_target_user_id AND s.closed_at IS NULL
  ) THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_HAS_OPEN_REGISTER_SHIFT' USING ERRCODE='23514'; END IF;
  UPDATE public.organization_members SET role=p_role,is_active=p_is_active,updated_at=pg_catalog.clock_timestamp()
   WHERE organization_id=p_organization_id AND user_id=p_target_user_id;
  IF NOT p_is_active THEN
    UPDATE public.branch_memberships SET is_active=false,updated_at=pg_catalog.clock_timestamp()
     WHERE organization_id=p_organization_id AND user_id=p_target_user_id AND is_active;
    IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=p_target_user_id AND m.is_active) THEN
      UPDATE public.auth_sessions SET revoked_at=pg_catalog.clock_timestamp()
       WHERE user_id=p_target_user_id AND revoked_at IS NULL;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=p_target_user_id AND m.is_active)
       AND NOT EXISTS(SELECT 1 FROM public.organization_invitations i
         WHERE lower(i.email)=lower(v_email) AND i.status='pending' AND i.organization_id<>p_organization_id) THEN
      UPDATE public.auth_allowlist SET is_active=false,updated_at=pg_catalog.clock_timestamp()
       WHERE lower(email)=lower(v_target.email);
    END IF;
  ELSE
    UPDATE public.auth_allowlist SET is_active=true,updated_at=pg_catalog.clock_timestamp()
     WHERE lower(email)=lower(v_target.email);
  END IF;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES(p_organization_id,p_actor_user_id,'organization_member.access_updated','organization_member',p_target_user_id::text,
    pg_catalog.jsonb_build_object('old_role',v_old_role,'new_role',p_role,'old_active',v_old_active,'new_active',p_is_active));
END;
$set_organization_member_access$;
ALTER FUNCTION public.set_organization_member_access(uuid,uuid,uuid,text,boolean) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(
 p_organization_id uuid,p_actor_user_id uuid,p_invitation_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $revoke_organization_invitation$
DECLARE v_inv public.organization_invitations%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id
     AND m.role='owner' AND m.is_active AND u.is_active FOR UPDATE OF m,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_INVITATION_MANAGEMENT_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_inv FROM public.organization_invitations i
   WHERE i.id=p_invitation_id AND i.organization_id=p_organization_id AND i.status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORGANIZATION_INVITATION_NOT_PENDING' USING ERRCODE='P0002'; END IF;
  UPDATE public.organization_invitations SET status='revoked',revoked_at=pg_catalog.clock_timestamp(),
    revoked_by_user_id=p_actor_user_id,updated_at=pg_catalog.clock_timestamp() WHERE id=p_invitation_id;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
      WHERE lower(u.email)=v_inv.email AND m.is_active)
     AND NOT EXISTS(SELECT 1 FROM public.organization_invitations i
      WHERE lower(i.email)=v_inv.email AND i.status='pending' AND i.id<>p_invitation_id
        AND i.organization_id<>p_organization_id) THEN
    UPDATE public.auth_allowlist SET is_active=false,updated_at=pg_catalog.clock_timestamp()
     WHERE lower(email)=v_inv.email;
  END IF;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES(p_organization_id,p_actor_user_id,'organization_invitation.revoked','organization_invitation',p_invitation_id::text,
    pg_catalog.jsonb_build_object('email',v_inv.email,'role',v_inv.role));
END;
$revoke_organization_invitation$;
ALTER FUNCTION public.revoke_organization_invitation(uuid,uuid,uuid) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.consume_google_login_invitation(
 p_email text,p_google_sub text,p_display_name text
) RETURNS TABLE(user_id uuid,organization_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $consume_google_login_invitation$
DECLARE v_email text; v_user uuid; v_inv record;
BEGIN
  v_email:=lower(btrim(p_email));
  IF p_email IS NULL OR length(v_email) NOT BETWEEN 3 AND 320 OR v_email ~ '[[:cntrl:]]'
     OR p_google_sub IS NULL OR length(p_google_sub) NOT BETWEEN 1 AND 255
     OR p_display_name IS NULL OR length(btrim(p_display_name)) NOT BETWEEN 1 AND 320
     OR p_display_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'GOOGLE_INVITATION_INPUT_INVALID' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.auth_allowlist a WHERE lower(a.email)=v_email AND a.is_active FOR SHARE;
  IF NOT FOUND THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.app_users u WHERE lower(u.email)=v_email) THEN RETURN; END IF;
  PERFORM 1 FROM public.organization_invitations i JOIN public.organizations o ON o.id=i.organization_id
   WHERE i.email=v_email AND i.status='pending' AND o.is_active
   ORDER BY i.organization_id,i.id FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.app_users(email,display_name,google_sub,email_verified_at)
  VALUES(v_email,btrim(p_display_name),p_google_sub,pg_catalog.clock_timestamp()) RETURNING id INTO v_user;
  FOR v_inv IN SELECT i.id,i.organization_id,i.role FROM public.organization_invitations i
    JOIN public.organizations o ON o.id=i.organization_id
   WHERE i.email=v_email AND i.status='pending' AND o.is_active
   ORDER BY i.organization_id,i.id LOOP
    INSERT INTO public.organization_members(organization_id,user_id,role,is_active)
    VALUES(v_inv.organization_id,v_user,v_inv.role,true);
    UPDATE public.organization_invitations SET status='accepted',accepted_user_id=v_user,
      accepted_at=pg_catalog.clock_timestamp(),updated_at=pg_catalog.clock_timestamp()
     WHERE id=v_inv.id;
    INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
    SELECT v_inv.organization_id,v_user,'organization_invitation.accepted',
      'organization_invitation',v_inv.id::text,
      pg_catalog.jsonb_build_object('email',v_email,'user_id',v_user,'role',v_inv.role)
      FROM public.organization_invitations i WHERE i.id=v_inv.id;
    user_id:=v_user; organization_id:=v_inv.organization_id; RETURN NEXT;
  END LOOP;
END;
$consume_google_login_invitation$;
ALTER FUNCTION public.consume_google_login_invitation(text,text,text) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.force_close_register_shift(
 p_organization_id uuid,p_branch_id uuid,p_shift_id uuid,p_actor_user_id uuid,
 p_closing_cash_usd numeric,p_closing_cash_ves numeric,p_reason text
) RETURNS TABLE(id uuid,organization_id uuid,branch_id uuid,register_id uuid,cashier_user_id uuid,
 opened_at timestamptz,opening_cash_usd numeric,opening_cash_ves numeric,closed_at timestamptz,
 closing_cash_usd numeric,closing_cash_ves numeric,closed_by_user_id uuid,force_closed boolean,force_close_reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $force_close_register_shift$
DECLARE v_shift public.register_shifts%ROWTYPE; v_reason text;
BEGIN
  v_reason:=btrim(p_reason);
  IF p_closing_cash_usd IS NULL OR p_closing_cash_usd<0 OR p_closing_cash_ves IS NULL OR p_closing_cash_ves<0
     OR p_reason IS NULL OR length(v_reason) NOT BETWEEN 3 AND 300 OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'REGISTER_SHIFT_FORCE_CLOSE_INPUT_INVALID' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
   WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_user_id
     AND m.role IN ('owner','admin') AND m.is_active AND u.is_active FOR UPDATE OF m,u;
  IF NOT FOUND THEN RAISE EXCEPTION 'REGISTER_SHIFT_FORCE_CLOSE_FORBIDDEN' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.branches b WHERE b.organization_id=p_organization_id
    AND b.id=p_branch_id AND b.is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REGISTER_SHIFT_BRANCH_NOT_ACTIVE' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_shift FROM public.register_shifts s
   WHERE s.organization_id=p_organization_id AND s.branch_id=p_branch_id
     AND s.id=p_shift_id AND s.closed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REGISTER_SHIFT_NOT_OPEN' USING ERRCODE='P0002'; END IF;
  UPDATE public.register_shifts s SET closing_cash_usd=p_closing_cash_usd,
    closing_cash_ves=p_closing_cash_ves,closed_by_user_id=p_actor_user_id,
    closed_at=pg_catalog.clock_timestamp(),force_closed=true,force_close_reason=v_reason
   WHERE s.id=p_shift_id
   RETURNING s.id,s.organization_id,s.branch_id,s.register_id,s.cashier_user_id,s.opened_at,
     s.opening_cash_usd,s.opening_cash_ves,s.closed_at,s.closing_cash_usd,s.closing_cash_ves,
     s.closed_by_user_id,s.force_closed,s.force_close_reason
   INTO id,organization_id,branch_id,register_id,cashier_user_id,opened_at,
     opening_cash_usd,opening_cash_ves,closed_at,closing_cash_usd,closing_cash_ves,
     closed_by_user_id,force_closed,force_close_reason;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  VALUES(p_organization_id,p_actor_user_id,'register_shift.force_closed','register_shift',p_shift_id::text,
    pg_catalog.jsonb_build_object('cashier_user_id',v_shift.cashier_user_id,'reason',v_reason,
      'closing_cash_usd',p_closing_cash_usd,'closing_cash_ves',p_closing_cash_ves));
  RETURN NEXT;
END;
$force_close_register_shift$;
ALTER FUNCTION public.force_close_register_shift(uuid,uuid,uuid,uuid,numeric,numeric,text) OWNER TO microapp_migrator;


CREATE OR REPLACE FUNCTION public.consume_auth_bootstrap(
 p_handle_hash text,p_state_hash text,p_email text,p_google_sub text,p_display_name text
) RETURNS TABLE(status text,user_id uuid,organization_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $consume_auth_bootstrap$
DECLARE
 v_email text; v_handoff record; v_user uuid; v_org uuid; v_consumed timestamptz;
BEGIN
 v_email:=lower(btrim(p_email));
 IF p_handle_hash IS NULL OR p_handle_hash !~ '^[a-f0-9]{64}$'
    OR p_state_hash IS NULL OR p_state_hash !~ '^[a-f0-9]{64}$'
    OR p_email IS NULL OR length(v_email) NOT BETWEEN 3 AND 320 OR v_email ~ '[[:cntrl:]]'
    OR p_google_sub IS NULL OR length(p_google_sub) NOT BETWEEN 1 AND 255
    OR p_display_name IS NULL OR length(btrim(p_display_name)) NOT BETWEEN 1 AND 320
    OR p_display_name ~ '[[:cntrl:]]' THEN
   RAISE EXCEPTION 'AUTH_BOOTSTRAP_INPUT_INVALID' USING ERRCODE='22023';
 END IF;
 PERFORM 1 FROM public.auth_allowlist a WHERE lower(a.email)=v_email AND a.is_active FOR SHARE;
 IF NOT FOUND THEN RETURN QUERY SELECT 'not_allowlisted'::text,NULL::uuid,NULL::uuid; RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.app_users u WHERE lower(u.email)=v_email) THEN
   RETURN QUERY SELECT 'account_exists'::text,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT a.organization_name,a.organization_slug INTO v_handoff
   FROM public.auth_bootstrap_attempts a
  WHERE a.handle_hash=p_handle_hash AND a.state_hash=p_state_hash
    AND a.expires_at>pg_catalog.clock_timestamp() AND a.consumed_at IS NULL
  FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT 'not_provisioned'::text,NULL::uuid,NULL::uuid; RETURN; END IF;
 UPDATE public.auth_bootstrap_attempts SET consumed_at=pg_catalog.clock_timestamp()
  WHERE handle_hash=p_handle_hash;
 SELECT b.consumed_at INTO v_consumed FROM public.auth_bootstrap b WHERE b.id=true FOR UPDATE;
 IF NOT FOUND OR v_consumed IS NOT NULL THEN
   RETURN QUERY SELECT 'bootstrap_consumed'::text,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 INSERT INTO public.organizations(name,slug)
 VALUES(v_handoff.organization_name,v_handoff.organization_slug) RETURNING id INTO v_org;
 INSERT INTO public.app_users(email,display_name,google_sub,email_verified_at)
 VALUES(v_email,btrim(p_display_name),p_google_sub,pg_catalog.clock_timestamp()) RETURNING id INTO v_user;
 INSERT INTO public.organization_members(organization_id,user_id,role,is_active)
 VALUES(v_org,v_user,'owner',true);
 UPDATE public.auth_bootstrap SET consumed_at=pg_catalog.clock_timestamp(),
   consumed_by_email=v_email,created_organization_id=v_org WHERE id=true;
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
 VALUES(v_org,v_user,'organization.created','organization',v_org::text,
   pg_catalog.jsonb_build_object('created_by_bootstrap',true,'owner_email',v_email));
 RETURN QUERY SELECT 'created'::text,v_user,v_org;
END;
$consume_auth_bootstrap$;
ALTER FUNCTION public.consume_auth_bootstrap(text,text,text,text,text) OWNER TO microapp_migrator;

CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_sessions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $cleanup_expired_auth_sessions$
DECLARE v_deleted integer;
BEGIN
  WITH expired AS (
    SELECT s.ctid FROM public.auth_sessions s
     WHERE s.expires_at < pg_catalog.clock_timestamp()-interval '48 hours'
        OR s.revoked_at < pg_catalog.clock_timestamp()-interval '48 hours'
     ORDER BY COALESCE(s.revoked_at,s.expires_at),s.id
     LIMIT 500 FOR UPDATE SKIP LOCKED
  ), deleted AS (
    DELETE FROM public.auth_sessions s USING expired e WHERE s.ctid=e.ctid RETURNING 1
  ) SELECT count(*)::integer INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$cleanup_expired_auth_sessions$;
ALTER FUNCTION public.cleanup_expired_auth_sessions() OWNER TO microapp_migrator;

-- Remove runtime table writes that have moved behind the narrow definer APIs.
REVOKE INSERT,UPDATE,DELETE ON TABLE public.organizations FROM microapp_runtime;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.organization_members FROM microapp_runtime;
GRANT INSERT (organization_id,user_id,role) ON TABLE public.organization_members TO microapp_runtime;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.auth_allowlist FROM microapp_runtime;
REVOKE INSERT ON TABLE public.app_users FROM microapp_runtime;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.register_shifts FROM microapp_runtime;
REVOKE DELETE ON TABLE public.auth_sessions FROM microapp_runtime;

REVOKE ALL ON FUNCTION public.rename_organization(uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_organization_member(uuid,uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_organization_member_access(uuid,uuid,uuid,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_organization_invitation(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_google_login_invitation(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.force_close_register_shift(uuid,uuid,uuid,uuid,numeric,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_auth_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_auth_bootstrap(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_organization(uuid,uuid,text,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(uuid,uuid,text,text,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.set_organization_member_access(uuid,uuid,uuid,text,boolean) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(uuid,uuid,uuid) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.consume_google_login_invitation(text,text,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.force_close_register_shift(uuid,uuid,uuid,uuid,numeric,numeric,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.consume_auth_bootstrap(text,text,text,text,text) TO microapp_runtime;

COMMIT;
