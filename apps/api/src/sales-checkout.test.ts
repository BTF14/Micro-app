import { describe, expect, it } from "vitest";
import {
  allocateUsdEquivalents,
  canonicalRequestHash,
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
