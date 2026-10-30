import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveOpenCashierRegisterShift } from "./cashier-open-shift";
import type { BranchContext } from "./branch-context";
import type { DatabaseClient } from "./database";

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;

function isDisposablePostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname === "/microapp_test" &&
      url.username === "microapp" &&
      url.password === "microapp-test-only"
    );
  } catch {
    return false;
  }
}

const suite = describe.skipIf(!isDisposablePostgresUrl(databaseUrl))(
  "authenticated cashier open-shift resolver against disposable PostgreSQL",
  () => {
    let client: import("pg").Client;

    beforeAll(async () => {
      const { Client } = await import("pg");
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.end();
    });

    async function seedScope() {
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const org = await client.query<{ id: string }>(
        "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
        [`Open Shift ${suffix}`, `open-shift-${suffix}`],
      );
      const organizationId = org.rows[0]!.id;
      const user = await client.query<{ id: string }>(
        "INSERT INTO app_users (email, display_name) VALUES ($1, 'Cashier') RETURNING id",
        [`cashier-${suffix}@example.invalid`],
      );
      const userId = user.rows[0]!.id;
      const branch = await client.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Main', $2) RETURNING id",
        [organizationId, `main-${suffix}`],
      );
      const branchId = branch.rows[0]!.id;
      await client.query(
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'cashier')",
        [organizationId, userId],
      );
      await client.query(
        "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
        [organizationId, branchId, userId],
      );
      const register = await client.query<{ id: string }>(
        "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Front', $3) RETURNING id",
        [organizationId, branchId, `front-${suffix}`],
      );
      const registerId = register.rows[0]!.id;
      const branchContext: BranchContext = {
        userId,
        organizationId,
        organizationRole: "cashier",
        branchId,
      };
      return { organizationId, userId, branchId, registerId, branchContext };
    }

    it("returns null without a shift and returns the cashier's own open shift", async () => {
      const scope = await seedScope();
      const databaseClient = client as unknown as DatabaseClient;

      await expect(
        resolveOpenCashierRegisterShift(databaseClient, scope.branchContext),
      ).resolves.toBeNull();

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO register_shifts (
           organization_id, branch_id, register_id, cashier_user_id,
           opening_cash_usd, opening_cash_ves
         ) VALUES ($1, $2, $3, $4, 12.5000, 125.00)
         RETURNING id`,
        [scope.organizationId, scope.branchId, scope.registerId, scope.userId],
      );

      await expect(
        resolveOpenCashierRegisterShift(databaseClient, scope.branchContext),
      ).resolves.toMatchObject({
        id: inserted.rows[0]!.id,
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        registerId: scope.registerId,
        cashierUserId: scope.userId,
        openingCashUsd: "12.5000",
        openingCashVes: "125.00",
      });
    });

    it("denies an inactive user or revoked organization membership", async () => {
      const inactiveUser = await seedScope();
      await client.query("UPDATE app_users SET is_active = false WHERE id = $1", [inactiveUser.userId]);
      await expect(
        resolveOpenCashierRegisterShift(client as unknown as DatabaseClient, inactiveUser.branchContext),
      ).resolves.toBeNull();

      const revokedMembership = await seedScope();
      await client.query(
        "UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2",
        [revokedMembership.organizationId, revokedMembership.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(client as unknown as DatabaseClient, revokedMembership.branchContext),
      ).resolves.toBeNull();
    });

    it("denies a role changed after context resolution and a cross-tenant branch scope", async () => {
      const staleRole = await seedScope();
      await client.query(
        "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
        [staleRole.organizationId, staleRole.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(client as unknown as DatabaseClient, staleRole.branchContext),
      ).resolves.toBeNull();

      const scopeA = await seedScope();
      const scopeB = await seedScope();
      await expect(
        resolveOpenCashierRegisterShift(client as unknown as DatabaseClient, {
          ...scopeA.branchContext,
          branchId: scopeB.branchId,
        }),
      ).resolves.toBeNull();
    });

    it("denies a revoked branch assignment", async () => {
      const revokedAssignment = await seedScope();
      await client.query(
        `UPDATE branch_memberships SET is_active = false
         WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3`,
        [revokedAssignment.organizationId, revokedAssignment.branchId, revokedAssignment.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(client as unknown as DatabaseClient, revokedAssignment.branchContext),
      ).resolves.toBeNull();
    });
  },
);
