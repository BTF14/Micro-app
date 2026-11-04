import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client {
    constructor(connectionString: string) { super({ connectionString }); }
  } };
});

const app = (await import("./index")).default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);

if (isCi && !databaseUrl) throw new Error("DATABASE_URL is required in CI; refusing to skip inventory count integration tests.");

describe.skipIf(!databaseUrl)("warehouse inventory count transactions against PostgreSQL", () => {
  let client: Client;
  let organizationId = "";
  let userId = "";
  let branchId = "";
  let warehouseId = "";
  let productId = "";
  let token = "";

  async function request(path: string, body?: unknown): Promise<Response> {
    return app.fetch(new Request("https://api.example" + path, {
      method: "POST",
      headers: {
        Cookie: "microapp_session=" + token,
        Origin: "https://frontend.example",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  const root = () => `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}`;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const org = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Inventory Count " + suffix, "inventory-count-" + suffix],
    );
    organizationId = org.rows[0]!.id;
    const user = await client.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      ["inventory-count-" + suffix + "@example.test", "Inventory Count Owner"],
    );
    userId = user.rows[0]!.id;
    await client.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationId, userId],
    );
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("inventory-count-session-" + suffix));
    token = "inventory-count-session-" + suffix;
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [userId, tokenHash],
    );
    const branch = await client.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Inventory Branch', $2) RETURNING id",
      [organizationId, "inventory-" + suffix],
    );
    branchId = branch.rows[0]!.id;
    const warehouse = await client.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, 'main', 'Main Warehouse') RETURNING id",
      [organizationId, branchId],
    );
    warehouseId = warehouse.rows[0]!.id;
    const product = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'INV-COUNT', 'Inventory Count Product', 1) RETURNING id",
      [organizationId],
    );
    productId = product.rows[0]!.id;
  });

  afterAll(async () => {
    if (!client) return;
    if (organizationId) {
      await client.query("DELETE FROM audit_logs WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM warehouse_inventory_movements WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM inventory_balances WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM inventory_count_lines WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM inventory_counts WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM warehouses WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM products WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM branches WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM organization_members WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM organizations WHERE id = $1", [organizationId]);
      await client.query("DELETE FROM app_users WHERE id = $1", [userId]);
    }
    await client.end();
  });

  it("posts opening and physical counts atomically and makes confirmation replay-safe", async () => {
    const opening = await request(root() + "/counts/opening", {
      reason: "Initial documented physical count",
      lines: [{ product_id: productId, counted_quantity: "10.500", unit_cost_usd: "2.2500" }],
    });
    expect(opening.status, await opening.clone().text()).toBe(201);
    const openingBody = await opening.json() as { id: string };
    const openingConfirm = await request(root() + "/counts/" + openingBody.id + "/confirm");
    expect(openingConfirm.status).toBe(200);
    expect(await openingConfirm.json()).toMatchObject({ status: "confirmed", count_type: "opening" });

    const replay = await request(root() + "/counts/" + openingBody.id + "/confirm");
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ status: "confirmed", replayed: true });

    const openingState = await client.query<{ balance: string; movements: string }>(
      `SELECT b.on_hand_quantity::text AS balance,
        (SELECT count(*)::text FROM warehouse_inventory_movements m
         WHERE m.organization_id = $1 AND m.count_id = $2) AS movements
       FROM inventory_balances b
       WHERE b.organization_id = $1 AND b.warehouse_id = $3 AND b.product_id = $4`,
      [organizationId, openingBody.id, warehouseId, productId],
    );
    expect(openingState.rows[0]).toEqual({ balance: "10.500", movements: "1" });

    const physical = await request(root() + "/counts/physical", {
      reason: "Scheduled physical count",
      lines: [{ product_id: productId, counted_quantity: "8.250" }],
    });
    expect(physical.status).toBe(201);
    const physicalBody = await physical.json() as { id: string };
    const physicalConfirm = await request(root() + "/counts/" + physicalBody.id + "/confirm");
    expect(physicalConfirm.status).toBe(200);

    const finalState = await client.query<{ balance: string; delta: string; action_count: string }>(
      `SELECT b.on_hand_quantity::text AS balance,
        (SELECT quantity_delta::text FROM warehouse_inventory_movements
         WHERE organization_id = $1 AND count_id = $2) AS delta,
        (SELECT count(*)::text FROM audit_logs
         WHERE organization_id = $1 AND entity_id = $2 AND action = 'inventory.count.confirmed') AS action_count
       FROM inventory_balances b
       WHERE b.organization_id = $1 AND b.warehouse_id = $3 AND b.product_id = $4`,
      [organizationId, physicalBody.id, warehouseId, productId],
    );
    expect(finalState.rows[0]).toEqual({ balance: "8.250", delta: "-2.250", action_count: "1" });
  });

  it("does not let a physical count reduce stock below reserved quantity", async () => {
    await client.query(
      "UPDATE inventory_balances SET reserved_quantity = 8.000 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
      [organizationId, warehouseId, productId],
    );
    const draft = await request(root() + "/counts/physical", {
      reason: "Count below reserved quantity must be rejected",
      lines: [{ product_id: productId, counted_quantity: "7.500" }],
    });
    expect(draft.status).toBe(201);
    const draftBody = await draft.json() as { id: string };
    const confirmation = await request(root() + "/counts/" + draftBody.id + "/confirm");
    expect(confirmation.status).toBe(409);
    expect(await confirmation.json()).toMatchObject({ error: "COUNT_BELOW_RESERVED_STOCK" });
    const state = await client.query<{ quantity: string; status: string }>(
      `SELECT b.on_hand_quantity::text AS quantity, c.status
       FROM inventory_balances b
       JOIN inventory_counts c ON c.organization_id = b.organization_id
       WHERE b.organization_id = $1 AND b.warehouse_id = $2 AND b.product_id = $3 AND c.id = $4`,
      [organizationId, warehouseId, productId, draftBody.id],
    );
    expect(state.rows[0]).toEqual({ quantity: "8.250", status: "draft" });
  });

  it("rejects a cashier role before creating an inventory count", async () => {
    const changed = await client.query(
      "UPDATE organization_members SET role = 'cashier' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, userId],
    );
    expect(changed.rowCount).toBe(1);
    const response = await request(root() + "/counts/physical", {
      reason: "Should be denied",
      lines: [{ product_id: productId, counted_quantity: "1" }],
    });
    expect(response.status).toBe(403);
  });
});
