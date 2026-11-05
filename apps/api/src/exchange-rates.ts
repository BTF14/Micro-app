import type { Hono } from "hono";
import { withDatabaseClient, type DatabaseClient } from "./database";
import type { Bindings } from "./bindings";

const BCV_SOURCE_URL = "https://www.bcv.org.ve/";
const BCV_SOURCE_ID = "BCV_OFFICIAL_HTML_V1";
const MAX_BCV_HTML_BYTES = 2_000_000;
const MAX_EFFECTIVE_DATE_AGE_DAYS = 10;

export type BcvOfficialRate = {
  rate: string;
  effectiveDate: string;
};

type StoredRateRow = {
  rate: string;
  effective_date: string;
};

function caracasDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function normalizeHtmlText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocalizedRate(value: string): string {
  if (!/^\d+(?:\.\d{3})*,\d{1,8}$/.test(value)) {
    throw new Error("BCV_RATE_FORMAT_INVALID");
  }
  const [integerPart, fractionalPart] = value.split(",");
  const normalized = `${integerPart!.replace(/\./g, "")}.${fractionalPart!}`;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1_000_000_000) {
    throw new Error("BCV_RATE_VALUE_INVALID");
  }
  return normalized;
}

function parseSpanishEffectiveDate(text: string): string {
  const match = text.match(
    /Fecha Valor:\s*(?:(?:[A-Za-zÁÉÍÓÚáéíóúÑñ]+),\s*)?(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(\d{4})/i,
  );
  if (!match) throw new Error("BCV_EFFECTIVE_DATE_MISSING");

  const months: Record<string, string> = {
    enero: "01", febrero: "02", marzo: "03", abril: "04",
    mayo: "05", junio: "06", julio: "07", agosto: "08",
    septiembre: "09", setiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12",
  };
  const day = Number(match[1]);
  const month = months[match[2]!.toLocaleLowerCase("es")];
  const year = Number(match[3]);
  if (!month || !Number.isInteger(day) || day < 1 || day > 31 ||
      !Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("BCV_EFFECTIVE_DATE_INVALID");
  }

  const effectiveDate = `${year}-${month}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${effectiveDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== effectiveDate) {
    throw new Error("BCV_EFFECTIVE_DATE_INVALID");
  }
  return effectiveDate;
}

function validateEffectiveDate(effectiveDate: string, now: Date): void {
  const today = caracasDate(now);
  const differenceDays = (
    Date.parse(`${effectiveDate}T00:00:00.000Z`) -
    Date.parse(`${today}T00:00:00.000Z`)
  ) / 86_400_000;
  // BCV can publish tomorrow's effective rate in advance. Reject implausible
  // future dates and old cached pages rather than presenting them as current.
  if (differenceDays > 1 || differenceDays < -MAX_EFFECTIVE_DATE_AGE_DAYS) {
    throw new Error("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
  }
}

/** Parse only the USD official rate and its explicit "Fecha Valor" from BCV HTML. */
export function parseBcvOfficialRate(html: string, now = new Date()): BcvOfficialRate {
  if (!html || html.length > MAX_BCV_HTML_BYTES) throw new Error("BCV_HTML_SIZE_INVALID");
  const text = normalizeHtmlText(html);
  const usd = text.match(/\bUSD\s+([\d.]+,[\d]{1,8})\b/i);
  if (!usd?.[1]) throw new Error("BCV_USD_RATE_MISSING");

  const rate = parseLocalizedRate(usd[1]);
  const effectiveDate = parseSpanishEffectiveDate(text);
  validateEffectiveDate(effectiveDate, now);
  return { rate, effectiveDate };
}

export async function fetchBcvOfficialRate(now = new Date()): Promise<BcvOfficialRate> {
  const response = await fetch(BCV_SOURCE_URL, {
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("BCV_SOURCE_HTTP_ERROR");
  const finalUrl = new URL(response.url || BCV_SOURCE_URL);
  if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "www.bcv.org.ve") {
    throw new Error("BCV_SOURCE_REDIRECT_REJECTED");
  }
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) {
    throw new Error("BCV_SOURCE_CONTENT_TYPE_INVALID");
  }
  const html = await response.text();
  return parseBcvOfficialRate(html, now);
}

function normalizeDecimal(value: string): string {
  const [integer = "0", fraction = ""] = value.split(".");
  return `${integer.replace(/^0+(?=\d)/, "")}.${fraction.replace(/0+$/, "") || "0"}`;
}

export async function persistBcvOfficialRate(
  client: DatabaseClient,
  rate: BcvOfficialRate,
): Promise<"inserted" | "unchanged" | "older"> {
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO public.exchange_rates
       (base_currency, quote_currency, rate, source, effective_date, fetched_at, validation_status)
     SELECT 'USD', 'VES', $1::numeric, $2, $3::date, now(), 'valid'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.exchange_rates
         WHERE source = $2 AND effective_date > $3::date
      )
     ON CONFLICT (source, effective_date) DO NOTHING
     RETURNING id`,
    [rate.rate, BCV_SOURCE_ID, rate.effectiveDate],
  );
  if (inserted.rows.length > 0) return "inserted";

  const existing = await client.query<StoredRateRow>(
    `SELECT rate::text AS rate, effective_date::text AS effective_date
       FROM public.exchange_rates
      WHERE source = $1 AND effective_date = $2::date
      LIMIT 1`,
    [BCV_SOURCE_ID, rate.effectiveDate],
  );
  const sameDate = existing.rows[0];
  if (sameDate) {
    if (normalizeDecimal(sameDate.rate) !== normalizeDecimal(rate.rate)) {
      // Never silently rewrite a rate already used by completed sales.
      throw new Error("BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE");
    }
    return "unchanged";
  }
  return "older";
}

