BEGIN;

-- The runtime API exposes a read-only, tenant-scoped inventory movement history.
-- Keep the append-only ledger immutable: runtime receives SELECT only in this migration.
GRANT SELECT ON TABLE public.warehouse_inventory_movements TO microapp_runtime;

COMMIT;
