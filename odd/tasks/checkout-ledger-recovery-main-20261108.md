# ODD task: recover atomic checkout and ledger-authoritative inventory on current main

- Status: recovery branch created; implementation not yet ported or validated
- Date: 2026-11-08 UTC
- Source PRs: #258 (checkout, migrations 0017/0018), #262 (ledger projection, migration 0019)
- Base: main `5f09b87aee09d0746f6ea90f076b4eb81d168daf`
- Risk: critical (sales, payments, stock, PostgreSQL privileges)

## Objective
Recover the unique checkout and inventory-ledger work onto the current main tree without force-pushing, losing post-merge changes, or importing stale documentation/workflow configuration. Produce one coherent draft PR for review and exact-SHA CI.

## Scope
- Checkout route, exact-money calculations, idempotency, rate limiting, BCV effective-date behavior, SQL payment allocation validation.
- Ledger-authoritative balance projection, source-document validation, scoped SECURITY DEFINER balance locking, and removal of direct runtime balance writes.
- PostgreSQL assertions and integration/unit tests.
- Minimal workflow updates needed to run migrations 0017-0019 and their assertions.

## Explicit non-goals and boundaries
- Do not change Neon rehearsal or Neon main, secrets, Cloudflare settings/deployments, DNS, billing, production data, or Worker credentials.
- Do not modify PR #193. Preserve PR #233 as historical until unique changes are disproven.
- Do not force-push or merge #258/#262. Do not copy stale CURRENT_STATE/HANDOFF snapshots from their branches.
- Keep checkout Draft until the owner approves the commercial payment contract. Do not change the existing database payment constraints to bypass that decision.

## Acceptance criteria
1. Port only the relevant source/migration/test changes from #258/#262 onto this current-main base.
2. Preserve current main versions of auth retention, rate-limit cleanup, Neon rehearsal runner, workflow branch filters, and documentation.
3. Review all migration ordering, object ownership, SECURITY DEFINER/search_path/grants, tenant/branch/role checks, locking order, idempotency, reserved stock and append-only ledger behavior.
4. Run PostgreSQL migration assertions and full unit/runtime-role/checkout integration suites in disposable PostgreSQL.
5. Inspect final diff against current main; verify exact-HEAD check-runs and workflow runs. No stale SHA evidence.
6. Record unresolved product decisions and environment limitations; no production readiness claim.

## Initial evidence
- #258 HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`: 35 ahead / 33 behind current main; diverged and GitHub reports mergeable=false.
- #262 HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`: stacked on an older checkout branch; 107 ahead / 33 behind current main. Do not merge independently.
- #255 remains a separate BCV dependency; Neon rehearsal verify is blocked by missing repository secret `NEON_REHEARSAL_DATABASE_URL`.
- Checkout payment contract remains pending owner approval.
