import { describe, expect, it, vi } from "vitest";
import type { DatabaseClientFactory } from "./database";
import { runBcvNodeSync } from "./bcv-node-runner";
import { safeBcvSyncErrorCode } from "./exchange-rates";

describe("BCV Node runner safety contract", () => {
  it("fails closed before opening a connection when the dedicated URL is missing", async () => {
    const createClient = vi.fn() as unknown as DatabaseClientFactory;
    await expect(runBcvNodeSync(undefined, false, createClient)).rejects.toThrow(
      "BCV_SYNC_DATABASE_URL_MISSING",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("classifies nested timeout causes without exposing raw messages", () => {
    const cause = Object.assign(new Error("private timeout detail"), {
      name: "TimeoutError",
      code: "UND_ERR_CONNECT_TIMEOUT",
    });
    const error = new Error("BCV_SOURCE_FETCH_FAILED", { cause });
    expect(safeBcvSyncErrorCode(error)).toBe("BCV_SOURCE_TIMEOUT");
    expect(safeBcvSyncErrorCode(error)).not.toContain("private");
  });

  it("classifies TLS and network causes through an allowlist", () => {
    const cause = Object.assign(new Error("private socket detail"), { code: "ECONNRESET" });
    expect(safeBcvSyncErrorCode(new Error("BCV_SOURCE_FETCH_FAILED", { cause })))
      .toBe("BCV_SOURCE_TLS_OR_NETWORK_ERROR");
    expect(safeBcvSyncErrorCode(new Error("private database detail"))).toBe("BCV_SYNC_UNKNOWN");
  });

  it("does not interpret an arbitrary database cause as a BCV source failure", () => {
    const cause = Object.assign(new Error("private"), { code: "ECONNRESET" });
    expect(safeBcvSyncErrorCode(new Error("DATABASE_QUERY_FAILED", { cause })))
      .toBe("BCV_SYNC_UNKNOWN");
  });
});
