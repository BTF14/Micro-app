BEGIN;
DO $assertions$
DECLARE f regprocedure;v_public boolean;
BEGIN
 IF to_regclass('public.platform_admins') IS NULL OR to_regclass('public.platform_audit_logs') IS NULL THEN RAISE EXCEPTION 'FAIL platform tables missing';END IF;
 IF NOT has_table_privilege('microapp_runtime','public.platform_admins','SELECT') OR has_table_privilege('microapp_runtime','public.platform_admins','INSERT') OR has_table_privilege('microapp_runtime','public.platform_admins','UPDATE') OR has_table_privilege('microapp_runtime','public.platform_admins','DELETE') OR NOT has_table_privilege('microapp_runtime','public.platform_audit_logs','SELECT') OR has_table_privilege('microapp_runtime','public.platform_audit_logs','INSERT') OR has_table_privilege('microapp_runtime','public.platform_audit_logs','UPDATE') OR has_table_privilege('microapp_runtime','public.platform_audit_logs','DELETE') THEN RAISE EXCEPTION 'FAIL runtime platform ACL';END IF;
 IF has_sequence_privilege('microapp_runtime','public.platform_audit_logs_id_seq','USAGE') OR has_sequence_privilege('microapp_runtime','public.platform_audit_logs_id_seq','UPDATE') THEN RAISE EXCEPTION 'FAIL runtime platform sequence ACL';END IF;
 FOREACH f IN ARRAY ARRAY['public.platform_create_organization(uuid,text,text,text,text)'::regprocedure,'public.platform_set_organization_active(uuid,uuid,boolean,text)'::regprocedure,'public.platform_set_admin_access(uuid,text,boolean,text)'::regprocedure] LOOP
  IF NOT has_function_privilege('microapp_runtime',f,'EXECUTE') THEN RAISE EXCEPTION 'FAIL missing runtime execute %',f;END IF;
  SELECT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=f AND a.grantee=0 AND a.privilege_type='EXECUTE') INTO v_public;
  IF v_public OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=f)<>'microapp_migrator' OR NOT (SELECT prosecdef FROM pg_proc WHERE oid=f) THEN RAISE EXCEPTION 'FAIL function security %',f;END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.organization_invitations'::regclass AND conname='organization_invitations_role_check' AND pg_get_constraintdef(oid) LIKE '%owner%') THEN RAISE EXCEPTION 'FAIL owner role check';END IF;
 IF pg_get_functiondef('public.invite_organization_member(uuid,uuid,text,text,text)'::regprocedure) NOT LIKE '%p_role NOT IN (''admin'',''cashier'',''inventory'')%' THEN RAISE EXCEPTION 'FAIL tenant invite owner restriction';END IF;
END;$assertions$;
ROLLBACK;
