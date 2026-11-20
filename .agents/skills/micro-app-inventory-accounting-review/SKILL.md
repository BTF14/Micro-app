---
name: micro-app-inventory-accounting-review
description: Independently test accounting and operational invariants across Micro-app inventory ledger/balances, exact decimals, sales/payments, register shifts, counts, transfers, and tenant/branch isolation before Carril B1.
---

# Micro-app inventory and accounting review

## Mandatory safety and cost boundary

- Cost target is USD 0. Use repository code, Python standard library, existing TypeScript helpers, PostgreSQL already available locally or in GitHub Actions, and synthetic fixtures only. No paid tools, subscriptions, APIs, SaaS test databases or additional runtime dependencies.
- Never connect this suite to Neon main, production, a real tenant, or a database containing customer data.
- The PostgreSQL runner requires an explicitly named disposable database (inventory_review_test or a name beginning with that prefix) on loopback. It refuses remote hosts and unrelated database names. Do not weaken this guard.
- Mutations are applied only to copied in-memory dataclasses or temporary tables inside a transaction that is rolled back. Never patch production source, migration files, persistent fixtures or live database rows.
- This is a review harness for current schema/code through migrations 0001–0027. It does not authorize 0028+, quantity_mode, sale_items changes, commercial endpoints or Carril B1.

## Independent accounting invariants

1. Decimal domain and rounding:
   - Quantity NUMERIC(14,3); USD prices/costs/line values/totals NUMERIC(14,4); VES amounts NUMERIC(16,2); BCV rates NUMERIC(18,8).
   - Reject values outside precision/scale and binary floating-point inputs. Use decimal strings, BigInt or PostgreSQL numeric.
   - Round ties away from zero. Apply documented per-line USD and VES rounding before summing; do not recompute a document total through a different rounding path.
   - Check max positive/negative, zero, negatives, excess fractional digits, exponent notation, malformed strings, overflow on sums and positive-rate/quantity constraints.

2. Sales, snapshots and payments:
   - Recompute each line from snapshotted quantity × snapshotted unit price; compare persisted line amount.
   - Under no-discount policy, line USD sum equals subtotal USD and total USD.
   - Payment allocation positions are unique/contiguous where required; allocations reconcile to captured sale totals under current currency/equivalent rules.
   - Today's product price/cost/name/SKU or BCV rate cannot change completed historical sale/payment snapshots.
   - Idempotent retries cannot create duplicate sales, payments or movements; same key with a different request hash is a conflict.

3. Inventory ledger and projection:
   - For each (organization, branch, warehouse, product), balance on-hand equals opening plus immutable movement deltas; reserved is non-negative and never exceeds on-hand.
   - Every movement and projection row belongs to the same composite scope.
   - Count adjustments derive from a confirmed count and captured expected quantity/version. A stale physical count cannot overwrite an intervening movement.
   - Reversal is a new compensating event, never update/delete of the original.
   - Concurrency, retries and rollback must not double-apply or lose a movement.

4. Register shifts:
   - Opening and closing cash are exact numeric.
   - Reconcile opening float + cash tenders − cash refunds/payouts + explicit adjustments to counted closing cash, using only movement classes actually defined by current model.
   - A close cannot absorb another cashier's, register's, branch's or tenant's movements. Closed shifts and snapshots remain historical facts.

5. Tenant/branch and actor scope:
   - Organization ID does not imply membership in every branch. Every row, actor, warehouse, product, sale and shift resolves to the same authorized scope.
   - Negative tests swap organization, branch, warehouse, product, cashier and actor IDs; attempt cross-tenant/cross-branch replay; verify database constraints and server authorization independently.
   - Revocation/concurrency tests cover lock order and authorization snapshot.

## Edge-case matrix

| Domain | Required boundary cases | Critical mutation to kill |
|---|---|---|
| Decimal parsing | max precision, one digit overflow, scale+1, exponent, whitespace, sign, zero, negatives | binary float or wrong scale accepted |
| Rounding | positive/negative ties, just below/above tie, many-line accumulation | half-even/truncation or aggregate-before-line rounding |
| Sale | multi-line, no discounts, snapshot price drift, line mismatch | line amount or total changed by 0.0001 |
| Payments | USD/VES/mixed, allocation gap/duplicate, residue, retry | payment reduced/duplicated while sale total fixed |
| Ledger | opening, count, receipt, sale, reversal, concurrent delta | movement delta or balance changed by 0.001 |
| Counts | stale expected quantity/version, empty count, duplicate confirmation | stale count overwrites newer stock |
| Transfers | origin dispatch vs destination receipt, in-transit variance, separate permissions | destination credited without dispatch or unauthorized origin debit |
| Scope | two tenants/two branches, swapped FK/actor, replay | movement or payment crosses tenant/branch |
| Shift close | opening float, cash/card separation, refunds, close count | close total shifted or another shift's cash included |

## Reproducible protocol

1. Inspect live main SHA, migrations 0001–0027, packages/money, checkout/count/receipt/shift modules, integration tests and domain models. Record implemented, schema-only, specified or absent behavior.
2. Run independent standard-library model tests:
   - python3 -m unittest tools.tests.test_inventory_accounting_review -v
3. Run PostgreSQL harness only against disposable local PostgreSQL:
   - Create an empty database named inventory_review_test.
   - Set DATABASE_URL_INVENTORY_REVIEW to its loopback connection URL.
   - Run bash scripts/test-inventory-accounting-review-postgres.sh.
   - SQL uses temporary tables and rolls back all test work; it does not apply or change repository migrations.
4. Run existing decimal helper tests and applicable API tests without changing their source. Discover exact package scripts from package.json; do not guess names.
5. Run deliberate mutation tests. The suite must show each mutation is detected by a named assertion. A mutation not killed is a failed review gate.
6. Inspect complete diff and verify no SQL migration, product source, secrets, Neon, Worker or Cloudflare configuration changed.
7. Record exact commands, PostgreSQL version, target identity (without credentials), SHA, results and anything not run.

## Expected evidence

Report invariant → independent assertion → mutation → detected failure. Separate Python reference-model evidence from PostgreSQL numeric/relational evidence and existing production integration tests. This harness does not certify every production trigger, authorization path, concurrency schedule or transfer workflow.
