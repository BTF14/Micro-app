import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import { lockInventoryBalances, lockInventoryWarehouses } from "./inventory-locks";

function fakeTransaction(responses: unknown[][]) {
  const calls: Array<{ statement: string; values: unknown[] | undefined }> = [];
  const query = vi.fn(async <Row>(statement: string, values?: unknown[]) => {
    calls.push({ statement, values });
    return { rows: (responses.shift() ?? []) as Row[] };
  });
  return { tx: { query } as unknown as DatabaseClient, calls };
}

describe("inventory transaction lock helpers", () => {
  it("locks all warehouses once in canonical UUID order", async () => {
    const first = "00000000-0000-4000-8000-000000000001";
    const second = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const branchA = "11111111-1111-4111-8111-111111111111";
    const branchB = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const { tx, calls } = fakeTransaction([[{ id: first }, { id: second }]]);

    await expect(lockInventoryWarehouses(tx, "org", [
      { warehouseId: second, branchId: branchB },
      { warehouseId: first, branchId: branchA },
      { warehouseId: second.toUpperCase(), branchId: branchB.toUpperCase() },
    ])).resolves.toEqual([first, second]);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.values).toEqual(["org", [first, second], [branchA, branchB]]);
    expect(calls[0]!.statement).toMatch(/requested\\.branch_id = w\\.branch_id/);
    expect(calls[0]!.statement).toMatch(/ORDER BY w\.id ASC\s+FOR UPDATE OF w/);
  });

  it("fails closed when any requested warehouse is missing or outside the tenant", async () => {
    const first = "00000000-0000-4000-8000-000000000001";
    const second = "00000000-0000-4000-8000-000000000002";
    const branch = "11111111-1111-4111-8111-111111111111";
    const { tx } = fakeTransaction([[{ id: first }]]);

    await expect(lockInventoryWarehouses(tx, "org", [
      { warehouseId: first, branchId: branch },
      { warehouseId: second, branchId: branch },
    ])).resolves.toBeNull();
  });

  it("rejects conflicting branch scopes for the same warehouse before querying", async () => {
    const warehouse = "00000000-0000-4000-8000-000000000001";
    const branchA = "11111111-1111-4111-8111-111111111111";
    const branchB = "22222222-2222-4222-8222-222222222222";
    const { tx, calls } = fakeTransaction([]);

    await expect(lockInventoryWarehouses(tx, "org", [
      { warehouseId: warehouse, branchId: branchA },
      { warehouseId: warehouse, branchId: branchB },
    ])).resolves.toBeNull();

    expect(calls).toHaveLength(0);
  });

  it("locks balances in warehouse/product order and sorts requested product IDs", async () => {
    const warehouseA = "00000000-0000-4000-8000-000000000001";
    const warehouseB = "00000000-0000-4000-8000-000000000002";
    const productA = "10000000-0000-4000-8000-000000000001";
    const productB = "10000000-0000-4000-8000-000000000002";
    const rows = [{ warehouse_id: warehouseA, product_id: productA, on_hand_quantity: "2.000", reserved_quantity: "0.000" }];
    const { tx, calls } = fakeTransaction([rows]);

    await expect(lockInventoryBalances(tx, "org", [warehouseB, warehouseA], [productB, productA]))
      .resolves.toEqual(rows);

    expect(calls[0]!.values).toEqual(["org", [warehouseA, warehouseB], [productA, productB]]);
    expect(calls[0]!.statement).toMatch(/ORDER BY warehouse_id ASC, product_id ASC\s+FOR UPDATE/);
  });

  it("locks every existing balance when product IDs are omitted", async () => {
    const warehouse = "00000000-0000-4000-8000-000000000001";
    const { tx, calls } = fakeTransaction([[]]);

    await expect(lockInventoryBalances(tx, "org", [warehouse])).resolves.toEqual([]);

    expect(calls[0]!.values).toEqual(["org", [warehouse]]);
    expect(calls[0]!.statement).not.toContain("product_id = ANY");
    expect(calls[0]!.statement).toMatch(/ORDER BY warehouse_id ASC, product_id ASC\s+FOR UPDATE/);
  });

  it("does not issue a query for an empty warehouse or product set", async () => {
    const { tx, calls } = fakeTransaction([]);

    await expect(lockInventoryBalances(tx, "org", [])).resolves.toEqual([]);
    await expect(lockInventoryBalances(tx, "org", ["00000000-0000-4000-8000-000000000001"], [])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
