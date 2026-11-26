import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { authorizeTenantOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction, type DatabaseClient, type DatabaseClientFactory } from "./database";
import type { Bindings } from "./bindings";
import { bcvCaracasDate, selectApplicableBcvRate } from "./bcv-0027";

const BCV_SOURCE_URL = "https://www.bcv.org.ve/";
export const BCV_SOURCE_ID = "BCV_OFFICIAL_HTML_V1";
const MAX_BCV_HTML_BYTES = 2_000_000;
const MAX_EFFECTIVE_DATE_AGE_DAYS = 10;
const MAX_EFFECTIVE_DATE_FUTURE_DAYS = 7;

export const BCV_STALE_RUNNING_THRESHOLD_SECONDS = 300;

// Per-isolate fallback guard keyed only by Cloudflare's trusted edge IP header.
// The deliberately generous ceiling protects public read endpoints without
// penalizing ordinary users behind shared carrier/NAT addresses.
const PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_RATE_LIMIT_MAX_REQUESTS = 120;
const publicRateLimitBuckets = new Map<string, { startedAt: number; count: number }>();

function applyPublicExchangeRateGuard(c: { req: { header(name: string): string | undefined }; header(name: string, value: string): void; json(body: unknown, status?: number): Response }): Response | null {
  const ip = c.req.header("CF-Connecting-IP")?.trim();
  // Local tests and non-Cloudflare deployments without a trusted edge IP keep
  // their existing contract; never trust X-Forwarded-For supplied by clients.
  if (!ip || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  const now = Date.now();
  const current = publicRateLimitBuckets.get(ip);
  const bucket = !current || now - current.startedAt >= PUBLIC_RATE_LIMIT_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : current;
  bucket.count += 1;
  publicRateLimitBuckets.set(ip, bucket);
  if (publicRateLimitBuckets.size > 10_000) {
    for (const [key, value] of publicRateLimitBuckets) {
      if (now - value.startedAt >= PUBLIC_RATE_LIMIT_WINDOW_MS) publicRateLimitBuckets.delete(key);
    }
  }
  if (bucket.count <= PUBLIC_RATE_LIMIT_MAX_REQUESTS) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.startedAt + PUBLIC_RATE_LIMIT_WINDOW_MS - now) / 1000));
  c.header("Cache-Control", "no-store");
  c.header("Retry-After", String(retryAfter));
  return c.json({ error: "RATE_LIMITED", message: "Demasiadas consultas. Inténtalo de nuevo en unos segundos." }, 429);
}


export function isBcvSyncStateStaleRunning(
  lastOutcome: string | null,
  attemptAgeSeconds: number | null,
): boolean {
  return lastOutcome === "running" &&
    attemptAgeSeconds !== null &&
    Number.isFinite(attemptAgeSeconds) &&
    attemptAgeSeconds >= BCV_STALE_RUNNING_THRESHOLD_SECONDS;
}

export type BcvOfficialRate = {
  rate: string;
  effectiveDate: string;
};

