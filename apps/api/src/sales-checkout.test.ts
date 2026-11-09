import { describe, expect, it } from "vitest";
import {
  allocateUsdEquivalents,
  canonicalRequestHash,
  findApplicableCheckoutRate,
  parseCheckoutInput,
} from "./sales-checkout";

const organizationId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const productA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const productB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const warehouseId = "44444444-4444-4444-8444-444444444444";

describe("sales checkout request contract", () => {
  it("normalizes decimal strings and consolidates duplicate product lines exactly", () => {
    const parsed = parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [
        { product_id: productA.toUpperCase(), quantity: "1.000" },
        { product_id: productA, quantity: "0.250" },
        { product_id: productB, quantity: "2" },
      ],
      payments: [{ method: "cash", currency: "USD", amount: "29.8125" }],
    });

    expect(parsed).toEqual({
      warehouseId,
      currency: "USD",
      lines: [
        { productId: productA, quantity: "1.250" },
        { productId: productB, quantity: "2.000" },
      ],
      payments: [
        { method: "cash", currency: "USD", amount: "29.8125", reference: null },
      ],
    });
  });

  it("rejects client-calculated prices, discounts, totals and unknown fields", () => {
    const base = {
      warehouse_id: warehouseId,
      lines: [{ product_id: productA, quantity: "1.000" }],
      payments: [{ method: "cash", currency: "USD", amount: "1.0000" }],
    };
    expect(parseCheckoutInput({ ...base, discount_usd: "1.00" })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      lines: [{ product_id: productA, quantity: "1.000", unit_price_usd: "0.01" }],
    })).toBeNull();
    expect(parseCheckoutInput({ ...base, subtotal_usd: "1.0000" })).toBeNull();
  });

  it("rejects numeric JSON amounts, exponent notation, excess scale and non-positive values", () => {
    const base = {
      warehouse_id: warehouseId,
      lines: [{ product_id: productA, quantity: "1.000" }],
      payments: [{ method: "cash", currency: "USD", amount: "1.0000" }],
    };
    expect(parseCheckoutInput({ ...base, lines: [{ product_id: productA, quantity: 1 }] })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      lines: [{ product_id: productA, quantity: "1e2" }],
    })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      lines: [{ product_id: productA, quantity: "1.0000" }],
    })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      lines: [{ product_id: productA, quantity: "0.000" }],
    })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      payments: [{ method: "cash", currency: "USD", amount: "-1.0000" }],
    })).toBeNull();
  });

  it("rejects duplicate-line quantity aggregation overflow", () => {
    expect(parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [
        { product_id: productA, quantity: "99999999999.999" },
        { product_id: productA, quantity: "99999999999.999" },
      ],
      payments: [{ method: "cash", currency: "USD", amount: "1.0000" }],
    })).toBeNull();
  });

  it("rejects payment-sum overflow", () => {
    expect(parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [{ product_id: productA, quantity: "1.000" }],
      payments: [
        { method: "cash", currency: "USD", amount: "99999999999.9999" },
        { method: "transfer", currency: "USD", amount: "99999999999.9999" },
      ],
    })).toBeNull();
  });

  it("rejects mixed settlement currencies and VES amounts beyond two decimals", () => {
    const base = {
      warehouse_id: warehouseId,
      lines: [{ product_id: productA, quantity: "1.000" }],
    };
    expect(parseCheckoutInput({
      ...base,
      payments: [
        { method: "cash", currency: "USD", amount: "1.0000" },
        { method: "transfer", currency: "VES", amount: "250.00" },
      ],
    })).toBeNull();
    expect(parseCheckoutInput({
      ...base,
      payments: [{ method: "cash", currency: "VES", amount: "250.001" }],
    })).toBeNull();
  });

  it("sorts lines and payments so equivalent payload order has the same canonical hash", async () => {
    const first = parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [
        { product_id: productB, quantity: "2.000" },
        { product_id: productA, quantity: "1.000" },
      ],
      payments: [
        { method: "transfer", currency: "USD", amount: "10.0000", reference: "B" },
        { method: "cash", currency: "USD", amount: "5.0000", reference: "A" },
      ],
    })!;
    const second = parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [
        { product_id: productA, quantity: "1" },
        { product_id: productB, quantity: "2" },
      ],
      payments: [
        { method: "cash", currency: "USD", amount: "5", reference: "A" },
        { method: "transfer", currency: "USD", amount: "10", reference: "B" },
      ],
    })!;

    await expect(canonicalRequestHash(organizationId, branchId, userId, first))
      .resolves.toBe(await canonicalRequestHash(organizationId, branchId, userId, second));
    await expect(canonicalRequestHash(organizationId, branchId, userId, first))
      .resolves.not.toBe(await canonicalRequestHash(organizationId, branchId, "55555555-5555-4555-8555-555555555555", first));
  });

  it("allocates VES payment USD-equivalents exactly with the final payment absorbing the remainder", () => {
    const input = parseCheckoutInput({
      warehouse_id: warehouseId,
      lines: [{ product_id: productA, quantity: "1.000" }],
      payments: [
        { method: "cash", currency: "VES", amount: "0.01" },
        { method: "transfer", currency: "VES", amount: "0.01" },
        { method: "card", currency: "VES", amount: "0.01" },
      ],
    })!;

    const allocated = allocateUsdEquivalents(
      input.payments, "VES", "0.0001", "0.03", "100.00000000",
    );
    expect(allocated.map((item) => item.usdEquivalent)).toEqual(["0.0000", "0.0000", "0.0001"]);
    expect(allocated.reduce((sum, item) => sum + BigInt(item.usdEquivalent.replace(".", "")), 0n)).toBe(1n);
    expect(allocated.every((item) => item.rateSnapshot === "100.00000000")).toBe(true);
  });
});

