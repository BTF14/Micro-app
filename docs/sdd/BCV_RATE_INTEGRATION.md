# BCV official exchange-rate integration

**Status:** implementation proposed in PR; not deployed or production-verified.  
**Cost target:** USD 0 in additional recurring provider fees.  
**Primary source:** https://www.bcv.org.ve/  
**Worker schedule:** weekdays, hourly from 09:00 through 19:00 Venezuela time (13:00–23:00 UTC).

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

Reject non-HTTPS or off-domain redirects, non-HTML responses, HTTP errors, oversized payloads, missing USD/date fields, invalid locale-formatted numbers, non-positive rates, implausible effective dates, and conflicting values for an already stored effective date.

The writer uses the least-privilege `microapp_runtime` role and receives only SELECT/INSERT on `exchange_rates`; it cannot update or delete history. Repeated identical data is a no-op. Older data cannot replace a newer effective date.

If BCV is unavailable or parsing/validation fails, do not invent a rate and do not silently substitute a third-party quote. Keep the last validated row. The API reports its effective date and marks it `stale` when it is older than the current Venezuela calendar date.

## Scheduling and free-tier assumptions

A single Cloudflare Cron Trigger runs hourly on weekdays during the Venezuela publication window. This is well below the documented Workers Free daily request allowance; the account's actual plan, quota, and Cron configuration still require verification in Cloudflare before production rollout. No paid plan or provider subscription is introduced by this code.

## API

`GET /api/exchange-rates/latest` returns the latest validated official rate, source, effective date, fetch timestamp, and freshness status. The response preserves the decimal as a string.

## Operational gates

1. Apply migrations through the checksum-ledger runner using the direct `microapp_migrator` login.
2. Verify the actual Cloudflare Worker has the scheduled trigger and a valid `DATABASE_URL` for `microapp_runtime`.
3. Run a controlled production smoke test only after the deployment and database gates are approved.
4. Add external alerting/monitoring without exposing database credentials.
5. Recheck the BCV markup whenever the parser fails; fail closed until a reviewed parser update passes fixture tests.

The public BCV page is not a formal machine API and can change its HTML. This is a controlled scraper of the original publisher, with strict validation and stale-data behavior—not a claim that BCV provides a supported API or uptime guarantee.
