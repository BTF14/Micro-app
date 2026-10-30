import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import { resolveBranchContext } from "./branch-context";
import type { TenantContext } from "./tenant-context";

const userId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "99999999-8888-4777-8666-555555555555";

function tenant(role: TenantContext["role"]): TenantContext {
  return { userId, organizationId, role };
}

function makeClient(rows: Array<{ user_id: string; organization_id: string; branch_id: string }> = []) {
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
      const { client, query } = makeClient([{ user_id: userId, organization_id: organizationId, branch_id: branchId }]);

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
      const { client, query } = makeClient([{ user_id: userId, organization_id: organizationId, branch_id: branchId }]);

      await expect(resolveBranchContext(client, tenant(role), branchId)).resolves.toMatchObject({
        userId,
        organizationId,
        organizationRole: role,
        branchId,
      });
      expect(query.mock.calls[0]?.[0]).toContain("bm.is_active = true");
      expect(query.mock.calls[0]?.[0]).toContain("bm.user_id = $1");
    },
  );

  it("denies when the branch is missing, inactive, or not assigned", async () => {
    const { client, query } = makeClient([]);
    await expect(resolveBranchContext(client, tenant("cashier"), branchId)).resolves.toBeNull();
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
