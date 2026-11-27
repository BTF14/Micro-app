-- Platform administration and tenant provisioning. Migration 0032 remains immutable.
BEGIN;
CREATE TABLE public.platform_admins (
 user_id uuid PRIMARY KEY REFERENCES public.app_users(id) ON DELETE RESTRICT,
 is_active boolean NOT NULL DEFAULT true,
 note text,
 granted_by_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (note IS NULL OR (length(note)<=500 AND note !~ '[[:cntrl:]]'))
);
REVOKE ALL ON TABLE public.platform_admins FROM PUBLIC,microapp_runtime;
GRANT SELECT ON TABLE public.platform_admins TO microapp_runtime;
CREATE TABLE public.platform_audit_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK(length(btrim(action))>0 AND action !~ '[[:cntrl:]]'),
 target_organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
 target_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_audit_logs_created_idx ON public.platform_audit_logs(created_at DESC,id DESC);
REVOKE ALL ON TABLE public.platform_audit_logs FROM PUBLIC,microapp_runtime;
GRANT SELECT ON TABLE public.platform_audit_logs TO microapp_runtime;
REVOKE ALL ON SEQUENCE public.platform_audit_logs_id_seq FROM PUBLIC,microapp_runtime;
ALTER TABLE public.organization_invitations DROP CONSTRAINT organization_invitations_role_check;
ALTER TABLE public.organization_invitations ADD CONSTRAINT organization_invitations_role_check CHECK(role IN ('owner','admin','cashier','inventory'));
INSERT INTO public.platform_admins(user_id,is_active,note,granted_by_user_id)
SELECT u.id,true,'Initial bootstrap platform admin',u.id
FROM public.auth_bootstrap b JOIN public.app_users u ON lower(u.email)=lower(b.consumed_by_email)
WHERE b.id=true AND b.consumed_at IS NOT NULL AND u.is_active AND u.google_sub IS NOT NULL
ON CONFLICT ON CONSTRAINT platform_admins_pkey DO NOTHING;
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
  IF p_role IS NULL OR p_role NOT IN ('admin','cashier','inventory') THEN RAISE EXCEPTION 'ORGANIZATION_MEMBER_ROLE_INVALID' USING ERRCODE='22023'; END IF;
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
    IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=p_target_user_id AND m.is_active) AND NOT EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=p_target_user_id AND pa.is_active) THEN
      UPDATE public.auth_sessions SET revoked_at=pg_catalog.clock_timestamp()
       WHERE user_id=p_target_user_id AND revoked_at IS NULL;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=p_target_user_id AND m.is_active)
       AND NOT EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=p_target_user_id AND pa.is_active)
       AND NOT EXISTS(SELECT 1 FROM public.organization_invitations i
         WHERE lower(i.email)=lower(v_email) AND i.status='pending' AND i.organization_id<>p_organization_id) THEN
      UPDATE public.auth_allowlist SET is_active=false,updated_at=pg_catalog.clock_timestamp()
       WHERE lower(email)=lower(v_email);
    END IF;
  ELSE
    UPDATE public.auth_allowlist SET is_active=true,updated_at=pg_catalog.clock_timestamp()
     WHERE lower(email)=lower(v_email);
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
  IF NOT EXISTS(SELECT 1 FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id WHERE lower(u.email)=v_inv.email AND m.is_active)
     AND NOT EXISTS(SELECT 1 FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id WHERE lower(u.email)=v_inv.email AND pa.is_active AND u.is_active)
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
CREATE OR REPLACE FUNCTION public.consume_auth_bootstrap(
 p_handle_hash text,p_state_hash text,p_email text,p_google_sub text,p_display_name text
) RETURNS TABLE(status text,user_id uuid,organization_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $consume_auth_bootstrap$
#variable_conflict use_column
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
 INSERT INTO public.platform_admins(user_id,is_active,note,granted_by_user_id) VALUES(v_user,true,'Initial bootstrap platform admin',v_user) ON CONFLICT ON CONSTRAINT platform_admins_pkey DO NOTHING;
 UPDATE public.auth_bootstrap SET consumed_at=pg_catalog.clock_timestamp(),
   consumed_by_email=v_email,created_organization_id=v_org WHERE id=true;
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
 VALUES(v_org,v_user,'organization.created','organization',v_org::text,
   pg_catalog.jsonb_build_object('created_by_bootstrap',true,'owner_email',v_email));
 RETURN QUERY SELECT 'created'::text,v_user,v_org;
END;
$consume_auth_bootstrap$;
ALTER FUNCTION public.consume_auth_bootstrap(text,text,text,text,text) OWNER TO microapp_migrator;
CREATE OR REPLACE FUNCTION public.platform_create_organization(p_actor_user_id uuid,p_name text,p_slug text,p_owner_email text,p_note text DEFAULT NULL)
RETURNS TABLE(id uuid,name text,slug text,is_active boolean,owner_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $f$
#variable_conflict use_column
DECLARE v_name text:=btrim(p_name);v_slug text:=lower(btrim(p_slug));v_email text:=lower(btrim(p_owner_email));v_org uuid;v_owner public.app_users%ROWTYPE;
BEGIN
 PERFORM 1 FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id WHERE pa.user_id=p_actor_user_id AND pa.is_active AND u.is_active AND u.google_sub IS NOT NULL FOR UPDATE OF pa,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'PLATFORM_ADMIN_FORBIDDEN' USING ERRCODE='42501';END IF;
 IF p_name IS NULL OR length(v_name) NOT BETWEEN 2 AND 120 OR v_name~'[[:cntrl:]]' OR p_slug IS NULL OR length(v_slug) NOT BETWEEN 1 AND 80 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR p_owner_email IS NULL OR length(v_email) NOT BETWEEN 3 AND 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR (p_note IS NOT NULL AND length(p_note)>500) THEN RAISE EXCEPTION 'PLATFORM_ORGANIZATION_INPUT_INVALID' USING ERRCODE='22023';END IF;
 SELECT * INTO v_owner FROM public.app_users u WHERE lower(u.email)=v_email FOR UPDATE;
 IF FOUND AND (NOT v_owner.is_active OR v_owner.google_sub IS NULL) THEN RAISE EXCEPTION 'PLATFORM_OWNER_ACCOUNT_NOT_ELIGIBLE' USING ERRCODE='23514';END IF;
 INSERT INTO public.organizations(name,slug) VALUES(v_name,v_slug) RETURNING organizations.id INTO v_org;
 INSERT INTO public.auth_allowlist(email,is_active,added_by,note) VALUES(v_email,true,p_actor_user_id::text,p_note) ON CONFLICT(lower(email)) DO UPDATE SET is_active=true,updated_at=pg_catalog.clock_timestamp();
 IF v_owner.id IS NOT NULL THEN
  INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES(v_org,v_owner.id,'owner',true);owner_status:='assigned';
 ELSE
  INSERT INTO public.organization_invitations(organization_id,email,role,note,invited_by_user_id) VALUES(v_org,v_email,'owner',p_note,p_actor_user_id);owner_status:='pending';
 END IF;
 INSERT INTO public.platform_audit_logs(actor_user_id,action,target_organization_id,target_user_id,metadata) VALUES(p_actor_user_id,'organization.created',v_org,v_owner.id,jsonb_build_object('name',v_name,'slug',v_slug,'owner_email',v_email,'owner_status',owner_status));
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES(v_org,NULL,'organization.created','organization',v_org::text,jsonb_build_object('platform_admin',true,'platform_actor_user_id',p_actor_user_id,'owner_email',v_email,'owner_status',owner_status));
 RETURN QUERY SELECT o.id,o.name,o.slug,o.is_active,owner_status FROM public.organizations o WHERE o.id=v_org;
END;$f$;
ALTER FUNCTION public.platform_create_organization(uuid,text,text,text,text) OWNER TO microapp_migrator;
CREATE OR REPLACE FUNCTION public.platform_set_organization_active(p_actor_user_id uuid,p_organization_id uuid,p_is_active boolean,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $f$
DECLARE v_old boolean;
BEGIN
 PERFORM 1 FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id WHERE pa.user_id=p_actor_user_id AND pa.is_active AND u.is_active AND u.google_sub IS NOT NULL FOR UPDATE OF pa,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'PLATFORM_ADMIN_FORBIDDEN' USING ERRCODE='42501';END IF;
 IF p_is_active IS NULL OR (p_reason IS NOT NULL AND length(p_reason)>500) THEN RAISE EXCEPTION 'PLATFORM_ORGANIZATION_INPUT_INVALID' USING ERRCODE='22023';END IF;
 SELECT is_active INTO v_old FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PLATFORM_ORGANIZATION_NOT_FOUND' USING ERRCODE='P0002';END IF;
 UPDATE public.organizations SET is_active=p_is_active,updated_at=pg_catalog.clock_timestamp() WHERE id=p_organization_id;
 INSERT INTO public.platform_audit_logs(actor_user_id,action,target_organization_id,metadata) VALUES(p_actor_user_id,CASE WHEN p_is_active THEN 'organization.activated' ELSE 'organization.suspended' END,p_organization_id,jsonb_build_object('old_is_active',v_old,'new_is_active',p_is_active,'reason',p_reason));
 INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES(p_organization_id,NULL,'organization.platform_status_updated','organization',p_organization_id::text,jsonb_build_object('platform_admin',true,'platform_actor_user_id',p_actor_user_id,'old_is_active',v_old,'new_is_active',p_is_active,'reason',p_reason));
END;$f$;
ALTER FUNCTION public.platform_set_organization_active(uuid,uuid,boolean,text) OWNER TO microapp_migrator;
CREATE OR REPLACE FUNCTION public.platform_set_admin_access(p_actor_user_id uuid,p_target_email text,p_is_active boolean,p_note text DEFAULT NULL)
RETURNS TABLE(user_id uuid,email text,is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $f$
#variable_conflict use_column
DECLARE v_email text:=lower(btrim(p_target_email));v_target public.app_users%ROWTYPE;v_old boolean;v_count integer;
BEGIN
 PERFORM 1 FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id WHERE pa.user_id=p_actor_user_id AND pa.is_active AND u.is_active AND u.google_sub IS NOT NULL FOR UPDATE OF pa,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'PLATFORM_ADMIN_FORBIDDEN' USING ERRCODE='42501';END IF;
 IF p_target_email IS NULL OR length(v_email) NOT BETWEEN 3 AND 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_is_active IS NULL OR (p_note IS NOT NULL AND length(p_note)>500) THEN RAISE EXCEPTION 'PLATFORM_ADMIN_INPUT_INVALID' USING ERRCODE='22023';END IF;
 SELECT * INTO v_target FROM public.app_users u WHERE lower(u.email)=v_email FOR UPDATE;
 IF NOT FOUND OR NOT v_target.is_active OR v_target.google_sub IS NULL THEN RAISE EXCEPTION 'PLATFORM_ADMIN_TARGET_NOT_ELIGIBLE' USING ERRCODE='23514';END IF;
 SELECT pa.is_active INTO v_old FROM public.platform_admins pa WHERE pa.user_id=v_target.id FOR UPDATE;
 IF NOT p_is_active AND v_target.id=p_actor_user_id THEN RAISE EXCEPTION 'PLATFORM_ADMIN_SELF_REVOKE_FORBIDDEN' USING ERRCODE='42501';END IF;
 IF NOT p_is_active AND COALESCE(v_old,false) THEN SELECT count(*) INTO v_count FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id WHERE pa.is_active AND u.is_active AND u.google_sub IS NOT NULL AND pa.user_id<>v_target.id;IF v_count=0 THEN RAISE EXCEPTION 'PLATFORM_ADMIN_LAST_ADMIN' USING ERRCODE='23514';END IF;END IF;
 INSERT INTO public.platform_admins(user_id,is_active,note,granted_by_user_id) VALUES(v_target.id,p_is_active,p_note,p_actor_user_id) ON CONFLICT ON CONSTRAINT platform_admins_pkey DO UPDATE SET is_active=EXCLUDED.is_active,note=EXCLUDED.note,updated_at=pg_catalog.clock_timestamp();
 IF NOT p_is_active AND NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=v_target.id AND m.is_active) AND NOT EXISTS(SELECT 1 FROM public.organization_invitations i WHERE lower(i.email)=v_email AND i.status='pending') THEN UPDATE public.auth_allowlist SET is_active=false,updated_at=pg_catalog.clock_timestamp() WHERE lower(email)=v_email;UPDATE public.auth_sessions SET revoked_at=pg_catalog.clock_timestamp() WHERE user_id=v_target.id AND revoked_at IS NULL;END IF;
 INSERT INTO public.platform_audit_logs(actor_user_id,action,target_user_id,metadata) VALUES(p_actor_user_id,CASE WHEN p_is_active THEN 'platform_admin.granted' ELSE 'platform_admin.revoked' END,v_target.id,jsonb_build_object('email',v_email,'old_is_active',COALESCE(v_old,false),'new_is_active',p_is_active,'note',p_note));
 RETURN QUERY SELECT v_target.id,v_target.email,p_is_active;
END;$f$;
ALTER FUNCTION public.platform_set_admin_access(uuid,text,boolean,text) OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.platform_create_organization(uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_set_organization_active(uuid,uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_set_admin_access(uuid,text,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_create_organization(uuid,text,text,text,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.platform_set_organization_active(uuid,uuid,boolean,text) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.platform_set_admin_access(uuid,text,boolean,text) TO microapp_runtime;
COMMIT;
