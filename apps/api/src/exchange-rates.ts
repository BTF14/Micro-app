import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { authorizeTenantOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction, type DatabaseClient } from "./database";
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

const SAFE_BCV_SYNC_ERROR_CODES = new Set([
  "BCV_HTML_SIZE_INVALID",
  "BCV_HTML_ENCODING_INVALID",
  "BCV_RATE_FORMAT_INVALID",
  "BCV_RATE_VALUE_INVALID",
  "BCV_EFFECTIVE_DATE_MISSING",
  "BCV_EFFECTIVE_DATE_INVALID",
  "BCV_EFFECTIVE_DATE_OUT_OF_RANGE",
  "BCV_SOURCE_HTTP_ERROR",
  "BCV_SOURCE_REDIRECT_REJECTED",
  "BCV_SOURCE_CONTENT_TYPE_INVALID",
  "BCV_USD_RATE_MISSING",
  "BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE",
  "BCV_SYNC_STATE_ROW_MISSING",
]);

export function safeBcvSyncErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "BCV_SYNC_UNKNOWN";
  return SAFE_BCV_SYNC_ERROR_CODES.has(error.message) ? error.message : "BCV_SYNC_UNKNOWN";
}

/**
 * Persist one attempt and its terminal result. The singleton row lock protects
 * both operational state and exchange_rates: a superseded fetch must not
 * invalidate or insert a rate after a newer attempt has taken ownership.
 */
