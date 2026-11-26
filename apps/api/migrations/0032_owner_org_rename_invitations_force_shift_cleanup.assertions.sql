-- Run after migration 0032 on disposable PostgreSQL 18. Transaction always rolls back.
BEGIN;
DO $owner_team_0032_assertions$
DECLARE
  fn record;
  expected text[] := ARRAY[
    'rename_organization(uuid,uuid,text,text)',
    'invite_organization_member(uuid,uuid,text,text,text)',
    'set_organization_member_access(uuid,uuid,uuid,text,boolean)',
    'revoke_organization_invitation(uuid,uuid,uuid)',
    'consume_google_login_invitation(text,text,text)',
    'force_close_register_shift(uuid,uuid,uuid,uuid,numeric,numeric,text)',
    'cleanup_expired_auth_sessions()',
    'consume_auth_bootstrap(text,text,text,text,text)'
  ];
  signature text;
  owner_name text;
  cfg text[];
  definer boolean;
BEGIN
  IF pg_catalog.to_regclass('public.organization_invitations') IS NULL THEN
    RAISE EXCEPTION '0032_INVITATIONS_TABLE_MISSING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
     WHERE schemaname='public' AND indexname='organization_invitations_pending_email_uq'
       AND indexdef ILIKE '%UNIQUE INDEX%' AND indexdef ILIKE '%WHERE (status = ''pending''::text)%'
  ) THEN
    RAISE EXCEPTION '0032_PENDING_INVITATION_UNIQUE_INDEX_MISSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.register_shifts'::regclass AND conname='register_shifts_force_close_state_check')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.register_shifts'::regclass AND conname='register_shifts_close_state_check')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_constraint c WHERE c.conrelid='public.register_shifts'::regclass AND c.contype='c' AND pg_catalog.pg_get_constraintdef(c.oid) LIKE '%closed_by_user_id = cashier_user_id%')
  THEN RAISE EXCEPTION '0032_FORCE_CLOSE_CONSTRAINT_MISSING_OR_LEGACY_CHECK_REMAINS'; END IF;

  FOREACH signature IN ARRAY expected LOOP
    SELECT p.proowner,p.proconfig,p.prosecdef INTO fn
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.oid=pg_catalog.to_regprocedure('public.'||signature);
    IF fn.proowner IS NULL THEN RAISE EXCEPTION '0032_FUNCTION_MISSING: %',signature; END IF;
    owner_name:=pg_catalog.pg_get_userbyid(fn.proowner);
    cfg:=fn.proconfig; definer:=fn.prosecdef;
    IF owner_name<>'microapp_migrator' OR NOT definer
       OR NOT (cfg @> ARRAY['search_path=pg_catalog, public']) THEN
      RAISE EXCEPTION '0032_FUNCTION_SECURITY_CONTRACT_INVALID: %',signature;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
        (SELECT p.proacl FROM pg_catalog.pg_proc p
          WHERE p.oid=pg_catalog.to_regprocedure('public.'||signature)),
        pg_catalog.acldefault('f',fn.proowner)
      )) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    ) OR NOT pg_catalog.has_function_privilege('microapp_runtime',pg_catalog.to_regprocedure('public.'||signature),'EXECUTE') THEN
      RAISE EXCEPTION '0032_FUNCTION_ACL_INVALID: %',signature;
    END IF;
  END LOOP;

  IF pg_catalog.has_table_privilege('microapp_runtime','public.organizations','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organizations','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organizations','DELETE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_members','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_members','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_members','DELETE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.auth_allowlist','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.auth_allowlist','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.auth_allowlist','DELETE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.register_shifts','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.register_shifts','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.register_shifts','DELETE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.auth_sessions','DELETE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.app_users','INSERT') THEN
    RAISE EXCEPTION '0032_RUNTIME_DIRECT_DML_PRIVILEGE_PRESENT';
  END IF;
  IF NOT pg_catalog.has_column_privilege('microapp_runtime','public.organization_members','organization_id','INSERT')
     OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.organization_members','user_id','INSERT')
     OR NOT pg_catalog.has_column_privilege('microapp_runtime','public.organization_members','role','INSERT')
     OR pg_catalog.has_column_privilege('microapp_runtime','public.organization_members','is_active','INSERT')
     OR pg_catalog.has_column_privilege('microapp_runtime','public.organization_members','updated_at','INSERT') THEN
    RAISE EXCEPTION '0032_BOOTSTRAP_ONLY_MEMBER_INSERT_COLUMNS_INVALID';
  END IF;
  IF NOT pg_catalog.has_table_privilege('microapp_runtime','public.organization_invitations','SELECT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_invitations','INSERT')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_invitations','UPDATE')
     OR pg_catalog.has_table_privilege('microapp_runtime','public.organization_invitations','DELETE') THEN
    RAISE EXCEPTION '0032_INVITATION_TABLE_ACL_INVALID';
  END IF;
  IF pg_catalog.has_column_privilege('microapp_runtime','public.auth_sessions','revoked_at','UPDATE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION '0032_SESSION_REVOCATION_COLUMN_GRANT_MISSING';
  END IF;
  IF pg_catalog.pg_get_functiondef('public.guard_register_shift_lifecycle()'::regprocedure) NOT ILIKE '%REGISTER_SHIFT_FORCE_CLOSE_REQUIRES_OWNER_OR_ADMIN%'
     OR pg_catalog.pg_get_functiondef('public.guard_register_shift_lifecycle()'::regprocedure) NOT ILIKE '%REGISTER_SHIFT_CLOSE_MUST_BE_BY_CASHIER%' THEN
    RAISE EXCEPTION '0032_REGISTER_SHIFT_GUARD_CONTRACT_INVALID';
  END IF;
  IF pg_catalog.pg_get_functiondef('public.cleanup_expired_auth_sessions()'::regprocedure) NOT ILIKE '%LIMIT 500%'
     OR pg_catalog.pg_get_functiondef('public.cleanup_expired_auth_sessions()'::regprocedure) NOT ILIKE '%SKIP LOCKED%'
     OR pg_catalog.pg_get_functiondef('public.cleanup_expired_auth_sessions()'::regprocedure) NOT ILIKE '%48 hours%' THEN
    RAISE EXCEPTION '0032_SESSION_CLEANUP_BOUND_INVALID';
  END IF;
END;
$owner_team_0032_assertions$;

DO $owner_team_0032_integration$
DECLARE
  org1 uuid; org2 uuid; owner1 uuid; owner2 uuid; admin1 uuid;
  cashier1 uuid; cashier2 uuid; cashier3 uuid; unlinked uuid; invited uuid;
  branch1 uuid; reg1 uuid; reg2 uuid; reg3 uuid;
  shift1 uuid; shift2 uuid; shift3 uuid; invitation1 uuid; invitation2 uuid;
  bootstrap_user uuid; bootstrap_org uuid; result_status text;
  failed boolean; deleted_count integer; token_a text:=repeat('a',64);
  token_b text:=repeat('b',64); token_c text:=repeat('c',64);
BEGIN
  INSERT INTO public.organizations(name,slug) VALUES('0032 Test Store','test-store-0032') RETURNING id INTO org1;
  INSERT INTO public.organizations(name,slug) VALUES('0032 Other Store','other-store-0032') RETURNING id INTO org2;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('owner1-0032@example.test','Owner One','google-owner1-0032') RETURNING id INTO owner1;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('owner2-0032@example.test','Owner Two','google-owner2-0032') RETURNING id INTO owner2;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('admin-0032@example.test','Admin One','google-admin-0032') RETURNING id INTO admin1;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('cashier1-0032@example.test','Cashier One','google-cashier1-0032') RETURNING id INTO cashier1;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('cashier2-0032@example.test','Cashier Two','google-cashier2-0032') RETURNING id INTO cashier2;
  INSERT INTO public.app_users(email,display_name,google_sub) VALUES
    ('cashier3-0032@example.test','Cashier Three','google-cashier3-0032') RETURNING id INTO cashier3;
  INSERT INTO public.app_users(email,display_name) VALUES
    ('legacy-0032@example.test','Legacy Unlinked') RETURNING id INTO unlinked;
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES
    (org1,owner1,'owner'),(org2,owner2,'owner'),(org1,admin1,'admin'),
    (org1,cashier1,'cashier'),(org1,cashier2,'cashier'),(org1,cashier3,'cashier');

  -- Owner rename is atomic and audited; admin cannot rename.
  PERFORM * FROM public.rename_organization(org1,owner1,'Renamed Test Store','renamed-test-store-0032');
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE organization_id=org1 AND action='organization.renamed'
    AND metadata->>'old_name'='0032 Test Store' AND metadata->>'new_name'='Renamed Test Store') THEN
    RAISE EXCEPTION '0032_RENAME_AUDIT_MISSING';
  END IF;
  failed:=false;
  BEGIN PERFORM * FROM public.rename_organization(org1,admin1,'Forbidden','forbidden-0032');
  EXCEPTION WHEN SQLSTATE '42501' THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION '0032_ADMIN_RENAME_WAS_ALLOWED'; END IF;

  -- NULL member roles must fail with SQLSTATE 22023.
  failed:=false;
  BEGIN PERFORM public.set_organization_member_access(org1,owner1,cashier1,NULL,true);
  EXCEPTION WHEN SQLSTATE '22023' THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION '0032_NULL_MEMBER_ROLE_WAS_NOT_REJECTED'; END IF;

  -- D7: an existing account without google_sub is never linked or invited.
  failed:=false;
  BEGIN PERFORM * FROM public.invite_organization_member(org1,owner1,'legacy-0032@example.test','cashier',NULL);
  EXCEPTION WHEN SQLSTATE '23514' THEN failed:=true; END;
  IF NOT failed OR (SELECT google_sub FROM public.app_users WHERE id=unlinked) IS NOT NULL THEN
    RAISE EXCEPTION '0032_D7_EXISTING_UNLINKED_ACCOUNT_WAS_LINKED';
  END IF;

  -- Pending invitation is unique per organization/email and can be consumed
  -- only after a verified Google identity reaches the definer RPC.
  SELECT invitation_id INTO invitation1
    FROM public.invite_organization_member(org1,owner1,'invited-0032@example.test','cashier','first invite');
  failed:=false;
  BEGIN PERFORM * FROM public.invite_organization_member(org1,owner1,'INVITED-0032@example.test','admin',NULL);
  EXCEPTION WHEN SQLSTATE '23505' THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION '0032_DUPLICATE_PENDING_INVITATION_WAS_ALLOWED'; END IF;
  SELECT user_id INTO invited FROM public.consume_google_login_invitation(
    'invited-0032@example.test','google-invited-0032','Invited User');
  IF invited IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members
    WHERE organization_id=org1 AND user_id=invited AND role='cashier' AND is_active) THEN
    RAISE EXCEPTION '0032_GOOGLE_INVITATION_CONSUMPTION_FAILED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organization_invitations WHERE id=invitation1
    AND status='accepted' AND accepted_user_id=invited AND accepted_at IS NOT NULL) THEN
    RAISE EXCEPTION '0032_INVITATION_ACCEPTANCE_NOT_PERSISTED';
  END IF;

  -- Prepare three cashier shifts; owner/admin can force close, cashier cannot.
  INSERT INTO public.branches(organization_id,name,slug) VALUES(org1,'0032 Branch','branch-0032') RETURNING id INTO branch1;
  INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES
    (org1,branch1,cashier1),(org1,branch1,cashier2),(org1,branch1,cashier3);
  INSERT INTO public.registers(organization_id,branch_id,name,code) VALUES
    (org1,branch1,'Register One','reg-one-0032') RETURNING id INTO reg1;
  INSERT INTO public.registers(organization_id,branch_id,name,code) VALUES
    (org1,branch1,'Register Two','reg-two-0032') RETURNING id INTO reg2;
  INSERT INTO public.registers(organization_id,branch_id,name,code) VALUES
    (org1,branch1,'Register Three','reg-three-0032') RETURNING id INTO reg3;
  INSERT INTO public.register_shifts(organization_id,branch_id,register_id,cashier_user_id)
    VALUES(org1,branch1,reg1,cashier1) RETURNING id INTO shift1;
  INSERT INTO public.register_shifts(organization_id,branch_id,register_id,cashier_user_id)
    VALUES(org1,branch1,reg2,cashier2) RETURNING id INTO shift2;
  INSERT INTO public.register_shifts(organization_id,branch_id,register_id,cashier_user_id)
    VALUES(org1,branch1,reg3,cashier3) RETURNING id INTO shift3;

  failed:=false;
  BEGIN PERFORM public.set_organization_member_access(org1,owner1,cashier3,'inventory',false);
  EXCEPTION WHEN SQLSTATE '23514' THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION '0032_OPEN_SHIFT_MEMBER_DEACTIVATION_WAS_ALLOWED'; END IF;
  failed:=false;
  BEGIN PERFORM * FROM public.force_close_register_shift(org1,branch1,shift3,cashier3,0,0,'cashier must not force close');
  EXCEPTION WHEN SQLSTATE '42501' THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION '0032_CASHIER_FORCE_CLOSE_WAS_ALLOWED'; END IF;

  PERFORM * FROM public.force_close_register_shift(org1,branch1,shift1,owner1,21.5,610,'owner emergency close');
  PERFORM * FROM public.force_close_register_shift(org1,branch1,shift2,admin1,15,450,'admin emergency close');
  PERFORM * FROM public.force_close_register_shift(org1,branch1,shift3,admin1,12,300,'cashier unavailable for close');
  IF (SELECT count(*) FROM public.register_shifts WHERE id IN (shift1,shift2,shift3)
      AND force_closed AND closed_at IS NOT NULL AND force_close_reason IS NOT NULL)<>3 THEN
    RAISE EXCEPTION '0032_FORCED_SHIFT_CLOSE_NOT_PERSISTED';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE organization_id=org1
      AND action='register_shift.force_closed' AND entity_type='register_shift'
      AND entity_id IN (shift1::text,shift2::text,shift3::text))<>3 THEN
    RAISE EXCEPTION '0032_FORCED_SHIFT_CLOSE_AUDIT_MISSING';
  END IF;

  -- An active membership in another tenant preserves shared allowlist and sessions.
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(org2,cashier2,'inventory');
  INSERT INTO public.auth_allowlist(email,is_active,added_by) VALUES('cashier2-0032@example.test',true,'0032-test');
  INSERT INTO public.auth_sessions(user_id,token_hash,expires_at) VALUES(cashier2,repeat('h',64),pg_catalog.clock_timestamp()+interval '1 day');
  PERFORM public.set_organization_member_access(org1,owner1,cashier2,'cashier',false);
  IF NOT EXISTS(SELECT 1 FROM public.auth_allowlist WHERE lower(email)='cashier2-0032@example.test' AND is_active)
     OR NOT EXISTS(SELECT 1 FROM public.auth_sessions WHERE token_hash=repeat('h',64) AND revoked_at IS NULL) THEN
    RAISE EXCEPTION '0032_OTHER_TENANT_MEMBERSHIP_DID_NOT_PRESERVE_ACCESS';
  END IF;
  PERFORM public.set_organization_member_access(org2,owner2,cashier2,'inventory',false);
  IF EXISTS(SELECT 1 FROM public.auth_allowlist WHERE lower(email)='cashier2-0032@example.test' AND is_active)
     OR NOT EXISTS(SELECT 1 FROM public.auth_sessions WHERE token_hash=repeat('h',64) AND revoked_at IS NOT NULL) THEN
    RAISE EXCEPTION '0032_LAST_TENANT_DEACTIVATION_DID_NOT_REVOKE_ACCESS';
  END IF;

  -- A pending invitation in another tenant keeps the shared allowlist active
  -- when the member is disabled in this tenant; revoking the last invite closes it.
  INSERT INTO public.organization_invitations(organization_id,email,role,invited_by_user_id)
    VALUES(org2,'invited-0032@example.test','admin',owner2) RETURNING id INTO invitation2;
  PERFORM public.set_organization_member_access(org1,owner1,invited,'cashier',false);
  IF NOT EXISTS(SELECT 1 FROM public.auth_allowlist WHERE lower(email)='invited-0032@example.test' AND is_active) THEN
    RAISE EXCEPTION '0032_CROSS_TENANT_PENDING_INVITATION_DISABLED_ALLOWLIST';
  END IF;
  PERFORM public.revoke_organization_invitation(org2,owner2,invitation2);
  IF EXISTS(SELECT 1 FROM public.auth_allowlist WHERE lower(email)='invited-0032@example.test' AND is_active) THEN
    RAISE EXCEPTION '0032_LAST_INVITATION_REVOCATION_LEFT_ALLOWLIST_ACTIVE';
  END IF;

  -- Bootstrap is still single-use but now performs all privileged inserts
  -- inside a SECURITY DEFINER function rather than runtime direct DML.
  INSERT INTO public.auth_allowlist(email,is_active,added_by) VALUES('bootstrap-0032@example.test',true,'0032-test');
  INSERT INTO public.auth_bootstrap_attempts(handle_hash,state_hash,organization_name,organization_slug,expires_at)
    VALUES(repeat('d',64),repeat('e',64),'Bootstrap Test Store','bootstrap-test-0032',pg_catalog.clock_timestamp()+interval '1 hour');
  SELECT status,user_id,organization_id INTO result_status,bootstrap_user,bootstrap_org
    FROM public.consume_auth_bootstrap(repeat('d',64),repeat('e',64),'bootstrap-0032@example.test','google-bootstrap-0032','Bootstrap Owner');
  IF result_status<>'created' OR bootstrap_user IS NULL OR bootstrap_org IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=bootstrap_org AND user_id=bootstrap_user AND role='owner') THEN
    RAISE EXCEPTION '0032_BOOTSTRAP_DEFINER_FLOW_FAILED';
  END IF;
  INSERT INTO public.auth_bootstrap_attempts(handle_hash,state_hash,organization_name,organization_slug,expires_at)
    VALUES(repeat('f',64),repeat('g',64),'Second Bootstrap Store','second-bootstrap-0032',pg_catalog.clock_timestamp()+interval '1 hour');
  SELECT status INTO result_status FROM public.consume_auth_bootstrap(
    repeat('f',64),repeat('g',64),'bootstrap-0032@example.test','google-bootstrap-0032','Bootstrap Owner');
  IF result_status<>'bootstrap_consumed' THEN RAISE EXCEPTION '0032_BOOTSTRAP_REUSE_WAS_ALLOWED'; END IF;

  -- Bounded cleanup deletes only sessions expired/revoked for more than 48h.
  INSERT INTO public.auth_sessions(user_id,token_hash,expires_at,created_at)
    VALUES(cashier1,token_a,pg_catalog.clock_timestamp()-interval '4 days',pg_catalog.clock_timestamp()-interval '5 days');
  INSERT INTO public.auth_sessions(user_id,token_hash,expires_at,revoked_at,created_at)
    VALUES(cashier1,token_b,pg_catalog.clock_timestamp()+interval '5 days',pg_catalog.clock_timestamp()-interval '4 days',pg_catalog.clock_timestamp()-interval '5 days');
  INSERT INTO public.auth_sessions(user_id,token_hash,expires_at,created_at)
    VALUES(cashier1,token_c,pg_catalog.clock_timestamp()+interval '1 day',pg_catalog.clock_timestamp()-interval '1 day');
  deleted_count:=public.cleanup_expired_auth_sessions();
  IF EXISTS(SELECT 1 FROM public.auth_sessions WHERE token_hash IN (token_a,token_b))
     OR NOT EXISTS(SELECT 1 FROM public.auth_sessions WHERE token_hash=token_c) THEN
    RAISE EXCEPTION '0032_SESSION_RETENTION_BOUND_INVALID: deleted=%',deleted_count;
  END IF;
END;
$owner_team_0032_integration$;

ROLLBACK;