export async function syncBcvOfficialRate(databaseUrl: string | undefined): Promise<"inserted" | "unchanged" | "older"> {
  const rate = await fetchBcvOfficialRate();
  return withDatabaseClient(databaseUrl, (client) => persistBcvOfficialRate(client, rate));
}

export function registerExchangeRateRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/exchange-rates/history", async (c) => {
    const rawLimit = c.req.query("limit") ?? "30";
    if (!/^\\d{1,3}$/.test(rawLimit)) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 365." }, 400);
    }
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 365) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 365." }, 400);
    }
    try {
      const rows = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const result = await client.query<StoredRateRow & { fetched_at: string }> (
          "SELECT rate::text AS rate, effective_date::text AS effective_date, fetched_at::text AS fetched_at FROM public.exchange_rates WHERE source = $1 AND validation_status = 'valid' ORDER BY effective_date DESC, fetched_at DESC LIMIT $2",
          [BCV_SOURCE_ID, limit],
        );
        return result.rows;
      });
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return c.json({
        baseCurrency: "USD",
        quoteCurrency: "VES",
        source: BCV_SOURCE_ID,
        rates: rows.map((row) => ({
          rate: row.rate,
          effectiveDate: row.effective_date,
          fetchedAt: row.fetched_at,
          status: row.effective_date < caracasDate(new Date()) ? "stale" : "current",
        })),
      });
    } catch {
      return c.json({ error: "BCV_RATE_HISTORY_FAILED", message: "No se pudo consultar el histórico BCV." }, 503);
    }
  });

  app.get("/api/exchange-rates/latest", async (c) => {
    try {
      const row = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const result = await client.query<StoredRateRow & { fetched_at: string }>(
          `SELECT rate::text AS rate, effective_date::text AS effective_date,
                  fetched_at::text AS fetched_at
             FROM public.exchange_rates
            WHERE source = $1 AND validation_status = 'valid'
            ORDER BY effective_date DESC, fetched_at DESC
            LIMIT 1`,
          [BCV_SOURCE_ID],
        );
        return result.rows[0] ?? null;
      });
      if (!row) {
        return c.json({ error: "BCV_RATE_UNAVAILABLE", message: "Todavía no hay una tasa BCV validada." }, 503);
      }
      const isStale = row.effective_date < caracasDate(new Date());
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return c.json({
        baseCurrency: "USD",
        quoteCurrency: "VES",
        rate: row.rate,
        effectiveDate: row.effective_date,
        fetchedAt: row.fetched_at,
        source: BCV_SOURCE_ID,
        status: isStale ? "stale" : "current",
      });
    } catch {
      return c.json({ error: "BCV_RATE_LOOKUP_FAILED", message: "No se pudo consultar la tasa BCV." }, 503);
    }
  });
}
