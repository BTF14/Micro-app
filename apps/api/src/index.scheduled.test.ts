import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";
import bcvWorkerConfig from "../wrangler.bcv.toml?raw";

const mocks = vi.hoisted(() => ({
  syncBcvOfficialRate: vi.fn(),
}));

vi.mock("./exchange-rates", () => ({
  registerExchangeRateRoutes: vi.fn(),
  syncBcvOfficialRate: mocks.syncBcvOfficialRate,
  safeBcvSyncErrorCode: (error: unknown) => error instanceof Error && error.message.startsWith("BCV_") ? error.message : "BCV_SYNC_UNKNOWN",
}));

import app from "./index";

const productionEnv = {
  APP_ENV: "production",
  DATABASE_URL: "postgresql://microapp_runtime:runtime-secret@example.invalid/db",
  DATABASE_URL_BCV_SYNC: "postgresql://microapp_bcv_sync:secret@example.invalid/db",
  BCV_SYNC_ENABLED: "true",
} as unknown as Bindings;

const bcvCron = { cron: "0 22 * * 1-5" } as ScheduledController;

describe("BCV scheduled failure reporting", () => {
  it("ships the isolated BCV Worker with synchronization disabled by default", () => {
    expect(bcvWorkerConfig).toContain('BCV_SYNC_ENABLED = "false"');
    expect(bcvWorkerConfig).not.toContain('BCV_SYNC_ENABLED = "true"');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mocks.syncBcvOfficialRate.mockReset();
  });

  it("uses only the dedicated BCV database credential", async () => {
    mocks.syncBcvOfficialRate.mockResolvedValue("inserted");
    await app.scheduled(bcvCron, productionEnv);
    expect(mocks.syncBcvOfficialRate).toHaveBeenCalledWith(productionEnv.DATABASE_URL_BCV_SYNC);
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalledWith(productionEnv.DATABASE_URL);
  });

  it("fails closed when the dedicated secret is absent and never falls back to runtime DATABASE_URL", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const withoutDedicatedSecret = { ...productionEnv, DATABASE_URL_BCV_SYNC: undefined };
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
    await app.scheduled(bcvCron, { ...productionEnv, BCV_SYNC_ENABLED: "false" });
    await app.scheduled(bcvCron, { ...productionEnv, BCV_SYNC_ENABLED: undefined });
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });

  it("does not invoke BCV synchronization outside production", async () => {
    await app.scheduled(bcvCron, {
      ...productionEnv,
      APP_ENV: "preview",
    });
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });

  it("ignores unrelated cron expressions", async () => {
    await app.scheduled({ cron: "0 0 * * *" } as ScheduledController, productionEnv);
    expect(mocks.syncBcvOfficialRate).not.toHaveBeenCalled();
  });
});
