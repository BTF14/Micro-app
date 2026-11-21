import { describe, expect, it, vi } from "vitest";
import type { DatabaseClientFactory } from "./database";
import { caracasHour, isCaracasWeekend, runBcvNodeSync, shouldSkipBcvNodeSync } from "./bcv-node-runner";
import { safeBcvSyncErrorCode } from "./exchange-rates";

describe("BCV Node runner safety contract", () => {
  it("fails closed before opening a connection when the dedicated URL is missing", async () => {
    const createClient = vi.fn() as unknown as DatabaseClientFactory;
    await expect(runBcvNodeSync(undefined, false, createClient)).rejects.toThrow(
      "BCV_SYNC_DATABASE_URL_MISSING",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("force_sync bypasses the skip preflight without opening a database connection", async () => {
    const createClient = vi.fn() as unknown as DatabaseClientFactory;
    await expect(shouldSkipBcvNodeSync("postgres://unused", true, new Date(), createClient))
      .resolves.toBe(false);
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


describe("BCV Node runner Caracas schedule preflight", () => {
  function mockDatabase(lastOutcome: string, rates: Array<{ id: string; validation_status: "valid" | "stale" }>) {
    const statements: string[] = [];
    const createClient = (() => ({
      connect: async () => undefined,
      end: async () => undefined,
      query: async (statement: string) => {
        statements.push(statement);
        if (statement.includes("FROM public.bcv_sync_state")) {
          return { rows: [{ singleton: true, last_outcome: lastOutcome }] };
        }
        if (statement.includes("FROM public.exchange_rates")) return { rows: rates };
        throw new Error("Unexpected SQL in BCV preflight test");
      },
    })) as unknown as DatabaseClientFactory;
    return { createClient, statements };
  }

  it("classifies Caracas hour and weekend independently of the host timezone", () => {
    expect(caracasHour(new Date("2026-11-20T15:00:00.000Z"))).toBe(11);
    expect(caracasHour(new Date("2026-11-20T22:23:00.000Z"))).toBe(18);
    expect(isCaracasWeekend(new Date("2026-11-21T11:17:00.000Z"))).toBe(true);
    expect(isCaracasWeekend(new Date("2026-11-20T22:23:00.000Z"))).toBe(false);
  });

  it("skips a valid same-day rate on a weekday morning", async () => {
    const mock = mockDatabase("inserted", [{ id: "today", validation_status: "valid" }]);
    await expect(shouldSkipBcvNodeSync(
      "postgres://mock:mock@localhost:5432/microapp_test", false, new Date("2026-11-20T15:00:00.000Z"), mock.createClient,
    )).resolves.toBe(true);
    expect(mock.statements[1]).toContain("effective_date = $2::date");
    expect(mock.statements[1]).not.toContain("effective_date > $2::date");
  });

  it("does not skip a weekday evening with only today's valid rate", async () => {
    const mock = mockDatabase("unchanged", [{ id: "today", validation_status: "valid" }]);
    await expect(shouldSkipBcvNodeSync(
      "postgres://mock:mock@localhost:5432/microapp_test", false, new Date("2026-11-20T22:23:00.000Z"), mock.createClient,
    )).resolves.toBe(false);
    expect(mock.statements[1]).toContain("effective_date > $2::date");
    expect(mock.statements[1]).toContain("effective_date <= ($2::date + 5)");
  });

  it("skips a weekday evening after a valid future rate has been captured", async () => {
    const mock = mockDatabase("inserted", [{ id: "monday", validation_status: "valid" }]);
    await expect(shouldSkipBcvNodeSync(
      "postgres://mock:mock@localhost:5432/microapp_test", false, new Date("2026-11-20T22:23:00.000Z"), mock.createClient,
    )).resolves.toBe(true);
    expect(mock.statements[1]).toContain("effective_date > $2::date");
  });

  it("recovers on Saturday when no future valid rate exists", async () => {
    const mock = mockDatabase("unchanged", []);
    await expect(shouldSkipBcvNodeSync(
      "postgres://mock:mock@localhost:5432/microapp_test", false, new Date("2026-11-21T11:17:00.000Z"), mock.createClient,
    )).resolves.toBe(false);
    expect(mock.statements[1]).toContain("effective_date > $2::date");
  });

  it("skips on Saturday once Monday's valid rate is already present", async () => {
    const mock = mockDatabase("unchanged", [{ id: "monday", validation_status: "valid" }]);
    await expect(shouldSkipBcvNodeSync(
      "postgres://mock:mock@localhost:5432/microapp_test", false, new Date("2026-11-21T11:17:00.000Z"), mock.createClient,
    )).resolves.toBe(true);
    expect(mock.statements[1]).toContain("effective_date > $2::date");
  });
});
