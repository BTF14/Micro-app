import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient, DatabaseClientFactory } from "./database";
import type { Bindings } from "./bindings";
import { registerBcvRoutes, syncBcvRate, validateBcvPayloads } from "./bcv";

const now = new Date("2026-11-05T18:00:00.000Z");
const databaseUrl = "postgres://test:test@localhost/micro_app_test";
const statusPayload = {
  status: "ok",
  generated_at: "2026-11-05T17:00:00.000Z",
  date: "2026-11-05",
  effective_date: "2026-11-05",
  timezone: "America/Caracas",
  source: "https://www.bcv.org.ve/",
  currencies: { USD: true },
};
const ratePayload = {
  USD: 894.8876,
  updated_at: "2026-11-05T17:00:00.000Z",
  effective_date: "2026-11-05",
  date: "2026-11-05",
};

function createDatabaseFactory(rows: Array<{ id: string }> = [], queryError?: Error) {
  const query = vi.fn(async (_statement: string, _values?: unknown[]) => {
    if (queryError) throw queryError;
    return { rows };
  });
  const client: DatabaseClient = {
    connect: vi.fn(async () => undefined),
    query: query as unknown as DatabaseClient["query"],
    end: vi.fn(async () => undefined),
  };
  const factory: DatabaseClientFactory = vi.fn(() => client);
  return { factory, client, query };
}

