## Corrección de política — tasa futura no aplicable antes de fecha efectiva

La rama #255 ahora selecciona exclusivamente la fila cuya `effective_date` coincide con la fecha Caracas actual. La tasa del lunes publicada el viernes permanece `scheduled` durante viernes, sábado y domingo. Se bloquea checkout si falta la tasa exacta del día, incluso en ventas USD-only. Los tests exact-HEAD deben confirmar esta regla.

# ODD task: official BCV rate integration and effective-date correctness

> **Estado autoritativo posterior a PR #281/#282 y revisión de freshness — 2026-11-08 UTC.** Main antes de sincronizar esta rama: `9c6b30281ed59726e532da840568fc9e80b528f7`. PR #255 pre-sync HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`, 53 ahead / 12 behind; se incorporará main mediante merge commit sin force-push. PR está OPEN/Draft. Los 10 workflows SUCCESS del HEAD anterior no validan el nuevo HEAD; reejecutar todos los contextos exactos tras sincronización. Neon rehearsal #42507066215 SUCCESS aplicó 0001–0019 en `microapp_rehearsal`; no hubo Neon main/production writes ni deben repetirse.
>
> **P1 freshness:** latest API y checkout confían en `effective_date` + `validation_status`, no en antigüedad de `fetched_at`. Cuando una sincronización devuelve el mismo valor, `persistBcvOfficialRate` devuelve `unchanged` sin actualizar `fetched_at`; ese campo es la hora de inserción, no la última comprobación exitosa. Si el Cron falla o BCV corrige una tasa prepublicada, la fila anterior puede seguir presentándose como `current`. La UI confía en el estado del API y no calcula edad. Se requiere una política de vigencia/last-success aprobada por el propietario; no inventar un umbral.
>
> Otros gates abiertos: política de anomalías, last-attempt/last-success y alerta persistente, fixture con HTML real de BCV, calendario oficial de feriados bancarios. El Cron registra error sanitizado y relanza, pero eso no reemplaza alerting persistente. Mantener fail-closed y no activar el Cron en producción.

- Status: implementation present in PR #255 Draft; exact-HEAD CI must be rerun after main synchronization; manual technical review exists, external review and P1 operational gates remain pending
- PR: #255 (base `main`; historical code includes #251 auth-retention changes)
- Branch: `feat/bcv-official-rate-recovered-v2-20261107`
- Risk: critical (financial rate selection and POS conversion)
- Started: 2026-11-07

## Objective

Integrate the official BCV USD/VES reference rate at zero additional provider cost, preserve eight decimal places, and make the rate visible in the dashboard/catalog only when current and validated. Preserve the future-first/today-second persistence regression fix.

## Scope

- Fetch only `https://www.bcv.org.ve/` over HTTPS; no paid API, third-party fallback, or new secret.
- Stream-limit the response to 2 MB, validate content type, final origin, UTF-8, official USD value and explicit effective date.
- Store decimal strings in PostgreSQL `NUMERIC(18,8)`; use the existing migration 0013 already in main, do not duplicate or renumber it.
- Use `(source, effective_date)` uniqueness for idempotency. A future row must not prevent inserting a missing earlier date.
- Expose bounded latest/history endpoints; all days require an exact `effective_date` match to today's Caracas date, while future rows remain scheduled in history.
- Fail closed on any day without today's exact official effective date; never apply an older or future rate early. An authoritative Venezuelan bank-holiday calendar remains necessary for polling/operations, not for changing the effective date.
- Display rate/date/source/freshness in the dashboard; convert catalog prices only with a current validated rate.
- Add one weekday Cron at 18:00 Caracas (22:00 UTC), preserving #251's hourly auth-retention Cron and preview skip.
- Test PostgreSQL persistence and API behavior with both admin and the actual disposable `microapp_runtime` login.

## Acceptance criteria

