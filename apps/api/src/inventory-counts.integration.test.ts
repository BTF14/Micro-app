import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { lockInventoryWarehouses } from "./inventory-locks";
import type { DatabaseClient } from "./database";

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
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;
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
  let unassignedBranchId = "";
  let unassignedWarehouseId = "";
  let foreignOrganizationId = "";
  let foreignBranchId = "";
  let foreignWarehouseId = "";
  let foreignProductId = "";
  let token = "";

  async function request(
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
    includeDefaultIdempotencyKey = true,
  ): Promise<Response> {
    return app.fetch(new Request("https://api.example" + path, {
      method: "POST",
      headers: {
        Cookie: "microapp_session=" + token,
        Origin: "https://frontend.example",
        "Content-Type": "application/json",
        ...(includeDefaultIdempotencyKey && /\\/counts\\/(opening|physical)$/.test(path)
          ? { "Idempotency-Key": "test-" + crypto.randomUUID() }
          : {}),
        ...extraHeaders,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  async function get(path: string): Promise<Response> {
    return app.fetch(new Request("https://api.example" + path, {
      headers: { Cookie: "microapp_session=" + token },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  const root = () => `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}`;

  async function waitForLockWait(pid: number): Promise<void> {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const state = await client.query<{ wait_event_type: string | null }>(
        "SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1",
        [pid],
      );
      if (state.rows[0]?.wait_event_type === "Lock") return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for warehouse row-lock contention.");
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrlAdmin });
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

    const unassignedBranch = await client.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Unassigned Inventory Branch', $2) RETURNING id",
      [organizationId, "inventory-unassigned-" + suffix],
    );
    unassignedBranchId = unassignedBranch.rows[0]!.id;
    const unassignedWarehouse = await client.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, 'other', 'Unassigned Branch Warehouse') RETURNING id",
      [organizationId, unassignedBranchId],
    );
    unassignedWarehouseId = unassignedWarehouse.rows[0]!.id;

    const foreignOrg = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Foreign Inventory " + suffix, "foreign-inventory-" + suffix],
    );
    foreignOrganizationId = foreignOrg.rows[0]!.id;
    const foreignBranch = await client.query<{ id: string }>(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Foreign Inventory Branch', $2) RETURNING id",
      [foreignOrganizationId, "foreign-inventory-" + suffix],
    );
    foreignBranchId = foreignBranch.rows[0]!.id;
    const foreignWarehouse = await client.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, 'foreign', 'Foreign Warehouse') RETURNING id",
      [foreignOrganizationId, foreignBranchId],
    );
    foreignWarehouseId = foreignWarehouse.rows[0]!.id;
    const foreignProduct = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'FOREIGN-INV', 'Foreign Inventory Product', 1) RETURNING id",
      [foreignOrganizationId],
    );
    foreignProductId = foreignProduct.rows[0]!.id;
  });

  beforeEach(async () => {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const warehouse = await client.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, $3, 'Inventory Count Test Warehouse') RETURNING id",
      [organizationId, branchId, "inv-" + suffix],
    );
    warehouseId = warehouse.rows[0]!.id;
    const product = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, $2, 'Inventory Count Test Product', 1) RETURNING id",
      [organizationId, "INV-COUNT-" + suffix],
    );
    productId = product.rows[0]!.id;
  });

  async function seedInventoryBalanceFor(targetProductId: string, onHand: string, reserved = "0.000"): Promise<void> {
    await client.query("BEGIN");
    try {
      await client.query(
        "INSERT INTO inventory_balances (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity, reserved_quantity) VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric)",
        [organizationId, branchId, warehouseId, targetProductId, onHand, reserved],
      );
      if (Number(onHand) !== 0) {
        await client.query(
          `INSERT INTO warehouse_inventory_movements
            (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
           VALUES ($1, $2, $3, $4, 'purchase_receipt', $5::numeric, 'Integration test fixture seed', $6)`,
          [organizationId, branchId, warehouseId, targetProductId, onHand, userId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  async function seedInventoryBalance(onHand: string, reserved = "0.000"): Promise<void> {
    await seedInventoryBalanceFor(productId, onHand, reserved);
  }

  afterAll(async () => {
    if (!client) return;
    if (organizationId) {
      await client.query("BEGIN");
      try {
        // The disposable CI database owns this test schema. Disable only user
        // triggers during fixture teardown; production ledger immutability is
        // exercised by the migration assertions and remains enabled at runtime.
        await client.query("ALTER TABLE warehouse_inventory_movements DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_balances DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_counts DISABLE TRIGGER USER");
        await client.query("ALTER TABLE audit_logs DISABLE TRIGGER USER");
        await client.query("DELETE FROM audit_logs WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM warehouse_inventory_movements WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_balances WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_count_lines WHERE organization_id = $1", [organizationId]);
        await client.query("DELETE FROM inventory_counts WHERE organization_id = $1", [organizationId]);
        await client.query("ALTER TABLE audit_logs ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_counts ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines ENABLE TRIGGER USER");
        await client.query("ALTER TABLE warehouse_inventory_movements ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_balances ENABLE TRIGGER USER");
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
      if (foreignOrganizationId) {
        await client.query("DELETE FROM inventory_count_lines WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM inventory_counts WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM organization_members WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM warehouses WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM products WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM branches WHERE organization_id = $1", [foreignOrganizationId]);
        await client.query("DELETE FROM organizations WHERE id = $1", [foreignOrganizationId]);
      }
      await client.query("DELETE FROM app_users WHERE id = $1", [userId]);
    }
    await client.end();
  });


  it("replays an idempotent count creation without creating duplicate drafts", async () => {
    await seedInventoryBalance("4.000");
    const key = "count-create-" + crypto.randomUUID();
    const body = { reason: "Retry-safe physical count", lines: [{ product_id: productId, counted_quantity: "5.000" }] };
    const first = await request(root() + "/counts/physical", body, { "Idempotency-Key": key });
    expect(first.status).toBe(201);
    const firstBody = await first.json() as { id: string };
    const replay = await request(root() + "/counts/physical", { reason: body.reason, lines: [{ product_id: productId, counted_quantity: "5" }] }, { "Idempotency-Key": key });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ id: firstBody.id, status: "draft", count_type: "physical", line_count: 1, replayed: true });
    const persisted = await client.query<{ counts: string; lines: string; audits: string }>(
      `SELECT
        (SELECT count(*)::text FROM inventory_counts WHERE organization_id = $1 AND idempotency_key = $2) AS counts,
        (SELECT count(*)::text FROM inventory_count_lines WHERE organization_id = $1 AND count_id = $3) AS lines,
        (SELECT count(*)::text FROM audit_logs WHERE organization_id = $1 AND entity_id = $3::text AND action = 'inventory.count.created') AS audits`,
      [organizationId, key, firstBody.id],
    );
    expect(persisted.rows[0]).toEqual({ counts: "1", lines: "1", audits: "1" });
  });

  it("treats line order as irrelevant when replaying an idempotent count", async () => {
    await seedInventoryBalance("4.000");
    const secondProduct = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, $2, 'Second Inventory Count Product', 1) RETURNING id",
      [organizationId, "INV-COUNT-SECOND-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12)],
    );
    await seedInventoryBalanceFor(secondProduct.rows[0]!.id, "2.000");
    const key = "count-order-" + crypto.randomUUID();
    const firstLines = [
      { product_id: productId, counted_quantity: "5.000" },
      { product_id: secondProduct.rows[0]!.id, counted_quantity: "3.000" },
    ];
    const first = await request(root() + "/counts/physical", { reason: "Line order is not semantically meaningful", lines: firstLines }, { "Idempotency-Key": key });
    expect(first.status).toBe(201);
    const firstBody = await first.json() as { id: string };
    const replay = await request(root() + "/counts/physical", {
      reason: "Line order is not semantically meaningful",
      lines: [...firstLines].reverse(),
    }, { "Idempotency-Key": key });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ id: firstBody.id, status: "draft", replayed: true });
  });

  it("replays the original confirmed status after an idempotent count has been confirmed", async () => {
    await seedInventoryBalance("4.000");
    const key = "count-confirmed-" + crypto.randomUUID();
    const body = { reason: "Confirmed count must remain the idempotent result", lines: [{ product_id: productId, counted_quantity: "5.000" }] };
    const first = await request(root() + "/counts/physical", body, { "Idempotency-Key": key });
    expect(first.status).toBe(201);
    const firstBody = await first.json() as { id: string };
    const confirmation = await request(root() + "/counts/" + firstBody.id + "/confirm");
    expect(confirmation.status).toBe(200);
    expect(await confirmation.json()).toMatchObject({ id: firstBody.id, status: "confirmed" });
    const replay = await request(root() + "/counts/physical", body, { "Idempotency-Key": key });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({
      id: firstBody.id, status: "confirmed", count_type: "physical", line_count: 1, replayed: true,
    });
  });

  it("rejects reuse of an idempotency key with a different canonical payload", async () => {
    const key = "count-create-" + crypto.randomUUID();
    const first = await request(root() + "/counts/physical", { reason: "Original request", lines: [{ product_id: productId, counted_quantity: "5" }] }, { "Idempotency-Key": key });
    expect(first.status).toBe(201);
    const conflict = await request(root() + "/counts/physical", { reason: "Different request", lines: [{ product_id: productId, counted_quantity: "6.000" }] }, { "Idempotency-Key": key });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: "IDEMPOTENCY_KEY_REUSED" });
    const persisted = await client.query<{ counts: string; lines: string }>(
      `SELECT
        (SELECT count(*)::text FROM inventory_counts WHERE organization_id = $1 AND idempotency_key = $2) AS counts,
        (SELECT count(*)::text FROM inventory_count_lines l JOIN inventory_counts c ON c.organization_id = l.organization_id AND c.id = l.count_id
         WHERE c.organization_id = $1 AND c.idempotency_key = $2) AS lines`,
      [organizationId, key],
    );
    expect(persisted.rows[0]).toEqual({ counts: "1", lines: "1" });
  });

  it("serializes concurrent create retries with the same idempotency key", async () => {
    const key = "count-create-" + crypto.randomUUID();
    const body = { reason: "Concurrent retry must create exactly one draft", lines: [{ product_id: productId, counted_quantity: "2.000" }] };
    const [first, second] = await Promise.all([
      request(root() + "/counts/physical", body, { "Idempotency-Key": key }),
      request(root() + "/counts/physical", body, { "Idempotency-Key": key }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    const responses = await Promise.all([first.json(), second.json()]) as Array<{ id: string; replayed?: boolean }>;
    expect(responses[0]!.id).toBe(responses[1]!.id);
    expect(responses.filter((response) => response.replayed === true)).toHaveLength(1);
    const persisted = await client.query<{ counts: string; lines: string; audits: string }>(
      `SELECT
        (SELECT count(*)::text FROM inventory_counts WHERE organization_id = $1 AND idempotency_key = $2) AS counts,
        (SELECT count(*)::text FROM inventory_count_lines l JOIN inventory_counts c ON c.organization_id = l.organization_id AND c.id = l.count_id
         WHERE c.organization_id = $1 AND c.idempotency_key = $2) AS lines,
        (SELECT count(*)::text FROM audit_logs a JOIN inventory_counts c ON c.organization_id = $1 AND c.id::text = a.entity_id
         WHERE c.organization_id = $1 AND c.idempotency_key = $2 AND a.action = 'inventory.count.created') AS audits`,
      [organizationId, key],
    );
    expect(persisted.rows[0]).toEqual({ counts: "1", lines: "1", audits: "1" });
  });

  it("rolls back the idempotency key when count creation audit persistence fails", async () => {
    await seedInventoryBalance("2.000");
    const key = "count-create-" + crypto.randomUUID();
    await client.query(`CREATE FUNCTION test_fail_inventory_count_created_audit() RETURNS trigger
      LANGUAGE plpgsql AS $test_fail_inventory_count_created_audit$
      BEGIN
        IF NEW.action = 'inventory.count.created' THEN
          RAISE EXCEPTION 'forced count creation audit failure';
        END IF;
        RETURN NEW;
      END;
      $test_fail_inventory_count_created_audit$;`);
    await client.query(`CREATE TRIGGER test_fail_inventory_count_created_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_fail_inventory_count_created_audit()`);
    const body = { reason: "Audit rollback must release the idempotency key", lines: [{ product_id: productId, counted_quantity: "3.000" }] };
    let failed: Response | undefined;
    try {
      failed = await request(root() + "/counts/physical", body, { "Idempotency-Key": key });
    } finally {
      await client.query("DROP TRIGGER IF EXISTS test_fail_inventory_count_created_audit ON audit_logs");
      await client.query("DROP FUNCTION IF EXISTS test_fail_inventory_count_created_audit()");
    }
    expect(failed?.status).toBe(500);
    const afterFailure = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM inventory_counts WHERE organization_id = $1 AND idempotency_key = $2",
      [organizationId, key],
    );
    expect(afterFailure.rows[0]).toEqual({ count: "0" });

    const retry = await request(root() + "/counts/physical", body, { "Idempotency-Key": key });
    expect(retry.status).toBe(201);
    const persisted = await client.query<{ counts: string; lines: string; audits: string }>(
      `SELECT
        (SELECT count(*)::text FROM inventory_counts WHERE organization_id = $1 AND idempotency_key = $2) AS counts,
        (SELECT count(*)::text FROM inventory_count_lines l JOIN inventory_counts c ON c.organization_id = l.organization_id AND c.id = l.count_id
         WHERE c.organization_id = $1 AND c.idempotency_key = $2) AS lines,
        (SELECT count(*)::text FROM audit_logs a JOIN inventory_counts c ON c.organization_id = $1 AND c.id::text = a.entity_id
         WHERE c.organization_id = $1 AND c.idempotency_key = $2 AND a.action = 'inventory.count.created') AS audits`,
      [organizationId, key],
    );
    expect(persisted.rows[0]).toEqual({ counts: "1", lines: "1", audits: "1" });
  });



  it("requires an idempotency key before creating a count", async () => {
    const response = await request(
      root() + "/counts/physical",
      { reason: "Missing idempotency key must fail closed", lines: [{ product_id: productId, counted_quantity: "1.000" }] },
      {},
      false,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_IDEMPOTENCY_KEY" });
    const rows = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM inventory_counts WHERE organization_id = $1 AND reason = $2",
      [organizationId, "Missing idempotency key must fail closed"],
    );
    expect(rows.rows[0]).toEqual({ count: "0" });
  });

  it("rejects malformed idempotency keys without creating a count", async () => {
    const response = await request(root() + "/counts/physical", { reason: "Invalid key must fail closed", lines: [{ product_id: productId, counted_quantity: "1.000" }] }, { "Idempotency-Key": "bad key with spaces" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_IDEMPOTENCY_KEY" });
  });
  it("refuses to confirm a draft after its warehouse has been deactivated", async () => {
    const draft = await request(root() + "/counts/physical", {
      reason: "Warehouse lifecycle must be revalidated at confirmation",
      lines: [{ product_id: productId, counted_quantity: "3.000" }],
    });
    expect(draft.status).toBe(201);
    const body = await draft.json() as { id: string };

    await client.query("UPDATE warehouses SET is_active = false WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
    const confirmation = await request(root() + "/counts/" + body.id + "/confirm");
    expect(confirmation.status).toBe(404);
    expect(await confirmation.json()).toMatchObject({ error: "WAREHOUSE_NOT_FOUND" });
    expect((await client.query(
      "SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $2",
      [organizationId, body.id],
    )).rows[0]).toEqual({ status: "draft" });
    await client.query("DELETE FROM inventory_count_lines WHERE organization_id = $1 AND count_id = $2", [organizationId, body.id]);
    await client.query("DELETE FROM inventory_counts WHERE organization_id = $1 AND id = $2", [organizationId, body.id]);
    await client.query("UPDATE warehouses SET is_active = true WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
  });

  it("serializes warehouse deactivation behind an inventory writer and fails closed afterward", async () => {
    const lockClient = new Client({ connectionString: databaseUrl });
    const deactivator = new Client({ connectionString: databaseUrlAdmin });
    await Promise.all([lockClient.connect(), deactivator.connect()]);
    try {
      await lockClient.query("BEGIN");
      await expect(lockInventoryWarehouses(
        lockClient as unknown as DatabaseClient,
        organizationId,
        [{ warehouseId, branchId }],
      )).resolves.toEqual([warehouseId]);

      const pid = (await deactivator.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      const deactivation = deactivator.query(
        "UPDATE warehouses SET is_active = false WHERE organization_id = $1 AND id = $2",
        [organizationId, warehouseId],
      );
      await waitForLockWait(pid);
      await lockClient.query("COMMIT");
      await deactivation;

      await lockClient.query("BEGIN");
      await expect(lockInventoryWarehouses(
        lockClient as unknown as DatabaseClient,
        organizationId,
        [{ warehouseId, branchId }],
      )).resolves.toBeNull();
      await lockClient.query("ROLLBACK");
      await client.query("UPDATE warehouses SET is_active = true WHERE organization_id = $1 AND id = $2", [organizationId, warehouseId]);
    } finally {
      await lockClient.query("ROLLBACK").catch(() => undefined);
      await Promise.all([lockClient.end(), deactivator.end()]);
    }
  });

  it("posts opening and physical counts atomically and makes confirmation replay-safe", async () => {
    const omittedProduct = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'INV-OMITTED', 'Omitted Opening Product', 1) RETURNING id",
      [organizationId],
    );
    await seedInventoryBalanceFor(omittedProduct.rows[0]!.id, "1.000");
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
    await client.query("ALTER TABLE warehouse_inventory_movements DISABLE TRIGGER USER");
    await client.query("ALTER TABLE inventory_balances DISABLE TRIGGER USER");
    try {
      await client.query(
        "DELETE FROM warehouse_inventory_movements WHERE organization_id = $1 AND product_id = $2",
        [organizationId, omittedProduct.rows[0]!.id],
      );
      await client.query(
        "DELETE FROM inventory_balances WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
        [organizationId, warehouseId, omittedProduct.rows[0]!.id],
      );
    } finally {
      await client.query("ALTER TABLE inventory_balances ENABLE TRIGGER USER");
      await client.query("ALTER TABLE warehouse_inventory_movements ENABLE TRIGGER USER");
    }
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
    const warehouseListBody = await warehouseList.json() as { warehouses: Array<{ id: string; code: string }> };
    expect(warehouseListBody.warehouses).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: warehouseId, code: expect.any(String) }),
    ]));

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

  it("rejects an older physical count after a newer count has changed the balance", async () => {
    await seedInventoryBalance("8.250");
    const initial = await client.query<{ version: string }>(
      "SELECT balance_version::text AS version FROM inventory_balances WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
      [organizationId, warehouseId, productId],
    );
    const initialVersion = BigInt(initial.rows[0]!.version);
    const currentVersion = (initialVersion + 1n).toString();
    const first = await request(root() + "/counts/physical", {
      reason: "First physical observation",
      lines: [{ product_id: productId, counted_quantity: "9.000" }],
    });
    expect(first.status).toBe(201);
    const firstBody = await first.json() as { id: string };

    const second = await request(root() + "/counts/physical", {
      reason: "Second physical observation",
      lines: [{ product_id: productId, counted_quantity: "8.500" }],
    });
    expect(second.status).toBe(201);
    const secondBody = await second.json() as { id: string };

    const newerConfirmation = await request(root() + "/counts/" + secondBody.id + "/confirm");
    expect(newerConfirmation.status).toBe(200);

    const staleConfirmation = await request(root() + "/counts/" + firstBody.id + "/confirm");
    expect(staleConfirmation.status).toBe(409);
    expect(await staleConfirmation.json()).toMatchObject({
      error: "COUNT_STALE",
      expected_on_hand_quantity: "8.250",
      current_on_hand_quantity: "8.500",
      expected_balance_version: initialVersion.toString(),
      current_balance_version: currentVersion,
    });

    const persisted = await client.query<{ balance: string; stale_status: string; newer_status: string; stale_movements: string }>(
      `SELECT
        (SELECT on_hand_quantity::text FROM inventory_balances
         WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3) AS balance,
        (SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $4) AS stale_status,
        (SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $5) AS newer_status,
        (SELECT count(*)::text FROM warehouse_inventory_movements
         WHERE organization_id = $1 AND count_id = $4) AS stale_movements`,
      [organizationId, warehouseId, productId, firstBody.id, secondBody.id],
    );
    expect(persisted.rows[0]).toEqual({
      balance: "8.500", stale_status: "draft", newer_status: "confirmed", stale_movements: "0",
    });
  });

  it("rejects an ABA-stale physical count even when on-hand returns to the original quantity", async () => {
    await seedInventoryBalance("8.250");
    const created = await request(root() + "/counts/physical", {
      reason: "ABA changes must invalidate a physical snapshot",
      lines: [{ product_id: productId, counted_quantity: "9.000" }],
    });
    expect(created.status).toBe(201);
    const body = await created.json() as { id: string };
    const snapshot = await client.query<{ expected: string; version: string }>(
      "SELECT expected_on_hand_quantity::text AS expected, expected_balance_version::text AS version FROM inventory_count_lines WHERE organization_id = $1 AND count_id = $2",
      [organizationId, body.id],
    );
    expect(snapshot.rows[0]).toEqual({ expected: "8.250", version: "1" });
    await client.query("BEGIN");
    try {
      await client.query(
        "UPDATE inventory_balances SET on_hand_quantity = 8.500 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
        [organizationId, warehouseId, productId],
      );
      await client.query(
        `INSERT INTO warehouse_inventory_movements
          (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
         VALUES ($1, $2, $3, $4, 'purchase_receipt', 0.250, 'ABA test intermediate increase', $5)`,
        [organizationId, branchId, warehouseId, productId, userId],
      );
      await client.query(
        "UPDATE inventory_balances SET on_hand_quantity = 8.250 WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3",
        [organizationId, warehouseId, productId],
      );
      await client.query(
        `INSERT INTO warehouse_inventory_movements
          (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta, reason, actor_user_id)
         VALUES ($1, $2, $3, $4, 'reversal', -0.250, 'ABA test return to original quantity', $5)`,
        [organizationId, branchId, warehouseId, productId, userId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    const confirmation = await request(root() + "/counts/" + body.id + "/confirm");
    expect(confirmation.status).toBe(409);
    expect(await confirmation.json()).toMatchObject({
      error: "COUNT_STALE",
      expected_on_hand_quantity: "8.250",
      current_on_hand_quantity: "8.250",
      expected_balance_version: "1",
      current_balance_version: "3",
    });
    const persisted = await client.query<{ version: string; status: string; movements: string }>(
      `SELECT
        (SELECT balance_version::text FROM inventory_balances WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3) AS version,
        (SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $4) AS status,
        (SELECT count(*)::text FROM warehouse_inventory_movements WHERE organization_id = $1 AND count_id = $4) AS movements`,
      [organizationId, warehouseId, productId, body.id],
    );
    expect(persisted.rows[0]).toEqual({ version: "3", status: "draft", movements: "0" });
  });

  it("does not let a physical count reduce stock below reserved quantity", async () => {
    await seedInventoryBalance("10.000", "8.000");
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
    expect(state.rows[0]).toEqual({ quantity: "10.000", status: "draft" });
  });

  it("serializes concurrent confirmation and records exactly one ledger movement and audit event", async () => {
    await seedInventoryBalance("7.000");
    const draft = await request(root() + "/counts/physical", {
      reason: "Concurrent confirmation must be idempotent",
      lines: [{ product_id: productId, counted_quantity: "8.500" }],
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

  it("confirms a zero opening balance without a stock movement and still reserves the opening slot", async () => {
    const opening = await request(root() + "/counts/opening", {
      reason: "Initialize a warehouse with zero stock",
      lines: [{ product_id: productId, counted_quantity: "0.000" }],
    });
    expect(opening.status).toBe(201);
    const body = await opening.json() as { id: string };
    const confirmation = await request(root() + "/counts/" + body.id + "/confirm");
    expect(confirmation.status).toBe(200);

    const persisted = await client.query<{ balance: string; movements: string; audits: string }>(
      `SELECT
        (SELECT on_hand_quantity::text FROM inventory_balances
         WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3) AS balance,
        (SELECT count(*)::text FROM warehouse_inventory_movements
         WHERE organization_id = $1 AND count_id = $4) AS movements,
        (SELECT count(*)::text FROM audit_logs
         WHERE organization_id = $1 AND entity_id = $4::text
           AND action = 'inventory.count.confirmed') AS audits`,
      [organizationId, warehouseId, productId, body.id],
    );
    expect(persisted.rows[0]).toEqual({ balance: "0.000", movements: "0", audits: "1" });

    const secondOpening = await request(root() + "/counts/opening", {
      reason: "A second opening must not overwrite the initial zero balance",
      lines: [{ product_id: productId, counted_quantity: "1.000" }],
    });
    expect(secondOpening.status).toBe(201);
    const secondBody = await secondOpening.json() as { id: string };
    const secondConfirmation = await request(root() + "/counts/" + secondBody.id + "/confirm");
    expect(secondConfirmation.status).toBe(409);
    expect(await secondConfirmation.json()).toMatchObject({ error: "OPENING_ALREADY_EXISTS" });
  });

  it("records an audited zero-delta physical count without creating a ledger movement", async () => {
    await seedInventoryBalance("8.000");
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
    await seedInventoryBalance("8.000");
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
      `INSERT INTO branch_memberships (organization_id, branch_id, user_id, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (organization_id, branch_id, user_id)
       DO UPDATE SET is_active = true`,
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

  it("rejects cross-tenant organization and product identifiers without writing inventory", async () => {
    const foreignTenantRequest = await request(
      `/api/orgs/${foreignOrganizationId}/branches/${foreignBranchId}/warehouses/${foreignWarehouseId}/counts/physical`,
      { reason: "Cross-tenant resource IDs must be denied", lines: [{ product_id: foreignProductId, counted_quantity: "1.000" }] },
    );
    expect(foreignTenantRequest.status).toBe(401);
    expect(await foreignTenantRequest.json()).toMatchObject({ error: "UNAUTHENTICATED" });

    const foreignTenantRead = await get(
      `/api/orgs/${foreignOrganizationId}/branches/${foreignBranchId}/warehouses`,
    );
    expect(foreignTenantRead.status).toBe(401);
    expect(await foreignTenantRead.json()).toMatchObject({ error: "UNAUTHENTICATED" });

    const foreignProductRequest = await request(root() + "/counts/physical", {
      reason: "A product from another tenant must not be accepted",
      lines: [{ product_id: foreignProductId, counted_quantity: "1.000" }],
    });
    expect(foreignProductRequest.status).toBe(400);
    expect(await foreignProductRequest.json()).toMatchObject({ error: "INVALID_PRODUCTS" });

    const persisted = await client.query<{ counts: string; lines: string }>(
      `SELECT
        (SELECT count(*)::text FROM inventory_counts WHERE organization_id = $1 AND warehouse_id = $2) AS counts,
        (SELECT count(*)::text FROM inventory_count_lines l
         JOIN inventory_counts c ON c.organization_id = l.organization_id AND c.id = l.count_id
         WHERE c.organization_id = $1 AND c.warehouse_id = $2) AS lines`,
      [organizationId, warehouseId],
    );
    expect(persisted.rows[0]).toEqual({ counts: "0", lines: "0" });
  });

  it("denies inventory members access to an unassigned branch and rejects a warehouse from another branch", async () => {
    await client.query(
      "UPDATE organization_members SET role = 'inventory' WHERE organization_id = $1 AND user_id = $2",
      [organizationId, userId],
    );
    await client.query(
      `INSERT INTO branch_memberships (organization_id, branch_id, user_id, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (organization_id, branch_id, user_id)
       DO UPDATE SET is_active = true`,
      [organizationId, branchId, userId],
    );

    const otherBranchCreate = await request(
      `/api/orgs/${organizationId}/branches/${unassignedBranchId}/warehouses/${unassignedWarehouseId}/counts/physical`,
      { reason: "Inventory member cannot write to an unassigned branch", lines: [{ product_id: productId, counted_quantity: "1.000" }] },
    );
    expect(otherBranchCreate.status).toBe(403);
    expect(await otherBranchCreate.json()).toMatchObject({ error: "BRANCH_FORBIDDEN" });

    const otherBranchRead = await get(
      `/api/orgs/${organizationId}/branches/${unassignedBranchId}/warehouses`,
    );
    expect(otherBranchRead.status).toBe(403);
    expect(await otherBranchRead.json()).toMatchObject({ error: "BRANCH_FORBIDDEN" });

    const otherBranchCountRead = await get(
      `/api/orgs/${organizationId}/branches/${unassignedBranchId}/warehouses/${unassignedWarehouseId}/counts`,
    );
    expect(otherBranchCountRead.status).toBe(403);
    expect(await otherBranchCountRead.json()).toMatchObject({ error: "BRANCH_FORBIDDEN" });

    const wrongWarehouseScope = await request(
      `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${unassignedWarehouseId}/counts/physical`,
      { reason: "Warehouse must belong to the requested branch", lines: [{ product_id: productId, counted_quantity: "1.000" }] },
    );
    expect(wrongWarehouseScope.status).toBe(404);
    expect(await wrongWarehouseScope.json()).toMatchObject({ error: "WAREHOUSE_NOT_FOUND" });

    const persisted = await client.query<{ counts: string }>(
      "SELECT count(*)::text AS counts FROM inventory_counts WHERE organization_id = $1 AND (warehouse_id = $2 OR warehouse_id = $3)",
      [organizationId, warehouseId, unassignedWarehouseId],
    );
    expect(persisted.rows[0]).toEqual({ counts: "0" });
    await client.query("DELETE FROM branch_memberships WHERE organization_id = $1 AND branch_id = $2 AND user_id = $3", [organizationId, branchId, userId]);
    await client.query("UPDATE organization_members SET role = 'owner' WHERE organization_id = $1 AND user_id = $2", [organizationId, userId]);
  });

  it("rejects confirmation when the count ID belongs to another branch or tenant", async () => {
    const branchCount = await client.query<{ id: string }>(
      `INSERT INTO inventory_counts
        (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
       VALUES ($1, $2, $3, 'physical', 'Cross-branch confirmation ID test', $4)
       RETURNING id`,
      [organizationId, unassignedBranchId, unassignedWarehouseId, userId],
    );
    const branchCountId = branchCount.rows[0]!.id;

    const branchAttempt = await request(root() + "/counts/" + branchCountId + "/confirm");
    expect(branchAttempt.status).toBe(404);
    expect(await branchAttempt.json()).toMatchObject({ error: "COUNT_NOT_FOUND" });

    // Give the same test identity a valid membership in the foreign tenant so
    // the fixture is a real foreign-tenant count, not merely an invalid row.
    await client.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [foreignOrganizationId, userId],
    );
    const tenantCount = await client.query<{ id: string }>(
      `INSERT INTO inventory_counts
        (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
       VALUES ($1, $2, $3, 'physical', 'Cross-tenant confirmation ID test', $4)
       RETURNING id`,
      [foreignOrganizationId, foreignBranchId, foreignWarehouseId, userId],
    );
    const tenantCountId = tenantCount.rows[0]!.id;

    const tenantAttempt = await request(root() + "/counts/" + tenantCountId + "/confirm");
    expect(tenantAttempt.status).toBe(404);
    expect(await tenantAttempt.json()).toMatchObject({ error: "COUNT_NOT_FOUND" });

    const persisted = await client.query<{ branch_status: string; tenant_status: string; branch_movements: string; tenant_movements: string }>(
      `SELECT
        (SELECT status FROM inventory_counts WHERE organization_id = $1 AND id = $2) AS branch_status,
        (SELECT status FROM inventory_counts WHERE organization_id = $3 AND id = $4) AS tenant_status,
        (SELECT count(*)::text FROM warehouse_inventory_movements WHERE organization_id = $1 AND count_id = $2) AS branch_movements,
        (SELECT count(*)::text FROM warehouse_inventory_movements WHERE organization_id = $3 AND count_id = $4) AS tenant_movements`,
      [organizationId, branchCountId, foreignOrganizationId, tenantCountId],
    );
    expect(persisted.rows[0]).toEqual({
      branch_status: "draft",
      tenant_status: "draft",
      branch_movements: "0",
      tenant_movements: "0",
    });
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

    const warehouseRead = await get(`/api/orgs/${organizationId}/branches/${branchId}/warehouses`);
    expect(warehouseRead.status).toBe(403);
    const countRead = await get(`/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/counts`);
    expect(countRead.status).toBe(403);
  });
});
