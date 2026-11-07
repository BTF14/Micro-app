# BCV official exchange-rate integration

**Status:** implementation under review in PR #252; not deployed or production-verified.  
**Cost target:** USD 0 in additional recurring provider fees.  
**Primary source:** https://www.bcv.org.ve/  
**Worker schedule:** weekdays at 18:00 Venezuela time (22:00 UTC); no weekend polling.

## Source-of-truth decision

Micro-app fetches the Banco Central de Venezuela's public homepage over HTTPS. The controlled parser extracts only the official USD/VES value and BCV's explicit "Fecha Valor". The page is HTML, not a documented JSON API; the parser is guarded by fixtures and strict validation.

No paid exchange-rate API, API key, third-party scraper, TLS verification bypass, or automatic third-party fallback is used. If the official page changes or is unavailable, the integration fails closed and retains the last validated value.

## Data contract

- Base currency: USD; quote currency: VES.
- Source identifier: `BCV_OFFICIAL_HTML_V1`.
- Rate remains a decimal string in TypeScript and PostgreSQL `NUMERIC(18,8)`; never convert the persisted rate to a JavaScript float.
- `effective_date` comes from BCV's explicit "Fecha Valor", not the local fetch date.
- `fetched_at` records when Micro-app retrieved the page.
- The `exchange_rates` table is shared platform reference data, not tenant-owned data.
- Completed sales/payments retain their own rate snapshot; refreshing the reference rate must never recalculate historical transactions.

## Validation and persistence

Reject non-HTTPS/off-domain redirects, non-HTML responses, HTTP errors, oversized response bodies, invalid UTF-8, missing USD/date fields, malformed locale-formatted numbers, non-positive rates, and implausible effective dates. The source response is capped at 2 MB while streaming, including when Content-Length is absent.

Idempotency is scoped to the unique `(source, effective_date)` key. A future-dated row does **not** block inserting a missing earlier effective date; tomorrow's publication must not suppress today's rate. Replaying the same date/value is a no-op. If BCV changes the value for an already stored effective date, preserve the original decimal, mark that row stale using the column-scoped `validation_status` grant, and fail closed.

The writer uses the least-privilege `microapp_runtime` role. Migration 0013 grants SELECT/INSERT and UPDATE only on `validation_status`; it does not grant rewriting rates, effective dates, source identifiers, or deletion of rate history. The live Neon database must be migrated and its actual Worker identity verified before this code is deployed.

## API and UI behavior

- `GET /api/exchange-rates/latest` returns today's effective rate on weekdays. On Saturday/Sunday it selects the nearest future effective date published for the next business day, which is the applicable BCV rate for non-business days.
- `GET /api/exchange-rates/history?limit=30` returns a bounded history (1–365 rows), including future-dated rows labelled `scheduled`.
- Weekday bank holidays are not yet backed by an authoritative holiday calendar. On those days, if no row exists for the calendar date, latest remains stale/unavailable and the catalog disables VES conversion rather than guessing. This is a known MVP limitation and must be resolved before POS use on bank holidays.
- The dashboard displays the official value, effective date, fetch timestamp, source, and freshness.
- The catalog converts USD prices to VES only when the API reports a current validated rate. Stale/unavailable data disables conversion; the UI never invents a fallback rate.
- The dashboard fetches on authenticated session load and refreshes at most once every 24 hours. Successful read responses are cacheable for one hour.

## Scheduling and cost

The Worker Cron fetches the official page once per weekday at 18:00 Venezuela time (22:00 UTC), after the usual late-afternoon publication window. Friday's publication can carry Monday's effective date; the weekend latest endpoint uses that next-business-day row. Weekday holidays do not trigger a Cron and currently fail closed until a reviewed holiday calendar is available. The existing hourly auth-retention Cron remains configured separately. Preview environments are excluded by the Worker scheduled handler.

No paid provider, subscription, or new secret is introduced. Cloudflare plan/quotas and the actual deployed Cron configuration still require verification before production rollout.

## Operational gates

1. Apply canonical migrations through the checksum-ledger runner using the direct `microapp_migrator` login; migration 0013 must be applied before using the eight-decimal schema.
2. Verify the actual Cloudflare Worker uses the dedicated `microapp_runtime` login and has the scheduled trigger.
3. Run a controlled smoke test only after schema, role, grants, and deployment gates are approved.
4. Recheck the official BCV markup whenever the parser fails; fail closed until a reviewed parser update passes fixture and integration tests.
5. Add operational alerting without exposing database URLs, cookies, IPs, or secrets.

The BCV public page is not a formal machine API and can change. This is a controlled extractor of the original publisher, with strict validation and stale-data behavior—not a claim that BCV provides a supported API or uptime guarantee.
