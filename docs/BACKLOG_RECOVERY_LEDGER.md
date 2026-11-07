# Live recovery ledger — 2026-11-07 UTC

- Main: `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`; GitHub open PR count: **21**.
- #251 auth-retention: Draft, HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`; 11/11 PR workflows + 2/2 push security scans SUCCESS. Cleanup uses 48-hour retention, max 500 rows/table/run, `FOR UPDATE SKIP LOCKED`, production-only Cron, preview skip, and admin/runtime PostgreSQL integration. Neon main still lacks bootstrap table and runtime role/grants; do not merge or activate.
- #255 BCV recovery: Draft, HEAD `0ccd2b814a6c581132d761c06ee52f86514979f4`, base #251 HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`; mergeable. Exact-HEAD workflows are running; no green claim yet. Includes #250's future-first/today-second fix, bounded source parser, current/history endpoints, UI, weekday Cron, weekend next-business-day rule and admin/runtime PostgreSQL integration.
- #254 closed as a duplicate recovery attempt; all code/docs copied into #255. #218–#226 closed as superseded after file-level recovery; #218's unique cleanup is in #251. #227 remains open as the source/base for money/catalog/checkout #228–#233. #250 remains a historical source; its fix is present in #255.
- BCV edge policy: weekdays select today's effective date; Saturday/Sunday select nearest future effective date (next business day). Never skip a stale nearest future row. Allow future effective dates up to 7 days for long weekends. Weekday bank holidays have no authoritative calendar yet: fail closed and disable VES conversion until implemented.
- Migration 0013 is already in GitHub main and is not duplicated. Neon rehearsal is read-only verified but has no baseline ledger, no bootstrap table, no warehouses/counts, and runtime grants are not applied. Neon main untouched.
- PR #253 is the current documentation reconciliation branch. Production remains **NOT READY**. No production secrets, Cloudflare settings, DNS, billing or real data were changed.

## Recovery priorities

1. Finish all exact-HEAD checks and independent review on #255; fix every failure before marking Ready.
2. Keep #251 Draft until Neon rehearsal/adoption, schema and runtime grants are proven.
3. Reconcile #228–#231 as superseded where their behavior is already in main; preserve the backup fixture improvement via #256. Port #232's updated checkout design and recover #233's unique handler/tests on #255 without its obsolete migration 0015.
4. Add migration 0017 to align the checkout DB trigger's BCV effective date with the API's weekday/weekend rule; confirm the existing single-currency/exact-full-payment schema contract before enabling checkout.
5. Reconstruct #200's unique inventory changes on current main; do not merge its divergent branch wholesale.
6. Keep #227 as provenance until #228–#233 are rebuilt; #250 is already closed as superseded by #255.


---

- #218's unique 48-hour auth retention behavior has been ported independently in PR #251 (Draft), HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`; hourly production-only Cron, preview skip, PostgreSQL old-vs-fresh retention test, runtime DELETE grant assertions, 10/10 PR workflows SUCCESS including `microapp_runtime`. Do not merge until Neon main has the bootstrap table and dedicated runtime role/grants; #218 remains open for other unique authz deltas.
# Backlog Recovery Ledger — BTF14 / Micro-app

**Snapshot:** 2026-11-06  
**Repository:** `BTF14/Micro-app`  
**Recovery branch:** `feat/recover-inventory-application-20261106`  
**Observed main baseline:** `38e1d61acc083b3c0b9b73edcb2bc7887ca56872`  
**Source backlog snapshot:** 25 open source implementation/documentation PRs. PR #242, #243 and #244 merged; the active recovery branch is `feat/inventory-read-ledger-20261106`. **Current open count after opening its PR: 26 (25 source PRs + next recovery PR)**. Re-query GitHub before future reports.

## Live recovery delta — 2026-11-07 UTC

GitHub reports **28 open PRs** and main `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`. This supersedes the 2026-11-06 snapshot count and refs above.

