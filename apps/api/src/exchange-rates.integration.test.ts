import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { persistBcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const databaseUrl = processEnv?.DATABASE_URL_ADMIN ?? processEnv?.DATABASE_URL;
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
  const source = "BCV_OFFICIAL_HTML_V1";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("PostgreSQL integration database is not configured.");
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    // This suite runs only against the disposable PostgreSQL service in CI.
    await client.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
  });

  afterAll(async () => {
    if (!client) return;
    try {
      await client.query("DELETE FROM public.exchange_rates WHERE source = $1", [source]);
    } finally {
      await client.end();
    }
  });

  it("keeps today's BCV rate when tomorrow's effective date was inserted first", async () => {
    if (!client) throw new Error("PostgreSQL integration client is not connected.");

    const dates = await client.query<{ today: string; tomorrow: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS today, ((now() AT TIME ZONE 'America/Caracas')::date + 1)::text AS tomorrow",
    );
    const { today, tomorrow } = dates.rows[0]!;
    const databaseClient = client as unknown as DatabaseClient;

    await expect(persistBcvOfficialRate(databaseClient, {
      rate: "895.10000000",
      effectiveDate: tomorrow,
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

    const stored = await client.query<{ effective_date: string; rate: string }>(
      "SELECT effective_date::text, rate::text FROM public.exchange_rates WHERE source = $1 ORDER BY effective_date DESC",
      [source],
    );
    expect(stored.rows).toEqual([
      { effective_date: tomorrow, rate: "895.10000000" },
      { effective_date: today, rate: "894.88760000" },
    ]);

    const latest = await client.query<{ effective_date: string; rate: string }>(
      `SELECT effective_date::text, rate::text
         FROM public.exchange_rates
        WHERE source = $1 AND validation_status = 'valid' AND effective_date <= $2::date
        ORDER BY effective_date DESC, fetched_at DESC
        LIMIT 1`,
      [source, today],
    );
    expect(latest.rows).toEqual([
      { effective_date: today, rate: "894.88760000" },
    ]);
  });
});
