# ODD task: reconcile tenant-scoped catalog API from PR #196 into the active inventory/audit stack

- Status: closed (no-op; implementation already present in base)
- Risk: high (tenant data, product cost/price, audit integrity)
- Issue: #53
- Branch: feat/catalog-api-reconcile-20261105
- Base: PR #209 HEAD 666236bc7b2c7e1dd1e30d9ccdc467e37c40784b
- Source: PR #196 HEAD c332e740aff279fb8b22a8879581d4b8a3c7de21
- Started: 2026-11-05 UTC

## Objective

Preserve the catalog read/create/update functionality already implemented and tested in PR #196, while integrating it into the current active stack (#208 → #207 → #209) without importing PR #196's divergent/older inventory migration or duplicating the inventory vertical slice.

The owner-approved role matrix (2026-10-31) authorizes:
- Catalog read for all organization roles; cashier receives sale price only, never product cost.
- Product create/update/deactivate only for owner/admin.
- All reads/writes must prove tenant isolation; writes must be transactional and audited.

## Scope

Port/reconcile only catalog-specific implementation and tests:
- `catalog.ts`, `catalog-write.ts`
- Catalog unit/integration tests (including product update)
- Minimal `index.ts` route registration and related route tests
- CI steps for catalog PostgreSQL integration tests
- ODD/status documentation

Do NOT port PR #196's `0005_warehouse_inventory.sql`, inventory-count routes, inventory lock code, or older inventory implementation. The active stack already has its own inventory migration and hardening.

## Acceptance criteria

- [ ] Catalog GET is authenticated, tenant-scoped, paginated, private/no-store and never selects/returns cost to cashier.
- [ ] Create/update/deactivate are owner/admin only, validate input/body size/content type/trusted origin and tenant-scope every SQL statement.
- [ ] Every successful catalog mutation writes before/after audit data in the same transaction; audit failure rolls back the mutation.
- [ ] Cross-tenant, role-denial, malformed input, oversized body, duplicate SKU/barcode, update and soft-deactivation tests pass on PostgreSQL disposable DB.
- [ ] Route registration and CI test wiring are reconciled with current #209 branch without overwriting newer workflows.
- [ ] Review full diff for accidental inventory migration or role-policy changes.
- [ ] Exact HEAD CI, E2E, PostgreSQL migration, SAST, security, secret scan, backup smoke and Workers/Pages preview checks pass.
- [ ] Keep Draft until all checks and independent code review complete; no merge/deploy/production changes.

## Evidence and boundaries

- PR #196 is open/Draft, head `c332e740aff279fb8b22a8879581d4b8a3c7de21`, and diverged from #200. Its unique catalog files are present in its diff but absent from the active #209 base.
- The approved role matrix is `docs/sdd/role-permission-decision-matrix.md` on the active #208 branch, explicitly approved 2026-10-31.
- No Neon, production data, credentials, secrets, billing or Cloudflare configuration will be accessed or modified.
- PR #209 adds count snapshot/ledger validation and has 16/16 checks success at exact HEAD `666236bc7b2c7e1dd1e30d9ccdc467e37c40784b`; this is the base for this work.

## Execution log

- 2026-11-05: initial comparison against PR #200 suggested catalog files were absent. A second live tree comparison against the actual active base `work/mvp-foundation` and #207/#209 proved that all catalog files, tests, and route registration already exist in the active stack. Their blob SHAs match the current PR #196 source for most files; product update integration test has a newer active-branch blob.
- 2026-11-05: verified active #209 base contains `catalog.ts`, `catalog-write.ts`, `catalog-update.integration.test.ts`, their unit/integration tests, `index.ts` route registration, and CI catalog test steps. No code port is necessary.
- 2026-11-05: closed this task as a no-op to prevent duplicate work. The temporary branch contains only this ODD record; no product source, migration, workflow, production, or infrastructure was changed. Continue authorization coverage audit on the existing stack instead.
