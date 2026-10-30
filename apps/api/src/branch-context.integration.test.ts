import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveBranchContext } from "./branch-context";
import type { DatabaseClient } from "./database";
import type { TenantContext } from "./tenant-context";

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;

const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const organizationSlug = `branch-context-${suffix}`;
const organizationName = `Branch Context ${suffix}`;

const suite = describe.skipIf(!databaseUrl)("branch context against PostgreSQL", () => {
  let client: import("pg").Client;
  let organizationId: string;
  let otherOrganizationId: string;
  let branchA: string;
  let branchB: string;
  let inactiveBranch: string;
  let ownerId: string;
  let adminId: string;
  let cashierAssignedId: string;
  let cashierUnassignedId: string;
  let inventoryAssignedId: string;

  const context = (userId: string, role: TenantContext["role"]): TenantContext => ({
    userId,
    organizationId,
    role,
  });

  beforeAll(async () => {
    const { Client } = await import("pg");
    client = new Client({ connectionString: databaseUrl });
    await client.connect();

    const org = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [organizationName, organizationSlug],
    );
    organizationId = org.rows[0]!.id;

    const otherOrg = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [`Other Branch Context ${suffix}`, `other-branch-context-${suffix}`],
    );
    otherOrganizationId = otherOrg.rows[0]!.id;

    const users = await Promise.all([
      ["owner", "owner"],
      ["admin", "admin"],
      ["cashier-assigned", "cashier"],
      ["cashier-unassigned", "cashier"],
      ["inventory-assigned", "inventory"],
    ].map(async ([label]) => {
      const result = await client.query<{ id: string }>(
        "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
        [`${label}-${suffix}@example.invalid`, label],
      );
      return result.rows[0]!.id;
    }));
    [ownerId, adminId, cashierAssignedId, cashierUnassignedId, inventoryAssignedId] = users;

    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, 'owner'), ($1, $3, 'admin'), ($1, $4, 'cashier'),
              ($1, $5, 'cashier'), ($1, $6, 'inventory')`,
      [organizationId, ownerId, adminId, cashierAssignedId, cashierUnassignedId, inventoryAssignedId],
    );

    const branchSeeds: Array<[string, string, boolean]> = [
      ["Branch A", "branch-a", true],
      ["Branch B", "branch-b", true],
      ["Inactive Branch", "branch-inactive", false],
    ];
    const branches = await Promise.all(branchSeeds.map(async ([name, slug, active]) => {
      const result = await client.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
        [organizationId, name, slug, active],
      );
      return result.rows[0]!.id;
    }));
    [branchA, branchB, inactiveBranch] = branches;

    await client.query(
      `INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Other tenant branch', $2)`,
      [otherOrganizationId, `other-branch-${suffix}`],
    ).then(async () => {
      const result = await client.query<{ id: string }>(
        "SELECT id FROM branches WHERE organization_id = $1 AND slug = $2",
        [otherOrganizationId, `other-branch-${suffix}`],
      );
      otherBranchId = result.rows[0]!.id;
    });

    await client.query(
      `INSERT INTO branch_memberships (organization_id, branch_id, user_id, is_active)
       VALUES ($1, $2, $3, true), ($1, $2, $4, true), ($1, $5, $3, false)`,
      [organizationId, branchA, cashierAssignedId, inventoryAssignedId, branchB],
    );
  });

  let otherBranchId: string;

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM branch_memberships WHERE organization_id = $1", [organizationId]);
    await client.query("DELETE FROM branches WHERE organization_id = ANY($1::uuid[])", [[organizationId, otherOrganizationId]]);
    await client.query("DELETE FROM organization_members WHERE organization_id = $1", [organizationId]);
    await client.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [[organizationId, otherOrganizationId]]);
    await client.query(
      "DELETE FROM app_users WHERE id = ANY($1::uuid[])",
      [[ownerId, adminId, cashierAssignedId, cashierUnassignedId, inventoryAssignedId]],
    );
    await client.end();
  });

  it("allows owner and admin to resolve active branches in their organization", async () => {
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(ownerId, "owner"), branchB)).resolves.toMatchObject({ branchId: branchB });
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(adminId, "admin"), branchA)).resolves.toMatchObject({ branchId: branchA });
  });

  it("requires active branch assignments for cashier and inventory", async () => {
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchA)).resolves.toMatchObject({ branchId: branchA });
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(inventoryAssignedId, "inventory"), branchA)).resolves.toMatchObject({ branchId: branchA });
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(cashierUnassignedId, "cashier"), branchA)).resolves.toBeNull();
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchB)).resolves.toBeNull();
  });

  it("rejects inactive branches and branch IDs belonging to another organization", async () => {
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(ownerId, "owner"), inactiveBranch)).resolves.toBeNull();
    await expect(resolveBranchContext(client as unknown as DatabaseClient, context(ownerId, "owner"), otherBranchId)).resolves.toBeNull();
  });
});
