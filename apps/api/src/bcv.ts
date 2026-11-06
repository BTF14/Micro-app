import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient, type DatabaseClientFactory } from "./database";

const BCV_API_BASE = "https://bcv.today/api/v1";
const BCV_PROVIDER = "bcv.today";
const BCV_UPSTREAM = "https://www.bcv.org.ve/";
const TIME_ZONE = "America/Caracas";
const MAX_STATUS_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_RATE_CAPTURE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_EFFECTIVE_DATE_DISTANCE_DAYS = 7;
const STALE_EFFECTIVE_DATE_DAYS = 4;
const STALE_FETCH_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type JsonObject = Record<string, unknown>;
type BcvRate = { rate: string; effectiveDate: string; capturedAt: string; calendarDate: string };
export type BcvValidationResult =
  | { ok: true; value: BcvRate }
  | { ok: false; reason: string };
export type BcvSyncResult =
  | { status: "updated" | "unchanged"; effectiveDate: string }
  | { status: "skipped"; reason: "source_unavailable" | "invalid_source" };

export interface BcvDependencies {
  fetcher?: typeof fetch;
  databaseClientFactory?: DatabaseClientFactory;
  now?: () => Date;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function caracasDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function calendarDayDistance(left: string, right: string): number {
  const leftTime = Date.parse(`${left}T00:00:00.000Z`);
  const rightTime = Date.parse(`${right}T00:00:00.000Z`);
  return Math.round((leftTime - rightTime) / 86_400_000);
}

function isRecentTimestamp(value: unknown, now: Date, maxAgeMs: number): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime() + MAX_FUTURE_SKEW_MS && now.getTime() - timestamp <= maxAgeMs;
}

export function validateBcvPayloads(statusPayload: unknown, ratePayload: unknown, now = new Date()): BcvValidationResult {
  if (!isObject(statusPayload) || !isObject(ratePayload)) return { ok: false, reason: "payload_not_object" };
  if (statusPayload.status !== "ok" || statusPayload.timezone !== TIME_ZONE) return { ok: false, reason: "source_status_invalid" };
  if (statusPayload.source !== BCV_UPSTREAM) return { ok: false, reason: "source_provenance_invalid" };
  if (!isObject(statusPayload.currencies) || statusPayload.currencies.USD !== true) return { ok: false, reason: "usd_unavailable" };

  const today = caracasDate(now);
  if (!isRecentTimestamp(statusPayload.generated_at, now, MAX_STATUS_AGE_MS)) return { ok: false, reason: "status_stale" };
  if (!isRecentTimestamp(ratePayload.updated_at, now, MAX_RATE_CAPTURE_AGE_MS)) return { ok: false, reason: "rate_capture_stale" };
  if (!isIsoDate(statusPayload.date) || statusPayload.date !== today) return { ok: false, reason: "status_date_mismatch" };
  if (!isIsoDate(ratePayload.date) || ratePayload.date !== today) return { ok: false, reason: "rate_date_mismatch" };
  if (!isIsoDate(statusPayload.effective_date) || !isIsoDate(ratePayload.effective_date)) return { ok: false, reason: "effective_date_invalid" };
  if (statusPayload.effective_date !== ratePayload.effective_date) return { ok: false, reason: "effective_date_mismatch" };
  if (Math.abs(calendarDayDistance(today, ratePayload.effective_date)) > MAX_EFFECTIVE_DATE_DISTANCE_DAYS) return { ok: false, reason: "effective_date_out_of_range" };

  const rate = ratePayload.USD;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || rate >= 100_000_000) return { ok: false, reason: "usd_rate_invalid" };

  return { ok: true, value: { rate: rate.toFixed(6), effectiveDate: ratePayload.effective_date, capturedAt: ratePayload.updated_at as string, calendarDate: today } };
}

