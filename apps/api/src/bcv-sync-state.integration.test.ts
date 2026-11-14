import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) { super({ connectionString }); }
    },
  };
});

const app = (await import("./index")).default;
const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
const runtimeDatabaseUrl = env.DATABASE_URL;
const adminDatabaseUrl = env.DATABASE_URL_ADMIN;
const isCi = Boolean(env.CI);
const isDisposableRuntimeDatabase = (() => {
  if (!runtimeDatabaseUrl || !adminDatabaseUrl) return false;
  try {
    const runtime = new URL(runtimeDatabaseUrl);
    const admin = new URL(adminDatabaseUrl);
    return runtime.username === "microapp_runtime" &&
      (runtime.hostname === "localhost" || runtime.hostname === "127.0.0.1") &&
      runtime.pathname === "/microapp_test" &&
      (admin.hostname === "localhost" || admin.hostname === "127.0.0.1") &&
      admin.pathname === "/microapp_test";
  } catch {
    return false;
  }
})();
if (isCi && !isDisposableRuntimeDatabase) {
  throw new Error("BCV sync-state integration requires disposable PostgreSQL 18 and a real microapp_runtime LOGIN.");
}

describe.skipIf(!isDisposableRuntimeDatabase)("BCV sync-state and watchdog with PostgreSQL runtime LOGIN", () => {
  let admin: Client;
  let runtime: Client;
  let organizationId = "";
  let userId = "";
  let sessionToken = "";
  let initialState: {
    last_attempt_at: Date | null;
    last_success_at: Date | null;
    last_outcome: string | null;
    last_error_code: string | null;
    last_effective_date: string | null;
    updated_at: Date;
  } | undefined;

  async function seedState(outcome: string, ageSeconds: number, successful: boolean): Promise<void> {
    await admin.query(
      `UPDATE public.bcv_sync_state
          SET last_attempt_at = now() - ($1::int * interval '1 second'),
              last_success_at = CASE WHEN $3::boolean THEN now() ELSE NULL END,
              last_outcome = $2,
              last_error_code = CASE WHEN $2 = 'failed' THEN 'BCV_TEST_FAILURE' ELSE NULL END,
              last_effective_date = NULL,
              updated_at = now()
        WHERE singleton = true`,
      [ageSeconds, outcome, successful],
    );
  }

  async function getSyncState(): Promise<Response> {
    return app.fetch(new Request(
      `https://api.example/api/orgs/${organizationId}/bcv/sync-state`,
      { headers: { Cookie: "microapp_session=" + sessionToken } },
    ), { APP_ENV: "production", DATABASE_URL: runtimeDatabaseUrl });
  }

  const scheduledApp = app as typeof app & {
    scheduled: (controller: { cron: string }, bindings: { APP_ENV: "production" | "preview"; DATABASE_URL?: string }) => Promise<void>;
  };

  beforeAll(async () => {
    if (!runtimeDatabaseUrl || !adminDatabaseUrl) throw new Error("Disposable PostgreSQL URLs are missing.");
    admin = new Client({ connectionString: adminDatabaseUrl });
    runtime = new Client({ connectionString: runtimeDatabaseUrl });
    await admin.connect();
    await runtime.connect();

    const existing = await admin.query(
      `SELECT last_attempt_at, last_success_at, last_outcome, last_error_code,
              last_effective_date::text AS last_effective_date, updated_at
         FROM public.bcv_sync_state WHERE singleton = true`,
    );
    if (existing.rows.length !== 1) throw new Error("BCV sync-state singleton fixture is missing.");
    initialState = existing.rows[0] as typeof initialState;

    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
    const organization = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["BCV Watchdog " + suffix, "bcv-watchdog-" + suffix],
    );
    organizationId = organization.rows[0]!.id;
    const user = await admin.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      ["bcv-watchdog-" + suffix + "@example.test", "BCV Watchdog Owner"],
    );
    userId = user.rows[0]!.id;
    await admin.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationId, userId],
    );
    sessionToken = "bcv-watchdog-" + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionToken));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await admin.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [userId, tokenHash],
    );
  });

  afterAll(async () => {
    try {
      if (initialState) {
        await admin.query(
          `UPDATE public.bcv_sync_state
              SET last_attempt_at = $1, last_success_at = $2, last_outcome = $3,
                  last_error_code = $4, last_effective_date = $5, updated_at = $6
            WHERE singleton = true`,
          [
            initialState.last_attempt_at,
            initialState.last_success_at,
            initialState.last_outcome,
            initialState.last_error_code,
            initialState.last_effective_date,
            initialState.updated_at,
          ],
        );
      }
      if (userId) {
        await admin.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
        await admin.query("DELETE FROM organization_members WHERE organization_id = $1", [organizationId]);
        await admin.query("DELETE FROM app_users WHERE id = $1", [userId]);
        await admin.query("DELETE FROM organizations WHERE id = $1", [organizationId]);
      }
    } finally {
      await Promise.all([runtime?.end(), admin?.end()]);
    }
  });

  it("returns recent running without stale health or warning", async () => {
    await seedState("running", 120, false);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await scheduledApp.scheduled({ cron: "17 * * * *" }, {
      APP_ENV: "production",
      DATABASE_URL: runtimeDatabaseUrl,
    });
    const response = await getSyncState();
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      health: "running",
      isStaleRunning: false,
      staleRunningThresholdSeconds: 300,
    });
    expect(errorLog).not.toHaveBeenCalledWith(expect.objectContaining({ event: "BCV_SYNC_STALE_RUNNING" }));
    expect(errorLog).not.toHaveBeenCalledWith({ event: "BCV_SYNC_WATCHDOG_LOOKUP_FAILED" });
    expect(errorLog).not.toHaveBeenCalledWith({ event: "AUTH_RETENTION_CLEANUP_FAILED" });
    errorLog.mockRestore();
  });

  it("detects stale running at the inclusive threshold, reports attention, and leaves producer state unchanged", async () => {
    await seedState("running", 300, false);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const attempt = await admin.query<{ last_attempt_at: string }>(
      `SELECT to_char(last_attempt_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_attempt_at
         FROM public.bcv_sync_state WHERE singleton = true`,
    );
    await scheduledApp.scheduled({ cron: "17 * * * *" }, {
      APP_ENV: "production",
      DATABASE_URL: runtimeDatabaseUrl,
    });
    const staleEvent = errorLog.mock.calls.find(([entry]) =>
      (entry as { event?: string }).event === "BCV_SYNC_STALE_RUNNING",
    )?.[0] as { attemptAgeSeconds: number } | undefined;
    expect(staleEvent).toEqual({
      event: "BCV_SYNC_STALE_RUNNING",
      attemptAgeSeconds: expect.any(Number),
      thresholdSeconds: 300,
      lastAttemptAt: attempt.rows[0]!.last_attempt_at,
    });
    expect(staleEvent?.attemptAgeSeconds).toBeGreaterThanOrEqual(300);
    const response = await getSyncState();
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      health: "attention",
      lastOutcome: "running",
      isStaleRunning: true,
      staleRunningThresholdSeconds: 300,
    });
    const state = await admin.query<{ last_outcome: string }>(
      "SELECT last_outcome FROM public.bcv_sync_state WHERE singleton = true",
    );
    expect(state.rows[0]?.last_outcome).toBe("running");
    const privilege = await runtime.query<{
      current_user: string;
      can_select: boolean;
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
      can_update_last_outcome: boolean;
      can_insert_last_outcome: boolean;
    }>(
      `SELECT current_user,
              has_table_privilege(current_user, 'public.bcv_sync_state', 'SELECT') AS can_select,
              has_table_privilege(current_user, 'public.bcv_sync_state', 'INSERT') AS can_insert,
              has_table_privilege(current_user, 'public.bcv_sync_state', 'UPDATE') AS can_update,
              has_table_privilege(current_user, 'public.bcv_sync_state', 'DELETE') AS can_delete,
              has_column_privilege(current_user, 'public.bcv_sync_state', 'last_outcome', 'UPDATE') AS can_update_last_outcome,
              has_column_privilege(current_user, 'public.bcv_sync_state', 'last_outcome', 'INSERT') AS can_insert_last_outcome`,
    );
    expect(privilege.rows[0]).toEqual({
      current_user: "microapp_runtime",
      can_select: true,
      can_insert: false,
      can_update: false,
      can_delete: false,
      can_update_last_outcome: false,
      can_insert_last_outcome: false,
    });
    expect(errorLog).not.toHaveBeenCalledWith({ event: "BCV_SYNC_WATCHDOG_LOOKUP_FAILED" });
    expect(errorLog).not.toHaveBeenCalledWith({ event: "AUTH_RETENTION_CLEANUP_FAILED" });
    errorLog.mockRestore();
  });

  it.each([
    ["inserted", "succeeded", true],
    ["unchanged", "succeeded", true],
    ["failed", "failed", false],
  ] as const)("does not flag old terminal outcome %s as stale-running", async (outcome, health, successful) => {
    await seedState(outcome, 900, successful);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await scheduledApp.scheduled({ cron: "17 * * * *" }, {
      APP_ENV: "production",
      DATABASE_URL: runtimeDatabaseUrl,
    });
    const response = await getSyncState();
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      health,
      lastOutcome: outcome,
      isStaleRunning: false,
      staleRunningThresholdSeconds: 300,
    });
    expect(errorLog).not.toHaveBeenCalledWith(expect.objectContaining({ event: "BCV_SYNC_STALE_RUNNING" }));
    errorLog.mockRestore();
  });
});
