# ODD task: inventory ledger-authoritative balance projection

- Status: implementation complete; exact-HEAD validation passed; independent review and Neon rehearsal pending
- Issue / PR: follow-up to #193 §7.9.H–I; stacked on checkout #258
- Owner / reviewer: repository owner; technical execution by senior agent
- Started: 2026-11-08 UTC
- Risk: critical

## Objective and authorization

- Desired outcome: make `warehouse_inventory_movements` the only runtime-authorized write path for stock changes. A hardened `SECURITY DEFINER` trigger projects each valid append-only movement into `inventory_balances`. The runtime role must not have direct INSERT/UPDATE/DELETE/TRUNCATE privileges on balances.
- Authorization boundary: implementation, additive migration, tests, CI and documentation on a branch stacked on #258 are authorized. No Neon access or mutation, no production data, secrets, Worker settings, Cloudflare manual changes, DNS, billing, manual deployment, destructive data operations or force-push.
- Relevant original request: resolve the documented P1 inventory privilege gap; do not leave useful PR work abandoned. Preserve the eight approved inventory decisions. #193 §7.9.I is a technical proposal, not proof of implementation or production applicability.

## Scope and exclusions

Included:
- Add migration 0019 and assertions after #258 migrations 0017/0018.
- Replace balance-first + movement-second application writes with movement-only writes in inventory count confirmation and atomic checkout.
- Add a narrow SECURITY DEFINER balance-lock helper so runtime can preserve ordered row locking without UPDATE privilege.
- Revoke runtime INSERT and column-scoped UPDATE on `inventory_balances`; retain SELECT and ledger INSERT.
- Add defense-in-depth guard against direct balance writes, retaining immutable identity and TRUNCATE protection.
- Remove obsolete transaction-intent pairing machinery only after the projection path and assertions are installed in the same atomic migration.
- Update runtime-role smoke, migration-check, CI assertions, integration tests, ODD and continuity evidence.

Excluded:
- No change to approved inventory business rules, movement semantics, branch/tenant authorization, checkout pricing, payment policy or idempotency contract.
- No automatic stock backfill or distribution from `products.stock_quantity`.
- No Neon main/rehearsal writes, production migration, secret or deployment changes.
- No direct merge of #258 or this stacked PR without exact-HEAD CI and required independent review.

## Acceptance criteria

- [x] AC-1 — a runtime login cannot INSERT, UPDATE, DELETE or TRUNCATE `inventory_balances`; it can SELECT and execute only the narrow lock helper.
- [x] AC-2 — a valid runtime INSERT into `warehouse_inventory_movements` updates/creates the exact balance atomically through a SECURITY DEFINER trigger owned by the migrator/object owner.
- [x] AC-3 — negative movements cannot reduce on-hand below reserved quantity; missing balance/insufficient available stock fails closed.
- [x] AC-4 — opening and physical count confirmation produce the same balances and ledger deltas as before, including zero-count/no-op behavior and stale snapshot rejection.
- [x] AC-5 — checkout remains atomic, idempotent and concurrency-safe; failed sale rolls back payment, movement, balance projection and audit together.
- [x] AC-6 — runtime row locks remain tenant/branch scoped and preserve deterministic lock order without direct UPDATE privilege; every movement INSERT locks its active warehouse before count validation and projection.
- [x] AC-7 — migration 0019 applies atomically after 0018, has assertions and injected-failure rollback coverage, and the canonical migration runner succeeds from an empty PostgreSQL database.
- [x] AC-8 — full CI, runtime-role smoke and PostgreSQL integration tests pass on the exact final HEAD.
- [x] AC-9 — no unrelated code, product policy, Neon, secrets or production configuration changes.
- [x] AC-10 — an all-zero opening count is recorded without a synthetic balance/movement row, and a second confirmed opening is rejected by application logic and a unique partial index.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Trigger ordering or SECURITY DEFINER privilege errors | Critical | Full-schema PostgreSQL 18 migration tests; explicit function owner/search_path/EXECUTE ACL assertions |
| Stock underflow or reserved-stock violation | Critical | Negative movement predicate checks `on_hand + delta >= reserved`; concurrent negative-movement tests |
| Deadlock or stale physical-count snapshot | High | Preserve warehouse→balance→document lock order; narrow SECURITY DEFINER lock helper; concurrency tests |
| Runtime cannot SELECT FOR UPDATE after UPDATE revoke | High | Replace direct row lock with SECURITY DEFINER helper and assert tenant/branch scoping |
| Checkout/count regression | Critical | Movement-only writers plus existing end-to-end PostgreSQL suites |
| Migration destroys outstanding intent evidence | High | Assert private intent table is empty before dropping; same-transaction migration and rollback test |
| Stacked PR drift | Medium | Base this branch on #258 HEAD; never reuse CI from the parent SHA |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Reconcile #193 §7.9.H–I against current schema and writers | Accurate implementation plan | GitHub source, migrations 0006/0010/0011/0012, inventory-counts and #258 checkout reviewed | complete |
| Create durable ODD task before source changes | This file exists on feature branch | GitHub contents API commit | complete |
| Implement 0019 projection, lock helper and least-privilege grants | Database-enforced ledger projection | Migration assertions + rollback + full PostgreSQL CI | complete — exact HEAD f2fb1f0 |
| Convert count and checkout writers | Movement-only stock writes; all-zero opening remains one-time | Inventory-count, inventory-read and atomic-checkout PostgreSQL suites | complete — exact HEAD f2fb1f0 |
| Harden smoke/CI and document evidence | Runtime principal proves allowed/denied actions | 8/8 check-runs; CI, migration validation, runtime smoke, backup/restore, security and secret scans all successful on exact HEAD f2fb1f0 | complete |
| Independent architecture/security/QA review | Review of complete diff | No formal reviews or review threads exist yet; owner/independent review remains a merge gate | pending |

