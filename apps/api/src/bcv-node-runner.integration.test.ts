import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import type { DatabaseClient, DatabaseClientFactory } from "./database";
import { runBcvNodeSync } from "./bcv-node-runner";

const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const producerUrl = processEnv?.DATABASE_URL_BCV_SYNC ?? processEnv?.BCV_DATABASE_URL;
const adminUrl = processEnv?.DATABASE_URL_ADMIN;
const runtimeUrl = processEnv?.DATABASE_URL_RUNTIME ?? processEnv?.RUNTIME_DATABASE_URL;
const isCi = Boolean(processEnv?.CI);
const disposable = (() => {
  if (!producerUrl || !adminUrl || !runtimeUrl) return false;
  try {
    const urls = [producerUrl, adminUrl, runtimeUrl].map((value) => new URL(value));
    return urls.every((url) =>
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname === "/microapp_test") &&
      urls[0]!.username === "microapp_bcv_sync" &&
      urls[2]!.username === "microapp_runtime";
  } catch {
    return false;
  }
})();
if (isCi && !disposable) {
  throw new Error("BCV Node runner integration requires disposable localhost PostgreSQL 18 and dedicated producer/runtime roles.");
}

const pgFactory: DatabaseClientFactory = (url) =>
  new Client({ connectionString: url }) as unknown as DatabaseClient;

describe.skipIf(!disposable)("BCV Node runner PostgreSQL 18 least-privilege preflight", () => {
  let admin: Client;
  const source = "BCV_OFFICIAL_HTML_V1";

  async function clearBcvFixtures(): Promise<void> {
    await admin.query("ALTER TABLE public.bcv_sync_success_observations DISABLE TRIGGER ALL");
    try {
      await admin.query("DELETE FROM public.bcv_sync_success_observations");
    } finally {
      await admin.query("ALTER TABLE public.bcv_sync_success_observations ENABLE TRIGGER ALL");
      await admin.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_10_append_only_rows");
      await admin.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_20_append_only_truncate");
    }
    await admin.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
  }

  beforeAll(async () => {
    if (!adminUrl) throw new Error("Disposable admin URL is missing.");
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
  });

  afterAll(async () => {
    try {
      await clearBcvFixtures();
      await admin.query(
        `UPDATE public.bcv_sync_state
            SET attempt_id = NULL, last_attempt_at = NULL, last_success_at = NULL,
                last_outcome = NULL, last_error_code = NULL, last_effective_date = NULL,
                updated_at = now()
          WHERE singleton = true`,
      );
    } finally {
      await admin.end();
    }
  });

  it("skips after today's successful state and valid rate without mutating bcv_sync_state", async () => {
    const dateResult = await admin.query<{ today: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today",
    );
    const today = dateResult.rows[0]!.today;
    await clearBcvFixtures();
    await admin.query(
      `INSERT INTO public.exchange_rates
         (base_currency, quote_currency, rate, source, effective_date, fetched_at, validation_status)
       VALUES ('USD','VES',895.1,$1,$2::date,now(),'valid')`,
      [source, today],
    );
    await admin.query(
      `UPDATE public.bcv_sync_state
          SET attempt_id = gen_random_uuid(), last_attempt_at = now() - interval '1 hour',
              last_success_at = now() - interval '1 hour', last_outcome = 'unchanged',
              last_error_code = NULL, last_effective_date = $1::date, updated_at = now()
        WHERE singleton = true`,
      [today],
    );
    const before = await admin.query(
      `SELECT attempt_id::text, last_attempt_at::text, last_success_at::text,
              last_outcome, last_error_code, last_effective_date::text, updated_at::text
         FROM public.bcv_sync_state WHERE singleton = true`,
    );

    const result = await runBcvNodeSync(producerUrl, false, pgFactory);
    expect(result).toMatchObject({ status: "skipped", outcome: "unchanged" });
    const after = await admin.query(
      `SELECT attempt_id::text, last_attempt_at::text, last_success_at::text,
              last_outcome, last_error_code, last_effective_date::text, updated_at::text
         FROM public.bcv_sync_state WHERE singleton = true`,
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("recovers a failed state by confirming the current official rate", async () => {
    const dateResult = await admin.query<{ today: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today",
    );
    const today = dateResult.rows[0]!.today;
    const dateLabel = new Intl.DateTimeFormat("es-VE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      timeZone: "America/Caracas",
    }).format(new Date(`${today}T16:00:00.000Z`));
    await clearBcvFixtures();
    await admin.query(
      `INSERT INTO public.exchange_rates
         (base_currency, quote_currency, rate, source, effective_date, fetched_at, validation_status)
       VALUES ('USD','VES',895.1,$1,$2::date,now(),'valid')`,
      [source, today],
    );
    await admin.query(
      `UPDATE public.bcv_sync_state
          SET attempt_id = gen_random_uuid(), last_attempt_at = now() - interval '1 hour',
              last_success_at = now() - interval '1 hour', last_outcome = 'failed',
              last_error_code = 'BCV_SOURCE_TLS_OR_NETWORK_ERROR',
              last_effective_date = $1::date, updated_at = now()
        WHERE singleton = true`,
      [today],
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      `<html><body><p>USD 895,10000000</p><p>Fecha Valor: ${dateLabel}</p></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    )));
    try {
      const result = await runBcvNodeSync(producerUrl, false, pgFactory);
      expect(result).toMatchObject({ status: "synced", outcome: "unchanged" });
      const state = await admin.query<{ last_outcome: string; last_error_code: string | null }>(
        "SELECT last_outcome, last_error_code FROM public.bcv_sync_state WHERE singleton = true",
      );
      expect(state.rows[0]).toEqual({ last_outcome: "unchanged", last_error_code: null });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects the runtime principal before reading producer-only state", async () => {
    await expect(runBcvNodeSync(runtimeUrl, false, pgFactory))
      .rejects.toThrow("BCV_SYNC_DATABASE_ROLE_INVALID");
  });
});