- #200 HEAD `464ca08b9020fad128cc9c8a321568493d484517` is 37 ahead / 14 behind current main and GitHub reports `mergeable=false`. Current main already has canonical migrations 0005–0016; #200 independently assigns inventory migration 0005 and shifts later migrations. Many auth/catalog/tenant/workflow/lockfile paths overlap. Reconstruct unique functionality on current main; do not merge or rebase this branch wholesale.
- #204 HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` is 8 ahead / 5 behind current #200 head, with one changed file (`apps/api/src/inventory-counts.integration.test.ts`). Its per-test warehouse/product isolation is already present in stronger form on current main; verify the full diff and close as superseded only if no unique behavior remains.
- Provenance check adicional: #205 idempotency columns/index, handler y los 21 test names de su rama están en main (main tiene 24 tests). #207 audit append-only SQL blob = main migration 0008; #208 own-shift roles SQL = main 0007; #209 count-ledger validation SQL = main 0009; #210 balance-ledger coupling SQL = main 0010. Las paired assertions solo cambian el comentario del migration filename. Estas PR parecen supersedidas por main; verificar tests/workflows/docs restantes y dependencias downstream antes de cerrar.
- #227 HEAD `83cf96b7fcb7b0e304f676d21ab721de61364a59` has 13 successful workflow runs, but remains Draft and depends on the older migration/auth stack.
- #250 is a distinct BCV regression fix stacked on #227: HEAD `081ec1026f4bda889a633bb3fcbe420433e13336`, 9 ahead / 0 behind #227, six exact-HEAD workflow runs success. Its disposable PostgreSQL integration test verifies tomorrow-first/today-second, Caracas effective date and same-date idempotency. It remains Draft with no formal review.
- #218 was retargeted from closed #215 to active #211 (51 ahead / 0 behind) for provenance audit. #214 was superseded by merged #213; do not restore its competing rate-limit module or HMAC secret dependency. #215's server-side bootstrap handoff is already integrated into main via #240; main migration 0005 is byte-identical to old branch migration 0010, and main `google-auth.ts` implements opaque handle/state hash plus atomic consumption. #218's duplicate authz/handoff/rate-limit code is obsolete. It does contain unique 48-hour scheduled cleanup of `auth_rate_limits` and `auth_bootstrap_attempts`; main currently only opportunistically prunes rate-limit rows older than 7 days. Preserve the 48-hour cleanup by porting it onto canonical #213 rate-limit code with runtime grant tests and preview skip before closing #218.
- Closed PRs are not discarded: unique work is carried by active branches/comments. Do not close any additional PR until file-level provenance and exact tests confirm the change is preserved.
- No PR merged during this recovery block. No Neon main, production data, secrets, Cloudflare production settings, DNS, billing or production deployment changed. Production remains NOT READY.

### Current recovery order

1. Reconstruct #200 on current main and reconcile migration definitions/checksums.
2. Verify #204's fixture isolation is already present in stronger form on main; if full diff confirms no unique behavior, close as superseded with evidence. Audit #205–#211 against current main before porting.
3. Port #215/#218 bootstrap handoff onto #213's rate limiter and verify migration 0010 runtime grants.
4. Keep #250's regression intact and rerun all required checks after it is moved to the recovered current-main base.

## Purpose and operating rules

This ledger is the working index for recovering every open PR without losing unique work or importing stale branch history. A PR is not considered recovered merely because its branch exists or its checks are green.

- Keep at most two active implementation fronts.
- Preserve every unique functional, security, test, migration, and documentation change before closing or superseding an old PR.
- Do not merge a diverged/stale stack wholesale. Reconstruct on current `main` from reviewed, unique changes.
- Reconcile SQL migrations, paired assertions, migration runner, workflow fixtures, tests, and documentation as one coordinated sequence. Never change checksums of migrations already applied without a reviewed migration/adoption plan.
- Run required workflows on the exact final head SHA. Review full diffs, dependency graph, required reviews, branch protection, and post-merge checks before merging.
- Owner's standing authorization permits eligible PR merges to `main`; it does not authorize production Neon writes, baseline/ledger adoption, role/grant changes, secrets, DNS, manual Cloudflare changes, billing, or destructive operations.
- Production readiness requires integrated authenticated E2E and production smoke evidence, P0/P1 closure, verified runtime/migrator privileges, migration/baseline plan, backup/restore and operational checks. Preview deployments and green branch checks are not production smoke evidence.

## Current verified constraints

