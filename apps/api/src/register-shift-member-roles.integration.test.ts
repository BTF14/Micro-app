import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;

function isDisposablePostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? url.pathname === "/microapp_test" && url.username === "microapp" && url.password === "microapp-test-only"
      : false;
  } catch {
    return false;
  }
}

let client: import("pg").Client;

const suite = describe.skipIf(!isDisposablePostgresUrl(databaseUrl))(
  "approved own-shift roles against disposable PostgreSQL",
  () => {
    beforeAll(async () => {
      const { Client } = await import("pg");
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.end();
    });

    async function seed() {
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const org = await client.query<{ id: string }>(
        "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
        [`Own shift ${suffix}`, `own-shift-${suffix}`],
      );
      const organizationId = org.rows[0]!.id;
      const users: Record<string, string> = {};
      for (const role of ["owner", "admin", "cashier", "inventory"]) {
        const user = await client.query<{ id: string }>(
          "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
          [`${role}-${suffix}@example.invalid`, role],
        );
        users[role] = user.rows[0]!.id;
        await client.query(
          "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
          [organizationId, users[role], role],
        );
      }
      const branch = await client.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Main', $2) RETURNING id",
        [organizationId, `main-${suffix}`],
      );
      const branchId = branch.rows[0]!.id;
      for (const role of ["owner", "admin", "cashier", "inventory"]) {
        await client.query(
          "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
          [organizationId, branchId, users[role]],
        );
      }
      const register = await client.query<{ id: string }>(
        "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Front', $3) RETURNING id",
        [organizationId, branchId, `front-${suffix}`],
      );
      return { organizationId, branchId, registerId: register.rows[0]!.id, users };
    }

    async function open(data: Awaited<ReturnType<typeof seed>>, userId: string) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO register_shifts (organization_id, branch_id, register_id, cashier_user_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [data.organizationId, data.branchId, data.registerId, userId],
      );
      return result.rows[0]!.id;
    }

    async function close(shiftId: string, actorId: string) {
      return client.query(
        `UPDATE register_shifts SET closed_at = clock_timestamp(),
           closing_cash_usd = 1, closing_cash_ves = 1, closed_by_user_id = $2
         WHERE id = $1`,
        [shiftId, actorId],
      );
    }

    it.each(["owner", "admin", "cashier"] as const)(
      "allows %s to open and close only their own shift",
      async (role) => {
        const data = await seed();
        const shiftId = await open(data, data.users[role]);
        await expect(close(shiftId, data.users.inventory)).rejects.toMatchObject({ code: "23514" });
        await expect(close(shiftId, data.users[role])).resolves.toMatchObject({ rowCount: 1 });
      },
    );

    it("denies inventory, requires active branch membership and protects an open owner's role", async () => {
      const data = await seed();
      await expect(open(data, data.users.inventory)).rejects.toMatchObject({ code: "23514" });

      await client.query(
        "UPDATE branch_memberships SET is_active = false WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [data.organizationId, data.branchId, data.users.owner],
      );
      await expect(open(data, data.users.owner)).rejects.toMatchObject({ code: "23514" });

      await client.query(
        "UPDATE branch_memberships SET is_active = true WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
        [data.organizationId, data.branchId, data.users.owner],
      );

      // Every scope component that makes the shift operable remains active
      // until its owner closes the shift.
      await client.query(
        "UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2",
        [data.organizationId, data.users.inventory],
      );
      await expect(open(data, data.users.inventory)).rejects.toMatchObject({ code: "23514" });
      await client.query(
        "UPDATE organization_members SET is_active = true WHERE organization_id = $1 AND user_id = $2",
        [data.organizationId, data.users.inventory],
      );

      const shiftId = await open(data, data.users.owner);
      const blockedUpdates = [
        ["UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2", [data.organizationId, data.users.owner]],
        ["UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2", [data.organizationId, data.users.owner]],
        ["UPDATE branch_memberships SET is_active = false WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3", [data.organizationId, data.branchId, data.users.owner]],
        ["UPDATE app_users SET is_active = false WHERE id = $1", [data.users.owner]],
        ["UPDATE branches SET is_active = false WHERE organization_id = $1 AND id = $2", [data.organizationId, data.branchId]],
        ["UPDATE registers SET is_active = false WHERE organization_id = $1 AND id = $2", [data.organizationId, data.registerId]],
        ["UPDATE organizations SET is_active = false WHERE id = $1", [data.organizationId]],
      ] as const;
      for (const [sql, values] of blockedUpdates) {
        await expect(client.query(sql, values)).rejects.toMatchObject({ code: "23514" });
      }

      await close(shiftId, data.users.owner);
      await client.query(
        "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
        [data.organizationId, data.users.owner],
      );
    });
  },
);