describe("checkout BCV effective-date and last-success selection", () => {
  const validState = (date: string, outcome: "inserted" | "unchanged" = "inserted"): {
    last_success_at: string | null; last_outcome: string | null; last_effective_date: string | null;
  } => ({
    last_success_at: "2026-11-06T12:00:00.000Z",
    last_outcome: outcome,
    last_effective_date: date,
  });
  const validRate = (date: string, status: "valid" | "stale" = "valid") => ({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    rate: "895.10000000",
    effective_date: date,
    validation_status: status,
  });
  function mockClient(state: ReturnType<typeof validState> | null, rate: ReturnType<typeof validRate> | null) {
    const statements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string) => {
        statements.push(statement);
        if (statements.length === 1) return { rows: (state ? [state] : []) as Row[] };
        return { rows: (rate ? [rate] : []) as Row[] };
      },
    } as unknown as import("./database").DatabaseClient;
    return { client, statements };
  }

  it("rejects a Monday-prepublished rate on Friday before its effective date", async () => {
    const { client, statements } = mockClient(validState("2026-11-09"), validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-06T18:00:00-04:00"))).resolves.toBeNull();
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("FOR SHARE");
  });

  it("rejects a Monday-prepublished rate on Saturday before its effective date", async () => {
    const { client } = mockClient(validState("2026-11-09"), validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-07T12:00:00-04:00"))).resolves.toBeNull();
  });

  it("rejects a Monday-prepublished rate on Sunday before its effective date", async () => {
    const { client } = mockClient(validState("2026-11-09"), validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-08T12:00:00-04:00"))).resolves.toBeNull();
  });

  it("accepts a Monday-prepublished rate on Monday after Friday's successful sync without an arbitrary TTL", async () => {
    const { client, statements } = mockClient(validState("2026-11-09", "unchanged"), validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T09:00:00-04:00"))).resolves.toMatchObject({
      effective_date: "2026-11-09",
      validation_status: "valid",
    });
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("FOR SHARE");
    expect(statements[1]).toContain("effective_date = $2::date");
  });

  it("blocks a valid same-day rate when the latest sync attempt failed", async () => {
    const { client, statements } = mockClient({
      ...validState("2026-11-09"),
      last_outcome: "failed",
    }, validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(statements).toHaveLength(1);
  });

  it("blocks a valid same-day rate while the latest sync is running", async () => {
    const { client, statements } = mockClient({
      ...validState("2026-11-09"),
      last_outcome: "running",
    }, validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(statements).toHaveLength(1);
  });

  it("blocks when last-success is missing or the singleton row is absent", async () => {
    const missingSuccess = mockClient({
      ...validState("2026-11-09"),
      last_success_at: null,
    }, validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(missingSuccess.client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(missingSuccess.statements).toHaveLength(1);

    const missingState = mockClient(null, validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(missingState.client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(missingState.statements).toHaveLength(1);
  });

  it("blocks when the last successful sync's effective date does not match today", async () => {
    const { client, statements } = mockClient(validState("2026-11-08"), validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(statements).toHaveLength(1);
  });

  it("blocks an older outcome even if an earlier same-day rate row remains valid", async () => {
    const { client, statements } = mockClient({
      ...validState("2026-11-08"),
      last_outcome: "older",
    }, validRate("2026-11-09"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
    expect(statements).toHaveLength(1);
  });

  it("rejects a stale same-day rate even after a successful sync", async () => {
    const { client } = mockClient(validState("2026-11-09"), validRate("2026-11-09", "stale"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).resolves.toBeNull();
  });

  it("requires today's exact effective date even when sync state matches today", async () => {
    const { client } = mockClient(validState("2026-11-06"), validRate("2026-11-05"));
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-06T12:00:00-04:00"))).resolves.toBeNull();
  });

  it("propagates database errors so the checkout transaction fails closed", async () => {
    const client = {
      query: async () => { throw new Error("database unavailable"); },
    } as unknown as import("./database").DatabaseClient;
    await expect(findApplicableCheckoutRate(client, new Date("2026-11-09T12:00:00-04:00"))).rejects.toThrow("database unavailable");
  });
});