1. `main` already contains `0005_auth_bootstrap_attempts.sql`.
2. Inventory branches introduce a conflicting `0005_warehouse_inventory.sql`; a duplicate auth migration exists later in the historical stack. The migration sequence must be reconciled globally, not by renaming one file in isolation.
3. PR #200 and PR #233 have different contents for `0005_warehouse_inventory.sql`:
   - #200 blob: `bb9020fdca535f84fda0f468e9d3ab86e1cc319c`
   - #233 blob: `ce1995c6a03e769f93e54a6fca0aa2276c63205c`
   - Their paired assertions file is identical: `58071689c493fa5467bbff7d752d7f410cef8d7f`.
   - #233 adds count idempotency fields; #200 carries distinct balance-version/snapshot invalidation logic. Both semantics require preservation and integration tests.
4. Neon main audit was read-only. The populated schema has no `public.schema_migrations` ledger and no `microapp_runtime` / `microapp_migrator` login roles. Do not run the migration runner or write a baseline/ledger against production without an explicit reviewed adoption plan and separate authorization.
5. PR #233 runner preflight was changed to reject a populated schema before creating the ledger. Historical CI success is not evidence that the branch is safe to merge or that Neon production is ready.

## Open PR inventory

The list below is the complete 25-PR open snapshot returned by GitHub. "Recovery disposition" is a plan, not a claim that the code has already been ported.

| PR | Head SHA | Base SHA | Draft | Commits | Workstream / recovery disposition |
|---:|---|---|:---:|---:|---|
| #233 | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | `4d12b4e8d2907c41758ff6dfe1d8d66ed3dc16f8` | yes | 83 | Atomic checkout, exact money, inventory ledger, BCV and migrations. Preserve unique changes; do not merge 408-ahead/7-behind stack wholesale. |
| #232 | `4d12b4e8d2907c41758ff6dfe1d8d66ed3dc16f8` | `762a722ba4b1eec8d8e752213f1d8f909e2e741d` | yes | 1 | Checkout design/gates; reconcile against implemented behavior and retain decisions/docs. |
| #231 | `762a722ba4b1eec8d8e752213f1d8f909e2e741d` | `60cc107a71585e63f37fb472a6154da32aee4940` | yes | 11 | Authorized catalog create/edit; recover independently of old stack. |
| #230 | `60cc107a71585e63f37fb472a6154da32aee4940` | `163a532126fa3d606f951369dacf52603e59c231` | yes | 10 | Read-only catalog and exact BCV pricing; coordinate with #227–#229. |
| #229 | `163a532126fa3d606f951369dacf52603e59c231` | `51e8cf4c402873b9e37849fabfdb46c3c9a13501` | yes | 20 | BigInt decimal engine; preserve exact arithmetic and centavo handling. |
| #228 | `51e8cf4c402873b9e37849fabfdb46c3c9a13501` | `aff197a497d612b6785da8d105a8b593e3db6295` | yes | 18 | Exact decimal contract and removal of discounts; no discounts is approved product rule. |
| #227 | `aff197a497d612b6785da8d105a8b593e3db6295` | `adf1b4ab4fde58ddbe41fdeaf11d5e68b7fbd7f5` | yes | 37 | BCV rate integration; verify official source, extraction, timestamps, freshness, precision and failure behavior. |
| #226 | `adf1b4ab4fde58ddbe41fdeaf11d5e68b7fbd7f5` | `a58f862b46119acb67377d843f218e5820a86779` | yes | 11 | Checksum-ledger migration runner; preserve fail-closed and adoption protections. |
| #225 | `a58f862b46119acb67377d843f218e5820a86779` | `0c1e071028df87c42c50fdf7eba6fa3e3400d2dc` | yes | 4 | Atomicity of legacy migrations in CI; reconcile helper assumptions and full migration suite. |
| #224 | `0c1e071028df87c42c50fdf7eba6fa3e3400d2dc` | `dc47c3ecc5f47f3f2dc49e5366d85d7f43b0e990` | yes | 19 | Runtime least-privilege grants; test actual login role and negative privileges. No production grants authorized. |
| #223 | `dc47c3ecc5f47f3f2dc49e5366d85d7f43b0e990` | `d72a5af1b856b7bfc52466bb44a187e1dc05f417` | yes | 3 | Hardened SECURITY DEFINER lock helpers; audit search_path, ownership, EXECUTE grants and transaction semantics. |
| #222 | `d72a5af1b856b7bfc52466bb44a187e1dc05f417` | `18dfc33525c792802c296469ee6140d3b5f649ff` | yes | 1 | Runtime role contract/harness design; retain as security acceptance criteria. |
| #221 | `18dfc33525c792802c296469ee6140d3b5f649ff` | `40cf9e2cff5e88a5feec7b8168c8f436cb3f0601` | yes | 1 | Central authorization policy for catalog cost projection; reconcile with current auth policy. |
| #220 | `40cf9e2cff5e88a5feec7b8168c8f436cb3f0601` | `2115d66cca18ee094ee3b3f8148ac6a61df040da` | yes | 7 | Streaming request-body limit; recover unique security change onto current auth baseline. |
| #218 | `2115d66cca18ee094ee3b3f8148ac6a61df040da` | `9ba4f76e0c155ceaff911a4033406a8afa9f09cd` | yes | 15 | Central authorization for existing API routes; recover unique changes; old dependency chain is stale. |
| #211 | `1ebb998b9711f6feb8b70191a704f627713cdc07` | `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` | yes | 1 | Authentication/rate-limit audit docs; update to current code and P0 issue #53. |
| #210 | `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` | `666236bc7b2c7e1dd1e30d9ccdc467e37c40784b` | yes | 24 | Transactional inventory balance-ledger coupling; high-priority integrity requirement. Verify SHA from live PR before cherry-pick (see note below). |
| #209 | `666236bc7b2c7e1dd1e30d9ccdc467e37c40784b` | `962b5e9d34cc23d7bb5929cd17b4599f4da06db4` | yes | 2 | Inventory count snapshot/ledger delta validation; integrate with #200/#205 semantics. |
| #208 | `32c7217a21b7a3719ebf72940419779a7b42c027` | `c0bcbbe48aa8783b85ee7787dd1ae8a6d0dfdafc` | yes | 21 | Register-shift own-shift roles after inventory migration; reconcile after role and inventory contract. |
| #207 | `962b5e9d34cc23d7bb5929cd17b4599f4da06db4` | `32c7217a21b7a3719ebf72940419779a7b42c027` | yes | 16 | Append-only audit logs; preserve immutability and test runtime denial paths. |
| #205 | `c0bcbbe48aa8783b85ee7787dd1ae8a6d0dfdafc` | `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` | yes | 27 | Idempotent inventory count creation; reconcile with count schema and #233. |
| #204 | `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` | `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e` | yes | 8 | Isolated inventory integration fixtures; preserve test isolation. |
| #202 | `e23c63b597b2c7ff547dff62eed04edd76cc9747` | `7b0f057b8c152515005feed40305143c0ebb94b0` | yes | 160 | Stale checkpoint docs; recover only still-valid decisions, rewrite from live facts; do not merge 160-commit history. |
| #200 | `464ca08b9020fad128cc9c8a321568493d484517` | `7b0f057b8c152515005feed40305143c0ebb94b0` | yes | 37 | Tenant catalog + warehouse inventory; diverged (33 ahead/3 behind in prior compare), mergeable=false; preserve unique inventory/catalog changes. |
| #193 | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | `705d3db3220894c7d3baca8dc7e7a6b623dfbb94` | no | 5 | Phase B inventory scope docs; reconcile against implementation and retain only current useful design. |

