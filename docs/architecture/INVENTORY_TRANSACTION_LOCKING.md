# Inventory transaction locking contract

**Status:** target technical contract implemented on PR #262 Ready for review, stacked on checkout PR #258; not yet merged into `main`.  
**Updated:** 2026-11-08 UTC  
**Scope:** any transaction that changes warehouse stock, reservations, inventory counts, the warehouse movement ledger, or a document that confirms those changes.  
**Does not approve:** new commercial rules, reservation/purchase-receipt/return/transfer endpoints, additional DDL, Neon migrations, production deployment or merge of the obsolete PR #200 stack. Atomic sale checkout is implemented on #258/#262 and follows this lock contract, but remains unmerged and subject to independent review/product gates.

## 1. Implementation represented on PR #262 branch

The #262 branch (including checkout work from #258) registers:

- tenant-scoped catalog read/write routes;
- inventory count creation/list/confirmation routes;
- inventory balance and movement read routes;
- atomic sales checkout;
- authentication and register-shift routes.

It does **not** register inventory-writing routes for reservations, purchase receipts, returns or inter-warehouse transfers. Those future writers must adopt this contract and pass cross-writer PostgreSQL concurrency tests before implementation is considered complete. The `main` branch has not yet received the #258/#262 changes.

The current inventory mutation path uses:

- centralized `authorizeBranchOperation` from `apps/api/src/authorization.ts`;
- SECURITY DEFINER row-lock helpers introduced by migration 0011;
- shared TypeScript lock helpers in `apps/api/src/inventory-locks.ts`;
- one PostgreSQL transaction for count/document, ledger movements, projected balances and audit writes;
- migration 0019's ledger-authoritative SECURITY DEFINER balance projection, direct runtime balance-write revocation and movement warehouse-lock trigger;
- migration 0008's append-only audit protection.

The older PR #200 branch used direct table-lock queries and a conflicting `0005_warehouse_inventory.sql`. That is not the current implementation. The canonical inventory schema is migration 0006; do not restore or renumber the old 0005 migration.

## 2. Global lock order

Every inventory writer must use one database client and one PostgreSQL transaction for final authorization, document state, balances, ledger movements and audit writes. Acquire locks in this order:

1. **Tenant identity and membership.** `authorizeTenantOperation` / `authorizeBranchOperation` call `resolveTenantContext(..., lockRows = true)`. The tenant helper invokes `public.lock_tenant_context(token_hash, organization_id)`, a SECURITY DEFINER function that takes `FOR SHARE` locks on the active session, user, organization membership and organization.
2. **Branch and membership scope.** `resolveBranchContext(..., lockRows = true)` calls `lockBranchScopes`, which invokes `public.lock_branch_scopes`. The SQL helper locks all requested active `branches` rows in UUID order first, then required active `branch_memberships` rows in `(branch_id, user_id)` order. Owner/Admin need an active branch lock but no membership row; Cashier/Inventory require the membership lock as well.
3. **Warehouse mutex.** `lockInventoryWarehouses` validates the complete set of `(warehouse_id, branch_id)` pairs, sorts by warehouse UUID, and invokes `public.lock_inventory_warehouses`. The SECURITY DEFINER function takes `FOR UPDATE` locks on active, tenant/branch-scoped warehouse rows in ascending UUID order. For multi-warehouse operations, pass the entire set in one call; never lock origin then destination according to request order.
4. **Operational document.** After the warehouse mutex, lock the count/document row with `SELECT ... FOR UPDATE` before reading or changing its state. When creating a new idempotent document, claim its unique idempotency key inside the same transaction before acquiring balances; a replay reads/locks the existing document and returns without repeating side effects.
5. **Balance rows.** `lockInventoryBalances` calls `public.lock_inventory_balances`, a scoped `SECURITY DEFINER` helper. It revalidates/relocks the tenant/branch warehouse pairs, then locks existing balance rows with `FOR UPDATE` under the migrator owner, ordered by `(warehouse_id, product_id)`. Runtime retains SELECT but has no UPDATE privilege on balances. Do not acquire individual per-product locks after acquiring the batch lock.
6. **Writes and commit.** Calculate from the locked snapshot and append movement ledger rows only. The `AFTER INSERT` `SECURITY DEFINER` projection trigger updates/inserts `inventory_balances` in the same transaction. Application code must never write balances directly. Transition the document and insert audit events before the same COMMIT. Any failure must roll back the entire operation.

