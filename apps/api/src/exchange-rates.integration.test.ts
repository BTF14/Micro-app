import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import type { DatabaseClient } from "./database";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) { super({ connectionString }); }
    },
  };
});

const { persistBcvOfficialRate } = await import("./exchange-rates");
const app = (await import("./index")).default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);
const sourceId = "BCV_OFFICIAL_HTML_V1";

if (isCi && (!databaseUrl || !databaseUrlAdmin)) {
  throw new Error("Runtime and admin PostgreSQL URLs are required in CI; refusing to skip BCV integration tests.");
}

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

describe.skipIf(!databaseUrl || !databaseUrlAdmin)("BCV persistence against PostgreSQL runtime role", () => {
  let admin: Client;
  let runtime: Client & DatabaseClient;
  let today = "";
  let tomorrow = "";

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrlAdmin });
    runtime = new Client({ connectionString: databaseUrl }) as Client & DatabaseClient;
    await admin.connect();
    await runtime.connect();

    today = caracasDate(new Date());
    tomorrow = new Date(Date.parse(`${today}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
    await admin.query(
      "DELETE FROM public.exchange_rates WHERE source = $1 AND effective_date IN ($2::date, $3::date)",
      [sourceId, today, tomorrow],
    );
  });

  afterAll(async () => {
    if (admin && today && tomorrow) {
      await admin.query(
        "DELETE FROM public.exchange_rates WHERE source = $1 AND effective_date IN ($2::date, $3::date)",
        [sourceId, today, tomorrow],
      );
    }
    if (runtime) await runtime.end();
    if (admin) await admin.end();
  });

  it("stores today's rate when tomorrow's effective rate was inserted first and serves today's rate as current", async () => {
    const futureResult = await persistBcvOfficialRate(runtime, {
      rate: "900.00000000",
      effectiveDate: tomorrow,
    });
    expect(futureResult).toBe("inserted");

    const todayResult = await persistBcvOfficialRate(runtime, {
      rate: "899.00000000",
      effectiveDate: today,
    });
    expect(todayResult).toBe("older");

    const stored = await admin.query<{ rate: string; validation_status: string }>(
      "SELECT rate::text AS rate, validation_status FROM public.exchange_rates WHERE source = $1 AND effective_date = $2::date",
      [sourceId, today],
    );
    expect(stored.rows[0]).toMatchObject({ rate: "899.00000000", validation_status: "valid" });

    const latest = await app.fetch(
      new Request("https://api.example/api/exchange-rates/latest"),
      { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" },
    );
    expect(latest.status).toBe(200);
    await expect(latest.json()).resolves.toMatchObject({
      rate: "899.00000000",
      effectiveDate: today,
      status: "current",
    });

    const history = await app.fetch(
      new Request("https://api.example/api/exchange-rates/history?limit=10"),
      { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" },
    );
    expect(history.status).toBe(200);
    const historyBody = await history.json() as { rates: Array<{ effectiveDate: string; status: string }> };
    expect(historyBody.rates).toEqual(expect.arrayContaining([
      { effectiveDate: tomorrow, status: "scheduled" },
      { effectiveDate: today, status: "current" },
    ]));
  });

  it("marks a changed same-day publication stale and does not silently replace the stored value", async () => {
    await expect(persistBcvOfficialRate(runtime, {
      rate: "899.00000001",
      effectiveDate: today,
    })).rejects.toThrow("BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE");

    const stored = await admin.query<{ rate: string; validation_status: string }>(
      "SELECT rate::text AS rate, validation_status FROM public.exchange_rates WHERE source = $1 AND effective_date = $2::date",
      [sourceId, today],
    );
    expect(stored.rows[0]).toMatchObject({ rate: "899.00000000", validation_status: "stale" });

    const latest = await app.fetch(
      new Request("https://api.example/api/exchange-rates/latest"),
      { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" },
    );
    expect(latest.status).toBe(503);
  });
});
