# Backlog Recovery Ledger — BTF14 / Micro-app

**Snapshot:** 2026-11-06  
**Repository:** `BTF14/Micro-app`  
**Recovery branch:** `chore/backlog-recovery-ledger-20261106`  
**Observed main baseline:** `9e0a0b5ead33dd3d43ac6182a9ea1de550adfd14`  
**Open PR count:** 25 (live query via GitHub listing; this supersedes older counts in historical checkpoint text).

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
| #210 | `ab5d2168a11f6feb8b70191a704f627713cdc07` | `666236bc7b2c7e1dd1e30d9ccdc467e37c40784b` | yes | 24 | Transactional inventory balance-ledger coupling; high-priority integrity requirement. Verify SHA from live PR before cherry-pick (see note below). |
| #209 | `666236bc7b2c7e1dd1e30d9ccdc467e37c40784b` | `962b5e9d34cc23d7bb5929cd17b4599f4da06db4` | yes | 2 | Inventory count snapshot/ledger delta validation; integrate with #200/#205 semantics. |
| #208 | `32c7217a21b7a3719ebf72940419779a7b42c027` | `c0bcbbe48aa8783b85ee7787dd1ae8a6d0dfdafc` | yes | 21 | Register-shift own-shift roles after inventory migration; reconcile after role and inventory contract. |
| #207 | `962b5e9d34cc23d7bb5929cd17b4599f4da06db4` | `32c7217a21b7a3719ebf72940419779a7b42c027` | yes | 16 | Append-only audit logs; preserve immutability and test runtime denial paths. |
| #205 | `c0bcbbe48aa8783b85ee7787dd1ae8a6d0dfdafc` | `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` | yes | 27 | Idempotent inventory count creation; reconcile with count schema and #233. |
| #204 | `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` | `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e` | yes | 8 | Isolated inventory integration fixtures; preserve test isolation. |
| #202 | `e23c63b597b2c7ff547dff62eed04edd76cc9747` | `7b0f057b8c152515005feed40305143c0ebb94b0` | yes | 160 | Stale checkpoint docs; recover only still-valid decisions, rewrite from live facts; do not merge 160-commit history. |
| #200 | `464ca08b9020fad128cc9c8a321568493d484517` | `7b0f057b8c152515005feed40305143c0ebb94b0` | yes | 37 | Tenant catalog + warehouse inventory; diverged (33 ahead/3 behind in prior compare), mergeable=false; preserve unique inventory/catalog changes. |
| #193 | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | `705d3db3220894c7d3baca8dc7e7a6b623dfbb94` | no | 5 | Phase B inventory scope docs; reconcile against implementation and retain only current useful design. |

> Live refs are authoritative: re-fetch the PR metadata before using a SHA for any patch or cherry-pick. This ledger is a snapshot, not a substitute for a fresh ref check.

## Active recovery sequence

### Front A — Inventory integrity and migration sequence
1. Re-fetch live metadata and changed filenames for #200, #204, #205, #207, #208, #209, #210, and #222–#226.
2. Build a file-level provenance map: PR → changed path → unique hunks/behavior → dependency → target file on new branch.
3. Reconcile the two different warehouse migration definitions, preserving count idempotency and balance-version snapshot invalidation. Add explicit tests for both behaviors.
4. Reconcile migration numbering from current `main`; update paired assertions, CI workflow references, runner, fixtures, docs and expected checksums together.
5. Validate on disposable PostgreSQL only. Do not connect this recovery workflow to production Neon.

### Front B — Money, BCV, catalog and checkout
1. Recover #227–#233 in dependency order, not by merging their stacked branches.
2. Preserve integer/BigInt exact decimal operations and decimal string serialization; no floating-point money arithmetic.
3. Remove all discount functionality and discount assumptions.
4. Verify BCV official source, extraction, rate date/time, freshness, precision and stale/error handling.
5. Recover catalog read/write authorization and atomic checkout only after the integrated database contract is stable.
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
- No Neon production writes, role/grant changes, secret changes, DNS changes, manual Cloudflare changes, or production deployments performed.

## Next update format

For each PR, record: live head/base SHA; changed file list; unique changes retained; conflicting hunks; target commit/PR; tests run on final SHA; unresolved blockers; disposition. Mark a source PR superseded/closed only after its unique changes are verified in the consolidated replacement.
