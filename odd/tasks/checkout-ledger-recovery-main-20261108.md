# ODD task: recover atomic checkout and ledger-authoritative inventory on current main

> **Estado autoritativo posterior al rehearsal Neon y PR #282 — 2026-11-08 UTC.** Main antes de esta sincronización: `9c6b30281ed59726e532da840568fc9e80b528f7`. PR #269 pre-sync HEAD `14afd5de938a6ff655ecdfc5cb747f0f799290c5`, 24 ahead / 5 behind; se incorpora main con un merge commit sin force-push. Consultar el HEAD vivo tras el merge y revalidar los seis contextos requeridos; no reutilizar checks de otros SHA. El source SHA del rehearsal `6227a3a8497f6be94d675b64da5da61530c200fc` aplicó 0001–0019 con 19/19 migrations `applied`, assertions 0017–0019 y ownership/grants verificados en `microapp_rehearsal`. Los cinco commits posteriores de ese source a este pre-sync HEAD solo modificaron workflow/documentación/ODD; migraciones 0017–0019 y los archivos de aplicación consultados conservan los mismos blobs. El source SHA 6227 tuvo 16/16 check-runs y 14/14 workflow runs SUCCESS, incluyendo suites runtime-role/checkout en PostgreSQL desechable; esos resultados son históricos, no CI exact-HEAD para el HEAD actual. Contrato comercial checkout y política BCV de freshness siguen pendientes; mantener Draft. No se ha certificado producción ni se deben repetir escrituras Neon.

- Status: implementation and security review complete; PR remains Draft; Neon bootstrap-and-migrate rehearsal completed on isolated rehearsal DB; exact-HEAD CI must be revalidated after the current-main merge commit
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
4. [x] Historical source SHA `6227a3a8497f6be94d675b64da5da61530c200fc` passed 16/16 check-runs and 14/14 workflow runs, including runtime-role and checkout integration suites in disposable PostgreSQL.
5. [ ] Re-run all required checks on the synchronized live PR HEAD; historical SHA results do not satisfy this gate.
6. Record unresolved product decisions and environment limitations; no production readiness claim.

## Historical evidence before Neon rehearsal #4 and current-main synchronization

- Main actual: `8a54f6e653d925a280776763bbb6f661e0fd19aa`; PR #277 merged y el workflow pinned Neon usa source SHA `6227a3a8497f6be94d675b64da5da61530c200fc`.
- Snapshot de código PR #269: `8ee0c7b82d2f6de597294dacecdb98e222816b7c`; 16/16 check-runs y 14/14 workflow runs SUCCESS. La prueba runtime de branch-inactive confirma `INVENTORY_MOVEMENT_BRANCH_SCOPE_INVALID`.
- Backup/restore tuvo un fallo transitorio de red y el retry terminó SUCCESS.
- Neon rehearsal #4 `42507066215` SUCCESS ejecutó `bootstrap-and-migrate` sobre source SHA `6227a3a8497f6be94d675b64da5da61530c200fc` en `microapp_rehearsal`; 0001–0019 quedaron aplicadas. No repetir escrituras remotas.
- Review thread de branch-inactive resuelto. PR #269 permanece Draft por contrato comercial y ensayo.

## Initial evidence
- #258 HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`: 35 ahead / 33 behind current main; diverged and GitHub reports mergeable=false.
- #262 HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`: stacked on an older checkout branch; 107 ahead / 33 behind current main. Do not merge independently.
- #255 remains a separate BCV dependency and is now Draft; its freshness/alert/fixture/holiday gates remain open. The Neon rehearsal is complete; no additional remote writes are authorized.
- Checkout payment contract remains pending owner approval.
