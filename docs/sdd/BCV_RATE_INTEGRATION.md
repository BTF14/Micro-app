# BCV official exchange-rate integration

**Status:** implementation proposed in PR; not deployed or production-verified.  
**Cost target:** USD 0 in additional recurring provider fees.  
**Primary source:** https://www.bcv.org.ve/  
**Worker schedule:** once per weekday at 18:00 Venezuela time (22:00 UTC).

## Source-of-truth decision

Micro-app fetches the Banco Central de Venezuela's own public homepage over HTTPS. The official page visibly publishes USD, EUR, CNY, TRY, RUB and an explicit "Fecha Valor". The integration parses only the USD/VES value and its effective date.

No paid exchange-rate API, API key, third-party scraper, or TLS verification bypass is used. The optional BCV Today JSON feed may be used for independent monitoring/diagnostics, but never as an automatic substitute for the official source.

## Data contract

- Base currency: USD.
- Quote currency: VES.
- Source identifier: `BCV_OFFICIAL_HTML_V1`.
- Rate is stored as a decimal string / PostgreSQL NUMERIC, never JavaScript floating-point arithmetic.
- Preserve the eight decimal places published by BCV in the canonical rate and sale/payment snapshots.
- `effective_date` comes from BCV's explicit "Fecha Valor", not the local fetch date.
- `fetched_at` records when Micro-app retrieved the page.
- The existing `exchange_rates` table is shared platform reference data, not tenant-owned data.
- Completed sales/payments retain their own rate snapshot; refreshing the reference rate must not recalculate historical transactions.

## Validation and failure behavior

Reject non-HTTPS or off-domain redirects, non-HTML responses, HTTP errors, oversized payloads, missing USD/date fields, invalid locale-formatted numbers, non-positive rates, and implausible effective dates. If BCV revises a value for an already stored effective date, mark the stored row stale using a column-scoped status update, preserve the original decimal, and fail closed.

The writer uses the least-privilege `microapp_runtime` role and receives only SELECT/INSERT on `exchange_rates`; it cannot update or delete history. Repeated identical data is a no-op. Older data cannot replace a newer effective date.

If BCV is unavailable or parsing/validation fails, do not invent a rate and do not silently substitute a third-party quote. Keep the last validated row. The API reports its effective date and marks it `stale` when it is older than the current Venezuela calendar date. If BCV publishes tomorrow's rate in advance, the history endpoint labels it `scheduled`; the latest-rate endpoint excludes it until its effective date so a POS cannot apply it early.

## Scheduling and free-tier assumptions

The BCV reference rate is a daily publication, so the Worker fetches the official page once per weekday at 18:00 Venezuela time (22:00 UTC), after the usual late-afternoon publication window. This reduces scheduled BCV fetches from up to 55 per week to 5. The existing hourly cleanup trigger remains unchanged. The dashboard refreshes at most every six hours, and successful rate responses are browser-cacheable for one hour to avoid repeated reads during reloads. The account's actual plan, quota, and Cron configuration still require verification in Cloudflare before production rollout. No paid plan or provider subscription is introduced by this code.

## API

`GET /api/exchange-rates/latest` returns the latest validated official rate, source, effective date, fetch timestamp, and freshness status. `GET /api/exchange-rates/history?limit=30` returns a bounded history (1–365 rows). Both responses preserve each decimal as a string.

## Operational gates

1. Apply migrations through the checksum-ledger runner using the direct `microapp_migrator` login.
2. Verify the actual Cloudflare Worker has the scheduled trigger and a valid `DATABASE_URL` for `microapp_runtime`.
3. Run a controlled production smoke test only after the deployment and database gates are approved.
4. Add external alerting/monitoring without exposing database credentials.
5. Recheck the BCV markup whenever the parser fails; fail closed until a reviewed parser update passes fixture tests.

The public BCV page is not a formal machine API and can change its HTML. This is a controlled scraper of the original publisher, with strict validation and stale-data behavior—not a claim that BCV provides a supported API or uptime guarantee.