type StoredRateRow = {
  rate: string;
  effective_date: string;
  validation_status: "valid" | "stale";
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
  // These bounds are parser/source-plausibility guards only: they reject
  // obviously old cached pages and implausibly distant future dates. They are
  // not a business-approved freshness policy and do not make an old/future
  // rate applicable to checkout. Checkout independently requires a valid rate
  // whose effective_date is exactly today's Caracas date and a successful
  // latest BCV sync. Keep the 10/7 values unchanged until policy is approved.
  // BCV may prepublish the next business day's rate before weekends/holidays.
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

  // The live BCV Drupal homepage exposes the official USD quote in its
  // dedicated #dolar container. Resolve the element by its actual tag name
  // and walk balanced same-tag tokens so nested layout elements remain inside
  // the official block while commercial-bank quotes remain outside it.
  const dolarOpen = [...html.matchAll(/<([a-z][a-z0-9:-]*)\b(?=[^>]*\bid\s*=\s*["']dolar["'])[^>]*>/gi)][0];
  if (dolarOpen && dolarOpen.index !== undefined) {
    const tagName = dolarOpen[1]!.toLowerCase();
    const openEnd = dolarOpen.index + dolarOpen[0].length;
    let depth = 1;
    const tagTokens = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
    tagTokens.lastIndex = openEnd;
    let closeEnd = -1;
    for (let token = tagTokens.exec(html); token; token = tagTokens.exec(html)) {
      if (new RegExp(`^</${tagName}\\b`, "i").test(token[0])) depth -= 1;
      else if (!/\/>$/.test(token[0])) depth += 1;
      if (depth === 0) { closeEnd = token.index; break; }
    }
    if (closeEnd > openEnd) {
      const dolarBlock = html.slice(openEnd, closeEnd);
      const usdIndex = dolarBlock.search(/\bUSD\b/i);
      if (usdIndex >= 0) {
        const valueMatch = dolarBlock.slice(usdIndex).match(/<strong\b[^>]*>\s*([\d.,]+)\s*<\/strong>/i);
        if (valueMatch) {
          try { rate = parseLocalizedRate(valueMatch[1]!); }
          catch (error) { if (error instanceof Error) candidateError = error; }
        }
      }
    }
  }

  // Retain fixture/legacy markup support, but only accept the adjacent official
  // USD label/value paragraph pair; never scan arbitrary USD values in tables.
  if (!rate) {
    const usdBlocks = html.matchAll(
      /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?\bUSD\b(?:(?!<\/p>)[\s\S])*<\/p>\s*<p\b[^>]*>\s*(?:<strong\b[^>]*>)?\s*([\d.,]+)\s*(?:<\/strong>)?\s*<\/p>/gi,
    );
    for (const match of usdBlocks) {
      try { rate = parseLocalizedRate(match[1]!); break; }
      catch (error) { if (error instanceof Error) candidateError = error; }
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
  let response: Response;
  try {
    response = await fetch(BCV_SOURCE_URL, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    // Preserve an existing safe application code; wrap only raw transport errors.
    if (error instanceof Error && SAFE_BCV_SYNC_ERROR_CODES.has(error.message)) throw error;
    // Keep transport details as a cause for safe classification only; never log them.
    throw new Error("BCV_SOURCE_FETCH_FAILED", { cause: error });
  }
  if (!response.ok) {
    throw new Error(response.status >= 500 && response.status <= 599
      ? "BCV_SOURCE_HTTP_5XX"
      : "BCV_SOURCE_HTTP_ERROR");
  }
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
    if (sameDate.validation_status === "stale") {
      // A successful BCV confirmation of the exact stored value restores
      // applicability without rewriting the immutable rate or its history.
      await client.query(
        `UPDATE public.exchange_rates
            SET validation_status = 'valid'
          WHERE source = $1
            AND effective_date = $2::date
            AND rate = $3::numeric
            AND validation_status = 'stale'`,
        [BCV_SOURCE_ID, rate.effectiveDate, rate.rate],
      );
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
  "BCV_SOURCE_HTTP_5XX",
  "BCV_SOURCE_TIMEOUT",
  "BCV_SOURCE_TLS_OR_NETWORK_ERROR",
  "BCV_SYNC_DATABASE_URL_MISSING",
  "BCV_SYNC_DATABASE_ROLE_INVALID",
  "BCV_SOURCE_REDIRECT_REJECTED",
  "BCV_SOURCE_CONTENT_TYPE_INVALID",
  "BCV_USD_RATE_MISSING",
  "BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE",
  "BCV_RATE_VARIATION_OUT_OF_RANGE",
  "BCV_SYNC_STATE_ROW_MISSING",
]);

export function safeBcvSyncErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "BCV_SYNC_UNKNOWN";
  if (SAFE_BCV_SYNC_ERROR_CODES.has(error.message)) return error.message;
  if (error.message !== "BCV_SOURCE_FETCH_FAILED") return "BCV_SYNC_UNKNOWN";

  const timeoutCodes = new Set(["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);
  const transportCodes = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "CERT_NOT_YET_VALID",
    "ERR_TLS_CERT_ALTNAME_INVALID", "ERR_SSL_WRONG_VERSION_NUMBER", "ECONNRESET",
    "ECONNREFUSED", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH",
    "ENETUNREACH", "UND_ERR_CONNECT", "UND_ERR_SOCKET", "ECONNABORTED",
  ]);
  let current: unknown = error.cause;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current !== "object") break;
    const candidate = current as { name?: unknown; code?: unknown; cause?: unknown };
    if (candidate.name === "TimeoutError" || candidate.name === "AbortError" ||
        (typeof candidate.code === "string" && timeoutCodes.has(candidate.code))) {
      return "BCV_SOURCE_TIMEOUT";
    }
    if (typeof candidate.code === "string" && transportCodes.has(candidate.code)) {
      return "BCV_SOURCE_TLS_OR_NETWORK_ERROR";
    }
    current = candidate.cause;
  }
  // Node fetch reports DNS/TLS/socket failures as TypeError with a nested cause.
  return "BCV_SOURCE_TLS_OR_NETWORK_ERROR";
}

/**
 * Persist one attempt and its terminal result. The singleton row lock protects
 * both operational state and exchange_rates: a superseded fetch must not
 * invalidate or insert a rate after a newer attempt has taken ownership.
 */
export async function syncBcvOfficialRate(
  databaseUrl: string | undefined,
  createClient?: DatabaseClientFactory,
): Promise<"inserted" | "unchanged" | "older" | "superseded"> {
  const attemptId = crypto.randomUUID();

  // Phase A: claim the singleton attempt, then close the DB connection before
  // making any external network request.
  const started = await withDatabaseClient(databaseUrl, async (client) => {
    return client.query<{ attempt_id: string }>(
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
  }, createClient);
  if (started.rows.length !== 1) throw new Error("BCV_SYNC_STATE_ROW_MISSING");

  // Phase B: fetch and validate the official source without holding a DB
  // connection. A failure is recorded with a short, independent connection.
  let rate: BcvOfficialRate;
  try {
    rate = await fetchBcvOfficialRate();
  } catch (error) {
    try {
      const markedFailed = await withDatabaseClient(databaseUrl, async (client) => {
        return client.query<{ attempt_id: string }>(
          `UPDATE public.bcv_sync_state
              SET last_outcome = 'failed',
                  last_error_code = $2,
                  updated_at = now()
            WHERE singleton = true AND attempt_id = $1::uuid
            RETURNING attempt_id::text AS attempt_id`,
          [attemptId, safeBcvSyncErrorCode(error)],
        );
      }, createClient);
      if (markedFailed.rows.length === 0) return "superseded";
    } catch {
      // Keep the original BCV error. If DB is unavailable, the watchdog can
      // detect the still-running attempt without exposing driver details.
    }
    throw error;
  }

  // Phase C: use a fresh connection and one transaction. The row lock and
  // attemptId comparison prevent a superseded fetch from touching any rate.
  let terminal: { kind: "superseded" } | { kind: "success"; outcome: "inserted" | "unchanged" | "older" } | { kind: "failed"; errorCode: string };
  try {
    terminal = await withDatabaseClient(databaseUrl, async (client) => {
      return withDatabaseTransaction(client, async (tx) => {
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
          // Anti-corruption guard: compare only with the latest valid official
          // observation from the preceding 15 effective-date days. A first
          // historical observation has no baseline and is accepted; a jump
          // beyond +/-35% is rejected before any rate row is written.
          const previousRate = await tx.query<{ exceeds_limit: boolean }>(
            `SELECT (abs($1::numeric - prior.rate) / prior.rate) > 0.35 AS exceeds_limit
               FROM public.get_recent_bcv_rate_baseline($2::date) AS prior(rate)`,
            [rate.rate, rate.effectiveDate],
          );
          if (previousRate.rows[0]?.exceeds_limit) {
            throw new Error("BCV_RATE_VARIATION_OUT_OF_RANGE");
          }
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
    }, createClient);
  } catch (error) {
    // COMMIT can be ambiguous if PostgreSQL committed but its response was
    // lost. Reconcile through a fresh connection and only mark a still-running
    // attempt failed; never overwrite a terminal success from an ambiguous
    // commit. If DB is unavailable, leave running for watchdog reconciliation.
    try {
      await withDatabaseClient(databaseUrl, async (client) => {
        await client.query(
          `UPDATE public.bcv_sync_state
              SET last_outcome = 'failed',
                  last_error_code = $2,
                  updated_at = now()
            WHERE singleton = true
              AND attempt_id = $1::uuid
              AND last_outcome = 'running'`,
          [attemptId, safeBcvSyncErrorCode(error)],
        );
      }, createClient);
    } catch {
      // Preserve the original terminal-phase failure.
    }
    throw error;
  }

  if (terminal.kind === "superseded") return "superseded";
  if (terminal.kind === "failed") throw new Error(terminal.errorCode);
  return terminal.outcome;
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
      WHERE source = $1 AND base_currency='USD' AND quote_currency='VES' AND rate > 0
        AND effective_date = $2::date
      ORDER BY fetched_at DESC
      LIMIT 1`,
    [BCV_SOURCE_ID, today],
  );
  const row = result.rows[0];
  return row?.effective_date === today ? row : null;
}

export async function findLatestBcvRate(
  client: DatabaseClient,
  now = new Date(),
): Promise<(StoredRateRow & { id: string; fetched_at: string; status: "current" | "scheduled" | "stale"; priority: string | null; operation_date: string }) | null> {
  const stateResult = await client.query<{
    operation_date: string; last_success_at: string | Date | null; last_outcome: string | null;
    last_effective_date: string | null; last_error_code: string | null; has_success_observation: boolean;
  }>(
    `SELECT (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date::text AS operation_date,
            observation.last_success_at, observation.last_outcome,
            observation.last_effective_date::text AS last_effective_date,
            observation.last_error_code, (observation.id IS NOT NULL) AS has_success_observation
       FROM public.bcv_sync_state state
       LEFT JOIN LATERAL (
         SELECT obs.id, obs.last_success_at, obs.last_outcome, obs.last_effective_date, obs.last_error_code
           FROM public.bcv_sync_success_observations obs
           JOIN public.exchange_rates rate_row
             ON rate_row.id = obs.exchange_rate_id
            AND rate_row.source = 'BCV_OFFICIAL_HTML_V1'
            AND rate_row.base_currency = 'USD' AND rate_row.quote_currency = 'VES'
            AND rate_row.effective_date = obs.last_effective_date
            AND rate_row.rate = obs.rate_snapshot
            AND rate_row.fetched_at = obs.rate_fetched_at
            AND rate_row.validation_status = 'valid'
          WHERE obs.last_error_code IS NULL
            AND obs.last_outcome IN ('inserted','unchanged')
            AND obs.validation_status = 'valid'
            AND obs.exchange_rate_id IS NOT NULL AND obs.rate_snapshot > 0
            AND obs.observed_at >= obs.last_success_at
            AND obs.last_success_at <= pg_catalog.clock_timestamp()
          ORDER BY obs.observed_at DESC
          LIMIT 1
       ) observation ON true
      WHERE state.singleton = true`,
  );
  const state = stateResult.rows[0] ?? null;
  const operationDate = state?.operation_date ?? bcvCaracasDate(now);
  const rowsResult = await client.query<StoredRateRow & { id: string; fetched_at: string }>(
    `SELECT id,rate::text AS rate,effective_date::text AS effective_date,
            to_char(fetched_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at,
            validation_status
       FROM public.exchange_rates
      WHERE source=$1 AND base_currency='USD' AND quote_currency='VES' AND rate > 0 AND effective_date >= ($2::date - 10) AND effective_date <= ($2::date + 5)
      ORDER BY effective_date DESC,fetched_at DESC`,
    [BCV_SOURCE_ID,operationDate],
  );
  const rows = rowsResult.rows;
  if (!rows.length) return null;
  const policyState = state?.has_success_observation ? state : null;
  const selected = selectApplicableBcvRate(operationDate,policyState,rows);
  if (selected) return { ...selected.row, fetched_at: selected.row.fetched_at ?? "", status: "current", priority: selected.priority, operation_date: operationDate };
  const hasValidExact = rows.some((row) => row.validation_status === "valid" && row.effective_date === operationDate);
  const futureCandidates = rows.filter((row) => row.validation_status === "valid" && row.effective_date > operationDate && row.effective_date <= new Date(Date.parse(`${operationDate}T00:00:00.000Z`) + 5*86_400_000).toISOString().slice(0,10))
    .sort((a,b) => a.effective_date.localeCompare(b.effective_date));
  const nearestFutureDate = futureCandidates[0]?.effective_date;
  const nearestFutureRows = nearestFutureDate ? futureCandidates.filter((row) => row.effective_date === nearestFutureDate) : [];
  const future = nearestFutureRows.length === 1 ? nearestFutureRows[0] : undefined;
  const operationWeekday = new Date(Date.parse(`${operationDate}T00:00:00.000Z`)).getUTCDay();
  const weekendOperation = operationWeekday === 0 || operationWeekday === 6;
  const observationSuccessAt = state?.last_success_at instanceof Date
    ? state.last_success_at.getTime()
    : state?.last_success_at ? Date.parse(state.last_success_at) : Number.NaN;
  const weekdaySyncConfirmed = Number.isFinite(observationSuccessAt) &&
    observationSuccessAt >= Date.parse(`${operationDate}T04:00:00.000Z`);
  if (!hasValidExact && future && state?.has_success_observation &&
      (weekendOperation || weekdaySyncConfirmed) &&
      (state.last_outcome === "inserted" || state.last_outcome === "unchanged") &&
      state.last_error_code === null && state.last_effective_date !== null &&
      state.last_effective_date >= future.effective_date) {
    return { ...future, status: "scheduled", priority: null, operation_date: operationDate };
  }
  const fallback = rows[0]!;
  return { ...fallback, status: "stale", priority: null, operation_date: operationDate };
}

export function registerExchangeRateRoutes(app: Hono<{ Bindings: Bindings }>): void {

  app.get("/api/orgs/:organizationId/bcv/sync-state", async (c) => {
    const organizationId = c.req.param("organizationId");
    const sessionToken = getCookie(c, "microapp_session");
    try {
      const state = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const authorization = await authorizeTenantOperation(
          client,
          sessionToken,
          organizationId,
          "bcv.sync_state.read",
          false,
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
      const isStaleRunning = isBcvSyncStateStaleRunning(
        outcome,
        state.state.attempt_age_seconds,
      );
      const health = isStaleRunning
        ? "attention"
        : outcome === "running"
          ? "running"
          : outcome === "failed"
            ? "failed"
            : (outcome === "inserted" || outcome === "unchanged") && state.state.last_success_at !== null
              ? "succeeded"
              : "attention";
      return c.json({
        source: BCV_SOURCE_ID,
        health,
        isStaleRunning,
        staleRunningThresholdSeconds: BCV_STALE_RUNNING_THRESHOLD_SECONDS,
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
    c.header("Cache-Control", "no-store");
    const blocked = applyPublicExchangeRateGuard(c);
    if (blocked) return blocked;
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
      c.header("Cache-Control", "no-store");
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
    c.header("Cache-Control", "no-store");
    const blocked = applyPublicExchangeRateGuard(c);
    if (blocked) return blocked;
    try {
      const row = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        findLatestBcvRate(client),
      );
      c.header("Cache-Control", "no-store");
      if (!row || row.status === "stale") {
        return c.json({ error: "BCV_RATE_UNAVAILABLE", message: "No existe una tasa BCV válida y confirmada para la fecha operativa." }, 503);
      }
      return c.json({
        baseCurrency: "USD",
        quoteCurrency: "VES",
        rate: row.rate,
        effectiveDate: row.effective_date,
        operationDate: row.operation_date,
        fetchedAt: row.fetched_at,
        source: BCV_SOURCE_ID,
        status: row.status,
        selectionPriority: row.priority,
      });
    } catch {
      return c.json({ error: "BCV_RATE_LOOKUP_FAILED", message: "No se pudo consultar la tasa BCV." }, 503);
    }
  });
}