Never invert these levels—for example, do not lock a balance before its warehouse, or acquire multiple warehouse locks sequentially in caller-supplied origin/destination order.

## 3. Why the warehouse row is the mutex

A row lock on `inventory_balances` protects only rows that already exist. It cannot lock the absence of a balance row for a product that has never had stock in a warehouse.

The warehouse row therefore acts as a transaction mutex. Every writer must lock the warehouse before checking, inserting or updating its balances. This serializes creation of previously absent balance rows as well as updates to existing ones. The unique balance key remains an additional database defense; it does not replace the mutex contract.

Application writers still call the warehouse helper before locking balances. Migration 0019 additionally enforces the mutex at the database boundary: a BEFORE INSERT SECURITY DEFINER trigger locks and validates the active tenant/branch warehouse before the existing count validator, and the AFTER INSERT projection trigger applies the movement. Runtime direct balance INSERT/UPDATE/DELETE/TRUNCATE is revoked; a nested-trigger guard is defense in depth. The prior migration 0010 intent-pairing mechanism is removed by 0019 after the projection path is installed. The same migration validates count confirmer role/scope at confirmation, revalidates the claimed actor at movement insertion using non-blocking scope locks, and checks physical-count quantity plus balance_version against the current projection under the warehouse mutex. Opening counts require an empty warehouse. Sale movements must reference a matching draft sale and exact sale line; unsupported source types fail closed.

## 4. Current count lifecycle and idempotency

### Draft creation

The current `POST /api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts/:countType` flow:

1. validates the request and idempotency key;
2. begins a transaction and obtains tenant/branch authorization locks;
3. locks the active warehouse;
4. claims the unique `(organization_id, created_by, idempotency_key)` document key and stores a canonical request hash;
5. for a physical count, locks the requested balances in one batch and records the expected quantity and `balance_version` snapshot;
6. inserts count lines and the audit event in the same transaction.

A replay with the same key and request hash returns the existing document; reuse of the key with a different hash is rejected. A replay must not create additional count lines, ledger movements or audit events.

### Confirmation

The confirmation flow:

1. obtains tenant/branch authorization locks;
2. locks the warehouse mutex;
3. locks the count document with `FOR UPDATE`;
4. reads the count lines in product UUID order;
5. locks the required balances in one batch;
6. compares both expected on-hand quantity and `balance_version` for physical counts, and checks reserved quantity. The version starts at 1 for an existing balance and uses 0 for an absent row. The trigger increments only when on-hand or reserved quantity changes; metadata-only updates do not increment it. A quantity that changes away and later returns to its original value still invalidates the old snapshot (ABA protection);
7. updates the count, appends any required ledger movements (the AFTER INSERT projection trigger applies the balance changes) and writes the audit event before commit.

A confirmed count is immutable and a repeated confirmation is idempotent. Opening counts inspect the complete warehouse balance set and are rejected if any balance already exists. A confirmed opening count remains the one-time initialization marker even when every line is zero: it creates no synthetic balance row or movement, and migration 0019's unique partial index prevents a second confirmed opening for that warehouse. Physical counts cannot reduce on-hand quantity below reserved quantity.

## 5. Ledger, balance and audit atomicity

- Migration 0006 creates warehouses, counts, count lines, balances and append-only warehouse movements. Its `balance_version` trigger increments only on stock/reservation changes (not metadata-only updates), and balance rows cannot be deleted, so the version cannot be reset by a DELETE/INSERT cycle.
- Migration 0009 enforces count lifecycle and movement-to-count-line consistency, including physical snapshot/version requirements.
- Migration 0010's transaction-intent pairing model is historical and is removed by migration 0019 after the replacement projection path is installed. Migration 0019 makes the append-only movement ledger the only runtime-authorized source of on-hand balance changes: a SECURITY DEFINER AFTER INSERT trigger applies positive/negative deltas, enforces the reserved-stock floor, and increments the existing balance version trigger. Runtime has SELECT but no direct INSERT/UPDATE/DELETE/TRUNCATE privilege on balances. A nested-trigger guard is defense in depth; the privilege boundary remains the primary control. Balance identity cannot be re-keyed.
- Migration 0008 makes audit logs append-only. The inventory count handler inserts its audit event inside the same transaction as the count/balance/ledger writes.

