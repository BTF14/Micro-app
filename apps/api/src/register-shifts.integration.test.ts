import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

type Fixture = {
  organizationId: string;
  otherOrganizationId: string;
  branchId: string;
  otherBranchId: string;
  cashierA: string;
  cashierB: string;
  inventoryUser: string;
  otherCashier: string;
  registerA: string;
  registerB: string;
  otherRegister: string;
};

let client: import("pg").Client;

async function seedFixture(db: import("pg").Client): Promise<Fixture> {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const organization = await db.query<{ id: string }>(
    "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
    [`Register Shift ${suffix}`, `register-shift-${suffix}`],
  );
  const otherOrganization = await db.query<{ id: string }>(
    "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
    [`Other Register Shift ${suffix}`, `other-register-shift-${suffix}`],
  );
  const organizationId = organization.rows[0]!.id;
  const otherOrganizationId = otherOrganization.rows[0]!.id;

  const users: Record<string, string> = {};
  for (const role of ["cashier-a", "cashier-b", "inventory", "other-cashier"]) {
    const result = await db.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      [`${role}-${suffix}@example.invalid`, role],
    );
    users[role] = result.rows[0]!.id;
  }

  await db.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'cashier'), ($1, $3, 'cashier'), ($1, $4, 'inventory'),
            ($5, $6, 'cashier')`,
    [
      organizationId,
      users["cashier-a"],
      users["cashier-b"],
      users.inventory,
      otherOrganizationId,
      users["other-cashier"],
    ],
  );

  const branch = await db.query<{ id: string }>(
    "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Main', $2) RETURNING id",
    [organizationId, `main-${suffix}`],
  );
  const otherBranch = await db.query<{ id: string }>(
    "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Other', $2) RETURNING id",
    [otherOrganizationId, `other-${suffix}`],
  );
  const branchId = branch.rows[0]!.id;
  const otherBranchId = otherBranch.rows[0]!.id;

  await db.query(
    `INSERT INTO branch_memberships (organization_id, branch_id, user_id)
     VALUES ($1, $2, $3), ($1, $2, $4), ($1, $2, $5), ($6, $7, $8)`,
    [
      organizationId,
      branchId,
      users["cashier-a"],
      users["cashier-b"],
      users.inventory,
      otherOrganizationId,
      otherBranchId,
      users["other-cashier"],
    ],
  );

  const registerA = await db.query<{ id: string }>(
    "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Front', $3) RETURNING id",
    [organizationId, branchId, `front-${suffix}`],
  );
  const registerB = await db.query<{ id: string }>(
    "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Back', $3) RETURNING id",
    [organizationId, branchId, `back-${suffix}`],
  );
  const otherRegister = await db.query<{ id: string }>(
    "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Other tenant', $3) RETURNING id",
    [otherOrganizationId, otherBranchId, `other-${suffix}`],
  );

  return {
    organizationId,
    otherOrganizationId,
    branchId,
    otherBranchId,
    cashierA: users["cashier-a"]!,
    cashierB: users["cashier-b"]!,
    inventoryUser: users.inventory!,
    otherCashier: users["other-cashier"]!,
    registerA: registerA.rows[0]!.id,
    registerB: registerB.rows[0]!.id,
    otherRegister: otherRegister.rows[0]!.id,
  };
}

async function openShift(
  db: import("pg").Client,
  fixture: Fixture,
  registerId: string,
  cashierId: string,
  openingCashUsd = 0,
  openingCashVes = 0,
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO register_shifts (
       organization_id, branch_id, register_id, cashier_user_id,
       opening_cash_usd, opening_cash_ves
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      fixture.organizationId,
      fixture.branchId,
      registerId,
      cashierId,
      openingCashUsd,
      openingCashVes,
    ],
  );
  return result.rows[0]!.id;
}

async function closeShift(
  db: import("pg").Client,
  shiftId: string,
  cashierId: string,
): Promise<void> {
  await db.query(
    `UPDATE register_shifts
     SET closed_at = clock_timestamp(),
         closing_cash_usd = 12.5000,
         closing_cash_ves = 125.00,
         closed_by_user_id = $2
     WHERE id = $1`,
    [shiftId, cashierId],
  );
}

const suite = describe.skipIf(!isDisposablePostgresUrl(databaseUrl))(
  "register shifts against disposable PostgreSQL",
  () => {
    beforeAll(async () => {
      const { Client } = await import("pg");
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.end();
    });

    it("enforces tenant, branch assignment and cashier-role boundaries", async () => {
      const fixture = await seedFixture(client);

      await expect(
        client.query(
          "INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'Cross tenant', 'cross-tenant')",
          [fixture.organizationId, fixture.otherBranchId],
        ),
      ).rejects.toMatchObject({ code: "23503" });

      await expect(
        openShift(client, fixture, fixture.otherRegister, fixture.cashierA),
      ).rejects.toMatchObject({ code: "23503" });

      await expect(
        openShift(client, fixture, fixture.registerA, fixture.otherCashier),
      ).rejects.toMatchObject({ code: "23503" });

      await expect(
        openShift(client, fixture, fixture.registerA, fixture.inventoryUser),
      ).rejects.toMatchObject({ code: "23514" });

      await client.query(
        `UPDATE branch_memberships SET is_active = false
         WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3`,
        [fixture.organizationId, fixture.branchId, fixture.cashierA],
      );
      await expect(
        openShift(client, fixture, fixture.registerA, fixture.cashierA),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("enforces one open shift per register and per cashier, then permits reuse after close", async () => {
      const fixture = await seedFixture(client);
      const shiftId = await openShift(
        client,
        fixture,
        fixture.registerA,
        fixture.cashierA,
        1.2500,
        25.00,
      );

      await expect(
        openShift(client, fixture, fixture.registerA, fixture.cashierB),
      ).rejects.toMatchObject({ code: "23505" });
      await expect(
        openShift(client, fixture, fixture.registerB, fixture.cashierA),
      ).rejects.toMatchObject({ code: "23505" });

      await expect(
        client.query("UPDATE register_shifts SET cashier_user_id = $2 WHERE id = $1", [
          shiftId,
          fixture.cashierB,
        ]),
      ).rejects.toMatchObject({ code: "23514" });

      await expect(
        client.query("UPDATE register_shifts SET closed_at = clock_timestamp() WHERE id = $1", [
          shiftId,
        ]),
      ).rejects.toMatchObject({ code: "23514" });

      await expect(
        client.query("DELETE FROM register_shifts WHERE id = $1", [shiftId]),
      ).rejects.toMatchObject({ code: "23514" });

      await closeShift(client, shiftId, fixture.cashierA);

      await expect(
        client.query("UPDATE register_shifts SET closing_cash_usd = 99 WHERE id = $1", [
          shiftId,
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        client.query("DELETE FROM register_shifts WHERE id = $1", [shiftId]),
      ).rejects.toMatchObject({ code: "23514" });

      const nextShiftId = await openShift(
        client,
        fixture,
        fixture.registerA,
        fixture.cashierA,
      );
      await closeShift(client, nextShiftId, fixture.cashierA);
    });

    it("prevents deactivation or cashier revocation while a shift is open", async () => {
      const fixture = await seedFixture(client);
      const shiftId = await openShift(
        client,
        fixture,
        fixture.registerA,
        fixture.cashierA,
      );

      const rejectedUpdates = [
        client.query("UPDATE registers SET is_active = false WHERE id = $1", [
          fixture.registerA,
        ]),
        client.query(
          "UPDATE branches SET is_active = false WHERE organization_id = $1 AND id = $2",
          [fixture.organizationId, fixture.branchId],
        ),
        client.query(
          `UPDATE branch_memberships SET is_active = false
           WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3`,
          [fixture.organizationId, fixture.branchId, fixture.cashierA],
        ),
        client.query(
          "UPDATE organization_members SET is_active = false WHERE organization_id = $1 AND user_id = $2",
          [fixture.organizationId, fixture.cashierA],
        ),
        client.query(
          "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
          [fixture.organizationId, fixture.cashierA],
        ),
        client.query("UPDATE app_users SET is_active = false WHERE id = $1", [
          fixture.cashierA,
        ]),
        client.query("UPDATE organizations SET is_active = false WHERE id = $1", [
          fixture.organizationId,
        ]),
      ];

      for (const update of rejectedUpdates) {
        await expect(update).rejects.toMatchObject({ code: "23514" });
      }

      await closeShift(client, shiftId, fixture.cashierA);

      await client.query("UPDATE registers SET is_active = false WHERE id = $1", [
        fixture.registerA,
      ]);
      await client.query(
        "UPDATE branches SET is_active = false WHERE organization_id = $1 AND id = $2",
        [fixture.organizationId, fixture.branchId],
      );
      await client.query(
        `UPDATE branch_memberships SET is_active = false
         WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3`,
        [fixture.organizationId, fixture.branchId, fixture.cashierA],
      );
      await client.query(
        "UPDATE organization_members SET role = 'inventory', is_active = false WHERE organization_id = $1 AND user_id = $2",
        [fixture.organizationId, fixture.cashierA],
      );
      await client.query("UPDATE app_users SET is_active = false WHERE id = $1", [
        fixture.cashierA,
      ]);
      await client.query("UPDATE organizations SET is_active = false WHERE id = $1", [
        fixture.organizationId,
      ]);
    });

    it("allows only one of two concurrent openings for the same register", async () => {
      const fixture = await seedFixture(client);
      const { Client } = await import("pg");
      const secondClient = new Client({ connectionString: databaseUrl });
      await secondClient.connect();

      try {
        const attempts = await Promise.allSettled([
          openShift(client, fixture, fixture.registerA, fixture.cashierA),
          openShift(secondClient, fixture, fixture.registerA, fixture.cashierB),
        ]);
        const succeeded = attempts.filter(
          (attempt): attempt is PromiseFulfilledResult<string> => attempt.status === "fulfilled",
        );
        const failed = attempts.filter(
          (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
        );

        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);
        expect(failed[0]!.reason).toMatchObject({ code: "23505" });

        const winnerCashier = attempts[0]!.status === "fulfilled"
          ? fixture.cashierA
          : fixture.cashierB;
        await closeShift(client, succeeded[0]!.value, winnerCashier);
      } finally {
        await secondClient.end();
      }
    });

    it("allows only one of two concurrent openings for the same cashier across registers", async () => {
      const fixture = await seedFixture(client);
      const { Client } = await import("pg");
      const secondClient = new Client({ connectionString: databaseUrl });
      await secondClient.connect();

      try {
        const attempts = await Promise.allSettled([
          openShift(client, fixture, fixture.registerA, fixture.cashierA),
          openShift(secondClient, fixture, fixture.registerB, fixture.cashierA),
        ]);
        const succeeded = attempts.filter(
          (attempt): attempt is PromiseFulfilledResult<string> => attempt.status === "fulfilled",
        );
        const failed = attempts.filter(
          (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
        );

        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);
        expect(failed[0]!.reason).toMatchObject({ code: "23505" });

        await closeShift(client, succeeded[0]!.value, fixture.cashierA);
      } finally {
        await secondClient.end();
      }
    });
  },
);
