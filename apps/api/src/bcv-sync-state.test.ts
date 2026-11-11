import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withDatabaseClient: vi.fn(),
  withDatabaseTransaction: vi.fn(),
  authorizeTenantOperation: vi.fn(),
  query: vi.fn(),
}));

vi.mock("./database", () => ({
  withDatabaseClient: mocks.withDatabaseClient,
  withDatabaseTransaction: mocks.withDatabaseTransaction,
}));
vi.mock("./authorization", () => ({
  authorizeTenantOperation: mocks.authorizeTenantOperation,
}));

import { Hono } from "hono";
import { registerExchangeRateRoutes } from "./exchange-rates";
import type { Bindings } from "./bindings";

const organizationId = "11111111-2222-4333-8444-555555555555";

function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();
  registerExchangeRateRoutes(app);
  return app;
}

describe("BCV administrative sync-state endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withDatabaseClient.mockImplementation(
      async (_url: string, callback: (client: { query: typeof mocks.query }) => Promise<unknown>) =>
        callback({ query: mocks.query }),
    );
    mocks.query.mockResolvedValue({
      rows: [{
        last_attempt_at: "2026-11-09T22:00:00.000Z",
        last_success_at: "2026-11-09T22:00:00.000Z",
        last_outcome: "failed",
        last_error_code: "BCV_SOURCE_HTTP_ERROR",
        last_effective_date: "2026-11-09",
        updated_at: "2026-11-09T22:00:00.000Z",
        attempt_age_seconds: 120,
      }],
    });
  });

  it("returns sanitized operational state to an authorized organization administrator", async () => {
    mocks.authorizeTenantOperation.mockResolvedValue({
      allowed: true,
      context: { userId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", organizationId, role: "admin" },
    });
    const response = await createApp().request(
      `/api/orgs/${organizationId}/bcv/sync-state`,
      { headers: { Cookie: "microapp_session=test-session" } },
      { DATABASE_URL: "postgres://runtime.invalid/db" } as Bindings,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      source: "BCV_OFFICIAL_HTML_V1",
      health: "failed",
      lastOutcome: "failed",
      lastErrorCode: "BCV_SOURCE_HTTP_ERROR",
      lastEffectiveDate: "2026-11-09",
      attemptAgeSeconds: 120,
    });
    expect(mocks.authorizeTenantOperation).toHaveBeenCalledWith(
      expect.anything(),
      "test-session",
      organizationId,
      "bcv.sync_state.read",
      false,
    );
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("does not query operational state for a cashier or another denied role", async () => {
    mocks.authorizeTenantOperation.mockResolvedValue({
      allowed: false,
      reason: "operation_denied",
    });
    const response = await createApp().request(
      `/api/orgs/${organizationId}/bcv/sync-state`,
      { headers: { Cookie: "microapp_session=cashier-session" } },
      { DATABASE_URL: "postgres://runtime.invalid/db" } as Bindings,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "FORBIDDEN" });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("fails closed without a valid tenant session", async () => {
    mocks.authorizeTenantOperation.mockResolvedValue({
      allowed: false,
      reason: "unauthenticated_or_out_of_scope",
    });
    const response = await createApp().request(
      `/api/orgs/${organizationId}/bcv/sync-state`,
      {},
      { DATABASE_URL: "postgres://runtime.invalid/db" } as Bindings,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHORIZED" });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
