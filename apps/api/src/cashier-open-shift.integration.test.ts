import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveOpenCashierRegisterShift } from "./cashier-open-shift";
import type { BranchContext } from "./branch-context";
import type { DatabaseClient } from "./database";

const testEnvironment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const databaseUrl = testEnvironment?.DATABASE_URL;
const runtimeDatabaseUrl = testEnvironment?.DATABASE_URL_RUNTIME;

function isDisposablePostgresUrl(value: string | undefined, expectedUser: string, expectedPassword: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname === "/microapp_test" && url.username === expectedUser && url.password === expectedPassword;
  } catch { return false; }
}

const suite = describe.skipIf(
  !isDisposablePostgresUrl(databaseUrl, "microapp", "microapp-test-only") ||
  !isDisposablePostgresUrl(runtimeDatabaseUrl, "microapp_runtime", "runtime-test-only"),
)(
  "authenticated cashier open-shift resolver against disposable PostgreSQL",
  () => {
    let client: import("pg").Client;
    let runtimeClient: import("pg").Client;

    beforeAll(async () => {
      const { Client } = await import("pg");
      client = new Client({ connectionString: databaseUrl });
      runtimeClient = new Client({ connectionString: runtimeDatabaseUrl });
      await client.connect();
      await runtimeClient.connect();
    });

    afterAll(async () => {
      if (runtimeClient) await runtimeClient.end();
      if (client) await client.end();
    });

    async function seedScope(role: BranchContext["organizationRole"] = "cashier") {
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
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
        [organizationId, userId, role],
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
        organizationRole: role,
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

    it("resolves owner and admin own shifts through the runtime lock helper", async () => {
      const owner = await seedScope("owner");
      const admin = await seedScope("admin");
      const ownerShift = await client.query<{ id: string }>(
        "INSERT INTO register_shifts (organization_id,branch_id,register_id,cashier_user_id) VALUES ($1,$2,$3,$4) RETURNING id",
        [owner.organizationId, owner.branchId, owner.registerId, owner.userId],
      );
      const adminShift = await client.query<{ id: string }>(
        "INSERT INTO register_shifts (organization_id,branch_id,register_id,cashier_user_id) VALUES ($1,$2,$3,$4) RETURNING id",
        [admin.organizationId, admin.branchId, admin.registerId, admin.userId],
      );

      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, owner.branchContext),
      ).resolves.toMatchObject({ id: ownerShift.rows[0]!.id, cashierUserId: owner.userId });
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, admin.branchContext),
      ).resolves.toMatchObject({ id: adminShift.rows[0]!.id, cashierUserId: admin.userId });
    });

    it("denies an inactive user or revoked organization membership", async () => {
      const inactiveUser = await seedScope();
      await client.query("UPDATE app_users SET is_active = false WHERE id = $1", [inactiveUser.userId]);
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, inactiveUser.branchContext),
      ).resolves.toBeNull();

      const revokedMembership = await seedScope();
      await client.query(
        "UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2",
        [revokedMembership.organizationId, revokedMembership.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, revokedMembership.branchContext),
      ).resolves.toBeNull();
    });

    it("denies a role changed after context resolution and a cross-tenant branch scope", async () => {
      const staleRole = await seedScope();
      await client.query(
        "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
        [staleRole.organizationId, staleRole.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, staleRole.branchContext),
      ).resolves.toBeNull();

      const scopeA = await seedScope();
      const scopeB = await seedScope();
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, {
          ...scopeA.branchContext,
          branchId: scopeB.branchId,
        }),
      ).resolves.toBeNull();
    });


    it("does not return another cashier's shift in the same organization and branch", async () => {
      const scope = await seedScope();
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const otherUser = await client.query<{ id: string }>(
        "INSERT INTO app_users (email, display_name) VALUES ($1, 'Other cashier') RETURNING id",
        [`other-cashier-${suffix}@example.invalid`],
      );
      const otherUserId = otherUser.rows[0]!.id;
      await client.query(
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'cashier')",
        [scope.organizationId, otherUserId],
      );
      await client.query(
        "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
        [scope.organizationId, scope.branchId, otherUserId],
      );
      const otherRegister = await client.query<{ id: string }>(
        "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Other', $3) RETURNING id",
        [scope.organizationId, scope.branchId, `other-${suffix}`],
      );
      await client.query(
        "INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id) VALUES ($1, $2, $3, $4)",
        [scope.organizationId, scope.branchId, otherRegister.rows[0]!.id, otherUserId],
      );

      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, scope.branchContext),
      ).resolves.toBeNull();
    });

    it("does not return the same cashier's shift from another branch in the same organization", async () => {
      const scope = await seedScope();
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const otherBranch = await client.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Other branch', $2) RETURNING id",
        [scope.organizationId, `other-branch-${suffix}`],
      );
      const otherBranchId = otherBranch.rows[0]!.id;
      await client.query(
        "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
        [scope.organizationId, otherBranchId, scope.userId],
      );
      const otherRegister = await client.query<{ id: string }>(
        "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Other branch register', $3) RETURNING id",
        [scope.organizationId, otherBranchId, `other-register-${suffix}`],
      );
      await client.query(
        "INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id) VALUES ($1, $2, $3, $4)",
        [scope.organizationId, otherBranchId, otherRegister.rows[0]!.id, scope.userId],
      );

      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, scope.branchContext),
      ).resolves.toBeNull();
    });

    it("holds the resolved shift against a concurrent close until the caller transaction ends", async () => {
      const scope = await seedScope();
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id) VALUES ($1, $2, $3, $4) RETURNING id",
        [scope.organizationId, scope.branchId, scope.registerId, scope.userId],
      );
      const { Client } = await import("pg");
      const closer = new Client({ connectionString: databaseUrl });
      await closer.connect();
      let inTransaction = false;

      try {
        await runtimeClient.query("BEGIN");
        inTransaction = true;
        await expect(
          resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, scope.branchContext),
        ).resolves.toMatchObject({ id: inserted.rows[0]!.id });

        await closer.query("SET lock_timeout = '100ms'");
        await expect(
          closer.query(
            `UPDATE register_shifts
             SET closed_at = clock_timestamp(),
                 closing_cash_usd = 0,
                 closing_cash_ves = 0,
                 closed_by_user_id = $2
             WHERE id = $1`,
            [inserted.rows[0]!.id, scope.userId],
          ),
        ).rejects.toMatchObject({ code: "55P03" });

        await runtimeClient.query("COMMIT");
        inTransaction = false;
        await closer.query("SET lock_timeout = '0'");
        await closer.query(
          `UPDATE register_shifts
           SET closed_at = clock_timestamp(),
               closing_cash_usd = 0,
               closing_cash_ves = 0,
               closed_by_user_id = $2
           WHERE id = $1`,
          [inserted.rows[0]!.id, scope.userId],
        );
      } finally {
        if (inTransaction) await runtimeClient.query("ROLLBACK");
        await closer.end();
      }
    });

    it("denies a revoked branch assignment", async () => {
      const revokedAssignment = await seedScope();
      await client.query(
        `UPDATE branch_memberships SET is_active = false
         WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3`,
        [revokedAssignment.organizationId, revokedAssignment.branchId, revokedAssignment.userId],
      );
      await expect(
        resolveOpenCashierRegisterShift(runtimeClient as unknown as DatabaseClient, revokedAssignment.branchContext),
      ).resolves.toBeNull();
    });
  },
);