function createFetcher(options: { status?: unknown; rate?: unknown; fail?: boolean } = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    if (options.fail) throw new Error("network unavailable");
    const url = String(input);
    const payload = url.endsWith("/status.json") ? (options.status ?? statusPayload) : (options.rate ?? ratePayload);
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("BCV source validation", () => {
  it("accepts a fresh, coherent USD/VES payload and preserves six decimal places", () => {
    const result = validateBcvPayloads(statusPayload, ratePayload, now);
    expect(result).toEqual({
      ok: true,
      value: { rate: "894.887600", effectiveDate: "2026-11-05", capturedAt: "2026-11-05T17:00:00.000Z", calendarDate: "2026-11-05" },
    });
  });

  it("rejects an unavailable or partial source status", () => {
    expect(validateBcvPayloads({ ...statusPayload, status: "partial" }, ratePayload, now)).toMatchObject({ ok: false });
    expect(validateBcvPayloads({ ...statusPayload, currencies: { USD: false } }, ratePayload, now)).toMatchObject({ ok: false });
  });

  it("rejects stale status, stale capture timestamps, and mismatched calendar dates", () => {
    expect(validateBcvPayloads({ ...statusPayload, generated_at: "2026-11-04T00:00:00.000Z" }, ratePayload, now)).toMatchObject({ ok: false, reason: "status_stale" });
    expect(validateBcvPayloads(statusPayload, { ...ratePayload, updated_at: "2026-10-01T00:00:00.000Z" }, now)).toMatchObject({ ok: false, reason: "rate_capture_stale" });
    expect(validateBcvPayloads(statusPayload, { ...ratePayload, date: "2026-11-04" }, now)).toMatchObject({ ok: false, reason: "rate_date_mismatch" });
  });

  it("rejects a provenance mismatch, an invalid effective date, and non-positive rates", () => {
    expect(validateBcvPayloads({ ...statusPayload, source: "https://attacker.example/" }, ratePayload, now)).toMatchObject({ ok: false, reason: "source_provenance_invalid" });
    expect(validateBcvPayloads(statusPayload, { ...ratePayload, effective_date: "2026-02-30" }, now)).toMatchObject({ ok: false, reason: "effective_date_invalid" });
    expect(validateBcvPayloads(statusPayload, { ...ratePayload, USD: 0 }, now)).toMatchObject({ ok: false, reason: "usd_rate_invalid" });
  });

  it("accepts a next-business-day effective date within the bounded window", () => {
    const next = { ...ratePayload, effective_date: "2026-11-06" };
    expect(validateBcvPayloads({ ...statusPayload, effective_date: "2026-11-06" }, next, now)).toMatchObject({ ok: true });
  });
});

describe("BCV scheduled ingestion", () => {
  it("persists a validated rate with source provenance and numeric precision", async () => {
    const { factory, query } = createDatabaseFactory([{ id: "rate-id" }]);
    const fetcher = createFetcher();
    const result = await syncBcvRate({ DATABASE_URL: databaseUrl }, { fetcher, databaseClientFactory: factory, now: () => now });
    expect(result).toEqual({ status: "updated", effectiveDate: "2026-11-05" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]).toEqual(["USD", "VES", "894.887600", "bcv.today", "2026-11-05", "valid"]);
  });

  it("does not write when the conditional upsert reports an unchanged rate", async () => {
    const { factory } = createDatabaseFactory([]);
    const result = await syncBcvRate({ DATABASE_URL: databaseUrl }, { fetcher: createFetcher(), databaseClientFactory: factory, now: () => now });
    expect(result).toEqual({ status: "unchanged", effectiveDate: "2026-11-05" });
  });

  it("does not touch the database when the provider is unavailable or invalid", async () => {
    const { factory } = createDatabaseFactory();
    await expect(syncBcvRate({ DATABASE_URL: databaseUrl }, { fetcher: createFetcher({ fail: true }), databaseClientFactory: factory, now: () => now })).resolves.toEqual({ status: "skipped", reason: "source_unavailable" });
    await expect(syncBcvRate({ DATABASE_URL: databaseUrl }, { fetcher: createFetcher({ rate: { ...ratePayload, USD: -1 } }), databaseClientFactory: factory, now: () => now })).resolves.toEqual({ status: "skipped", reason: "invalid_source" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("propagates persistence failures so the scheduled invocation is visibly failed", async () => {
    const { factory } = createDatabaseFactory([], new Error("database offline"));
    await expect(syncBcvRate({ DATABASE_URL: databaseUrl }, { fetcher: createFetcher(), databaseClientFactory: factory, now: () => now })).rejects.toThrow("database offline");
  });
});

describe("GET /exchange-rates/current", () => {
  function createApp(rows: Array<Record<string, unknown>>, queryError?: Error) {
    const { factory } = createDatabaseFactory(rows as unknown as Array<{ id: string }>, queryError);
    const app = new Hono<{ Bindings: Bindings }>();
    registerBcvRoutes(app, { databaseClientFactory: factory, now: () => now });
    return app;
  }

  it("returns the latest valid rate as a decimal string with explicit provenance", async () => {
    const app = createApp([{
      rate: "894.887600", source: "bcv.today", effective_date: "2026-11-05",
      fetched_at: "2026-11-05T17:00:00.000Z", validation_status: "valid",
    }]);
    const response = await app.request("/exchange-rates/current", {}, { DATABASE_URL: databaseUrl });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      base_currency: "USD", quote_currency: "VES", rate: "894.887600",
      source: { provider: "bcv.today", upstream: "https://www.bcv.org.ve/", official_api: false },
      effective_date: "2026-11-05", fetched_at: "2026-11-05T17:00:00.000Z", status: "valid",
    });
  });

  it("returns the last stored rate but labels it stale when its effective date is old", async () => {
    const app = createApp([{
      rate: "800.000000", source: "bcv.today", effective_date: "2026-10-30",
      fetched_at: "2026-10-30T17:00:00.000Z", validation_status: "valid",
    }]);
    const response = await app.request("/exchange-rates/current", {}, { DATABASE_URL: databaseUrl });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ rate: "800.000000", status: "stale" });
  });

  it("returns 503 instead of inventing a rate when no valid rate exists or the database fails", async () => {
    const empty = createApp([]);
    const unavailable = await empty.request("/exchange-rates/current", {}, { DATABASE_URL: databaseUrl });
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ error: "BCV_RATE_UNAVAILABLE" });

    const broken = createApp([], new Error("database offline"));
    const failed = await broken.request("/exchange-rates/current", {}, { DATABASE_URL: databaseUrl });
    expect(failed.status).toBe(503);
  });
});
