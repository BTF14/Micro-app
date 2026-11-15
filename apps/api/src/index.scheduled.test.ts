import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";
import bcvWorkerConfig from "../wrangler.bcv.toml?raw";

const mocks = vi.hoisted(() => ({
  syncBcvOfficialRate: vi.fn(),
  withDatabaseClient: vi.fn(),
  withDatabaseTransaction: vi.fn(),
  consumeAuthRateLimit: vi.fn(),
  cleanupExpiredAuthRecords: vi.fn(),
}));

vi.mock("./exchange-rates", () => ({
  registerExchangeRateRoutes: vi.fn(),
  syncBcvOfficialRate: mocks.syncBcvOfficialRate,
  BCV_STALE_RUNNING_THRESHOLD_SECONDS: 300,
  isBcvSyncStateStaleRunning: (outcome: string | null, age: number | null) =>
    outcome === "running" && age !== null && age >= 300,
  safeBcvSyncErrorCode: (error: unknown) => error instanceof Error && error.message.startsWith("BCV_") ? error.message : "BCV_SYNC_UNKNOWN",
}));
vi.mock("./database", () => ({
  withDatabaseClient: mocks.withDatabaseClient,
  withDatabaseTransaction: mocks.withDatabaseTransaction,
}));
vi.mock("./auth-rate-limit", () => ({
  consumeAuthRateLimit: mocks.consumeAuthRateLimit,
  cleanupExpiredAuthRecords: mocks.cleanupExpiredAuthRecords,
}));

import app from "./index";

const productionEnv = {
  APP_ENV: "production",
  DATABASE_URL: "postgresql://microapp_runtime:runtime-secret@example.invalid/db",
  DATABASE_URL_BCV_SYNC: "postgresql://microapp_bcv_sync:secret@example.invalid/db",
  BCV_SYNC_ENABLED: "true",
} as unknown as Bindings;

const morningBcvCron = { cron: "0 11 * * MON-FRI" } as ScheduledController;
const bcvCron = { cron: "0 22 * * MON-FRI" } as ScheduledController;

