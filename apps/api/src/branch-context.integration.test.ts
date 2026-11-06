import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveBranchContext } from "./branch-context";
import type { DatabaseClient } from "./database";
import type { TenantContext } from "./tenant-context";

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;

const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const organizationSlug = `branch-context-${suffix}`;
const organizationName = `Branch Context ${suffix}`;

const suite = describe.skipIf(!databaseUrl)("branch context against PostgreSQL", () => {
  let client: import("pg").Client;
  let secondClient: import("pg").Client;
  let runtimeClient: import("pg").Client;
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
    client = new Client({ connectionString: databaseUrlAdmin });
    secondClient = new Client({ connectionString: databaseUrlAdmin });
    runtimeClient = new Client({ connectionString: databaseUrl });
    await Promise.all([client.connect(), secondClient.connect(), runtimeClient.connect()]);

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

    const userLabels = ["owner", "admin", "cashier-assigned", "cashier-unassigned", "inventory-assigned"];
    const users: string[] = [];
    for (const label of userLabels) {
      const result = await client.query<{ id: string }>(
        "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
        [`${label}-${suffix}@example.invalid`, label],
      );
      users.push(result.rows[0]!.id);
    }
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
    const branches: string[] = [];
    for (const [name, slug, active] of branchSeeds) {
      const result = await client.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
        [organizationId, name, slug, active],
      );
      branches.push(result.rows[0]!.id);
    }
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
    await Promise.all([client.end(), secondClient.end(), runtimeClient.end()]);
  });

  async function waitForLockWait(pid: number): Promise<void> {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const state = await client.query<{ wait_event_type: string | null }>(
        "SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1",
        [pid],
      );
      if (state.rows[0]?.wait_event_type === "Lock") return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for the competing PostgreSQL transaction to block on a row lock.");
  }

  it("allows owner and admin to resolve active branches in their organization", async () => {
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(ownerId, "owner"), branchB)).resolves.toMatchObject({ branchId: branchB });
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(adminId, "admin"), branchA)).resolves.toMatchObject({ branchId: branchA });
  });

  it("requires active branch assignments for cashier and inventory", async () => {
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchA)).resolves.toMatchObject({ branchId: branchA });
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(inventoryAssignedId, "inventory"), branchA)).resolves.toMatchObject({ branchId: branchA });
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierUnassignedId, "cashier"), branchA)).resolves.toBeNull();
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchB)).resolves.toBeNull();
  });

  it("revalidates active organization membership and the current database role", async () => {
    await client.query(
      "UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2",
      [organizationId, cashierAssignedId],
    );
    await expect(
      resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchA),
    ).resolves.toBeNull();

    await client.query(
      "UPDATE organization_members SET is_active = true, role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, cashierAssignedId],
    );
    await expect(
      resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchA),
    ).resolves.toBeNull();

    await client.query(
      "UPDATE organization_members SET role = 'cashier' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, cashierAssignedId],
    );
    await expect(
      resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(cashierAssignedId, "cashier"), branchA),
    ).resolves.toMatchObject({ branchId: branchA });
  });


  it("denies branch access when a membership revocation commits before authorization acquires its lock", async () => {
    const { Client } = await import("pg");
    const reader = new Client({ connectionString: databaseUrl });
    await reader.connect();
    await secondClient.query("BEGIN");
    try {
      await secondClient.query(
        "UPDATE branch_memberships SET is_active = false WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [organizationId, branchA, cashierAssignedId],
      );
      const pid = (await reader.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const resolution = resolveBranchContext(
        reader as unknown as DatabaseClient,
        context(cashierAssignedId, "cashier"),
        branchA,
        true,
      );
      await waitForLockWait(pid);
      await secondClient.query("COMMIT");
      await expect(resolution).resolves.toBeNull();
      await client.query(
        "UPDATE branch_memberships SET is_active = true WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [organizationId, branchA, cashierAssignedId],
      );
    } catch (error) {
      await secondClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await reader.end();
    }
  });

  it("makes a concurrent membership revocation wait until an authorized transaction commits", async () => {
    const { Client } = await import("pg");
    const reader = new Client({ connectionString: databaseUrl });
    await reader.connect();
    try {
      await reader.query("BEGIN");
      await expect(resolveBranchContext(
        reader as unknown as DatabaseClient,
        context(cashierAssignedId, "cashier"),
        branchA,
        true,
      )).resolves.toMatchObject({ branchId: branchA });
      const pid = (await secondClient.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const revocation = secondClient.query(
        "UPDATE branch_memberships SET is_active = false WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [organizationId, branchA, cashierAssignedId],
      );
      await waitForLockWait(pid);
      await reader.query("COMMIT");
      await revocation;
      await client.query(
        "UPDATE branch_memberships SET is_active = true WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [organizationId, branchA, cashierAssignedId],
      );
    } finally {
      await reader.query("ROLLBACK").catch(() => undefined);
      await reader.end();
    }
  });

  it("serializes branch deactivation behind a transaction holding the active branch lock", async () => {
    const { Client } = await import("pg");
    const reader = new Client({ connectionString: databaseUrl });
    await reader.connect();
    try {
      await reader.query("BEGIN");
      await expect(resolveBranchContext(
        reader as unknown as DatabaseClient,
        context(ownerId, "owner"),
        branchB,
        true,
      )).resolves.toMatchObject({ branchId: branchB });
      const pid = (await secondClient.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const deactivation = secondClient.query(
        "UPDATE branches SET is_active = false WHERE organization_id = $1 AND id = $2",
        [organizationId, branchB],
      );
      await waitForLockWait(pid);
      await reader.query("COMMIT");
      await deactivation;
      await client.query("UPDATE branches SET is_active = true WHERE organization_id = $1 AND id = $2", [organizationId, branchB]);
    } finally {
      await reader.query("ROLLBACK").catch(() => undefined);
      await reader.end();
    }
  });

  it("rejects inactive branches and branch IDs belonging to another organization", async () => {
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(ownerId, "owner"), inactiveBranch)).resolves.toBeNull();
    await expect(resolveBranchContext(runtimeClient as unknown as DatabaseClient, context(ownerId, "owner"), otherBranchId)).resolves.toBeNull();
  });
});
