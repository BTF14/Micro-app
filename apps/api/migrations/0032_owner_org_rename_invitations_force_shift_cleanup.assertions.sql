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
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.register_shifts'::regclass
       AND conname='register_shifts_force_close_state_check'
  ) THEN RAISE EXCEPTION '0032_FORCE_CLOSE_CONSTRAINT_MISSING'; END IF;

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
ROLLBACK;