> Live refs are authoritative: re-fetch the PR metadata before using a SHA for any patch or cherry-pick. This ledger is a snapshot, not a substitute for a fresh ref check.

## File-level provenance map — inventory / database work

Changed filenames were fetched from GitHub's paginated PR file listing. These are source paths, not proof that a change is ready to port.

| PR | Changed files | Key paths / role |
|---:|---:|---|
| #200 | 42 | First inventory/catalog vertical slice: `0005_warehouse_inventory.sql`, `inventory-counts.ts`, `inventory-locks.ts`, branch/tenant context, catalog routes, integration tests, CI workflows, docs. |
| #204 | 1 | Inventory integration-test fixture isolation only: `inventory-counts.integration.test.ts`. Depends on the inventory implementation/schema. |
| #205 | 3 | Adds count idempotency to `0005_warehouse_inventory.sql`, `inventory-counts.ts`, and integration tests. |
| #207 | 9 | Audit append-only migration/assertions plus CI and integration coverage. |
| #208 | 11 | Register-shift role migration and authorization/shift tests. |
| #209 | 5 | Inventory count ledger validation migration/assertions and workflow references. |
| #210 | 7 | Inventory balance↔ledger coupling migration, deferred-failure fixture, integration tests. |
| #222 | 1 | Runtime role contract design document. |
| #223 | 9 | Runtime lock-helper migration/assertions and branch/tenant/inventory locking code/tests. |
| #224 | 16 | Runtime role grants migration/assertions, fixtures, smoke tests, and CI/backup/E2E workflow changes. |
| #225 | 3 | Atomic migration test helper and workflow changes. |
| #226 | 3 | Migration runner, its workflow, and operator documentation. |