Do not update or delete historical movement rows to correct stock. A correction must be represented by a new, authorized and audited compensating movement under a separately approved business flow.

## 6. Multi-warehouse and future writer requirements

For any future transfer or other multi-warehouse operation:

- resolve and lock tenant identity once;
- lock all involved branch rows in UUID order, then all required memberships in `(branch_id, user_id)` order;
- lock the complete warehouse set in UUID order in one helper call;
- lock the operational document(s) in a deterministic order;
- lock all affected balances in `(warehouse_id, product_id)` order;
- perform all balance and ledger changes in one transaction.

Reservation and consumption writers must use the same warehouse mutex and balance locks, and must validate availability from the locked snapshot. A future writer must not rely on an unlocked read-then-write sequence. Multi-warehouse deadlock avoidance must be proven with two independent PostgreSQL connections requesting the same warehouses in opposite input order.

Atomic sale checkout is implemented on #258/#262: it is the only non-count movement writer currently supported, and each sale movement must match a draft sale, tenant/branch/warehouse, actor, product, quantity and unit cost. It is not yet merged or product-approved for POS use. Reservation, purchase receipt, return and inter-warehouse transfer writers remain unsupported; their commercial rules, permissions, idempotency, partial operations and reversal semantics require separate design/authorization.

## 7. Required tests for each new writer

Use disposable PostgreSQL with independent connections, not mocks alone:

1. two operations on the same warehouse/product;
2. two operations on different products in the same warehouse;
3. concurrent creation of a previously absent balance row;
4. two multi-warehouse operations requesting the same warehouse set in opposite input order;
5. concurrent stock consumption and reservation mutation;
6. simultaneous replay of the same idempotency key and same hash;
7. reuse of the same idempotency key with a different request hash;
8. an induced failure after a balance change but before ledger/audit completion, proving full rollback;
9. cross-tenant, cross-branch and cross-warehouse identifiers with no partial writes;
10. branch-membership revocation racing authorization, proving the lock order serializes correctly;
11. branch or warehouse deactivation racing an inventory operation;
12. count confirmation racing any new stock/reservation writer.

A count-vs-count test alone does not prove coordination with future sales, reservations, receipts or transfers. Every new writer must demonstrate the same global order.

## 8. Current source references

- `apps/api/src/authorization.ts`: centralized tenant/branch operation authorization.
- `apps/api/src/tenant-context.ts`: tenant context and `public.lock_tenant_context` call.
- `apps/api/src/branch-context.ts`: `lockBranchScopes` and branch scope resolution.
- `apps/api/src/inventory-locks.ts`: `lockInventoryWarehouses` and `lockInventoryBalances`.
- `apps/api/src/inventory-counts.ts`: current draft/create/confirm count flows.
- `apps/api/src/inventory-read.ts`: read-only inventory balance and movement routes.
- `apps/api/migrations/0006_warehouse_inventory.sql`: canonical inventory schema.
- `apps/api/migrations/0008_audit_logs_append_only.sql`: append-only audit protection.
- `apps/api/migrations/0009_inventory_count_ledger_validation.sql`: count lifecycle and movement validation.
- `apps/api/migrations/0010_inventory_balance_ledger_coupling.sql`: balance/ledger coupling.
- `apps/api/migrations/0011_postgres_runtime_lock_helpers.sql`: SECURITY DEFINER lock helpers.
- `apps/api/migrations/0016_runtime_inventory_ledger_read.sql`: runtime read privileges (its assertions also tolerate the intent table being removed by 0019).
- `apps/api/migrations/0019_inventory_ledger_balance_projection.sql` and its assertions: ledger projection, warehouse-before-count trigger, scoped balance-lock helper, count-confirmation actor authorization, stale snapshot revalidation, sale-source validation and runtime least privilege.

This document describes the #262 branch implementation and its tests, not `main` until #258/#262 are integrated. It does not certify that Neon has applied these migrations or that the production Worker uses the intended least-privilege role. Neon rehearsal, runtime identity and production deployment remain separate gates.
