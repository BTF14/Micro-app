## Política de vigencia BCV confirmada por el propietario — 2026-11-08 UTC

**Decisión:** se permite utilizar la tasa del siguiente día hábil cuando el BCV la haya publicado anticipadamente de forma oficial y la propia fuente indique esa fecha efectiva. La tasa no se puede aplicar antes de su `effective_date`.

Reglas obligatorias:
1. La elegibilidad se determina por la fecha efectiva de la operación y la `effective_date` publicada explícitamente por BCV; nunca por la fecha local de descarga ni por una predicción del calendario.
2. Una tasa futura publicada oficialmente puede cubrir sábados, domingos y feriados únicamente desde la fecha efectiva indicada por BCV. Ejemplo: una tasa publicada el viernes con `effective_date` lunes se puede utilizar el lunes, no el viernes, sábado ni domingo.
3. Si BCV no publica anticipadamente una tasa aplicable a la fecha efectiva de la operación, no se debe promover silenciosamente la última tasa anterior como vigente: conservarla para auditoría, marcar la fuente/dato como stale o unavailable y bloquear checkout.
4. Si una sincronización falla, no se borra ni sobrescribe el último dato histórico válido. Sin embargo, su existencia no demuestra frescura ni autoriza su uso para nuevas ventas.
5. Checkout requiere tasa aplicable para todas las ventas, incluidas las pagadas 100% en USD. El snapshot aplicado es inmutable y los importes/monedas de pago no se convierten ni cobran dos veces.
6. La fuente debe ser BCV oficial; no se aceptan tasas inferidas, copias de terceros ni fechas supuestas.
7. La selección debe soportar tasas prepublicadas sin que una fila futura suprima la inserción o selección de una fecha efectiva anterior.
8. No se fija un umbral arbitrario de minutos/horas para `fetched_at`. La frescura operativa se debe basar en un registro separado de último intento/último éxito, resultado de sincronización y estado del proveedor. Definir y probar una política explícita de degradación; no confundir `fetched_at` de inserción con última comprobación exitosa.

**Ejemplos de aceptación:** viernes con tasa oficial efectiva lunes → el lunes usa esa tasa; sábado sin tasa oficial futura efectiva sábado → checkout bloqueado; tasa efectiva lunes no se usa el domingo; fallo de Cron conserva historial pero no certifica una tasa actual.

**No autoriza:** activar el Cron, desplegar #255, merge a main, escribir en Neon ni relajar gates de producción. PR #255 y #269 permanecen Draft hasta que el comportamiento, pruebas, calendario oficial, observabilidad y despliegue seguro estén revisados.

---

# BCV official exchange-rate integration

**Status:** implementation under review in PR #255; not deployed or production-verified.  
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
- `fetched_at` is set when a new rate row is inserted. Replaying the same rate currently returns `unchanged` without refreshing this timestamp; it is **not** a last-success/last-check timestamp.
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
- The dashboard fetches on authenticated session load and refreshes hourly, on tab visibility, and when the Caracas calendar date changes. `/latest` is `Cache-Control: no-store`; only bounded history responses are cacheable for one hour. The browser client disables HTTP caching for `/latest`.

## Operational freshness limitation — 2026-11-08

The current implementation does not enforce a maximum age based on `fetched_at`. The latest API and checkout selection use `effective_date` plus `validation_status`. When a successful sync sees the same rate, persistence returns `unchanged` and does not update `fetched_at`; if the Cron fails or BCV corrects a future-published rate, an older row can remain marked valid/current. The UI trusts the API status and does not independently calculate age. The owner must decide the freshness/last-success policy; do not invent a time threshold. Until then, this is a production blocker for VES conversion.

The scheduled handler logs a sanitized `BCV_SYNC_FAILED` and rethrows so the Cron execution fails, but there is no persisted last-attempt/last-success record or external alert. A real official BCV HTML fixture, anomaly policy, and authoritative weekday bank-holiday calendar also remain open gates.

## Scheduling and cost

The Worker Cron fetches the official page once per weekday at 18:00 Venezuela time (22:00 UTC), after the usual late-afternoon publication window. Friday's publication can carry Monday's effective date; the weekend latest endpoint uses that next-business-day row. The Cron still runs on weekdays that are bank holidays because no authoritative holiday calendar is configured; on those dates, latest fails closed if there is no exact effective-date row until a reviewed calendar/selection policy is implemented. The existing hourly auth-retention Cron remains configured separately. Preview environments are excluded by the Worker scheduled handler.

No paid provider, subscription, or new secret is introduced. Cloudflare plan/quotas and the actual deployed Cron configuration still require verification before production rollout.

## Operational gates

1. Apply canonical migrations through the checksum-ledger runner using the direct `microapp_migrator` login; migration 0013 must be applied before using the eight-decimal schema.
2. Verify the actual Cloudflare Worker uses the dedicated `microapp_runtime` login and has the scheduled trigger.
3. Run a controlled smoke test only after schema, role, grants, and deployment gates are approved.
4. Recheck the official BCV markup whenever the parser fails; fail closed until a reviewed parser update passes fixture and integration tests.
5. Add operational alerting without exposing database URLs, cookies, IPs, or secrets.

The BCV public page is not a formal machine API and can change. This is a controlled extractor of the original publisher, with strict validation and stale-data behavior—not a claim that BCV provides a supported API or uptime guarantee.
