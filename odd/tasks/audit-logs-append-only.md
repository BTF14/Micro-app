# ODD task: make general audit logs append-only

- Status: in progress
- Issue / PR: Issue #53; stacked on PR #200 (inventory foundation)
- Owner / reviewer: repository owner / senior engineering review
- Started: 2026-11-05
- Risk: critical

## Objective and authorization

- Desired outcome: enforce database-level append-only behavior for `audit_logs`, prove the intended runtime privilege boundary on disposable PostgreSQL, and document what cannot be verified without inspecting the real runtime connection role.
- Authorization boundary: authorized to investigate and implement reversible code/migration/test/documentation changes on a dedicated branch. Strictly exclude Neon main/production, real data, Cloudflare settings, Worker secrets, DNS, billing, deployments, main, force-push and merges.
- Relevant original request: continue the Micro-app security and inventory work as senior engineer; prioritize the `audit_logs` audit; perform static review and isolated tests only; do not modify real databases.

## Scope and exclusions

Included:
- Inspect all current migrations, audit write call sites, database connection configuration and existing audit/ledger protections.
- Add PostgreSQL protections against UPDATE, DELETE and TRUNCATE of `audit_logs`.
- Add disposable-PostgreSQL assertions for allowed append/read behavior, rejected mutation paths, and a non-owner runtime role with least-privilege grants.
- Verify audit inserts remain in the same transaction as the business writes that emit them.
- Record the runtime-role verification gap without reading, changing or exposing the production connection secret.
- Reconcile migration numbering with the inventory/role migration stack before choosing the final migration filename.

Excluded:
- Reading or changing Neon main/production, real data, Cloudflare secrets or environment configuration.
- Creating/changing production PostgreSQL roles or rotating `DATABASE_URL`.
- Claiming the effective production runtime privileges are verified without a safe, authorized, read-only source of evidence.
- Merging any PR or changing main.

## Acceptance criteria

- [ ] AC-1 — every migration and runtime call site affecting `audit_logs` is inventoried; no existing protection is assumed from the inventory ledger.
- [ ] AC-2 — PostgreSQL rejects UPDATE, DELETE and TRUNCATE of `audit_logs`, including direct SQL that bypasses application services.
- [ ] AC-3 — a disposable non-owner runtime role can perform only the intended SELECT/INSERT operations and cannot alter table ownership, privileges or triggers.
- [ ] AC-4 — audit INSERT remains transactionally coupled to the corresponding business operation; induced audit failure rolls back the business write.
- [ ] AC-5 — migration ordering is collision-free with inventory 0005 and the register-role migration currently also named 0005; assertions and CI apply the complete ordered stack from a clean PostgreSQL database.
- [ ] AC-6 — exact final HEAD CI and PostgreSQL migration/assertion results pass; full diff and security review are recorded.
- [ ] AC-7 — documentation distinguishes verified database guarantees from the still-unverified effective production runtime role.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Runtime database role owns `audit_logs` and can bypass trigger protections | Critical | Test a non-owner role in disposable PostgreSQL; do not claim production role separation without verified runtime-role evidence |
| TRUNCATE bypasses row-level UPDATE/DELETE triggers | High | Add a statement-level BEFORE TRUNCATE guard and explicit privilege assertions |
| Migration-number collision with register roles 0005 | High | Reserve inventory as 0005; coordinate register roles as 0006 and audit protection after that; validate the final sequence before naming |
| Audit failure leaves business mutation committed | Critical | Preserve same-transaction writes and prove rollback with PostgreSQL integration tests |
| Accidental production mutation or secret disclosure | Critical | No Neon/Cloudflare writes or secret reads; all SQL tests use disposable PostgreSQL |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Reconcile GitHub and current PR stack | Current bases, HEADs and CI are known | Live GitHub metadata, exact-SHA workflow runs/check-runs | complete |
| Static audit of audit_logs | DDL, triggers, grants and callers inventoried | 0001 DDL; code search; catalog and inventory audit INSERT call sites | complete |
| Design mutation guard and runtime-role test | Testable DDL and privilege contract | Migration and assertion SQL drafted; PostgreSQL execution pending CI | complete |
| Implement migration and assertions | UPDATE/DELETE/TRUNCATE rejected; SELECT/INSERT supported | `0007_audit_logs_append_only.sql` and `.assertions.sql` added; exact-HEAD CI pending | in progress |
| Verify transaction coupling | Business write rolls back on audit insert failure | Existing inventory rollback test retained; catalog/inventory teardown updated for append-only trigger | in progress |
| Reconcile documentation and handoff | Current state, journal and handoff reflect evidence and gaps | Exact SHA and diff review | pending |

## Technical decisions

- The legacy `audit_logs` table is created in migration 0001. The current DDL has no append-only trigger, and repository search found no explicit audit-log GRANT/REVOKE policy.
- The inventory ledger's append-only trigger is separate and does not protect `audit_logs`.
- Runtime connects through the single Worker binding `DATABASE_URL`; the effective PostgreSQL username and privileges are not inferable from checked-in code and will not be read from secrets.
- A database trigger is not sufficient if the runtime role owns the table or can disable/drop its triggers. Production closure therefore requires proof that runtime is a non-owner with least privilege; this task will not alter the production role or secret.
- Migration numbering must be collision-free. Inventory currently occupies 0005; PR #194 still has a distinct register-role migration also named 0005. The planned sequence is inventory 0005, register roles 0006, audit-log hardening after both; verify the actual integration graph before finalizing the filename.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
