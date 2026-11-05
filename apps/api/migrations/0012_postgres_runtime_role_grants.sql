BEGIN;

DO $runtime_role_preflight$
DECLARE
  runtime_role pg_catalog.pg_roles%ROWTYPE;
  migrator_role pg_catalog.pg_roles%ROWTYPE;
BEGIN
  IF current_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'MIGRATION_MUST_RUN_AS_MICROAPP_MIGRATOR';
  END IF;

  SELECT * INTO runtime_role FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime';
  SELECT * INTO migrator_role FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator';

  IF runtime_role.rolname IS NULL OR NOT runtime_role.rolcanlogin
    OR runtime_role.rolsuper OR runtime_role.rolcreatedb OR runtime_role.rolcreaterole
    OR runtime_role.rolreplication OR runtime_role.rolbypassrls OR runtime_role.rolinherit
  THEN RAISE EXCEPTION 'MICROAPP_RUNTIME_ROLE_ATTRIBUTES_INVALID'; END IF;

  IF migrator_role.rolname IS NULL OR NOT migrator_role.rolcanlogin
    OR migrator_role.rolsuper OR migrator_role.rolcreatedb OR migrator_role.rolcreaterole
    OR migrator_role.rolreplication OR migrator_role.rolbypassrls
  THEN RAISE EXCEPTION 'MICROAPP_MIGRATOR_ROLE_ATTRIBUTES_INVALID'; END IF;

  IF pg_catalog.pg_has_role('microapp_runtime', 'microapp_migrator', 'MEMBER') THEN
    RAISE EXCEPTION 'RUNTIME_MUST_NOT_INHERIT_MIGRATOR';
  END IF;

  -- Schema ACLs are bootstrap-owned: require the database owner to have
  -- removed PUBLIC CREATE before this migration can install table grants.
  -- This prevents a successful migration from masking an unsafe public schema.
  IF NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'USAGE')
    OR NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'CREATE')
    OR NOT pg_catalog.has_schema_privilege('microapp_runtime', 'public', 'USAGE')
    OR pg_catalog.has_schema_privilege('microapp_runtime', 'public', 'CREATE')
  THEN RAISE EXCEPTION 'POSTGRES_SCHEMA_BOOTSTRAP_PRIVILEGES_INVALID'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members m
    WHERE m.member IN (runtime_role.oid, migrator_role.oid)
  ) THEN
    RAISE EXCEPTION 'RUNTIME_AND_MIGRATOR_MUST_NOT_HAVE_ROLE_MEMBERSHIPS';
  END IF;
END;
$runtime_role_preflight$;

-- Remove implicit/public access before granting the exact operations currently
-- used by production callsites. This migration must run as the object owner.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, microapp_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, microapp_runtime;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, microapp_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE microapp_migrator
  REVOKE ALL ON TABLES FROM PUBLIC, microapp_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE microapp_migrator
  REVOKE ALL ON SEQUENCES FROM PUBLIC, microapp_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE microapp_migrator
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, microapp_runtime;

-- Identity/session and OAuth bootstrap.
GRANT SELECT ON TABLE public.auth_allowlist, public.auth_bootstrap,
  public.auth_bootstrap_attempts, public.auth_sessions,
  public.app_users, public.organizations, public.organization_members
  TO microapp_runtime;
GRANT INSERT ON TABLE public.auth_sessions, public.auth_bootstrap_attempts,
  public.app_users, public.organizations, public.organization_members
  TO microapp_runtime;
GRANT UPDATE (revoked_at) ON TABLE public.auth_sessions TO microapp_runtime;
GRANT UPDATE (consumed_at, consumed_by_email, created_organization_id)
  ON TABLE public.auth_bootstrap TO microapp_runtime;
GRANT UPDATE (consumed_at) ON TABLE public.auth_bootstrap_attempts TO microapp_runtime;
GRANT DELETE ON TABLE public.auth_bootstrap_attempts TO microapp_runtime;

-- Atomic OAuth rate-limit upsert/retention. SELECT is column-scoped to the
-- conflict/update expressions and RETURNING projection used by the handler.
GRANT SELECT (key_hash, window_started_at, attempts, updated_at)
  ON TABLE public.auth_rate_limits TO microapp_runtime;
GRANT INSERT ON TABLE public.auth_rate_limits TO microapp_runtime;
GRANT UPDATE (window_started_at, attempts, updated_at)
  ON TABLE public.auth_rate_limits TO microapp_runtime;
GRANT DELETE ON TABLE public.auth_rate_limits TO microapp_runtime;

-- Tenant/branch resolution and register lookup are read-only. Locking of
-- otherwise read-only rows is performed by the hardened SECURITY DEFINER APIs.
GRANT SELECT ON TABLE public.branches, public.branch_memberships,
  public.registers, public.register_shifts TO microapp_runtime;

-- Catalog operations. FOR UPDATE is supported by the narrow column UPDATE
-- grant; the API patch handler only writes these columns plus updated_at.
GRANT SELECT, INSERT ON TABLE public.products TO microapp_runtime;
GRANT UPDATE (sku, barcode, name, description, unit, cost_usd, price_usd,
  minimum_stock, is_active, updated_at) ON TABLE public.products TO microapp_runtime;

-- Inventory reads and count lifecycle. The runtime can update only the
-- confirmation fields; count lines and warehouse identity remain non-writable.
GRANT SELECT ON TABLE public.warehouses, public.inventory_counts,
  public.inventory_count_lines, public.inventory_balances TO microapp_runtime;
GRANT INSERT ON TABLE public.inventory_counts, public.inventory_count_lines,
  public.inventory_balances, public.warehouse_inventory_movements TO microapp_runtime;
GRANT UPDATE (status, confirmed_by, confirmed_at)
  ON TABLE public.inventory_counts TO microapp_runtime;
GRANT UPDATE (on_hand_quantity, updated_at)
  ON TABLE public.inventory_balances TO microapp_runtime;

-- General audit and inventory movement ledgers are append-only for runtime.
-- Identity sequence access is intentionally not granted unless PostgreSQL's
-- direct-login harness proves it is required for GENERATED ALWAYS AS IDENTITY.
GRANT INSERT ON TABLE public.audit_logs,
  public.warehouse_inventory_movements TO microapp_runtime;

-- These functions preserve row locks without granting UPDATE on read-only
-- tenant/branch/warehouse relations.
GRANT EXECUTE ON FUNCTION public.lock_tenant_context(text, uuid) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.lock_branch_scopes(uuid, uuid[], uuid[], uuid[]) TO microapp_runtime;
GRANT EXECUTE ON FUNCTION public.lock_inventory_warehouses(uuid, uuid[], uuid[]) TO microapp_runtime;

COMMIT;