async function fetchJson(fetcher: typeof fetch, url: string): Promise<unknown> {
  const response = await fetcher(url, {
    method: "GET", headers: { Accept: "application/json" }, cache: "no-store",
    redirect: "error", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("BCV source request failed.");
  return response.json() as Promise<unknown>;
}

export async function syncBcvRate(env: Bindings, dependencies: BcvDependencies = {}): Promise<BcvSyncResult> {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  let statusPayload: unknown;
  let ratePayload: unknown;
  try {
    [statusPayload, ratePayload] = await Promise.all([
      fetchJson(fetcher, `${BCV_API_BASE}/status.json`),
      fetchJson(fetcher, `${BCV_API_BASE}/rate.json`),
    ]);
  } catch {
    return { status: "skipped", reason: "source_unavailable" };
  }

  const validation = validateBcvPayloads(statusPayload, ratePayload, now);
  if (!validation.ok) return { status: "skipped", reason: "invalid_source" };

  const result = await withDatabaseClient(
    env.DATABASE_URL,
    (client) => client.query<{ id: string }>(
      `INSERT INTO exchange_rates
         (base_currency, quote_currency, rate, source, effective_date, fetched_at, validation_status)
       VALUES ($1::char(3), $2::char(3), $3::numeric, $4, $5::date, now(), $6)
       ON CONFLICT (source, effective_date)
       DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at, validation_status = EXCLUDED.validation_status
       WHERE exchange_rates.rate IS DISTINCT FROM EXCLUDED.rate
          OR exchange_rates.validation_status <> EXCLUDED.validation_status
       RETURNING id`,
      ["USD", "VES", validation.value.rate, BCV_PROVIDER, validation.value.effectiveDate, "valid"],
    ),
    dependencies.databaseClientFactory,
  );

  return { status: result.rows.length > 0 ? "updated" : "unchanged", effectiveDate: validation.value.effectiveDate };
}

type CurrentRateRow = { rate: string; source: string; effective_date: string; fetched_at: string; validation_status: "valid" | "stale" };

export function registerBcvRoutes(
  app: Hono<{ Bindings: Bindings }>,
  dependencies: Pick<BcvDependencies, "databaseClientFactory" | "now"> = {},
): void {
  app.get("/exchange-rates/current", async (c) => {
    c.header("Cache-Control", "no-store");
    try {
      const result = await withDatabaseClient(
        c.env.DATABASE_URL,
        (client) => client.query<CurrentRateRow>(
          `SELECT rate::text AS rate, source, effective_date::text AS effective_date,
                  fetched_at::text AS fetched_at, validation_status
             FROM exchange_rates
            WHERE base_currency = $1 AND quote_currency = $2 AND validation_status = $3
            ORDER BY effective_date DESC, fetched_at DESC LIMIT 1`,
          ["USD", "VES", "valid"],
        ),
        dependencies.databaseClientFactory,
      );
      const row = result.rows[0];
      if (!row) return c.json({ error: "BCV_RATE_UNAVAILABLE", message: "Todavía no hay una tasa BCV válida disponible." }, 503);

      const now = dependencies.now?.() ?? new Date();
      const effectiveAge = calendarDayDistance(caracasDate(now), row.effective_date);
      const fetchedAt = Date.parse(row.fetched_at);
      const stale = row.validation_status !== "valid" || effectiveAge > STALE_EFFECTIVE_DATE_DAYS ||
        !Number.isFinite(fetchedAt) || now.getTime() - fetchedAt > STALE_FETCH_AGE_MS;
      return c.json({
        base_currency: "USD", quote_currency: "VES", rate: row.rate,
        source: { provider: row.source, upstream: BCV_UPSTREAM, official_api: false },
        effective_date: row.effective_date, fetched_at: row.fetched_at, status: stale ? "stale" : "valid",
      });
    } catch {
      return c.json({ error: "BCV_RATE_UNAVAILABLE", message: "No se pudo consultar la tasa BCV." }, 503);
    }
  });
}
