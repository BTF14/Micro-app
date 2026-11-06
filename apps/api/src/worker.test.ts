import { describe, expect, it, vi } from "vitest";

vi.mock("./bcv", () => ({ syncBcvRate: vi.fn() }));

import { syncBcvRate } from "./bcv";
import worker from "./worker";

describe("Cloudflare scheduled BCV refresh", () => {
  it("registers the refresh promise with waitUntil so it survives the scheduled handler return", () => {
    const refresh = Promise.resolve({ status: "unchanged" as const, effectiveDate: "2026-11-05" });
    vi.mocked(syncBcvRate).mockReturnValue(refresh);
    const waitUntil = vi.fn();

    worker.scheduled(
      {} as ScheduledController,
      {},
      { waitUntil } as unknown as ExecutionContext,
    );

    expect(syncBcvRate).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledWith(refresh);
  });
});
