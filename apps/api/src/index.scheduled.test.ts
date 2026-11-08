import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";

const mocks = vi.hoisted(() => ({
  syncBcvOfficialRate: vi.fn(),
}));

vi.mock("./exchange-rates", () => ({
  registerExchangeRateRoutes: vi.fn(),
  syncBcvOfficialRate: mocks.syncBcvOfficialRate,
}));

import app from "./index";

const productionEnv = {
  APP_ENV: "production",
  DATABASE_URL: "postgresql://microapp_migrator:masked@localhost/microapp",
} as unknown as Bindings;

const bcvCron = { cron: "0 22 * * 1-5" } as ScheduledController;

describe("BCV scheduled failure reporting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.syncBcvOfficialRate.mockReset();
  });

  it("logs only an allowlisted error code and rejects the Cron invocation", async () => {
    mocks.syncBcvOfficialRate.mockRejectedValue(
      new Error("BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(app.scheduled(bcvCron, productionEnv)).rejects.toThrow(
      "BCV_SYNC_FAILED",
    );
    expect(errorLog).toHaveBeenCalledWith("BCV_SYNC_FAILED", {
      code: "BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE",
    });
  });

  it("does not expose an unrecognized error message in logs", async () => {
    mocks.syncBcvOfficialRate.mockRejectedValue(
      new Error("postgresql://user:secret@host/database"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(app.scheduled(bcvCron, productionEnv)).rejects.toThrow(
      "BCV_SYNC_FAILED",
    );
    expect(errorLog).toHaveBeenCalledWith("BCV_SYNC_FAILED", {
      code: "UNKNOWN",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret");
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
