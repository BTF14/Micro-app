# ODD task: recover atomic checkout and ledger-authoritative inventory on current main

- Status: implementation, security review and exact-HEAD CI complete; PR remains Draft; Neon pin updated in main; new verify-empty pending
- Initial code port commit: `88e0aab5219810ab24375f8eb947c5ad17aa453b`; use the live PR HEAD for current exact-SHA status.
- Date: 2026-11-08 UTC
- Source PRs: #258 (checkout, migrations 0017/0018), #262 (ledger projection, migration 0019)
- Base at branch start: main `5f09b87aee09d0746f6ea90f076b4eb81d168daf`; later synchronized with main `b10d029061a5258f37e4feba65a30dad683f563f` and then with `8a54f6e653d925a280776763bbb6f661e0fd19aa` after PR #277
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
1. [x] Port relevant source/migration/test changes from #258/#262 onto this current-main base; preserve post-merge main behavior.
2. [x] Preserve current main auth retention, rate-limit cleanup, Neon rehearsal runner, workflow branch filters and scheduled handler.
3. [x] Review migration ordering, object ownership, SECURITY DEFINER/search_path/grants, tenant/branch/role checks, locking order, idempotency, reserved stock and append-only ledger behavior; added branch-active fail-closed guard.
4. [x] Run PostgreSQL migration assertions and full unit/runtime-role/checkout integration suites in disposable PostgreSQL; exact-HEAD suite passed.
5. [x] Inspect final diff against current main; 20 ahead / 0 behind, 16/16 check-runs and 11/11 pull_request workflows SUCCESS exact-HEAD.
6. Record unresolved product decisions and environment limitations; no production readiness claim.

## Current evidence — 2026-11-08 UTC

- Main actual: `8a54f6e653d925a280776763bbb6f661e0fd19aa`; PR #277 merged y el workflow pinned Neon ahora usa source SHA `6227a3a8497f6be94d675b64da5da61530c200fc`.
- PR #269 se sincroniza con main sin force-push; exact current HEAD se consulta en GitHub. El código merge commit `6227a3a8497f6be94d675b64da5da61530c200fc` pasó 16/16 check-runs y 14/14 workflow runs; la prueba runtime de branch-inactive confirma `INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID`.
- Neon run #1 `42498486767` SUCCESS fue verify-empty sobre el source SHA antiguo `bc393...`. El nuevo pin 6227 requiere un segundo verify-empty manual; no se han aplicado migraciones ni realizado DDL/DML remoto.
- Review thread de branch-inactive resuelto. PR #269 permanece Draft por contrato comercial y ensayo.

## Initial evidence
- #258 HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`: 35 ahead / 33 behind current main; diverged and GitHub reports mergeable=false.
- #262 HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`: stacked on an older checkout branch; 107 ahead / 33 behind current main. Do not merge independently.
- #255 remains a separate BCV dependency; Neon rehearsal verify is blocked by missing repository secret `NEON_REHEARSAL_DATABASE_URL`.
- Checkout payment contract remains pending owner approval.