### Current main-vs-source implementation status — reconciled 2026-11-07

The earlier statement that main lacked inventory handlers/locks is superseded by the later integration of PR #244 and the canonical migration chain. Live checks on current `main` (`fc332946a9128e92ce39a3eb1ef1ee7ebd261598`) confirmed:
- `apps/api/src/inventory-counts.ts`, `inventory-locks.ts`, `catalog.ts`, `catalog-write.ts` and `inventory-read.ts` all exist on main.
- Main's `inventory-counts.integration.test.ts` already uses `beforeEach`, creates a warehouse and product per test, and has `seedInventoryBalanceFor` that records fixture ledger movements. This is stronger/more complete than the old #204 fixture-isolation patch. #204 is likely superseded; compare its full diff before closing.
- Main's canonical sequence is now 0001–0016: 0005 auth bootstrap, 0006 warehouse inventory, 0007 register-shift roles, 0008 audit append-only, 0009 count-ledger validation, 0010 balance-ledger coupling, 0011 runtime lock helpers, 0012 runtime grants, 0013 BCV precision/grants, 0014–0015 sales, 0016 inventory ledger read.
- #200 still uses a conflicting sequence (inventory at 0005, roles at 0006, audit at 0007, count ledger at 0008, balance coupling at 0009, auth bootstrap at 0010). Its branch also overlaps current main across auth, catalog, tenant context, workflows, lockfile and inventory code. Do not port old migration files or branch snapshots wholesale.
- #200/#204/#205/#207–#211 must now be reviewed as possible superseded source PRs against the integrated implementation. Preserve any demonstrably unique behavior/tests/docs; close only after file-level evidence and explicit comments. Do not assume every old PR still represents missing functionality.

### Integrated recovery PRs
- PR #242 (backlog ledger) merged to `main` at `7a719d593248341aac86b1ded980d5bb9a6f94e8`.
- PR #243 (canonical migrations and runner) merged to `main` at `38e1d61acc083b3c0b9b73edcb2bc7887ca56872`. Its final head `481f3b956c96c50b6f956541d1d675646fe66b51` passed 10/10 workflows, including all PostgreSQL migration/assertion/rollback and runner checks.
- The current recovery branch is `feat/recover-inventory-application-20261106`, based on that main. It ports tenant authorization/locking, catalog read/write, inventory counts, shared BigInt money, preview isolation, and bounded request bodies. Its checks have not yet run on a PR SHA.

## Active recovery sequence

### Front A — Inventory integrity and application routes
1. Schema sequence 0001–0015, paired assertions, runner and role harness are integrated in main via #243.
2. Current branch ports inventory count lifecycle/idempotency, balance/ledger locks, branch/tenant authorization, own-shift helper, catalog read/write routes and PostgreSQL integration suites.
3. CI now applies the canonical runner, executes assertions, and tests admin plus runtime-role paths. Await exact-SHA workflows and fix all failures before marking ready.
4. After integration, recover remaining inventory read/movement endpoints and reconcile any unique tests from #200/#204/#205/#207–#210/#223/#224.

### Front B — Money, BCV and checkout
1. BigInt decimal package and catalog UI/API are being recovered in the current branch; no floating-point money arithmetic.
2. No discounts are included in the money/catalog policy or product form.
3. #227 has a recorded future-effective-date ordering bug: storing tomorrow's BCV row first can block today's row. Fix and test this before enabling BCV.
4. Recover BCV official source, extraction, rate date/time, freshness, precision and stale/error handling.
5. Recover checkout application code only after DB invariants and runtime-role integration are validated.
6. Run integration/E2E and security checks on the final consolidated head.

### Authentication and documentation
- Recover unique security changes from #218/#220 onto the already-integrated auth baseline; do not restore obsolete handoff dependencies.
- Reconcile #211, #193 and #202 docs from current facts. Historical docs are not authoritative for live SHAs, migration state, or deployment status.
- P0 issue #53 remains a production gate until its controls and evidence are closed.

## Progress log

