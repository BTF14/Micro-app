BEGIN;
DO $catalog_import_batches_preflight$
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='microapp_runtime' AND rolcanlogin) THEN
    RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_RUNTIME_ROLE_MISSING';
  END IF;
END;
$catalog_import_batches_preflight$;

CREATE TABLE public.catalog_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('applied')),
  total_rows integer NOT NULL CHECK (total_rows BETWEEN 1 AND 1000),
  created_count integer NOT NULL CHECK (created_count >= 0),
  updated_count integer NOT NULL CHECK (updated_count >= 0),
  unchanged_count integer NOT NULL CHECK (unchanged_count >= 0),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_catalog.jsonb_typeof(summary)='object'),
  actor_user_id uuid NOT NULL,
  audit_log_id bigint NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT catalog_import_batches_counts_match_ck CHECK (created_count+updated_count+unchanged_count=total_rows),
  CONSTRAINT catalog_import_batches_org_idempotency_key_uq UNIQUE (organization_id,idempotency_key),
  CONSTRAINT catalog_import_batches_org_id_uq UNIQUE (organization_id,id),
  CONSTRAINT catalog_import_batches_actor_member_fk FOREIGN KEY (organization_id,actor_user_id)
    REFERENCES public.organization_members (organization_id,user_id) ON DELETE RESTRICT
);
CREATE INDEX catalog_import_batches_org_created_at_idx
  ON public.catalog_import_batches (organization_id,created_at DESC,id DESC);

CREATE FUNCTION public.reject_catalog_import_batches_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog
AS $reject_catalog_import_batches_mutation$
BEGIN
  RAISE EXCEPTION 'CATALOG_IMPORT_BATCHES_APPEND_ONLY: % is forbidden',TG_OP USING ERRCODE='42501';
END;
$reject_catalog_import_batches_mutation$;
ALTER FUNCTION public.reject_catalog_import_batches_mutation() OWNER TO microapp_migrator;
REVOKE ALL ON FUNCTION public.reject_catalog_import_batches_mutation() FROM PUBLIC,microapp_runtime,microapp_bcv_sync;

CREATE TRIGGER catalog_import_batches_10_append_only_rows
BEFORE UPDATE OR DELETE ON public.catalog_import_batches
FOR EACH ROW EXECUTE FUNCTION public.reject_catalog_import_batches_mutation();
CREATE TRIGGER catalog_import_batches_20_append_only_truncate
BEFORE TRUNCATE ON public.catalog_import_batches
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_catalog_import_batches_mutation();
ALTER TABLE public.catalog_import_batches ENABLE ALWAYS TRIGGER catalog_import_batches_10_append_only_rows;
ALTER TABLE public.catalog_import_batches ENABLE ALWAYS TRIGGER catalog_import_batches_20_append_only_truncate;

REVOKE ALL ON TABLE public.catalog_import_batches FROM PUBLIC,microapp_runtime,microapp_bcv_sync;
GRANT SELECT,INSERT ON TABLE public.catalog_import_batches TO microapp_runtime;
COMMIT;
