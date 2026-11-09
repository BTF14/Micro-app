import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { findApplicableBcvRate, persistBcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";
import app from "./index";

// Run the Hono routes through the same PostgreSQL adapter contract as the Worker.
vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) {
        super({ connectionString });
      }
    },
  };
});
const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
// DATABASE_URL is the principal under test (admin in the regular CI job,
 // microapp_runtime in the runtime-role job). Cleanup always uses the admin URL.
const databaseUrl = processEnv?.DATABASE_URL ?? processEnv?.DATABASE_URL_ADMIN;
const cleanupDatabaseUrl = processEnv?.DATABASE_URL_ADMIN ?? databaseUrl;
const isCi = Boolean(processEnv?.CI);
const isDisposableCiDatabase = (() => {
  if (!isCi || !databaseUrl) return false;
  try {
    const url = new URL(databaseUrl);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname === "/microapp_test";
  } catch {
    return false;
  }
})();

if (isCi && !isDisposableCiDatabase) {
  throw new Error("BCV PostgreSQL integration tests require the disposable localhost microapp_test database.");
}

describe.skipIf(!isDisposableCiDatabase)("BCV effective-date persistence against disposable PostgreSQL", () => {
  let client: Client | undefined;
  let cleanupClient: Client | undefined;
  const source = "BCV_OFFICIAL_HTML_V1";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("PostgreSQL integration database is not configured.");
    if (!cleanupDatabaseUrl) throw new Error("PostgreSQL admin cleanup URL is not configured.");
    client = new Client({ connectionString: databaseUrl });
    cleanupClient = new Client({ connectionString: cleanupDatabaseUrl });
    await client.connect();
    await cleanupClient.connect();
    // This suite runs only against the disposable PostgreSQL service in CI.
    await cleanupClient.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
  });

  afterAll(async () => {
    try {
      if (cleanupClient) await cleanupClient.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
    } finally {
      await client?.end();
      await cleanupClient?.end();
    }
  });

  it("runs BCV synchronization only on the production Cron using the runtime role", async () => {
    if (!client || !cleanupClient || !databaseUrl) {
      throw new Error("PostgreSQL integration clients are not connected.");
    }

    const dates = await cleanupClient.query<{ today: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today",
    );
    const today = dates.rows[0]!.today;
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas", weekday: "short",
    }).format(new Date(`${today}T16:00:00.000Z`));
    const daysUntilNextBusinessDay = weekday === "Fri" ? 3 : weekday === "Sat" ? 2 : weekday === "Sun" ? 1 : 1;
    const nextDate = new Date(`${today}T12:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + daysUntilNextBusinessDay);
    const nextEffectiveDate = nextDate.toISOString().slice(0, 10);
    const dateLabel = new Intl.DateTimeFormat("es-VE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      timeZone: "America/Caracas",
    }).format(new Date(`${nextEffectiveDate}T16:00:00.000Z`));
    const html = `<html><body><p>USD</p><p>895,10000000</p><p>Fecha Valor: ${dateLabel}</p></body></html>`;
    const fetchMock = vi.fn().mockResolvedValue(new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }));
    const scheduledApp = app as typeof app & {
      scheduled: (controller: { cron: string }, env: { APP_ENV: "production" | "preview"; DATABASE_URL?: string; BCV_SYNC_ENABLED?: string }) => Promise<void>;
    };

    await cleanupClient.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
    vi.stubGlobal("fetch", fetchMock);
    try {
      await scheduledApp.scheduled({ cron: "0 22 * * 1-5" }, { APP_ENV: "preview" });
      expect(fetchMock).not.toHaveBeenCalled();

      await scheduledApp.scheduled(
        { cron: "0 22 * * 1-5" },
        { APP_ENV: "production", DATABASE_URL: databaseUrl, BCV_SYNC_ENABLED: "true" },
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const stored = await cleanupClient.query<{ effective_date: string; rate: string }>(
        "SELECT effective_date::text, rate::text FROM public.exchange_rates WHERE source = $1",
        [source],
      );
      expect(stored.rows).toEqual([
        { effective_date: nextEffectiveDate, rate: "895.10000000" },
      ]);

      const syncState = await cleanupClient.query<{
        last_outcome: string;
        last_error_code: string | null;
        last_effective_date: string | null;
        last_attempt_at: string | null;
        last_success_at: string | null;
      }>(
        `SELECT last_outcome, last_error_code, last_effective_date::text,
                last_attempt_at::text, last_success_at::text
           FROM public.bcv_sync_state WHERE singleton = true`,
      );
      expect(syncState.rows).toHaveLength(1);
      expect(syncState.rows[0]).toMatchObject({
        last_outcome: "inserted",
        last_error_code: null,
        last_effective_date: nextEffectiveDate,
      });
      expect(syncState.rows[0]?.last_attempt_at).toBeTruthy();
      expect(syncState.rows[0]?.last_success_at).toBeTruthy();

      const priorSuccessAt = syncState.rows[0]!.last_success_at;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", {
        status: 503,
        headers: { "content-type": "text/html" },
      })));
      await expect(scheduledApp.scheduled(
        { cron: "0 22 * * 1-5" },
        { APP_ENV: "production", DATABASE_URL: databaseUrl, BCV_SYNC_ENABLED: "true" },
      )).rejects.toThrow("BCV_SYNC_FAILED");

      const failedState = await cleanupClient.query<{
        last_outcome: string;
        last_error_code: string | null;
        last_success_at: string | null;
      }>(
        `SELECT last_outcome, last_error_code, last_success_at::text
           FROM public.bcv_sync_state WHERE singleton = true`,
      );
      expect(failedState.rows[0]).toMatchObject({
        last_outcome: "failed",
        last_error_code: "BCV_SOURCE_HTTP_ERROR",
        last_success_at: priorSuccessAt,
      });
    } finally {
      vi.unstubAllGlobals();
      await cleanupClient.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
    }
  });

  it("prevents a slower overlapping attempt from overwriting the newer result", async () => {
    if (!client || !cleanupClient || !databaseUrl) {
      throw new Error("PostgreSQL integration clients are not connected.");
    }

    const dates = await cleanupClient.query<{ today: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today",
    );
    const today = dates.rows[0]!.today;
    const dateLabel = new Intl.DateTimeFormat("es-VE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      timeZone: "America/Caracas",
    }).format(new Date(`${today}T16:00:00.000Z`));
    const olderHtml = `<html><body><p>USD</p><p>895,10000000</p><p>Fecha Valor: ${dateLabel}</p></body></html>`;
    const newerHtml = `<html><body><p>USD</p><p>896,10000000</p><p>Fecha Valor: ${dateLabel}</p></body></html>`;

    let releaseOlderFetch!: (response: Response) => void;
    let signalOlderFetchStarted!: () => void;
    const olderFetchStarted = new Promise<void>((resolve) => { signalOlderFetchStarted = resolve; });
    const olderFetchResponse = new Promise<Response>((resolve) => { releaseOlderFetch = resolve; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => {
        signalOlderFetchStarted();
        return olderFetchResponse;
      })
      .mockResolvedValueOnce(new Response(newerHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    const scheduledApp = app as typeof app & {
      scheduled: (controller: { cron: string }, env: { APP_ENV: "production" | "preview"; DATABASE_URL?: string; BCV_SYNC_ENABLED?: string }) => Promise<void>;
    };

    vi.stubGlobal("fetch", fetchMock);
    try {
      const olderAttempt = scheduledApp.scheduled(
        { cron: "0 22 * * 1-5" },
        { APP_ENV: "production", DATABASE_URL: databaseUrl, BCV_SYNC_ENABLED: "true" },
      );
      await olderFetchStarted;

      await scheduledApp.scheduled(
        { cron: "0 22 * * 1-5" },
        { APP_ENV: "production", DATABASE_URL: databaseUrl, BCV_SYNC_ENABLED: "true" },
      );
      const newerState = await cleanupClient.query<{ attempt_id: string; last_outcome: string }>(
        "SELECT attempt_id::text, last_outcome FROM public.bcv_sync_state WHERE singleton = true",
      );
      expect(newerState.rows[0]?.last_outcome).toBe("inserted");
      const newerAttemptId = newerState.rows[0]?.attempt_id;

      releaseOlderFetch(new Response(olderHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
      await expect(olderAttempt).resolves.toBeUndefined();

      const finalRate = await cleanupClient.query<{ rate: string; validation_status: string }>(
        "SELECT rate::text, validation_status FROM public.exchange_rates WHERE source = $1 AND effective_date = $2::date",
        [source, today],
      );
      expect(finalRate.rows).toEqual([{ rate: "896.10000000", validation_status: "valid" }]);

      const finalState = await cleanupClient.query<{ attempt_id: string; last_outcome: string }>(
        "SELECT attempt_id::text, last_outcome FROM public.bcv_sync_state WHERE singleton = true",
      );
      expect(finalState.rows[0]).toEqual({
        attempt_id: newerAttemptId,
        last_outcome: "inserted",
      });
    } finally {
      vi.unstubAllGlobals();
      await cleanupClient.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
    }
  });

  it("stores today's rate after the next business-day rate and selects the applicable date", async () => {
    if (!client) throw new Error("PostgreSQL integration client is not connected.");

    const dates = await client.query<{ today: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today",
    );
    const { today } = dates.rows[0]!;
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas", weekday: "short",
    }).format(new Date());
    const daysUntilNextBusinessDay = weekday === "Fri" ? 3 : weekday === "Sat" ? 2 : weekday === "Sun" ? 1 : 1;
    const nextBusinessDate = new Date(`${today}T12:00:00Z`);
    nextBusinessDate.setUTCDate(nextBusinessDate.getUTCDate() + daysUntilNextBusinessDay);
    const nextEffectiveDate = nextBusinessDate.toISOString().slice(0, 10);
    const expectedApplicableDate = today;
    const expectedApplicableRate = "894.88760000";
    const databaseClient = client as unknown as DatabaseClient;

    await expect(persistBcvOfficialRate(databaseClient, {
      rate: "895.10000000",
      effectiveDate: nextEffectiveDate,
    })).resolves.toBe("inserted");

    await expect(persistBcvOfficialRate(databaseClient, {
      rate: "894.88760000",
      effectiveDate: today,
    })).resolves.toBe("inserted");

    // Replaying the same official effective date/value must remain idempotent.
    await expect(persistBcvOfficialRate(databaseClient, {
      rate: "894.88760000",
      effectiveDate: today,
    })).resolves.toBe("unchanged");

    const stored = await cleanupClient!.query<{ effective_date: string; rate: string }>(
      "SELECT effective_date::text, rate::text FROM public.exchange_rates WHERE source = $1 ORDER BY effective_date DESC",
      [source],
    );
    expect(stored.rows).toEqual([
      { effective_date: nextEffectiveDate, rate: "895.10000000" },
      { effective_date: today, rate: "894.88760000" },
    ]);

    const latest = await findApplicableBcvRate(databaseClient, new Date());
    expect(latest).toMatchObject({
      effective_date: expectedApplicableDate,
      rate: expectedApplicableRate,
    });

    const latestResponse = await app.fetch(
      new Request("https://api.example/api/exchange-rates/latest"),
      { APP_ENV: "production", DATABASE_URL: databaseUrl },
    );
    expect(latestResponse.status).toBe(200);
    expect(latestResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(latestResponse.json()).resolves.toMatchObject({
      rate: expectedApplicableRate,
      effectiveDate: expectedApplicableDate,
      source,
      status: "current",
    });

    const historyResponse = await app.fetch(
      new Request("https://api.example/api/exchange-rates/history?limit=10"),
      { APP_ENV: "production", DATABASE_URL: databaseUrl },
    );
    expect(historyResponse.status).toBe(200);
    await expect(historyResponse.json()).resolves.toMatchObject({
      source,
      rates: [
        { rate: "895.10000000", effectiveDate: nextEffectiveDate, status: "scheduled" },
        { rate: "894.88760000", effectiveDate: today, status: "current" },
      ],
    });
  });
});