export async function syncBcvOfficialRate(databaseUrl: string | undefined): Promise<"inserted" | "unchanged" | "older" | "superseded"> {
  return withDatabaseClient(databaseUrl, async (client) => {
    const attemptId = crypto.randomUUID();
    const started = await client.query<{ attempt_id: string }>(
      `UPDATE public.bcv_sync_state
          SET attempt_id = $1::uuid,
              last_attempt_at = now(),
              last_outcome = 'running',
              last_error_code = NULL,
              updated_at = now()
        WHERE singleton = true
        RETURNING attempt_id::text AS attempt_id`,
      [attemptId],
    );
    if (started.rows.length !== 1) throw new Error("BCV_SYNC_STATE_ROW_MISSING");

    let rate: BcvOfficialRate;
    try {
      rate = await fetchBcvOfficialRate();
    } catch (error) {
      const markedFailed = await client.query<{ attempt_id: string }>(
        `UPDATE public.bcv_sync_state
            SET last_outcome = 'failed',
                last_error_code = $2,
                updated_at = now()
          WHERE singleton = true AND attempt_id = $1::uuid
          RETURNING attempt_id::text AS attempt_id`,
        [attemptId, safeBcvSyncErrorCode(error)],
      );
      if (markedFailed.rows.length === 0) return "superseded";
      throw error;
    }

    let terminal:
      | { kind: "superseded" }
      | { kind: "success"; outcome: "inserted" | "unchanged" | "older" }
      | { kind: "failed"; errorCode: string };
    try {
      terminal = await withDatabaseTransaction(client, async (tx) => {
      const current = await tx.query<{ attempt_id: string | null }>(
        `SELECT attempt_id::text AS attempt_id
           FROM public.bcv_sync_state
          WHERE singleton = true
          FOR UPDATE`,
      );
      if (current.rows.length !== 1) throw new Error("BCV_SYNC_STATE_ROW_MISSING");
      if (current.rows[0]?.attempt_id !== attemptId) {
        return { kind: "superseded" as const };
      }

      try {
        const outcome = await persistBcvOfficialRate(tx, rate);
        await tx.query(
          `UPDATE public.bcv_sync_state
              SET last_success_at = now(),
                  last_outcome = $2,
                  last_error_code = NULL,
                  last_effective_date = $3::date,
                  updated_at = now()
            WHERE singleton = true AND attempt_id = $1::uuid`,
          [attemptId, outcome, rate.effectiveDate],
        );
        return { kind: "success" as const, outcome };
      } catch (error) {
        // A changed value for an existing effective date deliberately marks
        // the row stale. Commit that invalidation and the failed attempt state
        // together; other errors still abort and roll back the transaction.
        if (error instanceof Error && error.message === "BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE") {
          await tx.query(
            `UPDATE public.bcv_sync_state
                SET last_outcome = 'failed',
                    last_error_code = $2,
                    updated_at = now()
              WHERE singleton = true AND attempt_id = $1::uuid`,
            [attemptId, safeBcvSyncErrorCode(error)],
          );
          return { kind: "failed" as const, errorCode: error.message };
        }
        throw error;
      }
      });
    } catch (error) {
      try {
        await client.query(
          `UPDATE public.bcv_sync_state
              SET last_outcome = 'failed',
                  last_error_code = $2,
                  updated_at = now()
            WHERE singleton = true AND attempt_id = $1::uuid`,
          [attemptId, safeBcvSyncErrorCode(error)],
        );
      } catch {
        // Preserve the original failure if the connection cannot record it.
      }
      throw error;
    }

    if (terminal.kind === "superseded") return "superseded";
    if (terminal.kind === "failed") throw new Error(terminal.errorCode);
    return terminal.outcome;
  });
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

  app.get("/api/orgs/:organizationId/bcv/sync-state", async (c) => {
    const organizationId = c.req.param("organizationId");
    const sessionToken = getCookie(c, "microapp_session");
    try {
      const state = await withDatabaseTransaction(c.env.DATABASE_URL, async (client) => {
        const authorization = await authorizeTenantOperation(
          client,
          sessionToken,
          organizationId,
          "bcv.sync_state.read",
        );
        if (!authorization.allowed) return { denied: authorization.reason } as const;

        const result = await client.query<{
          last_attempt_at: string | null;
          last_success_at: string | null;
          last_outcome: string | null;
          last_error_code: string | null;
          last_effective_date: string | null;
          updated_at: string;
          attempt_age_seconds: number | null;
        }>(
          `SELECT
             to_char(last_attempt_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_attempt_at,
             to_char(last_success_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_success_at,
             last_outcome,
             last_error_code,
             last_effective_date::text AS last_effective_date,
             to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at,
             CASE WHEN last_attempt_at IS NULL THEN NULL
                  ELSE GREATEST(0, floor(extract(epoch FROM (now() - last_attempt_at))))::int
              END AS attempt_age_seconds
           FROM public.bcv_sync_state
          WHERE singleton = true`,
        );
        return { state: result.rows[0] ?? null } as const;
      });

      c.header("Cache-Control", "no-store");
      if ("denied" in state) {
        if (state.denied === "operation_denied") {
          return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar el estado BCV." }, 403);
        }
        return c.json({ error: "UNAUTHORIZED", message: "Debes iniciar sesión en esta organización." }, 401);
      }
      if (!state.state) {
        return c.json({ error: "BCV_SYNC_STATE_UNAVAILABLE", message: "El estado operativo BCV no está disponible." }, 503);
      }
      const outcome = state.state.last_outcome;
      const health = outcome === "running"
        ? "running"
        : outcome === "failed"
          ? "failed"
          : (outcome === "inserted" || outcome === "unchanged") && state.state.last_success_at !== null
            ? "succeeded"
            : "attention";
      return c.json({
        source: BCV_SOURCE_ID,
        health,
        lastAttemptAt: state.state.last_attempt_at,
        lastSuccessAt: state.state.last_success_at,
        lastOutcome: outcome,
        lastErrorCode: state.state.last_error_code,
        lastEffectiveDate: state.state.last_effective_date,
        updatedAt: state.state.updated_at,
        attemptAgeSeconds: state.state.attempt_age_seconds,
      });
    } catch {
      c.header("Cache-Control", "no-store");
      return c.json({ error: "BCV_SYNC_STATE_LOOKUP_FAILED", message: "No se pudo consultar el estado operativo BCV." }, 503);
    }
  });

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
