import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";
import { createWorker } from "./worker";

describe("Cloudflare scheduled BCV refresh", () => {
  it("registers the refresh promise with waitUntil so it survives the scheduled handler return", () => {
    const refresh = Promise.resolve({ status: "unchanged" as const, effectiveDate: "2026-11-05" });
    const syncRate = vi.fn((_env: Bindings) => refresh);
    const worker = createWorker(syncRate);
    const waitUntil = vi.fn();

    worker.scheduled(
      {} as ScheduledController,
      {},
      { waitUntil } as unknown as ExecutionContext,
    );

    expect(syncRate).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledWith(refresh);
  });
});