describe("BCV scheduled failure reporting", () => {
  it("ships the isolated BCV Worker enabled only in production without workers.dev", () => {
    expect(bcvWorkerConfig).toContain('BCV_SYNC_ENABLED = "true"');
    expect(bcvWorkerConfig).toContain('APP_ENV = "production"');
    expect(bcvWorkerConfig).toContain("workers_dev = false");
    expect(bcvWorkerConfig).toContain('crons = ["0 11 * * MON-FRI", "0 22 * * MON-FRI"]');
    expect(bcvWorkerConfig).not.toContain('BCV_SYNC_ENABLED = "false"');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mocks.syncBcvOfficialRate.mockReset();
    mocks.withDatabaseClient.mockReset();
    mocks.withDatabaseTransaction.mockReset();
    mocks.consumeAuthRateLimit.mockReset();
    mocks.cleanupExpiredAuthRecords.mockReset();
  });

  it("uses only the dedicated BCV database credential for both weekday windows", async () => {
    mocks.syncBcvOfficialRate.mockResolvedValue("inserted");
    await app.scheduled(morningBcvCron, productionEnv);
    await app.scheduled(bcvCron, productionEnv);
    expect(mocks.syncBcvOfficialRate).toHaveBeenNthCalledWith(1, productionEnv.DATABASE_URL_BCV_SYNC);
    expect(mocks.syncBcvOfficialRate).toHaveBeenNthCalledWith(2, productionEnv.DATABASE_URL_BCV_SYNC);
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalledWith(productionEnv.DATABASE_URL);
  });

  it("fails closed when the dedicated secret is absent and never falls back to runtime DATABASE_URL", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const withoutDedicatedSecret = { ...productionEnv, DATABASE_URL_BCV_SYNC: undefined };
    await expect(app.scheduled(morningBcvCron, withoutDedicatedSecret)).rejects.toThrow("BCV_SYNC_FAILED");
    await expect(app.scheduled(bcvCron, withoutDedicatedSecret)).rejects.toThrow("BCV_SYNC_FAILED");
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith({ event: "BCV_SYNC_FAILED", code: "BCV_SYNC_DATABASE_URL_MISSING" });
  });

  it("logs a sanitized successful synchronization outcome", async () => {
    mocks.syncBcvOfficialRate.mockResolvedValue("inserted");
    const infoLog = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await app.scheduled(bcvCron, productionEnv);
    expect(infoLog).toHaveBeenNthCalledWith(1, { event: "BCV_SYNC_STARTED" });
    expect(infoLog).toHaveBeenNthCalledWith(2, {
      event: "BCV_SYNC_COMPLETED",
      outcome: "inserted",
    });
  });

  it("logs only an allowlisted error code and rejects the Cron invocation", async () => {
    mocks.syncBcvOfficialRate.mockRejectedValue(
      new Error("BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(app.scheduled(bcvCron, productionEnv)).rejects.toThrow(
      "BCV_SYNC_FAILED",
    );
    expect(errorLog).toHaveBeenCalledWith({
      event: "BCV_SYNC_FAILED",
      code: "BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE",
    });
  });

  it("does not expose an unrecognized error message in logs", async () => {
    mocks.syncBcvOfficialRate.mockRejectedValue(
      new Error("internal-db-detail-should-not-be-logged"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(app.scheduled(bcvCron, productionEnv)).rejects.toThrow(
      "BCV_SYNC_FAILED",
    );
    expect(errorLog).toHaveBeenCalledWith({
      event: "BCV_SYNC_FAILED",
      code: "BCV_SYNC_UNKNOWN",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("internal-db-detail-should-not-be-logged");
  });

  it("keeps the production BCV Cron disabled unless explicitly enabled", async () => {
    await app.scheduled(morningBcvCron, { ...productionEnv, BCV_SYNC_ENABLED: "false" });
    await app.scheduled(bcvCron, { ...productionEnv, BCV_SYNC_ENABLED: "false" });
    await app.scheduled(morningBcvCron, { ...productionEnv, BCV_SYNC_ENABLED: undefined });
    await app.scheduled(bcvCron, { ...productionEnv, BCV_SYNC_ENABLED: undefined });
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });

  it("does not invoke BCV synchronization outside production", async () => {
    await app.scheduled(morningBcvCron, {
      ...productionEnv,
      APP_ENV: "preview",
    });
    await app.scheduled(bcvCron, {
      ...productionEnv,
      APP_ENV: "preview",
    });
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });

  it("ignores numeric weekday Cron expressions for both BCV windows", async () => {
    await app.scheduled({ cron: "0 11 * * 1-5" } as ScheduledController, productionEnv);
    await app.scheduled({ cron: "0 22 * * 1-5" } as ScheduledController, productionEnv);
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });

  it("ignores unrelated cron expressions", async () => {
    await app.scheduled({ cron: "0 0 * * *" } as ScheduledController, productionEnv);
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });
});


describe("hourly BCV stale-running watchdog and auth retention isolation", () => {
  const hourlyCron = { cron: "17 * * * *" } as ScheduledController;

  function runtimeClient(state: {
    last_attempt_at: string;
    last_outcome: string;
    attempt_age_seconds: number;
  }) {
    return { query: vi.fn().mockResolvedValue({ rows: [state] }) };
  }

  it("logs only stale running state and still executes retention cleanup", async () => {
    const client = runtimeClient({
      last_attempt_at: "2026-11-14T17:00:00.000Z",
      last_outcome: "running",
      attempt_age_seconds: 300,
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.withDatabaseClient.mockImplementation(async (_url: unknown, operation: (client: unknown) => Promise<unknown>) =>
      operation(client));
    mocks.cleanupExpiredAuthRecords.mockResolvedValue({
      rateLimitBucketsDeleted: 0,
      bootstrapAttemptsDeleted: 0,
    });

    await app.scheduled(hourlyCron, productionEnv);

    expect(mocks.withDatabaseClient).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenCalledTimes(1);
    const sql = String(client.query.mock.calls[0]?.[0]);
    expect(sql).toContain("FROM public.bcv_sync_state");
    expect(sql).toContain("WHERE singleton = true");
    expect(sql).not.toMatch(/\b(?:UPDATE|INSERT|DELETE)\b/i);
    expect(errorLog).toHaveBeenCalledWith({
      event: "BCV_SYNC_STALE_RUNNING",
      attemptAgeSeconds: 300,
      thresholdSeconds: 300,
      lastAttemptAt: "2026-11-14T17:00:00.000Z",
    });
    expect(mocks.cleanupExpiredAuthRecords).toHaveBeenCalledWith(client);
  });

  it("does not report recent running state as stale", async () => {
    const client = runtimeClient({
      last_attempt_at: "2026-11-14T17:00:00.000Z",
      last_outcome: "running",
      attempt_age_seconds: 299,
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.withDatabaseClient.mockImplementation(async (_url: unknown, operation: (client: unknown) => Promise<unknown>) =>
      operation(client));
    mocks.cleanupExpiredAuthRecords.mockResolvedValue({
      rateLimitBucketsDeleted: 0,
      bootstrapAttemptsDeleted: 0,
    });

    await app.scheduled(hourlyCron, productionEnv);

    expect(errorLog).not.toHaveBeenCalledWith(expect.objectContaining({ event: "BCV_SYNC_STALE_RUNNING" }));
    expect(mocks.cleanupExpiredAuthRecords).toHaveBeenCalledTimes(1);
  });

  it("runs retention cleanup when the watchdog database lookup fails", async () => {
    const client = runtimeClient({
      last_attempt_at: "2026-11-14T17:00:00.000Z",
      last_outcome: "running",
      attempt_age_seconds: 299,
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.withDatabaseClient
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockImplementationOnce(async (_url: unknown, operation: (client: unknown) => Promise<unknown>) =>
        operation(client));
    mocks.cleanupExpiredAuthRecords.mockResolvedValue({
      rateLimitBucketsDeleted: 0,
      bootstrapAttemptsDeleted: 0,
    });

    await app.scheduled(hourlyCron, productionEnv);

    expect(errorLog).toHaveBeenCalledWith({ event: "BCV_SYNC_WATCHDOG_LOOKUP_FAILED" });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private database detail");
    expect(mocks.cleanupExpiredAuthRecords).toHaveBeenCalledTimes(1);
  });

  it("keeps the watchdog operational when retention cleanup fails", async () => {
    const client = runtimeClient({
      last_attempt_at: "2026-11-14T17:00:00.000Z",
      last_outcome: "running",
      attempt_age_seconds: 300,
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.withDatabaseClient
      .mockImplementationOnce(async (_url: unknown, operation: (client: unknown) => Promise<unknown>) =>
        operation(client))
      .mockRejectedValueOnce(new Error("private cleanup detail"));

    await app.scheduled(hourlyCron, productionEnv);

    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ event: "BCV_SYNC_STALE_RUNNING" }));
    expect(errorLog).toHaveBeenCalledWith({ event: "AUTH_RETENTION_CLEANUP_FAILED" });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private cleanup detail");
  });
});
