import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { consumeAuthRateLimit, hashAuthRateLimitKey } from "./auth-rate-limit";
import { withDatabaseClient } from "./database";

// Exercise the same query contract with real PostgreSQL while keeping the
// production Worker on @neondatabase/serverless.
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

const appModule = await import("./index");
const app = appModule.default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);
if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip auth rate-limit integration tests.");
}

const frontendOrigin = "https://micro-app.example";
const testPepper = "test-google-client-secret";
const googleEnv = {
  DATABASE_URL: databaseUrl,
  FRONTEND_ORIGIN: frontendOrigin,
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: testPepper,
  GOOGLE_REDIRECT_URI: "https://api.example/auth/google/callback",
  BOOTSTRAP_TOKEN: "expected-bootstrap-token",
};
const suite = describe.skipIf(!databaseUrl)("authentication rate limiting against PostgreSQL", () => {
  let cleanupClient: Client;
  const cleanupKeys: string[] = [];
  const cleanupRateLimitHashes: string[] = [];
  const cleanupBootstrapHandles: string[] = [];

  beforeAll(async () => {
    cleanupClient = new Client({ connectionString: databaseUrl });
    await cleanupClient.connect();
  });

  afterAll(async () => {
    const hashes = [
      ...cleanupRateLimitHashes,
      ...await Promise.all(cleanupKeys.map((key) => hashAuthRateLimitKey(key, testPepper))),
    ];
    if (hashes.length > 0) {
      await cleanupClient.query(
        "DELETE FROM auth_rate_limits WHERE key_hash = ANY($1::char(64)[])",
        [hashes],
      );
    }
    if (cleanupBootstrapHandles.length > 0) {
      await cleanupClient.query(
        "DELETE FROM auth_bootstrap_attempts WHERE handle_hash = ANY($1::char(64)[])",
        [cleanupBootstrapHandles],
      );
    }
    await cleanupClient.end();
  });

  it("atomically allows only the configured number of concurrent requests", async () => {
    const key = `integration:concurrent:${crypto.randomUUID()}`;
    cleanupKeys.push(key);
    const decisions = await Promise.all(
      Array.from({ length: 12 }, () =>
        withDatabaseClient(databaseUrl, (client) => consumeAuthRateLimit(client, key, 5, 60, testPepper)),
      ),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(5);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(7);

    const keyHash = await hashAuthRateLimitKey(key, testPepper);
    const stored = await cleanupClient.query<{ key_hash: string; attempts: number }>(
      "SELECT key_hash, attempts FROM auth_rate_limits WHERE key_hash = $1",
      [keyHash],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]!.key_hash.trim()).toBe(keyHash);
    expect(stored.rows[0]!.attempts).toBe(6);
    expect(stored.rows[0]!.key_hash).not.toContain("integration:concurrent");
  });

  it("resets an expired window atomically", async () => {
    const key = `integration:reset:${crypto.randomUUID()}`;
    cleanupKeys.push(key);
    const keyHash = await hashAuthRateLimitKey(key, testPepper);
    await cleanupClient.query(
      `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
       VALUES ($1, now() - interval '61 seconds', 99, now())`,
      [keyHash],
    );

    const decision = await withDatabaseClient(
      databaseUrl,
      (client) => consumeAuthRateLimit(client, key, 5, 60, testPepper),
    );
    expect(decision).toMatchObject({ allowed: true, attempts: 1, retryAfterSeconds: 0 });
  });

  it("prunes only authentication records older than 48 hours using runtime grants", async () => {
    const oldRateLimitKey = "integration:retention:old:" + crypto.randomUUID();
    const freshRateLimitKey = "integration:retention:fresh:" + crypto.randomUUID();
    cleanupKeys.push(oldRateLimitKey, freshRateLimitKey);
    const [oldRateLimitHash, freshRateLimitHash, oldHandleHash, oldStateHash, freshHandleHash, freshStateHash] =
      await Promise.all([
        hashAuthRateLimitKey(oldRateLimitKey, testPepper),
        hashAuthRateLimitKey(freshRateLimitKey, testPepper),
        hashAuthRateLimitKey("bootstrap:old:" + crypto.randomUUID(), testPepper),
        hashAuthRateLimitKey("state:old:" + crypto.randomUUID(), testPepper),
        hashAuthRateLimitKey("bootstrap:fresh:" + crypto.randomUUID(), testPepper),
        hashAuthRateLimitKey("state:fresh:" + crypto.randomUUID(), testPepper),
      ]);
    cleanupBootstrapHandles.push(oldHandleHash, freshHandleHash);

    await cleanupClient.query(
      "INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at) VALUES ($1, now() - interval '72 hours', 1, now() - interval '60 hours'), ($2, now(), 1, now())",
      [oldRateLimitHash, freshRateLimitHash],
    );
    await cleanupClient.query(
      "INSERT INTO auth_bootstrap_attempts (handle_hash, state_hash, organization_name, organization_slug, expires_at, created_at) VALUES ($1, $2, 'Expired Retention Fixture', 'expired-retention-fixture', now() - interval '60 hours', now() - interval '72 hours'), ($3, $4, 'Fresh Retention Fixture', 'fresh-retention-fixture', now() + interval '10 minutes', now())",
      [oldHandleHash, oldStateHash, freshHandleHash, freshStateHash],
    );

    // Preview invocations must be a no-op and must not open a database client.
    const scheduledApp = app as typeof app & {
      scheduled: (controller: { cron?: string }, env: { APP_ENV?: "production" | "preview"; DATABASE_URL?: string }) => Promise<void>;
    };
    await expect(scheduledApp.scheduled({ cron: "17 * * * *" }, { APP_ENV: "preview" })).resolves.toBeUndefined();

    // Exercise the real Worker scheduled entrypoint with the actual runtime
    // login used by this test invocation, not only the helper function.
    await scheduledApp.scheduled({ cron: "17 * * * *" }, { APP_ENV: "production", DATABASE_URL: databaseUrl });
    // The scheduled handler intentionally returns no row counts; the rows
    // below prove it invoked the production cleanup against PostgreSQL.

    const rateLimitRows = await cleanupClient.query<{ key_hash: string }>(
      "SELECT key_hash FROM auth_rate_limits WHERE key_hash = ANY($1::char(64)[])",
      [[oldRateLimitHash, freshRateLimitHash]],
    );
    expect(rateLimitRows.rows.map((row) => row.key_hash.trim())).toEqual([freshRateLimitHash]);

    const bootstrapRows = await cleanupClient.query<{ handle_hash: string }>(
      "SELECT handle_hash FROM auth_bootstrap_attempts WHERE handle_hash = ANY($1::char(64)[])",
      [[oldHandleHash, freshHandleHash]],
    );
    expect(bootstrapRows.rows.map((row) => row.handle_hash.trim())).toEqual([freshHandleHash]);
  });
  it("deletes no more than 500 expired rows per table in one scheduled run", async () => {
    const prefix = crypto.randomUUID().replace(/-/g, "");
    const rateHashes = Array.from({ length: 501 }, (_, index) =>
      `${prefix}${index.toString(16).padStart(32, "0")}`,
    );
    const handlePrefix = crypto.randomUUID().replace(/-/g, "");
    const statePrefix = crypto.randomUUID().replace(/-/g, "");
    const handleHashes = Array.from({ length: 501 }, (_, index) =>
      `${handlePrefix}${index.toString(16).padStart(32, "0")}`,
    );
    const stateHashes = Array.from({ length: 501 }, (_, index) =>
      `${statePrefix}${index.toString(16).padStart(32, "0")}`,
    );
    cleanupRateLimitHashes.push(...rateHashes);
    cleanupBootstrapHandles.push(...handleHashes);

    await cleanupClient.query(
      `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
       SELECT key_hash, now() - interval '60 hours', 1, now() - interval '60 hours'
         FROM unnest($1::char(64)[]) AS fixtures(key_hash)`,
      [rateHashes],
    );
    await cleanupClient.query(
      `INSERT INTO auth_bootstrap_attempts
         (handle_hash, state_hash, organization_name, organization_slug, expires_at, created_at)
       SELECT handle_hash, state_hash, 'Retention Batch Fixture', 'retention-batch-fixture',
              now() - interval '60 hours', now() - interval '72 hours'
         FROM unnest($1::char(64)[], $2::char(64)[]) AS fixtures(handle_hash, state_hash)`,
      [handleHashes, stateHashes],
    );

    const scheduledApp = app as typeof app & {
      scheduled: (controller: unknown, env: { APP_ENV?: "production" | "preview"; DATABASE_URL?: string }) => Promise<void>;
    };
    await scheduledApp.scheduled({ cron: "17 * * * *" }, { APP_ENV: "production", DATABASE_URL: databaseUrl });

    const remainingRateLimits = await cleanupClient.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM auth_rate_limits WHERE key_hash = ANY($1::char(64)[])",
      [rateHashes],
    );
    const remainingBootstrapAttempts = await cleanupClient.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM auth_bootstrap_attempts WHERE handle_hash = ANY($1::char(64)[])",
      [handleHashes],
    );
    expect(Number(remainingRateLimits.rows[0]?.count)).toBe(1);
    expect(Number(remainingBootstrapAttempts.rows[0]?.count)).toBe(1);
  });

  it("enforces the Google OAuth start limit and returns Retry-After", async () => {
    const ip = "198.51.100.40";
    cleanupKeys.push(`google:start:${ip}`);
    const responses: Response[] = [];
    for (let index = 0; index < 11; index += 1) {
      responses.push(await app.fetch(
        new Request("https://api.example/auth/google", {
          headers: { "CF-Connecting-IP": ip },
        }),
        googleEnv,
      ));
    }

    expect(responses.slice(0, 10).every((response) => response.status === 302)).toBe(true);
    const limited = responses[10]!;
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
    await expect(limited.json()).resolves.toMatchObject({ error: "RATE_LIMITED" });
  });

  it("limits bootstrap token attempts before parsing or comparing the secret", async () => {
    const ip = "198.51.100.41";
    cleanupKeys.push(`google:bootstrap:${ip}`);
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      const response = await app.fetch(
        new Request("https://api.example/auth/google", {
          method: "POST",
          headers: {
            Origin: frontendOrigin,
            "Content-Type": "application/x-www-form-urlencoded",
            "CF-Connecting-IP": ip,
          },
          body: new URLSearchParams({
            bootstrap_token: "wrong-token",
            org_name: "Test Shop",
            org_slug: "test-shop",
          }).toString(),
        }),
        googleEnv,
      );
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 5)).toEqual([403, 403, 403, 403, 403]);
    expect(statuses[5]).toBe(429);
  });

  it("limits callback traffic before state parsing and external token exchange", async () => {
    const ip = "198.51.100.42";
    cleanupKeys.push(`google:callback:${ip}`);
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1) {
      const response = await app.fetch(
        new Request("https://api.example/auth/google/callback?code=test-code&state=wrong", {
          headers: {
            Cookie: "microapp_oauth_state=real-state; microapp_oauth_verifier=real-verifier",
            "CF-Connecting-IP": ip,
          },
        }),
        googleEnv,
      );
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 20).every((status) => status === 302)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