- [x] Historical parser/bounded-streaming tests passed on previous exact HEAD `4e9f01ab85fd767736f4f47f3e47ffefbe7efd88`; current synchronized HEAD must rerun them.
- [x] Historical PostgreSQL integration verifies future-first/today-second persistence, same-date idempotency, exact-date selection, scheduled history status and preview no-op; the corrected tests require today's exact effective date. Re-run on the current exact HEAD.
- [ ] Weekday bank-holiday handling has an authoritative calendar before POS conversion is enabled for those dates.
- [x] Runtime-role integration passes without broadening migration 0013 grants in disposable PostgreSQL CI; production grants remain unverified.
- [x] Dashboard displays exact decimal/date/freshness and catalog conversion uses shared exact-money arithmetic; UI tests verify exact conversion.
- [x] Unavailable/stale rates never produce a VES conversion or third-party fallback; `CatalogPanel` tests cover stale and unavailable states.
- [x] Historical CI, migration runner, backup restore, security, SAST, E2E, ODD validation and secret scans passed on previous exact HEAD `4e9f01ab85fd767736f4f47f3e47ffefbe7efd88`; these results do not satisfy the current exact-HEAD gate.
- [ ] Re-run all required checks on the synchronized exact HEAD; do not reuse prior SHA results.
- [ ] Separate external reviewer approval completed; only manual review by this ChatGPT session is recorded.
- [ ] Neon migration 0013, runtime login/ACLs, Cloudflare Worker identity and Cron are verified under the separate production gates.

## Follow-up hardening — 2026-11-07

- Replaced JavaScript `Number()` range validation with exact `BigInt` comparison so a value just above the `1,000,000,000` ceiling cannot round down and pass.
- Added a regression test that accepts the exact ceiling and rejects `1.000.000.000,00000001`.
- Final exact-HEAD CI is pending for the precision-bound and freshness follow-ups.

## Historical UI freshness behavior — 2026-11-07 (reconciled 2026-11-08)

- The latest-rate API response is `Cache-Control: no-store`; the history endpoint may be cached for one hour. The browser API client disables HTTP caching for the latest-rate request.
- The authenticated dashboard fetches on session load, refreshes hourly, on tab visibility and on Caracas date change. It sets the previous rate stale on date change and on request failure; an ordinary periodic/visibility refresh does not mark it stale while the request is pending.
- The UI trusts API `status`; it does not calculate age from `fetched_at`. A Cron failure alone does not change the stored row's status.
- `persistBcvOfficialRate` returns `unchanged` without updating `fetched_at` when the value is identical. Therefore `fetched_at` is not a last-success timestamp.
- UI regression coverage exercises Friday-to-Saturday midnight; PostgreSQL API integration asserts the latest endpoint's no-store header. Current exact-HEAD CI remains pending after synchronization.

## Evidence and legal basis

- The previously documented interpretation of Article 25 of Venezuela's VAT Law as permitting a next-business-day rate for weekend operations is not sufficient to override the owner's explicit product rule: a prepublished Monday rate is not applied Friday, Saturday or Sunday. The statutory wording and the operational effective-date policy require professional fiscal/legal reconciliation before production. Reference copy of Official Gazette No. 6,507 Extraordinary (2020-01-29): https://www.ivecofi.net/informacion/legislacion/leyes/ley-impuesto-valor-agregado/titulo-iv. This is a technical reference, not legal/accounting advice.
- Historical exact HEAD `4e9f01ab85fd767736f4f47f3e47ffefbe7efd88`: 10/10 PR workflows and 3/3 push runs SUCCESS; manual review comment on PR #255. No external review or production smoke test; these checks do not validate the synchronized HEAD.

## Safety

- Migration 0013 already exists in GitHub main; do not duplicate it.
- No Neon production access or mutation, secrets, Cloudflare dashboard settings, Worker deployment, DNS, billing, or real business data changes in this task.
- PR remains Draft until all code and review gates pass. Do not merge or activate the BCV Cron until Neon has the correct schema and the Worker is proven to use `microapp_runtime`.