### 2026-11-06 — Initial recovery baseline
- Queried GitHub open PR listing: 25 open PRs.
- Confirmed #200 and #233 are not safe to merge as whole branches.
- Compared #200 and #233 warehouse migration blobs and found distinct schema semantics.
- Added recovery rationale comments to #200 and #233.
- Created this ledger branch from current `main`.
- No application code or SQL migrations have been ported in this commit.
- Opened draft PR #243 from `feat/recover-schema-migrations-20261106` to `main`; it carries the canonical migration sequence, paired assertions, runner, PostgreSQL runtime-role harness and docs. It is 36 commits ahead / 0 behind with 28 changed files; all required checks are still being evaluated.
- Corrected the migration sequence in the recovery branch: keep main's auth bootstrap at 0005; inventory 0006; shift roles 0007; audit 0008; count-ledger validation 0009; balance-ledger coupling 0010; runtime locks 0011; runtime grants 0012; BCV 0013; no-discount 0014; checkout 0015. The old 0010 auth duplicate is omitted.
- Main's API still lacks the inventory route and lock modules; PR #243 is schema/validation only and does not yet port application handlers.
- Recorded a BCV recovery finding on #227: the parser accepts a next-day effective rate, while persistence can reject today's rate if that future row was stored first. The recovery must allow today's row alongside a future row and test the ordering; stale rows must not become valid implicitly.
- No Neon production writes, role/grant changes, secret changes, DNS changes, manual Cloudflare changes, or production deployments performed.

## Next update format

For each PR, record: live head/base SHA; changed file list; unique changes retained; conflicting hunks; target commit/PR; tests run on final SHA; unresolved blockers; disposition. Mark a source PR superseded/closed only after its unique changes are verified in the consolidated replacement.

### 2026-11-06 — Schema recovery integrated; application recovery underway
- Merged #242 (ledger) and #243 (canonical migration sequence/runner) after required checks passed. Current `main`: `38e1d61acc083b3c0b9b73edcb2bc7887ca56872`.
- #243 final SHA `481f3b956c96c50b6f956541d1d675646fe66b51`: 10/10 workflows passed. PostgreSQL validated migrations 0001–0015, assertions, rollback atomicity, runtime login privileges, checksum drift, ledger gaps, interrupted states, populated-schema baseline rejection, advisory lock and runtime ledger denial.
- Current branch `feat/recover-inventory-application-20261106` ports catalog read/create/update, inventory count creation/confirmation with required Idempotency-Key, tenant/branch locking, own-shift helper, BigInt decimal package, bounded streaming bodies and preview API isolation. Adds admin/runtime-role integration tests and web catalog UI. Not yet validated by PR workflows.
- Removed discount operations from the recovered authorization policy and kept discount fields out of product forms.
- Recorded the BCV future-date persistence ordering issue on #227; no BCV API route or checkout handler is being enabled until this is fixed.
- No Neon production writes, roles/grants, secrets, DNS, manual Cloudflare changes or production deployment actions were performed.

- PR #244 opened Draft on 2026-11-06: https://github.com/BTF14/Micro-app/pull/244. Exact HEAD at opening: `d180f2709be7ca0a193cdecb3223709c6a64bb15`; 10 workflows in progress. No production changes.

### PR #244 validation record — 2026-11-06
- Validated HEAD: `d3de5216fac446580e4afdd39376af503cc94b51`; 10/10 workflows SUCCESS.
- Cloudflare Pages and Workers preview deployments succeeded. Worker preview smoke: health 200; application catalog route 503 by design. No production deployment.
- Follow-up hardening included transactional authorization locks for catalog/warehouse/count reads and exact-string decimal input enforcement for inventory counts.
- PR remains Draft pending final diff/review gate. Source PRs remain open until every unique change is recovered.

### PR #244 final integration record
- Merged to main at `158ec68bd55825d6e8d5527d086023a13445a89c`.
- Post-merge 10/10 commit checks SUCCESS, including Cloudflare Pages and Workers Builds.
- Production unauthenticated catalog route returned 401 as expected; no authenticated production smoke or Neon writes.

### Next recovery front — inventory read/kardex
- Branch `feat/inventory-read-ledger-20261106` adds balances and append-only movement read APIs with pagination and role-based cost visibility. Draft PR and exact-SHA checks pending.
- Transfer dispatch/receipt must be designed as a persisted two-stage lifecycle before implementation.
