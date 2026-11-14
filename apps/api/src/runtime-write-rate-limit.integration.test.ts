import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import type { Context } from "hono";
import type { Bindings } from "./bindings";
import { hashAuthRateLimitKey } from "./auth-rate-limit";
import { withDatabaseClient } from "./database";
import { enforceRuntimeWriteRateLimit } from "./runtime-write-rate-limit";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) { super({ connectionString }); }
    },
  };
});

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);
if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip runtime write rate-limit integration tests.");
}

const pepper = "runtime-write-rate-limit-integration-pepper";
const clientIp = "198.51.100.220";
const routeScopes = [
  "catalog:create",
  "catalog:update",
  "inventory:count:create",
  "inventory:count:confirm",
  "inventory:receipt:create",
  "register-shift:open",
  "register-shift:close",
  "organization:branch:create",
  "organization:warehouse:create",
  "organization:register:create",
  "organization:branch-membership:update",
];

function context(_scope?: string) {
  const responseHeaders = new Headers();
  const c = {
    req: { header: (name: string) => name === "CF-Connecting-IP" ? clientIp : undefined },
    env: { DATABASE_URL: databaseUrl, GOOGLE_CLIENT_SECRET: pepper },
    header: (name: string, value: string) => responseHeaders.set(name, value),
    json: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: responseHeaders }),
  };
  return c as unknown as Context<{ Bindings: Bindings }>;
}

const suite = describe.skipIf(!databaseUrl)("runtime write rate limiting against PostgreSQL 18", () => {
  let cleanupClient: Client;
  const cleanupKeys: string[] = [];

  beforeAll(async () => {
    cleanupClient = new Client({ connectionString: databaseUrl });
    await cleanupClient.connect();
  });

  afterAll(async () => {
    const hashes = await Promise.all(cleanupKeys.map((key) => hashAuthRateLimitKey(key, pepper)));
    if (hashes.length) {
      await cleanupClient.query("DELETE FROM auth_rate_limits WHERE key_hash = ANY($1::char(64)[])", [hashes]);
    }
    await cleanupClient.end();
  });

  it.each(routeScopes)("enforces independent allow/429 buckets for %s", async (scope) => {
    const uniqueScope = `${scope}:integration:${crypto.randomUUID()}`;
    const key = `write:${uniqueScope}:ip:${clientIp}`;
    cleanupKeys.push(key);

    const allowed = await enforceRuntimeWriteRateLimit(context(), uniqueScope, 1);
    expect(allowed).toBeNull();

    const limited = await enforceRuntimeWriteRateLimit(context(uniqueScope), uniqueScope, 1);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toMatch(/^\d+$/);
    await expect(limited?.json()).resolves.toMatchObject({ error: "RATE_LIMITED" });

    // A different route scope with the same client IP has an independent bucket.
    const siblingScope = `${scope}:sibling:${crypto.randomUUID()}`;
    const siblingKey = `write:${siblingScope}:ip:${clientIp}`;
    cleanupKeys.push(siblingKey);
    expect(await enforceRuntimeWriteRateLimit(context(), siblingScope, 1)).toBeNull();
  });

  it("stores only HMAC digests and saturates the counter at max+1", async () => {
    const scope = `integration:privacy:${crypto.randomUUID()}`;
    const rawKey = `write:${scope}:ip:${clientIp}`;
    cleanupKeys.push(rawKey);
    await enforceRuntimeWriteRateLimit(context(), scope, 1);
    await enforceRuntimeWriteRateLimit(context(scope), scope, 1);

    const digest = await hashAuthRateLimitKey(rawKey, pepper);
    const result = await withDatabaseClient(databaseUrl, (db) =>
      db.query<{ key_hash: string; attempts: number }>(
        "SELECT key_hash, attempts FROM auth_rate_limits WHERE key_hash = $1",
        [digest],
      ),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.key_hash.trim()).toBe(digest);
    expect(result.rows[0]!.attempts).toBe(2);
    expect(result.rows[0]!.key_hash).not.toContain(clientIp);
  });
});
