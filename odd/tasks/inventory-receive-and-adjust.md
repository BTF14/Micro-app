# ODD task: Inventory receive and physical adjustment

- Status: in progress
- Issue / PR: Issue #53 remains OPEN / P0; implementation PR to be opened after exact-HEAD validation
- Owner / reviewer: BTF14 (product owner / Tech Lead); implementation agent
- Started: 2026-11-14 UTC
- Risk: critical

## Objective and authorization

Deliver the approved operational inventory workflows for receiving merchandise and adjusting stock through physical counts, without weakening tenant/branch isolation, append-only ledger semantics, runtime least privilege, role authorization, restore guarantees, or the USD 0 operating constraint.

- Authorization boundary: implement only on `feat/inventory-receive-and-adjust-20261113`, branched from merged `main` at `bc08e00468769a54c69d5c8d6464ff423d5c17d5`. Do not merge the resulting PR. Do not access or mutate Neon `main`, secrets, real data, Cloudflare manually, Cron, or billing.
- Relevant original request: owner/Tech Lead directive dated 2026-11-13 authorizing Block 2, migration 0025, API receipt endpoints, physical-count adjustment UI, PostgreSQL 18 ephemeral integration, React/Vitest tests, and a non-Draft PR only after 100% exact-HEAD checks succeed.
- The merge of PR #351 is complete; Merge SHA and main HEAD are `bc08e00468769a54c69d5c8d6464ff423d5c17d5`.

## Scope and exclusions

Included:
- Add the receiving-document schema and transactional SECURITY DEFINER receive operation in migration `0025`, plus rollback-safe assertions.
- Extend `validate_inventory_movement_source()` compatibly for receipt-backed movements while preserving all existing 0019 contracts, triggers, tokens, and count/sale behavior.
- Enforce idempotency key + canonical payload hash, tenant/branch/warehouse/document scope, deterministic balance locking, ledger projection, and atomic audit logging.
- Add restore ACL profile `bcv-0025` (25 migrations) without weakening existing `main` (16), `bcv` (23), and `bcv-0024` (24) profiles.
- Add branch-scoped GET/POST receipt API routes with trusted-origin, strict payload/body validation, idempotency conflict handling, no-store caching, and sanitized errors.
- Reuse existing physical count create/confirm endpoints for `inventory.adjust`; do not add a second adjustment write mechanism.
- Add role-aware inventory receive and physical-count UI in `InventoryPanel.tsx` and pass explicit `canManageInventory` from `App.tsx`.
- Add PostgreSQL 18 ephemeral integration and React/Vitest tests, then open a non-Draft PR only when all exact-HEAD checks are successful.

Excluded:
- Any modification to `apps/api/src/authorization.ts`, especially `ROLE_OPERATIONS`, `authorizeBranchOperation()`, and `resolveBranchContext()`. Existing role mapping remains authoritative: receive/adjust only Owner, Admin, Inventory; Cashier remains read-only; Inventory is branch-membership scoped.
- Any direct runtime INSERT/UPDATE/DELETE/TRUNCATE/trigger privilege on `inventory_balances`; runtime must append source-authorized ledger movements only.
- Transfers, purchase orders, supplier management, valuation/accounting changes, new role permissions, changes to catalog permissions, and unrelated inventory refactors.
- Running `neon-main-migrations.yml`, connecting to Neon `main`, reading or changing secrets, real data, Cloudflare manual operations, Cron, or enabling `BCV_SYNC_ENABLED`.
- Changes to PRs #193, #314, #315, #316; changing Issue #53 from OPEN/P0; declaring production ready; any paid service or budget above USD 0.

## Acceptance criteria

