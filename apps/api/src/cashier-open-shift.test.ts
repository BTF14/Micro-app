import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import type { BranchContext } from "./branch-context";
import { resolveOpenCashierRegisterShift } from "./cashier-open-shift";

const userId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "99999999-8888-4777-8666-555555555555";

const context = (organizationRole: BranchContext["organizationRole"] = "cashier"): BranchContext => ({
  userId,
  organizationId,
  organizationRole,
  branchId,
});

const openShift = {
  id: "22222222-3333-4444-8555-666666666666",
  organizationId,
  branchId,
  registerId: "33333333-4444-4555-8666-777777777777",
  cashierUserId: userId,
  openedAt: new Date("2026-10-30T10:00:00.000Z"),
  openingCashUsd: "10.0000",
  openingCashVes: "100.00",
};

function makeClient(rows: typeof openShift[] = []) {
  const query = vi.fn(async (_statement: string, _values?: unknown[]) => ({ rows }));
  return {
    client: { connect: vi.fn(), query, end: vi.fn() } as unknown as DatabaseClient,
    query,
  };
}

describe("resolveOpenCashierRegisterShift", () => {
  it("returns the open shift belonging to the authenticated cashier and exact branch", async () => {
    const { client, query } = makeClient([openShift]);

    await expect(resolveOpenCashierRegisterShift(client, context())).resolves.toEqual(openShift);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[1]).toEqual([organizationId, branchId, userId]);
    const sql = query.mock.calls[0]?.[0] ?? "";
    expect(sql).toContain("s.organization_id = $1");
    expect(sql).toContain("s.branch_id = $2");
    expect(sql).toContain("s.cashier_user_id = $3");
    expect(sql).toContain("s.closed_at IS NULL");
    expect(sql).toContain("m.role = 'cashier'");
    expect(sql).toContain("bm.is_active = true");
    expect(sql).toContain("u.is_active = true");
    expect(sql).toContain("FOR SHARE OF s");
  });

  it("returns null when the cashier has no open shift", async () => {
    const { client } = makeClient();
    await expect(resolveOpenCashierRegisterShift(client, context())).resolves.toBeNull();
  });

  it.each(["owner", "admin", "inventory"] as const)(
    "does not query for the %s role",
    async (organizationRole) => {
      const { client, query } = makeClient([openShift]);
      await expect(
        resolveOpenCashierRegisterShift(client, context(organizationRole)),
      ).resolves.toBeNull();
      expect(query).not.toHaveBeenCalled();
    },
  );

  it("does not query with malformed or incomplete branch scope", async () => {
    const { client, query } = makeClient();
    await expect(
      resolveOpenCashierRegisterShift(client, { ...context(), branchId: "not-a-uuid" }),
    ).resolves.toBeNull();
    await expect(
      resolveOpenCashierRegisterShift(client, { ...context(), organizationId: "" }),
    ).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
