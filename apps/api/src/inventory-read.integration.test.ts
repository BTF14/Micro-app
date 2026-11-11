import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) { super({ connectionString }); }
    },
  };
});

const app = (await import("./index")).default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);

if (isCi && !databaseUrl) throw new Error("DATABASE_URL is required in CI; refusing to skip inventory read integration tests.");

async function sessionToken(): Promise<{ token: string; hash: string }> {
  const token = "inventory-read-" + crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { token, hash };
}

describe.skipIf(!databaseUrl)("inventory balance and ledger read APIs against PostgreSQL", () => {
  let admin: Client;
  let organizationId = "";
  let branchId = "";
  let warehouseId = "";
  let otherBranchId = "";
  let otherWarehouseId = "";
  let ownerToken = "";
  let cashierToken = "";
  let ownerId = "";
  let ledgerProjectionEnabled = false;
  let firstProductId = "";
  let secondProductId = "";
  let inactiveProductId = "";
  let foreignOrganizationId = "";
  let foreignBranchId = "";
  let foreignWarehouseId = "";

  async function get(path: string, token = ownerToken): Promise<Response> {
    return app.fetch(new Request("https://api.example" + path, {
      headers: { Cookie: "microapp_session=" + token },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  const root = () => `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}`;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrlAdmin });
    await admin.connect();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 14);

    const organization = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Inventory Read " + suffix, "inventory-read-" + suffix],
    );
    organizationId = organization.rows[0]!.id;

    const owner = await admin.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, 'Inventory Owner') RETURNING id",
      ["inventory-read-owner-" + suffix + "@example.test"],
    );
    ownerId = owner.rows[0]!.id;
    await admin.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationId, ownerId],
    );
    const ownerSession = await sessionToken();
    ownerToken = ownerSession.token;
    await admin.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [ownerId, ownerSession.hash],
    );

    const cashier = await admin.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, 'Inventory Cashier') RETURNING id",
      ["inventory-read-cashier-" + suffix + "@example.test"],
    );
    const cashierId = cashier.rows[0]!.id;
    await admin.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'cashier')",
      [organizationId, cashierId],
    );
    const cashierSession = await sessionToken();
    cashierToken = cashierSession.token;
    await admin.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [cashierId, cashierSession.hash],
    );

    const branch = await admin.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Inventory Read Branch', $2) RETURNING id",
      [organizationId, "inventory-read-" + suffix],
    );
    branchId = branch.rows[0]!.id;
    await admin.query(
      "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
      [organizationId, branchId, cashierId],
    );

    const warehouse = await admin.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, $3, 'Inventory Read Warehouse') RETURNING id",
      [organizationId, branchId, "read-" + suffix],
    );
    warehouseId = warehouse.rows[0]!.id;
    const otherBranch = await admin.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Other Inventory Branch', $2) RETURNING id",
      [organizationId, "inventory-read-other-" + suffix],
    );
    otherBranchId = otherBranch.rows[0]!.id;
    const otherWarehouse = await admin.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, $3, 'Other Branch Warehouse') RETURNING id",
      [organizationId, otherBranchId, "other-" + suffix],
    );
    otherWarehouseId = otherWarehouse.rows[0]!.id;

    const first = await admin.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, unit, cost_usd, price_usd, minimum_stock) VALUES ($1, $2, 'Read Product A', 'unidad', 4.2500, 10.0000, 2.000) RETURNING id",
      [organizationId, "READ-A-" + suffix],
    );
    firstProductId = first.rows[0]!.id;
    const second = await admin.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, unit, cost_usd, price_usd, minimum_stock) VALUES ($1, $2, 'Read Product B', 'kg', 1.0000, 2.0000, 0.500) RETURNING id",
      [organizationId, "READ-B-" + suffix],
    );
    secondProductId = second.rows[0]!.id;
    const inactive = await admin.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, unit, cost_usd, price_usd, minimum_stock, is_active) VALUES ($1, $2, 'Inactive Stocked Product', 'unidad', 2.0000, 5.0000, 0.000, false) RETURNING id",
      [organizationId, "READ-INACTIVE-" + suffix],
    );
    inactiveProductId = inactive.rows[0]!.id;

    // Seed balances through confirmed count documents when migration 0019
    // makes the ledger the sole writer. Keep legacy paired-write fixtures only
    // for the pre-projection migration sequence.
    await admin.query("BEGIN");
    const projection = await admin.query<{ enabled: boolean }>(
      "SELECT pg_catalog.to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL AS enabled",
    );
    ledgerProjectionEnabled = projection.rows[0]?.enabled === true;
    if (!ledgerProjectionEnabled) {
      await admin.query(
        "INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity) VALUES ($1, $2, $3, $4, 12.000)",
        [organizationId, branchId, warehouseId, firstProductId],
      );
      await admin.query(
        "INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, actor_user_id, created_at) VALUES ($1, $2, $3, $4, 'purchase_receipt', 12.000, 4.2500, 'Seed receipt', $5, now() - interval '1 minute')",
        [organizationId, branchId, warehouseId, firstProductId, ownerId],
      );
      await admin.query(
        "UPDATE inventory_balances SET reserved_quantity = 2.000 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
        [organizationId, warehouseId, firstProductId],
      );
      await admin.query(
        "UPDATE inventory_balances SET on_hand_quantity = 15.000 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
        [organizationId, warehouseId, firstProductId],
      );
      await admin.query(
        "INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, actor_user_id, created_at) VALUES ($1, $2, $3, $4, 'purchase_receipt', 3.000, 4.2500, 'Second seed receipt', $5, now())",
        [organizationId, branchId, warehouseId, firstProductId, ownerId],
      );
      await admin.query(
        "INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity) VALUES ($1, $2, $3, $4, 1.000)",
        [organizationId, branchId, warehouseId, inactiveProductId],
      );
      await admin.query(
        "INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, actor_user_id) VALUES ($1, $2, $3, $4, 'purchase_receipt', 1.000, 2.0000, 'Inactive product stock', $5)",
        [organizationId, branchId, warehouseId, inactiveProductId, ownerId],
      );
    } else {
      const seedCountMovement = async (
        productId: string, counted: string, expected: string, cost: string,
        reason: string, createdAt: Date,
      ): Promise<void> => {
        const balance = await admin.query<{ balance_version: string }>(
          "SELECT balance_version::text FROM inventory_balances WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3",
          [organizationId, warehouseId, productId],
        );
        const expectedVersion = balance.rows[0]?.balance_version ?? "0";
        const count = await admin.query<{ id: string }>(
          `INSERT INTO inventory_counts
            (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
           VALUES ($1,$2,$3,'physical',$4,$5) RETURNING id`,
          [organizationId, branchId, warehouseId, reason, ownerId],
        );
        await admin.query(
          `INSERT INTO inventory_count_lines
            (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
             expected_on_hand_quantity,expected_balance_version)
           VALUES ($1,$2,$3,$4,$5,$6::numeric,$7::numeric,$8::numeric,$9::bigint)`,
          [organizationId, branchId, warehouseId, count.rows[0]!.id, productId, counted, cost, expected, expectedVersion],
        );
        await admin.query(
          "UPDATE inventory_counts SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1",
          [count.rows[0]!.id, ownerId],
        );
        await admin.query(
          `INSERT INTO warehouse_inventory_movements
            (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,
             unit_cost_usd,reason,count_id,actor_user_id,created_at)
           VALUES ($1,$2,$3,$4,'count_adjustment',$5::numeric,$6::numeric,$7,$8,$9,$10)`,
          [organizationId, branchId, warehouseId, productId,
           (Number(counted) - Number(expected)).toFixed(3), cost, reason, count.rows[0]!.id, ownerId, createdAt],
        );
      };
      await seedCountMovement(firstProductId, "12.000", "0.000", "4.2500", "Seed receipt", new Date(Date.now() - 60_000));
      // Reservation APIs are not implemented; seed the reserved fixture only
      // in this disposable admin test database, bypassing the direct-write guard.
      await admin.query("ALTER TABLE inventory_balances DISABLE TRIGGER inventory_balances_direct_write_guard");
      await admin.query(
        "UPDATE inventory_balances SET reserved_quantity=2.000 WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3",
        [organizationId, warehouseId, firstProductId],
      );
      await admin.query("ALTER TABLE inventory_balances ENABLE TRIGGER inventory_balances_direct_write_guard");
      await seedCountMovement(firstProductId, "15.000", "12.000", "4.2500", "Second seed receipt", new Date());
      await seedCountMovement(inactiveProductId, "1.000", "0.000", "2.0000", "Inactive product stock", new Date());
    }
    await admin.query("COMMIT");

    const foreignOrg = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Foreign Inventory Read " + suffix, "foreign-inventory-read-" + suffix],
    );
    foreignOrganizationId = foreignOrg.rows[0]!.id;
    const foreignBranch = await admin.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Foreign Branch', $2) RETURNING id",
      [foreignOrganizationId, "foreign-inventory-read-" + suffix],
    );
    foreignBranchId = foreignBranch.rows[0]!.id;
    const foreignWarehouse = await admin.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, 'foreign-read', 'Foreign Warehouse') RETURNING id",
      [foreignOrganizationId, foreignBranchId],
    );
    foreignWarehouseId = foreignWarehouse.rows[0]!.id;
  });

  afterAll(async () => {
    if (admin) await admin.end();
  });

  it("returns tenant-scoped balances, available quantity and costs only to authorized cost readers", async () => {
    const response = await get(root() + "/inventory");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const body = await response.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(body.items).toHaveLength(3);
    const stocked = body.items.find((item) => item.product_id === firstProductId)!;
    const empty = body.items.find((item) => item.product_id === secondProductId)!;
    expect(stocked).toMatchObject({
      on_hand_quantity: "15.000",
      reserved_quantity: "2.000",
      available_quantity: "13.000",
      cost_usd: "4.2500",
    });
    expect(empty).toMatchObject({ on_hand_quantity: "0.000", reserved_quantity: "0.000", balance_version: null });
    const inactive = body.items.find((item) => item.product_id === inactiveProductId)!;
    expect(inactive).toMatchObject({ is_active: false, on_hand_quantity: "1.000", available_quantity: "1.000" });

    const cashierResponse = await get(root() + "/inventory", cashierToken);
    expect(cashierResponse.status).toBe(200);
    const cashierBody = await cashierResponse.json() as { items: Array<Record<string, unknown>> };
    expect(cashierBody.items).toHaveLength(3);
    expect(cashierBody.items.every((item) => !("cost_usd" in item))).toBe(true);

    // Exercise the complete cashier read path with the same branch membership.
    const branchList = await get(`/api/orgs/${organizationId}/branches`, cashierToken);
    expect(branchList.status).toBe(200);
    const branchBody = await branchList.json() as { branches: Array<{ id: string }> };
    expect(branchBody.branches.map((item) => item.id)).toContain(branchId);

    const warehouseList = await get(`/api/orgs/${organizationId}/branches/${branchId}/warehouses`, cashierToken);
    expect(warehouseList.status).toBe(200);
    const warehouseBody = await warehouseList.json() as { warehouses: Array<{ id: string }> };
    expect(warehouseBody.warehouses.map((item) => item.id)).toContain(warehouseId);

    const unassignedWarehouseList = await get(`/api/orgs/${organizationId}/branches/${otherBranchId}/warehouses`, cashierToken);
    expect(unassignedWarehouseList.status).toBe(403);

    // A syntactically valid, trusted-origin count request must be rejected
    // because cashier has inventory.read, not inventory.adjust.
    const countDenied = await app.fetch(new Request(
      `https://api.example/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/counts/physical`,
      {
        method: "POST",
        headers: {
          Cookie: "microapp_session=" + cashierToken,
          Origin: "https://frontend.example",
          "Content-Type": "application/json",
          "Idempotency-Key": "cashier-denied-" + crypto.randomUUID(),
        },
        body: JSON.stringify({
          reason: "Authorization regression test",
          lines: [{ product_id: firstProductId, counted_quantity: "15.000" }],
        }),
      },
    ), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(countDenied.status).toBe(403);
  });

  it("paginates inventory balances with a stable product cursor", async () => {
    const first = await get(root() + "/inventory?limit=1");
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { items: Array<{ product_id: string }>; nextCursor: string | null };
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.nextCursor).toBe(firstBody.items[0]!.product_id);
    expect(firstBody.nextCursor).not.toBeNull();

    const second = await get(root() + "/inventory?limit=1&cursor=" + firstBody.nextCursor);
    expect(second.status).toBe(200);
    const secondBody = await second.json() as { items: Array<{ product_id: string }>; nextCursor: string | null };
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]!.product_id).not.toBe(firstBody.items[0]!.product_id);
    expect(secondBody.nextCursor).not.toBeNull();

    const third = await get(root() + "/inventory?limit=1&cursor=" + secondBody.nextCursor);
    expect(third.status).toBe(200);
    const thirdBody = await third.json() as { items: Array<{ product_id: string; is_active?: boolean }>; nextCursor: string | null };
    expect(thirdBody.items).toHaveLength(1);
    expect(thirdBody.nextCursor).toBeNull();

    const allItems = [...firstBody.items, ...secondBody.items, ...thirdBody.items];
    expect(allItems.map((item) => item.product_id)).toEqual(
      [firstProductId, secondProductId, inactiveProductId].sort(),
    );
    expect(allItems.find((item) => item.product_id === inactiveProductId)?.is_active).toBe(false);
  });

  it("returns append-only movement history with stable cursors and cost visibility", async () => {
    const first = await get(root() + "/inventory/movements?product_id=" + firstProductId + "&limit=1");
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.items[0]).toMatchObject({
      product_id: firstProductId,
      movement_type: ledgerProjectionEnabled ? "count_adjustment" : "purchase_receipt",
      quantity_delta: "3.000",
      unit_cost_usd: "4.2500",
    });
    expect(firstBody.nextCursor).not.toBeNull();

    const second = await get(root() + "/inventory/movements?product_id=" + firstProductId + "&limit=1&cursor=" + firstBody.nextCursor);
    expect(second.status).toBe(200);
    const secondBody = await second.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]).toMatchObject({ movement_type: ledgerProjectionEnabled ? "count_adjustment" : "purchase_receipt", quantity_delta: "12.000" });
    expect(secondBody.nextCursor).toBeNull();

    const cashierResponse = await get(root() + "/inventory/movements", cashierToken);
    expect(cashierResponse.status).toBe(200);
    const cashierBody = await cashierResponse.json() as { items: Array<Record<string, unknown>> };
    expect(cashierBody.items.length).toBeGreaterThan(0);
    expect(cashierBody.items.every((item) => !("unit_cost_usd" in item))).toBe(true);

    // Cashier may read movements and warehouses, but cannot manage counts.
    // Branch-scoped warehouse visibility was asserted above; keep count management denied.
    expect((await get(root() + "/counts", cashierToken)).status).toBe(403);

    // The same role remains confined to its active branch membership and tenant.
    const unassignedBranchMovements = await get(
      `/api/orgs/${organizationId}/branches/${otherBranchId}/warehouses/${otherWarehouseId}/inventory/movements`,
      cashierToken,
    );
    expect(unassignedBranchMovements.status).toBe(403);
    const crossTenantMovements = await get(
      `/api/orgs/${foreignOrganizationId}/branches/${foreignBranchId}/warehouses/${foreignWarehouseId}/inventory/movements`,
      cashierToken,
    );
    expect(crossTenantMovements.status).toBe(401);
  });

  it("rejects invalid selectors, cursors and pagination values before returning inventory", async () => {
    expect((await get("/api/orgs/not-a-uuid/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory")).status).toBe(400);
    expect((await get(root() + "/inventory?limit=0")).status).toBe(400);
    expect((await get(root() + "/inventory?cursor=not-a-uuid")).status).toBe(400);
    expect((await get(root() + "/inventory/movements?product_id=not-a-uuid")).status).toBe(400);
    expect((await get(root() + "/inventory/movements?cursor=not-a-uuid")).status).toBe(400);
  });

  it("denies cross-tenant access and inactive warehouses", async () => {
    const foreign = await get(`/api/orgs/${foreignOrganizationId}/branches/${foreignBranchId}/warehouses/${foreignWarehouseId}/inventory`);
    expect(foreign.status).toBe(401);

    const crossBranch = await get(`/api/orgs/${organizationId}/branches/${branchId}/warehouses/${otherWarehouseId}/inventory`);
    expect(crossBranch.status).toBe(404);

    await admin.query("UPDATE warehouses SET is_active = false WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
    const inactive = await get(root() + "/inventory");
    expect(inactive.status).toBe(404);
    await admin.query("UPDATE warehouses SET is_active = true WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
  });
});