## Technical decisions

- Keep the current business ledger append-only. The balance becomes a projection, not a second writable source of truth.
- Use the existing warehouse mutex and a narrow SECURITY DEFINER helper for balance row locks; do not require runtime UPDATE on the balance table merely to use `SELECT FOR UPDATE`.
- Projection must preserve `balance_version` trigger behavior and the invariant `reserved_quantity <= on_hand_quantity`.
- Positive movements may INSERT/UPSERT a balance; negative movements must UPDATE an existing row only when the resulting on-hand quantity remains at least the reserved quantity.
- Use `SET search_path = pg_catalog` and fully qualify application objects in SECURITY DEFINER code. Revoke EXECUTE from PUBLIC; grant only what trigger/lock callers require.
- Migration 0010's transaction-intent mechanism is historical defense-in-depth; migration 0019 may remove it only after replacing it with ledger-driven projection and verifying there are no unconsumed intents.
- Keep this branch stacked on #258 because checkout is a new movement writer and its migration 0017/0018 sequence is required.

## Closure and handoff

- Final commit SHA: `f2fb1f0bdb2976050cd69f1689c799c9eb8ac771`
- PR: #262 Draft, base `feat/sales-checkout-recovered-main-20261108` (PR #258); mergeable=true; branch is one commit behind the current base branch after the CI-trigger improvement.
- Checks and exact outcomes: 8/8 check-runs successful on the exact HEAD; full CI build/typecheck, unit tests, inventory count/read, atomic checkout and runtime-role API integration all passed. Migration validation passed both PR and push runs, including injected rollback and runtime-role smoke. Backup/restore, Cloudflare Pages, Workers build, Trivy, secret-history and security scans passed.
- Acceptance criteria met / unmet: AC-1 through AC-10 met in disposable PostgreSQL/CI. Formal independent review and Neon rehearsal are not complete.
- Limitations not verified: Neon role ownership and Worker DATABASE_URL identity remain unverified; #193's reduced-schema experiments do not prove production Neon behavior.
- Residual risks: CI proves the disposable PostgreSQL contract, not Neon role identity/ownership or the production Worker's actual DATABASE_URL principal. Runtime retains INSERT on the append-only movement table by design; migration 0019 enforces active warehouse locking, count-linked movement validation and balance/reserved-stock projection, but it does not add source-document authorization for future purchase-receipt, transfer, return or reservation movement types. Those endpoints must not be exposed until their per-type source/actor/tenant authorization contracts and tests are implemented. No production readiness claim until Neon rehearsal, runtime identity/grants, backup/restore and end-to-end operational gates are independently verified.
- Next step: implement migration 0019 and convert both application balance writers.
