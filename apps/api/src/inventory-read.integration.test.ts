import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
  let ownerToken = "";
  let cashierToken = "";
  let firstProductId = "";
  let secondProductId = "";
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
    const ownerId = owner.rows[0]!.id;
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

    // Every non-zero balance mutation is paired with one immutable ledger event.
    await admin.query("BEGIN");
    await admin.query(
      "INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity) VALUES ($1, $2, $3, $4, 12.000)",
      [organizationId, branchId, warehouseId, firstProductId],
    );
    await admin.query(
      "INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, actor_user_id) VALUES ($1, $2, $3, $4, 'purchase_receipt', 12.000, 4.2500, 'Seed receipt', $5)",
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
      "INSERT INTO warehouse_inventory_movements (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, unit_cost_usd, reason, actor_user_id) VALUES ($1, $2, $3, $4, 'purchase_receipt', 3.000, 4.2500, 'Second seed receipt', $5)",
      [organizationId, branchId, warehouseId, firstProductId, ownerId],
    );
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
    expect(body.items).toHaveLength(2);
    const stocked = body.items.find((item) => item.product_id === firstProductId)!;
    const empty = body.items.find((item) => item.product_id === secondProductId)!;
    expect(stocked).toMatchObject({
      on_hand_quantity: "15.000",
      reserved_quantity: "2.000",
      available_quantity: "13.000",
      cost_usd: "4.2500",
    });
    expect(empty).toMatchObject({ on_hand_quantity: "0.000", reserved_quantity: "0.000", balance_version: null });

    const cashierResponse = await get(root() + "/inventory", cashierToken);
    expect(cashierResponse.status).toBe(200);
    const cashierBody = await cashierResponse.json() as { items: Array<Record<string, unknown>> };
    expect(cashierBody.items).toHaveLength(2);
    expect(cashierBody.items.every((item) => !("cost_usd" in item))).toBe(true);
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
    expect(secondBody.nextCursor).toBeNull();
  });

  it("returns append-only movement history with stable cursors and cost visibility", async () => {
    const first = await get(root() + "/inventory/movements?limit=1");
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.items[0]).toMatchObject({
      product_id: firstProductId,
      movement_type: "purchase_receipt",
      quantity_delta: "3.000",
      unit_cost_usd: "4.2500",
    });
    expect(firstBody.nextCursor).not.toBeNull();

    const second = await get(root() + "/inventory/movements?limit=1&cursor=" + firstBody.nextCursor);
    expect(second.status).toBe(200);
    const secondBody = await second.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]).toMatchObject({ quantity_delta: "12.000" });
    expect(secondBody.nextCursor).toBeNull();

    const cashierResponse = await get(root() + "/inventory/movements", cashierToken);
    expect(cashierResponse.status).toBe(403);
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

    await admin.query("UPDATE warehouses SET is_active = false WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
    const inactive = await get(root() + "/inventory");
    expect(inactive.status).toBe(404);
    await admin.query("UPDATE warehouses SET is_active = true WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
  });
});
