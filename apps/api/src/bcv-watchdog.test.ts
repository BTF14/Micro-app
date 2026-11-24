import { describe, expect, it } from "vitest";
import {
  BCV_STALE_RUNNING_THRESHOLD_SECONDS,
  isBcvSyncStateStaleRunning,
} from "./exchange-rates";

describe("BCV stale-running threshold", () => {
  it("defines one inclusive five-minute threshold", () => {
    expect(BCV_STALE_RUNNING_THRESHOLD_SECONDS).toBe(300);
    expect(isBcvSyncStateStaleRunning("running", 299)).toBe(false);
    expect(isBcvSyncStateStaleRunning("running", 300)).toBe(true);
    expect(isBcvSyncStateStaleRunning("running", 301)).toBe(true);
  });

  it("never treats null ages or terminal outcomes as stale-running", () => {
    expect(isBcvSyncStateStaleRunning("running", null)).toBe(false);
    for (const outcome of ["inserted", "unchanged", "failed", null]) {
      expect(isBcvSyncStateStaleRunning(outcome, 900)).toBe(false);
    }
  });
});
