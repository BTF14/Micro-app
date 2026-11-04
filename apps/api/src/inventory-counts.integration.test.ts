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
      await client.query("BEGIN");
      try {
        // The disposable CI database owns this test schema. Disable only user
        // triggers during fixture teardown; production ledger immutability is
        // exercised by the migration assertions and remains enabled at runtime.
        await client.query("ALTER TABLE warehouse_inventory_movements DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_counts DISABLE TRIGGER USER");
        await client.query("DELETE FROM audit_logs WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM warehouse_inventory_movements WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_balances WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_count_lines WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_counts WHERE organization_id = $1", [organizationId]);
        await client.query("ALTER TABLE inventory_counts ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines ENABLE TRIGGER USER");
        await client.query("ALTER TABLE warehouse_inventory_movements ENABLE TRIGGER USER");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      await client.query("COMMIT");
      await client.query("DELETE FROM warehouses WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM products WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM branch_memberships WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM branches WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM organization_members WHERE organization_id = $1", [organizationId]);
      await client.query("DELETE FROM organizations WHERE id = $1", [organizationId]);
      await client.query("DELETE FROM app_users WHERE id = $1", [userId]);
    }
    await client.end();
  });

  it("posts opening and physical counts atomically and makes confirmation replay-safe", async () => {
    const omittedProduct = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'INV-OMITTED', 'Omitted Opening Product', 1) RETURNING id",
      [organizationId],
    );
    await client.query(
      `INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
       VALUES ($1, $2, $3, $4, 1)`,
      [organizationId, branchId, warehouseId, omittedProduct.rows[0]!.id],
    );
    const partialOpening = await request(root() + "/counts/opening", {
      reason: "Opening must not ignore balances for omitted products",
      lines: [{ product_id: productId, counted_quantity: "10.500" }],
    });
    expect(partialOpening.status).toBe(201);
    const partialOpeningBody = await partialOpening.json() as { id: string };
    const partialConfirmation = await request(root() + "/counts/" + partialOpeningBody.id + "/confirm");
    expect(partialConfirmation.status).toBe(409);
    expect(await partialConfirmation.json()).toMatchObject({ error: "OPENING_ALREADY_EXISTS" });
    expect((await client.query(
      "SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $2",
      [organizationId, partialOpeningBody.id],
    )).rows[0]).toEqual({ status: "draft" });
    await client.query(
      "DELETE FROM inventory_count_lines WHERE organization_id = $1 AND count_id = $2",
      [organizationId, partialOpeningBody.id],
    );
    await client.query(
      "DELETE FROM inventory_counts WHERE organization_id = $1 AND id = $2",
      [organizationId, partialOpeningBody.id],
    );
    await client.query(
      "DELETE FROM inventory_balances WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
      [organizationId, warehouseId, omittedProduct.rows[0]!.id],
    );
    await client.query("DELETE FROM products WHERE organization_id = $1 AND id = $2", [organizationId, omittedProduct.rows[0]!.id]);

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
         WHERE organization_id = $1 AND entity_id = $2::text AND action = 'inventory.count.confirmed') AS action_count
       FROM inventory_balances b
       WHERE b.organization_id = $1 AND b.warehouse_id = $3 AND b.product_id = $4`,
      [organizationId, physicalBody.id, warehouseId, productId],
    );
    expect(finalState.rows[0]).toEqual({ balance: "8.250", delta: "-2.250", action_count: "1" });

    const warehouseList = await app.fetch(new Request(
      "https://api.example/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses",
      { headers: { Cookie: "microapp_session=" + token } },
    ), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(warehouseList.status).toBe(200);
    expect(await warehouseList.json()).toMatchObject({ warehouses: [{ id: warehouseId, code: "main" }] });

    const countList = await app.fetch(new Request(
      "https://api.example" + root() + "/counts",
      { headers: { Cookie: "microapp_session=" + token } },
    ), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(countList.status).toBe(200);
    expect(await countList.json()).toMatchObject({
      counts: [
        { id: physicalBody.id, status: "confirmed", line_count: "1" },
        { id: openingBody.id, status: "confirmed", line_count: "1" },
      ],
    });
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

  it("serializes concurrent confirmation and records exactly one ledger movement and audit event", async () => {
    const draft = await request(root() + "/counts/physical", {
      reason: "Concurrent confirmation must be idempotent",
      lines: [{ product_id: productId, counted_quantity: "8.000" }],
    });
    expect(draft.status).toBe(201);
    const body = await draft.json() as { id: string };
    const [first, second] = await Promise.all([
      request(root() + "/counts/" + body.id + "/confirm"),
      request(root() + "/counts/" + body.id + "/confirm"),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 200]);
    const responses = await Promise.all([first.json(), second.json()]) as Array<{ status: string; replayed?: boolean }>;
    expect(responses.filter((response) => response.replayed === true)).toHaveLength(1);
    expect(responses.filter((response) => response.status === "confirmed" && !response.replayed)).toHaveLength(1);
    const persisted = await client.query<{ movements: string; audits: string; status: string }>(
      `SELECT c.status,
        (SELECT count(*)::text FROM warehouse_inventory_movements m
         WHERE m.organization_id = $1 AND m.count_id = $2) AS movements,
        (SELECT count(*)::text FROM audit_logs a
         WHERE a.organization_id = $1 AND a.entity_id = $2::text
           AND a.action = 'inventory.count.confirmed') AS audits
       FROM inventory_counts c WHERE c.organization_id = $1 AND c.id = $2`,
      [organizationId, body.id],
    );
    expect(persisted.rows[0]).toEqual({ status: "confirmed", movements: "1", audits: "1" });
  });

  it("records an audited zero-delta physical count without creating a ledger movement", async () => {
    const draft = await request(root() + "/counts/physical", {
      reason: "Verify counted stock with no difference",
      lines: [{ product_id: productId, counted_quantity: "8.000" }],
    });
    expect(draft.status).toBe(201);
    const body = await draft.json() as { id: string };
    const confirmation = await request(root() + "/counts/" + body.id + "/confirm");
    expect(confirmation.status).toBe(200);
    const persisted = await client.query<{ movements: string; audits: string; balance: string }>(
      `SELECT
        (SELECT count(*)::text FROM warehouse_inventory_movements m
         WHERE m.organization_id = $1 AND m.count_id = $2) AS movements,
        (SELECT count(*)::text FROM audit_logs a
         WHERE a.organization_id = $1 AND a.entity_id = $2::text
           AND a.action = 'inventory.count.confirmed') AS audits,
        (SELECT on_hand_quantity::text FROM inventory_balances b
         WHERE b.organization_id = $1 AND b.warehouse_id = $3 AND b.product_id = $4) AS balance`,
      [organizationId, body.id, warehouseId, productId],
    );
    expect(persisted.rows[0]).toEqual({ movements: "0", audits: "1", balance: "8.000" });
  });

  it("rolls back count confirmation, balance and ledger when audit persistence fails", async () => {
    await client.query(
      "UPDATE inventory_balances SET reserved_quantity = 0 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
      [organizationId, warehouseId, productId],
    );
    const draft = await request(root() + "/counts/physical", {
      reason: "Force audit failure to verify atomic rollback",
      lines: [{ product_id: productId, counted_quantity: "7.000" }],
    });
    expect(draft.status).toBe(201);
    const body = await draft.json() as { id: string };
    await client.query(`CREATE FUNCTION test_fail_inventory_count_audit() RETURNS trigger
      LANGUAGE plpgsql AS $test_fail_inventory_count_audit$
      BEGIN
        IF NEW.action = 'inventory.count.confirmed' THEN
          RAISE EXCEPTION 'forced audit persistence failure';
        END IF;
        RETURN NEW;
      END;
      $test_fail_inventory_count_audit$`);
    await client.query(`CREATE TRIGGER test_fail_inventory_count_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_fail_inventory_count_audit()`);
    let confirmation: Response;
    try {
      confirmation = await request(root() + "/counts/" + body.id + "/confirm");
    } finally {
      await client.query("DROP TRIGGER IF EXISTS test_fail_inventory_count_audit ON audit_logs");
      await client.query("DROP FUNCTION IF EXISTS test_fail_inventory_count_audit()");
    }
    expect(confirmation!.status).toBe(500);
    const persisted = await client.query<{ count_status: string; balance: string; movements: string; audits: string }>(
      `SELECT c.status AS count_status,
        (SELECT on_hand_quantity::text FROM inventory_balances b
         WHERE b.organization_id = $1 AND b.warehouse_id = $3 AND b.product_id = $4) AS balance,
        (SELECT count(*)::text FROM warehouse_inventory_movements m
         WHERE m.organization_id = $1 AND m.count_id = $2) AS movements,
        (SELECT count(*)::text FROM audit_logs a
         WHERE a.organization_id = $1 AND a.entity_id = $2::text
           AND a.action = 'inventory.count.confirmed') AS audits
       FROM inventory_counts c WHERE c.organization_id = $1 AND c.id = $2`,
      [organizationId, body.id, warehouseId, productId],
    );
    expect(persisted.rows[0]).toEqual({ count_status: "draft", balance: "8.000", movements: "0", audits: "0" });
  });

  it("requires an active branch assignment for inventory members and revalidates revocation", async () => {
    await client.query(
      "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, userId],
    );
    const unassigned = await request(root() + "/counts/physical", {
      reason: "Inventory member without branch assignment must be denied",
      lines: [{ product_id: productId, counted_quantity: "8.000" }],
    });
    expect(unassigned.status).toBe(403);
    expect(await unassigned.json()).toMatchObject({ error: "BRANCH_FORBIDDEN" });

    await client.query(
      "INSERT INTO branch_memberships (organization_id, branch_id, user_id, is_active) VALUES ($1, $2, $3, true)",
      [organizationId, branchId, userId],
    );
    const assigned = await request(root() + "/counts/physical", {
      reason: "Assigned inventory member may create a draft",
      lines: [{ product_id: productId, counted_quantity: "8.000" }],
    });
    expect(assigned.status).toBe(201);
    const assignedBody = await assigned.json() as { id: string };

    await client.query(
      "UPDATE branch_memberships SET is_active = false WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3",
      [organizationId, branchId, userId],
    );
    const revoked = await request(root() + "/counts/" + assignedBody.id + "/confirm");
    expect(revoked.status).toBe(403);
    expect(await revoked.json()).toMatchObject({ error: "BRANCH_FORBIDDEN" });
    await client.query(
      "UPDATE organization_members SET role = 'owner' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, userId],
    );
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
