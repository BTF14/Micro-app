# ODD task: reconcile inventory idempotency, register roles, and append-only audit stack

- Status: in progress
- Risk: critical
- Issue: #53
- Branch/PR stack: #200 inventory foundation; #204 inventory test isolation; #205 count idempotency; #208 register-shift roles; #207 append-only audit
- Started: 2026-11-05 UTC

## Objective

Integrate the parallel inventory-count idempotency work (#205) into the roles/audit branch stack without losing inventory improvements, duplicating migration history, weakening tests, or changing production resources.

## Authorization and boundaries

The owner has authorized autonomous engineering changes when technically necessary, verified, and safe for production. This task is limited to repository branches and disposable CI PostgreSQL. Do not mutate main, Neon main/production, real data, secrets, Cloudflare settings, DNS, billing, or deploy production. No force-push. Do not merge PRs until the complete resulting stack, reviews, checks, and required gates are satisfied.

## Current verified topology

- #200: inventory base, HEAD `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e`.
- #204: base #200, HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20`.
- #205: base #204, HEAD `c0bcbbe48aa8783b85ee7787dd1ae8a6d0dfdafc`; changes migration 0005, inventory-counts.ts and integration tests.
- #208: base #200, HEAD `76a246ea141eedbee877608e7c0f50d6a07f3019`; changes migration 0006, authorization/role helpers and tests.
- #207: base #208, HEAD `3e4490695128e7638d5e71ee822dccf134fc2bce`; migration 0007 and audit guards/tests.
- #205 and #208 are sibling branches, not a linear stack. GitHub compare reports divergence (17 commits on #208-only side and 35 on #205-only side); overlap is limited to inventory migration/count implementation/tests.

## Required final ancestry

`#200 → #204 → #205 → #208 → #207`

Migration order must remain:
1. `0005_warehouse_inventory.sql` including idempotency columns/indexes from #205.
2. `0006_register_shift_member_roles.sql` from #208.
3. `0007_audit_logs_append_only.sql` from #207.

## Acceptance criteria

- [ ] Preserve #205 idempotency key/hash implementation, migration constraints/index, and PostgreSQL integration coverage.
- [ ] Preserve #208 role migration/helpers/tests and the approved own-shift contract.
- [ ] Preserve #207 append-only triggers, assertions, audit rollback coverage, and CI workflows.
- [ ] Resolve overlapping `inventory-counts.integration.test.ts` teardown changes so append-only audit triggers remain enabled for runtime assertions and are disabled only in owner-controlled fixture cleanup.
- [ ] Ensure CI and migration-check execute migrations 0001–0007 in order from clean disposable PostgreSQL.
- [ ] Run exact-HEAD CI for #208 and #207 after ancestry integration; no failed or pending required checks.
- [ ] Review the complete compare/diff and tests for idempotency, cross-tenant/branch/role, concurrency, stale-count/ABA, audit rollback, and migration rollback.
- [ ] Update PR descriptions and canonical docs with live SHA/topology/check results; correct stale historical statements without deleting history.
- [ ] Keep both PRs Draft and unmerged until separate runtime ownership/grants and remaining issue #53 production gates are independently verified.

## Risks

- Replacing #200 migration 0005 with a stale #196 snapshot would regress inventory features; preserve #205's migration, which descends from #200.
- Blindly changing PR bases or force-pushing could discard ancestry. Use explicit merge commits and compare exact SHAs.
- Replaying only tests without runtime idempotency code would create false confidence.
- A green CI stack does not prove real Worker DATABASE_URL ownership/grants or production readiness.

## Execution log

- 2026-11-05: live GitHub metadata and check-runs queried for #200/#202/#204/#205/#207/#208. All observed check-runs on these exact SHAs completed successfully.
- 2026-11-05: discovered #205 and #208 are sibling branches; #205 is not an ancestor of #208/#207. Compare #205→#208: diverged, 17 ahead / 35 behind; compare reverse: 35 ahead / 17 behind.
- 2026-11-05: inspected #205 patch; it adds idempotency_key/request_hash to migration 0005 and idempotency logic/tests to inventory counts. #207 currently does not include the runtime idempotency implementation.
