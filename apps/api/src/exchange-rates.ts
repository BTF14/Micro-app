import type { Hono } from "hono";
import { withDatabaseClient, type DatabaseClient } from "./database";
import type { Bindings } from "./bindings";

const BCV_SOURCE_URL = "https://www.bcv.org.ve/";
const BCV_SOURCE_ID = "BCV_OFFICIAL_HTML_V1";
const MAX_BCV_HTML_BYTES = 2_000_000;
const MAX_EFFECTIVE_DATE_AGE_DAYS = 10;
const MAX_EFFECTIVE_DATE_FUTURE_DAYS = 7;

export type BcvOfficialRate = {
  rate: string;
  effectiveDate: string;
};

type StoredRateRow = {
  rate: string;
  effective_date: string;
  validation_status?: "valid" | "stale";
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

async function readBcvHtmlWithinLimit(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BCV_HTML_BYTES) {
    await response.body?.cancel();
    throw new Error("BCV_HTML_SIZE_INVALID");
  }
  if (!response.body) throw new Error("BCV_HTML_SIZE_INVALID");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let bytesRead = 0;
  let html = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BCV_HTML_BYTES) {
        await reader.cancel();
        throw new Error("BCV_HTML_SIZE_INVALID");
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return html;
  } catch (error) {
    try { await reader.cancel(); } catch { /* Preserve the original read/decode error. */ }
    if (error instanceof TypeError) throw new Error("BCV_HTML_ENCODING_INVALID");
    throw error;
  } finally {
    reader.releaseLock();
  }
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
    .replace(/&aacute;|&#225;|&#xE1;/gi, "á")
    .replace(/&eacute;|&#233;|&#xE9;/gi, "é")
    .replace(/&iacute;|&#237;|&#xED;/gi, "í")
    .replace(/&oacute;|&#243;|&#xF3;/gi, "ó")
    .replace(/&uacute;|&#250;|&#xFA;/gi, "ú")
    .replace(/&ntilde;|&#241;|&#xF1;/gi, "ñ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocalizedRate(value: string): string {
  if (!/^\d+(?:\.\d{3})*,\d{1,8}$/.test(value)) {
    throw new Error("BCV_RATE_FORMAT_INVALID");
  }
  const [integerPart, fractionalPart] = value.split(",");
  const integerDigits = integerPart!.replace(/\./g, "");
  const fractionalDigits = fractionalPart!;
  const integerValue = BigInt(integerDigits);
  const isZero = integerValue === 0n && /^0+$/.test(fractionalDigits);
  const exceedsMaximum = integerValue > 1_000_000_000n ||
    (integerValue === 1_000_000_000n && /[1-9]/.test(fractionalDigits));
  if (isZero || exceedsMaximum) {
    throw new Error("BCV_RATE_VALUE_INVALID");
  }
  // Keep range validation exact too: Number() rounds values near the 1e9 cap.
  return integerDigits + "." + fractionalDigits;
}

function parseSpanishEffectiveDate(text: string): string {
  const match = text.match(
    /Fecha Valor:\s*(?:(?:[A-Za-zÁÉÍÓÚáéíóúÑñ]+),?\s+)?(\d{1,2})\s+(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(?:de\s+)?(\d{4})/i,
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
  // Friday/holiday publications may carry the next business day's value.
  // Keep a bounded horizon so legitimate long weekends work without accepting
  // implausibly distant future dates.
  if (differenceDays > MAX_EFFECTIVE_DATE_FUTURE_DAYS || differenceDays < -MAX_EFFECTIVE_DATE_AGE_DAYS) {
    throw new Error("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
  }
}

/** Parse only the USD official rate and its explicit "Fecha Valor" from BCV HTML. */
export function parseBcvOfficialRate(html: string, now = new Date()): BcvOfficialRate {
  if (!html || new TextEncoder().encode(html).byteLength > MAX_BCV_HTML_BYTES) throw new Error("BCV_HTML_SIZE_INVALID");
  const text = normalizeHtmlText(html);
  let rate: string | null = null;
  let candidateError: Error | null = null;
  for (const match of text.matchAll(/\bUSD\b\s*([\d.,]+)/gi)) {
    try {
      rate = parseLocalizedRate(match[1]!);
      break;
    } catch (error) {
      if (error instanceof Error) candidateError = error;
    }
  }
  if (!rate) {
    if (candidateError) throw candidateError;
    throw new Error("BCV_USD_RATE_MISSING");
  }
  const effectiveDate = parseSpanishEffectiveDate(text);
  validateEffectiveDate(effectiveDate, now);
  return { rate, effectiveDate };
}

export async function fetchBcvOfficialRate(now = new Date()): Promise<BcvOfficialRate> {
  const response = await fetch(BCV_SOURCE_URL, {
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
    redirect: "error",
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
  const html = await readBcvHtmlWithinLimit(response);
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
     ON CONFLICT (source, effective_date) DO NOTHING
     RETURNING id`,
    [rate.rate, BCV_SOURCE_ID, rate.effectiveDate],
  );
  if (inserted.rows.length > 0) return "inserted";

  const existing = await client.query<StoredRateRow>(
    `SELECT rate::text AS rate, effective_date::text AS effective_date, validation_status
       FROM public.exchange_rates
      WHERE source = $1 AND effective_date = $2::date
      LIMIT 1`,
    [BCV_SOURCE_ID, rate.effectiveDate],
  );
  const sameDate = existing.rows[0];
  if (sameDate) {
    if (normalizeDecimal(sameDate.rate) !== normalizeDecimal(rate.rate)) {
      // Mark the old value stale without rewriting the rate or historical sales.
      // The runtime grant is column-scoped to validation_status only.
      await client.query(
        "UPDATE public.exchange_rates SET validation_status = 'stale' WHERE source = $1 AND effective_date = $2::date",
        [BCV_SOURCE_ID, rate.effectiveDate],
      );
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

/**
 * A BCV rate is usable only on its explicit effective date. A prepublished
 * next-business-day row is historical/scheduled until that date arrives.
 * Missing today's row always fails closed; no older or future fallback.
 */
export async function findApplicableBcvRate(
  client: DatabaseClient,
  now = new Date(),
): Promise<(StoredRateRow & { fetched_at: string }) | null> {
  const today = caracasDate(now);
  const result = await client.query<StoredRateRow & { fetched_at: string }>(
    `SELECT rate::text AS rate, effective_date::text AS effective_date,
            to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at, validation_status
       FROM public.exchange_rates
      WHERE source = $1
        AND effective_date = $2::date
      ORDER BY fetched_at DESC
      LIMIT 1`,
    [BCV_SOURCE_ID, today],
  );
  const row = result.rows[0];
  return row?.effective_date === today ? row : null;
}

export function registerExchangeRateRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/exchange-rates/history", async (c) => {
    const rawLimit = c.req.query("limit") ?? "30";
    if (!/^\d{1,3}$/.test(rawLimit)) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 365." }, 400);
    }
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 365) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 365." }, 400);
    }
    try {
      const rows = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const result = await client.query<StoredRateRow & { fetched_at: string }>(
          `SELECT rate::text AS rate, effective_date::text AS effective_date,
                  to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at,
                  validation_status
             FROM public.exchange_rates
            WHERE source = $1
            ORDER BY effective_date DESC, fetched_at DESC
            LIMIT $2`,
          [BCV_SOURCE_ID, limit],
        );
        return result.rows;
      });
      c.header("Cache-Control", "public, max-age=3600");
      return c.json({
        baseCurrency: "USD",
        quoteCurrency: "VES",
        source: BCV_SOURCE_ID,
        rates: rows.map((row) => ({
          rate: row.rate,
          effectiveDate: row.effective_date,
          fetchedAt: row.fetched_at,
          status: row.validation_status === "stale" || row.effective_date < caracasDate(new Date()) ? "stale" : row.effective_date > caracasDate(new Date()) ? "scheduled" : "current",
        })),
      });
    } catch {
      return c.json({ error: "BCV_RATE_HISTORY_FAILED", message: "No se pudo consultar el histórico BCV." }, 503);
    }
  });

  app.get("/api/exchange-rates/latest", async (c) => {
    try {
      const row = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        findApplicableBcvRate(client),
      );
      if (!row) {
        return c.json({ error: "BCV_RATE_UNAVAILABLE", message: "Todavía no hay una tasa BCV validada." }, 503);
      }
      const isStale = row.validation_status === "stale" || row.effective_date < caracasDate(new Date());
      // Applicability can change at Caracas midnight without a new database row.
      c.header("Cache-Control", "no-store");
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
