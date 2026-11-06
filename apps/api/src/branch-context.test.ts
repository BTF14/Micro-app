import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import { lockBranchScopes, resolveBranchContext } from "./branch-context";
import type { TenantContext } from "./tenant-context";

const userId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "99999999-8888-4777-8666-555555555555";

function tenant(role: TenantContext["role"]): TenantContext {
  return { userId, organizationId, role };
}

function makeClient(rows: Array<{ user_id: string; organization_id: string; branch_id: string; role: TenantContext["role"] }> = []) {
  const query = vi.fn(async (_statement: string, _values?: unknown[]) => ({ rows }));
  return {
    client: { connect: vi.fn(), query, end: vi.fn() } as unknown as DatabaseClient,
    query,
  };
}

describe("resolveBranchContext", () => {
  it.each(["owner", "admin"] as const)(
    "%s resolves an active branch within the selected organization without a branch assignment",
    async (role) => {
      const { client, query } = makeClient([{ user_id: userId, organization_id: organizationId, branch_id: branchId, role }]);

      await expect(resolveBranchContext(client, tenant(role), branchId)).resolves.toEqual({
        userId,
        organizationId,
        organizationRole: role,
        branchId,
      });
      expect(query).toHaveBeenCalledOnce();
      expect(query.mock.calls[0]?.[1]).toEqual([userId, organizationId, branchId, role]);
      expect(query.mock.calls[0]?.[0]).toContain("b.is_active = true");
      expect(query.mock.calls[0]?.[0]).toContain("o.is_active = true");
      expect(query.mock.calls[0]?.[0]).toContain("m.is_active = true");
      expect(query.mock.calls[0]?.[0]).toContain("m.role = $4");
      expect(query.mock.calls[0]?.[0]).toContain("m.role IN ('owner', 'admin')");
    },
  );

  it.each(["cashier", "inventory"] as const)(
    "%s requires an active assignment to the selected branch",
    async (role) => {
      const { client, query } = makeClient([{ user_id: userId, organization_id: organizationId, branch_id: branchId, role }]);

      await expect(resolveBranchContext(client, tenant(role), branchId)).resolves.toMatchObject({
        userId,
        organizationId,
        organizationRole: role,
        branchId,
      });
      expect(query.mock.calls[0]?.[0]).toContain("bm.is_active = true");
      expect(query.mock.calls[0]?.[0]).toContain("m.user_id = $1");
      expect(query.mock.calls[0]?.[0]).toContain("bm.user_id = m.user_id");
    },
  );

  it("denies when the branch is missing, inactive, or not assigned", async () => {
    const { client, query } = makeClient([]);
    await expect(resolveBranchContext(client, tenant("cashier"), branchId)).resolves.toBeNull();
    expect(query).toHaveBeenCalledOnce();
  });


  it("locks branch rows before membership rows through one hardened helper in canonical order", async () => {
    const branchA = "11111111-1111-4111-8111-111111111111";
    const branchB = "22222222-2222-4222-8222-222222222222";
    const userA = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const userB = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ locked: true }] });
    const client = { query } as unknown as DatabaseClient;

    await expect(lockBranchScopes(client, organizationId, [
      { branchId: branchB, userId: userB, requiresMembership: true },
      { branchId: branchA, userId: userA, requiresMembership: true },
      { branchId: branchA.toUpperCase(), userId: userA.toUpperCase(), requiresMembership: true },
    ])).resolves.toBe(true);

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain("public.lock_branch_scopes");
    expect(query.mock.calls[0]?.[1]).toEqual([organizationId, [branchA, branchB], [branchA, branchB], [userA, userB]]);
  });

  it("fails closed when a requested branch or required active membership is missing", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ locked: false }] });
    const client = { query } as unknown as DatabaseClient;

    await expect(lockBranchScopes(client, organizationId, [
      { branchId, userId, requiresMembership: true },
    ])).resolves.toBe(false);
    expect(query).toHaveBeenCalledOnce();
  });

  it("does not query for malformed branch or untrusted role context", async () => {
    const { client, query } = makeClient();
    await expect(resolveBranchContext(client, tenant("cashier"), "not-a-uuid")).resolves.toBeNull();
    await expect(
      resolveBranchContext(client, { ...tenant("cashier"), role: "superuser" as TenantContext["role"] }, branchId),
    ).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
