# ODD task: official BCV rate integration and effective-date correctness

- Status: implementation on recovery branch; exact-HEAD CI and independent review pending; production blocked on Neon migration/runtime reconciliation
- PR: #252 (stacked on #251)
- Branch: `feat/bcv-official-rate-recovered-20261107`
- Risk: critical (financial rate selection and POS conversion)
- Started: 2026-11-07

## Objective

Integrate the official BCV USD/VES reference rate at zero additional provider cost, preserve eight decimal places, and make the rate visible in the dashboard/catalog only when current and validated. Preserve the future-first/today-second persistence regression fix.

## Scope

- Fetch only `https://www.bcv.org.ve/` over HTTPS; no paid API, third-party fallback, or new secret.
- Stream-limit the response to 2 MB, validate content type, final origin, UTF-8, official USD value and explicit effective date.
- Store decimal strings in PostgreSQL `NUMERIC(18,8)`; use the existing migration 0013 already in main, do not duplicate or renumber it.
- Use `(source, effective_date)` uniqueness for idempotency. A future row must not prevent inserting a missing earlier date.
- Expose bounded latest/history endpoints; weekdays select today's effective row, weekends select the nearest next-business-day row, and history labels future rows scheduled.
- Fail closed on weekday bank holidays until an authoritative Venezuelan bank-holiday calendar is implemented; never guess or apply a future rate to a normal business weekday.
- Display rate/date/source/freshness in the dashboard; convert catalog prices only with a current validated rate.
- Add one weekday Cron at 18:00 Caracas (22:00 UTC), preserving #251's hourly auth-retention Cron and preview skip.
- Test PostgreSQL persistence and API behavior with both admin and the actual disposable `microapp_runtime` login.

## Acceptance criteria

- [ ] API source parser fixtures and bounded streaming tests pass.
- [ ] PostgreSQL integration verifies next-business-day-first/today-second, same-date idempotency, weekend latest selection, and scheduled history status.
- [ ] Weekday bank-holiday handling has an authoritative calendar before POS conversion is enabled for those dates.
- [ ] Runtime-role integration passes without broadening migration 0013 grants.
- [ ] Dashboard displays exact decimal/date/freshness and catalog conversion uses shared exact-money arithmetic.
- [ ] Unavailable/stale rates never produce a VES conversion or third-party fallback.
- [ ] CI, migration runner, backup restore, security, SAST, E2E, ODD validation and secret scans pass on the final exact HEAD.
- [ ] Independent review completed.
- [ ] Neon migration 0013, runtime login/ACLs, Cloudflare Worker identity and Cron are verified under the separate production gates.

## Safety

- Migration 0013 already exists in GitHub main; do not duplicate it.
- No Neon production access or mutation, secrets, Cloudflare dashboard settings, Worker deployment, DNS, billing, or real business data changes in this task.
- PR remains Draft until all code and review gates pass. Do not merge or activate the BCV Cron until Neon has the correct schema and the Worker is proven to use `microapp_runtime`.
