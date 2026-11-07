import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { persistBcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const databaseUrl = processEnv?.DATABASE_URL_ADMIN ?? processEnv?.DATABASE_URL;
const isCi = Boolean(processEnv?.CI);

if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip BCV PostgreSQL integration tests.");
}

describe.skipIf(!databaseUrl)("BCV effective-date persistence against PostgreSQL", () => {
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
      "SELECT current_date::text AS today, (current_date + 1)::text AS tomorrow",
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
        WHERE source = $1 AND validation_status = 'valid' AND effective_date <= current_date
        ORDER BY effective_date DESC, fetched_at DESC
        LIMIT 1`,
      [source],
    );
    expect(latest.rows).toEqual([
      { effective_date: today, rate: "894.88760000" },
    ]);
  });
});
