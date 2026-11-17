import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "hono";
import type { Bindings } from "./bindings";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  withDatabaseClient: vi.fn(),
}));

vi.mock("./auth-rate-limit", () => ({ consumeAuthRateLimit: mocks.consume }));
vi.mock("./database", () => ({ withDatabaseClient: mocks.withDatabaseClient }));

import { enforceRuntimeWriteRateLimit, isValidClientIp } from "./runtime-write-rate-limit";

function context(headers: Record<string, string> = {}, env: Partial<Bindings> = {}) {
  const response = {
    req: { header: (name: string) => headers[name] },
    env: { DATABASE_URL: "postgres://runtime-test", GOOGLE_CLIENT_SECRET: "test-google-client-secret", ...env },
    header: vi.fn(),
    json: vi.fn((body: unknown, status = 200) => new Response(JSON.stringify(body), { status })),
  };
  return response as unknown as Context<{ Bindings: Bindings }>;
}

describe("runtime write rate limiting", () => {
  it.each([
    ["valid IPv4", "198.51.100.10", true],
    ["valid IPv6", "2001:db8::1", true],
    ["invalid IPv4", "999.1.1.1", false],
    ["invalid IPv6", "2001:::1", false],
    ["forwarded list", "198.51.100.1, 203.0.113.2", false],
    ["zone identifier", "fe80::1%eth0", false],
    ["whitespace", " 198.51.100.1", false],
  ])("validates client IP syntax (%s)", (_label, value, expected) => {
    expect(isValidClientIp(value)).toBe(expected);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withDatabaseClient.mockImplementation(async (_url: string, callback: (client: unknown) => unknown) =>
      callback({ query: vi.fn() }),
    );
    mocks.consume.mockResolvedValue({ allowed: true, attempts: 1, retryAfterSeconds: 0 });
  });

  it("allows an in-quota request and uses a scope-specific HMAC key", async () => {
    const c = context({ "CF-Connecting-IP": "198.51.100.10", "X-Forwarded-For": "203.0.113.99" });
    await expect(enforceRuntimeWriteRateLimit(c, "catalog:create", 30)).resolves.toBeNull();
    expect(mocks.consume).toHaveBeenCalledWith(
      expect.anything(),
      "write:catalog:create:ip:198.51.100.10",
      30,
      60,
      "test-google-client-secret",
    );
    expect(mocks.consume.mock.calls[0]?.[1]).not.toContain("203.0.113.99");
  });

  it("returns 429 with Retry-After and a Spanish message after quota exhaustion", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, attempts: 11, retryAfterSeconds: 37 });
    const c = context({ "CF-Connecting-IP": "198.51.100.11" });
    const response = await enforceRuntimeWriteRateLimit(c, "inventory:count:create", 10);
    expect(response?.status).toBe(429);
    expect(c.header).toHaveBeenCalledWith("Retry-After", "37");
    await expect(response?.json()).resolves.toMatchObject({
      error: "RATE_LIMITED",
      message: expect.stringContaining("límite de solicitudes"),
    });
  });

  it.each([
    ["missing", {}],
    ["malformed", { "CF-Connecting-IP": "198.51.100.1, 203.0.113.2" }],
    ["invalid IPv4", { "CF-Connecting-IP": "999.1.1.1" }],
    ["invalid IPv6", { "CF-Connecting-IP": "2001:::1" }],
  ])("fails closed for %s client identity without consulting the limiter", async (_label, headers) => {
    const c = context(headers);
    const response = await enforceRuntimeWriteRateLimit(c, "catalog:create", 30);
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({ error: "RATE_LIMIT_UNAVAILABLE" });
    expect(mocks.withDatabaseClient).not.toHaveBeenCalled();
  });

  it("fails closed when the existing HMAC pepper is missing or too short", async () => {
    for (const secret of [undefined, "short"]) {
      const c = context({ "CF-Connecting-IP": "198.51.100.12" }, { GOOGLE_CLIENT_SECRET: secret });
      const response = await enforceRuntimeWriteRateLimit(c, "catalog:create", 30);
      expect(response?.status).toBe(503);
    }
    expect(mocks.withDatabaseClient).not.toHaveBeenCalled();
  });

  it("fails closed when the rate-limit database is unavailable", async () => {
    mocks.withDatabaseClient.mockRejectedValue(new Error("private database failure"));
    const c = context({ "CF-Connecting-IP": "198.51.100.13" });
    const response = await enforceRuntimeWriteRateLimit(c, "catalog:create", 30);
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({ error: "RATE_LIMIT_UNAVAILABLE" });
  });

  it("keeps route namespaces independent for the same client IP", async () => {
    const c = context({ "CF-Connecting-IP": "198.51.100.14" });
    await enforceRuntimeWriteRateLimit(c, "catalog:create", 30);
    await enforceRuntimeWriteRateLimit(c, "catalog:update", 30);
    expect(mocks.consume.mock.calls.map((call) => call[1])).toEqual([
      "write:catalog:create:ip:198.51.100.14",
      "write:catalog:update:ip:198.51.100.14",
    ]);
  });
});
