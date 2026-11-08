> **Historical ODD record — reconciled 2026-11-07.** Original PR #210 migration `0009_inventory_balance_ledger_coupling.sql` is present on main as `0010_inventory_balance_ledger_coupling.sql`; the SQL body and deferred-failure assertion are byte-for-byte identical. The main assertion file differs only in its first comment naming the migration. Main retains the transaction-scoped balance/ledger coupling. The checklist and SHAs below are historical branch evidence, not proof of Neon production application or production runtime ownership.

---

# ODD task: enforce transactional inventory balance ↔ ledger coupling

- Status: complete within repository/CI scope; PR remains Draft pending stack integration and production-principal verification
- Risk: critical (inventory integrity)
- Issue: #53
- Branch: feat/inventory-balance-ledger-coupling-20261105
- Base: PR #209 HEAD 666236bc7b2c7e1dd1e30d9ccdc467e37c40784b
- Started: 2026-11-05 UTC

## Objective

Make PostgreSQL reject any non-zero on-hand balance insertion/update unless exactly one matching append-only ledger movement is inserted in the same transaction, and reject any ledger movement unless a matching on-hand balance change exists in that transaction. This closes the universal balance↔ledger pairing gap for writes performed through the database triggers.

## Existing contract and evidence

- Current API writer is `apps/api/src/inventory-counts.ts`: it locks the warehouse and balances, validates physical snapshot version/quantity, updates/inserts `inventory_balances`, then inserts `warehouse_inventory_movements`, all inside one transaction.
- Migration 0005 already has balance versioning and a no-delete trigger; movement ledger is append-only.
- Migration 0008 validates count snapshots and count-derived movement delta/actor/reason/unit cost.
- No other API source module currently writes `inventory_balances` or `warehouse_inventory_movements`.
- Reservation-only changes and on-hand no-op updates must not require a stock movement. A non-zero on-hand delta must pair exactly with one movement for the same org/branch/warehouse/product and signed quantity.

## Design

- Add a private transaction-intent table populated by an AFTER INSERT/UPDATE OF on_hand_quantity trigger.
- The intent is transaction-scoped via `txid_current()`, scoped to the exact inventory key and signed delta, and starts unconsumed.
- A SECURITY DEFINER BEFORE INSERT movement trigger consumes one exact matching intent using row locking; it rejects movements with no corresponding balance change and prevents duplicate consumption.
- A DEFERRABLE INITIALLY DEFERRED constraint trigger on newly inserted intents rejects balance changes left unmatched at transaction commit, then removes the consumed intent.
- Internal table and trigger functions use a fixed search_path and no direct PUBLIC privileges. This is defense-in-depth, not a substitute for a non-owner least-privilege runtime principal; production principal/ownership remains NO VERIFICADO.
- Contract order: update balance first, insert matching movement second, commit. Existing count confirmation already follows this order.

## Acceptance criteria

- [x] Non-zero balance insert/update without movement fails at commit.
- [ ] Movement without a same-transaction balance delta fails immediately.
- [ ] Wrong signed delta, product, warehouse, branch or tenant fails.
- [ ] Duplicate movement cannot consume the same balance intent.
- [ ] TRUNCATE is rejected for both inventory balances and the append-only movement ledger.
- [ ] Exact one-to-one matching succeeds.
- [ ] Zero opening balance, zero-delta physical count and reservation-only update remain valid without a stock movement.
- [ ] Multiple distinct balance changes in one transaction pair independently.
- [ ] Existing append-only, count snapshot, stale/ABA, tenant and branch tests remain passing.
- [ ] CI and migration-check apply 0001–0009 from clean disposable PostgreSQL 18; migration rollback is verified.
- [ ] Exact HEAD CI and PostgreSQL assertions pass; full diff and ODD review completed.
- [ ] Documentation states the database-level pairing scope and the remaining runtime-owner caveat.

## Scope and safety

- Only additive migration, disposable PostgreSQL assertions, workflow integration and docs in this feature branch.
- No main/production/Neon access, no secrets, no real data, no Cloudflare settings/DNS/billing, no merge or deployment.
- Do not weaken append-only, stale/ABA, authorization or migration rollback checks.
- The transaction-intent table is an internal mechanism, not a business ledger or user-facing API. TRUNCATE must also be blocked because row-level DELETE triggers do not fire for TRUNCATE.

## Execution log

- 2026-11-05: traced all API source files in the current stack. The only current API writer pair is count confirmation, which updates balances before inserting movements in one transaction. Confirmed universal database pairing was not yet enforced.
- 2026-11-05: first PostgreSQL CI run caught an invalid negative-delta test fixture using `count_adjustment` without its required `count_id`; changed that fixture to a non-count `reversal` movement while retaining a negative signed delta. Added explicit TRUNCATE protection because row-level DELETE triggers do not cover TRUNCATE.
- 2026-11-05: PostgreSQL assertions now cover missing movement at commit, movement without balance change, wrong signed delta/product/warehouse/branch/tenant, duplicate movement, exact positive/negative pairing, multiple independent balance keys, reservation-only/no-op updates, and TRUNCATE rejection.
- 2026-11-05: integration fixtures were updated to pair non-zero balance mutations with ledger movements. Added API integration coverage proving a zero-quantity opening count creates a zero balance without a stock movement, audits the count, and prevents a second opening from overwriting it. Existing zero-delta physical-count coverage remains green.
- 2026-11-05: exact HEAD `b6d4da7cb03d519206aee9b6c1576df542a75d61` passed 9/9 checks: CI, PostgreSQL migration validation (clean PostgreSQL 18; 0001–0009; rollback of 0009; assertions and deferred-failure test), Chromium, Semgrep, Trivy, secret-history scan, synthetic backup/restore, Cloudflare Pages preview and Workers preview build.
- 2026-11-05: manual review covered trigger ordering, transaction-scoped intent matching, rollback behavior, SECURITY DEFINER search_path/privileges, signed deltas, concurrency via row locks, test cleanup and full PR diff. No separate agent was launched.
- Remaining production caveat: the effective Worker `DATABASE_URL` principal, ownership and grants remain NO VERIFICADO. The database-level guard assumes the runtime role cannot disable/drop triggers or mutate the private intent table. No production secrets or Neon were accessed. This PR does not establish production readiness or authorize merge/deploy.