- [ ] AC-1 — Migration `0025` creates tenant-scoped receipt header/lines with unique idempotency scope and payload hash, constraints, indexes, and FK integrity.
- [ ] AC-2 — Receipt write executes atomically through a `SECURITY DEFINER` function owned by `microapp_migrator`, `SET search_path = pg_catalog, public`, revoked from PUBLIC, with EXECUTE granted explicitly to `microapp_runtime`.
- [ ] AC-3 — `microapp_runtime` has zero direct write privileges (table- and column-level, including inherited/public grants) on `inventory_balances`; the receive function updates stock only through the ledger/projection contract.
- [ ] AC-4 — `validate_inventory_movement_source()` accepts only valid receipt-backed inbound movement and preserves every pre-existing 0019 assertion, trigger name/order, function contract, and rejection token.
- [ ] AC-5 — Lock order is canonical and consistent: tenant/membership -> branch/membership -> warehouse -> receipt document/idempotency -> balances in deterministic product order -> ledger/projection/audit.
- [ ] AC-6 — Audit row and receipt, movements, and balances commit or roll back together, including simulated audit failure.
- [ ] AC-7 — Duplicate idempotency key + identical canonical payload returns the original result; same key + different payload returns HTTP 409; concurrent same-product receipts serialize without lost updates or negative stock.
- [ ] AC-8 — Restore scripts and tests accept exactly 16/23/24/25 migration profiles as applicable; all historical profile counts and assertions remain unchanged and `bcv-0025` is additive only.
- [ ] AC-9 — GET/POST receipt routes are branch-authorized and trusted-origin protected; quantities > 0 with max 3 decimals, unit costs >= 0 with max 4 decimals, required reason <= 500 chars, <= 500 lines, body <= 128 KiB, required `Idempotency-Key`, sanitized errors, and `Cache-Control: private, no-store`.
- [ ] AC-10 — Physical adjustment uses only existing count create/confirm endpoints, absolute counted quantities, mandatory reason, server-calculated differences, and existing stale-snapshot protections.
- [ ] AC-11 — UI exposes receiving and physical count create/confirm only when `canManageInventory` is true (Owner/Admin/Inventory); Cashier sees read-only inventory. Successful operations refresh balances and movement history.
- [ ] AC-12 — PostgreSQL 18 ephemeral tests run as direct `microapp_runtime` login and cover happy path, idempotent retry, payload conflict, same-product concurrency, audit rollback, cashier denial, cross-tenant/cross-branch denial, untrusted origin, and direct balance-write denial.
- [ ] AC-13 — React/Vitest tests cover receiving and physical count workflows, refresh behavior, validation, and role isolation.
- [ ] AC-14 — Full relevant test suite, migration runner, assertions, restore-profile tests, static analysis, and CI succeed on the final exact HEAD; no check from an earlier SHA is reused.
- [ ] AC-15 — A non-Draft PR is opened only after 100% exact-HEAD checks succeed; PR is not merged by this agent. Issue #53 remains OPEN/P0 and production remains NOT READY.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Runtime can mutate balance projection directly | Critical | Migration ACL revokes and assertions inspect effective table/column privileges and PUBLIC ACLs. |
| Ledger validator regression | Critical | Preserve 0019 SQL contracts, triggers, ordering, and all assertion tokens; run original assertions unchanged. |
| Deadlock / lost stock update | Critical | Document canonical lock order; deterministic product ordering; PostgreSQL concurrency tests. |
| Duplicate receipt or replay with changed payload | High | Scoped unique idempotency key, canonical hash, immutable response/result semantics, conflict 409. |
| Audit failure leaves partial inventory state | Critical | Audit inserted in same DB transaction/function; injected failure test proves full rollback. |
| Restore profile drift | High | Add 25-only profile while retaining 16/23/24 tests and ledger checksum validation. |
| Role or branch authorization bypass | Critical | Leave authorization.ts unchanged; server and DB checks; Cashier/cross-scope denial tests. |
| Untrusted origin / oversized payload | High | `isTrustedOrigin`, 128 KiB body cap, strict schema and bounded line count. |
| BCV / production / cost scope creep | Critical | No Neon main, secrets, Cron, Cloudflare manual, BCV enablement, paid tools, or real data. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Reconcile main and branch baseline | PR #351 merged; feature branch based on merge SHA | GitHub PR, main ref and branch ref | completed |
| Read ODD, constitution, security, inventory and permission contracts | Constraints and current implementation understood | Repository files at merge SHA | completed |
| Inspect 0019 and restore profile contracts | Exact compatibility points identified | Migration/assertions/scripts review | in progress |
| Design migration 0025 and assertions | Receipt schema/function/validator/ACL contract | SQL review + PostgreSQL 18 | pending |
| Add additive restore profile bcv-0025 | Restore scripts support 25 without weakening old profiles | Shell profile tests + ephemeral restore | pending |
| Add API receipt GET/POST | Strict, authorized, idempotent endpoints | API integration tests | pending |
| Wire InventoryPanel and App | Receive + physical count workflows; role isolation | React/Vitest | pending |
| Run complete verification and independent review | All acceptance criteria evidenced | Exact-HEAD CI, diff/security/QA review | pending |
| Open non-Draft PR | Reviewable implementation PR, no merge | GitHub PR + exact-HEAD checks | pending |

## Technical decisions

- `inventory_balances` remains a projection, not a write surface. Receipt writes append ledger movements; the database projection trigger owns balance updates.
- Physical adjustment remains the existing physical count workflow; do not create an alternate direct adjustment endpoint or table.
- The receipt document is immutable once accepted for stock posting; idempotency replay returns the original receipt result and payload mismatch is a conflict.
- Keep the source validator's 0019 behavior byte-for-byte conceptually intact; add a narrowly scoped receipt branch without weakening count or sale validation.
- Any new lock step must fit the established order and avoid reverse lock acquisition from triggers. Database-side checks must use safe NOWAIT/consistent ordering where required by existing 0019 behavior.
- The 0025 assertions are additive; the existing 0019 assertions file must not be edited to make new behavior pass.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
