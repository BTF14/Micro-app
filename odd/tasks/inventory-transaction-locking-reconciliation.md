# ODD task: reconcile the inventory transaction locking contract with current main

- Status: documentation reconciliation in progress; exact-HEAD validation pending
- Source: unique locking-contract document from the stale PR #200 branch
- Target: current main `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`
- Risk: critical (tenant isolation, authorization revocation races, inventory/ledger integrity)
- Scope: documentation only; no application code, DDL, migration, Neon, secret, Cloudflare or production changes

## Objective

Preserve the useful transaction-locking contract from PR #200 without copying its obsolete implementation. The current main implementation has moved from direct table locks to the SECURITY DEFINER helpers in migration 0011, centralized `authorizeBranchOperation`, and current inventory-count/idempotency/ledger code.

## Source-of-truth files inspected

- `apps/api/src/authorization.ts`
- `apps/api/src/tenant-context.ts`
- `apps/api/src/branch-context.ts`
- `apps/api/src/inventory-locks.ts`
- `apps/api/src/inventory-counts.ts`
- `apps/api/src/inventory-read.ts`
- migrations `0006`, `0008`, `0009`, `0010`, `0011`, `0016`
- `apps/api/src/inventory-locks.test.ts`
- `apps/api/src/inventory-counts.integration.test.ts`

## Required contract

1. Tenant/session/user/organization-membership rows are stabilized first by `public.lock_tenant_context`.
2. Branch rows are locked in UUID order, then required branch-membership rows in `(branch_id,user_id)` order by `public.lock_branch_scopes`.
3. Warehouse rows are locked in UUID order by `public.lock_inventory_warehouses`; the warehouse is the mutex protecting even absent balance rows.
4. The count document is locked after the warehouse and before balance rows.
5. Balance rows are locked as a batch in `(warehouse_id,product_id)` order by `lockInventoryBalances`.
6. Balance changes, count status, append-only movement ledger and audit writes stay in one transaction.
7. New writers must use the same complete lock order; do not imply that transfer, receipt, reservation, return or sales inventory writers are already implemented.

## Acceptance criteria

- [x] The previous PR #200 document is confirmed unique and referenced by the merged checkout design; its implementation details are stale and require reconciliation.
- [x] The current migration/helper/API lock order is verified from main source.
- [ ] New architecture document describes the actual SQL helpers and current writer paths without preserving obsolete direct-lock implementation details.
- [ ] `docs/sdd/SALES_CHECKOUT_MODEL.md` reference resolves to the reconciled document.
- [ ] ODD/docs validation and required exact-HEAD CI pass on the final PR SHA.
- [ ] No source code, schema, production data, Neon, secrets or Cloudflare settings are changed.

## Guardrails

- Do not copy PR #200 wholesale; its migration filename `0005_warehouse_inventory.sql` collides with the canonical main sequence, where inventory is `0006_warehouse_inventory.sql`.
- Do not create a duplicate migration or change migration numbering.
- Do not claim a transfer/receipt/reservation/sales inventory writer exists unless the current route registration proves it.
- Keep PR #200 open as a provenance anchor until its remaining downstream dependencies are audited and every unique artifact is preserved or explicitly retired.
- Production remains NOT READY.
