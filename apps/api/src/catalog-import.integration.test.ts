import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import app from "./index";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client {
    constructor(connectionString: string) { super({ connectionString }); }
  } };
});

let ipCounter = 1;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);

if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip catalog CSV import PostgreSQL integration tests.");
}

type Fixture = { token: string; userId: string };
const csv = (rows: string[][], headers = ["sku", "name", "price_usd"]) =>
  [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

describe.skipIf(!databaseUrl)("catalog CSV import endpoints against PostgreSQL 18", () => {
  let client: Client;
  let organizationA = "";
  let organizationB = "";
  let branchId = "";
  let warehouseId = "";
  let existingProductId = "";
  let updateProductId = "";
  let fractionalProductId = "";
  const fixtures = {} as Record<"ownerA" | "ownerB" | "inventory" | "cashier", Fixture>;
  const userIds: string[] = [];
  const organizationIds: string[] = [];

  async function createOrganization(label: string): Promise<string> {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const result = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING id",
      [label + " " + suffix, "catalog-import-" + suffix],
    );
    organizationIds.push(result.rows[0]!.id);
    return result.rows[0]!.id;
  }

  async function createMember(organizationId: string, role: "owner" | "inventory" | "cashier"): Promise<Fixture> {
    const suffix = crypto.randomUUID();
    const user = await client.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1,$2) RETURNING id",
      ["catalog-import-" + suffix + "@example.test", "Catalog Import " + role],
    );
    const userId = user.rows[0]!.id;
    userIds.push(userId);
    await client.query(
      "INSERT INTO organization_members (organization_id,user_id,role) VALUES ($1,$2,$3)",
      [organizationId, userId, role],
    );
    const token = "catalog-import-session-" + suffix;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client.query(
      "INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 day')",
      [userId, tokenHash],
    );
    return { token, userId };
  }

  async function request(
    fixture: Fixture,
    organizationId: string,
    mode: "preview" | "apply",
    source: string,
    key?: string,
    expectedHash?: string,
  ): Promise<Response> {
    return app.fetch(new Request(
      `https://api.example/api/orgs/${organizationId}/catalog/imports/${mode}`,
      {
        method: "POST",
        headers: {
          Cookie: "microapp_session=" + fixture.token,
          Origin: "https://frontend.example",
          "Content-Type": "application/json",
          "CF-Connecting-IP": `198.51.100.${(ipCounter++ % 240) + 1}`,
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: JSON.stringify({ csv: source, ...(expectedHash ? { expected_hash: expectedHash } : {}) }),
      },
    ), {
      DATABASE_URL: databaseUrl,
      FRONTEND_ORIGIN: "https://frontend.example",
      GOOGLE_CLIENT_SECRET: "catalog-import-test-google-secret",
    });
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrlAdmin });
    await client.connect();
    organizationA = await createOrganization("Catalog Import A");
    organizationB = await createOrganization("Catalog Import B");
    fixtures.ownerA = await createMember(organizationA, "owner");
    fixtures.ownerB = await createMember(organizationB, "owner");
    fixtures.inventory = await createMember(organizationA, "inventory");
    fixtures.cashier = await createMember(organizationA, "cashier");

    const existing = await client.query<{ id: string }>(
      `INSERT INTO products (organization_id,sku,barcode,name,price_usd,cost_usd,minimum_stock,unit,quantity_mode)
       VALUES ($1,'IMPORT-EXISTING','BARCODE-EXISTING','Existing product',10,0,0,'unidad','integer') RETURNING id`,
      [organizationA],
    );
    existingProductId = existing.rows[0]!.id;
    const updateProduct = await client.query<{ id: string }>(
      `INSERT INTO products (organization_id,sku,name,price_usd,cost_usd,minimum_stock,unit,quantity_mode)
       VALUES ($1,'IMPORT-UPDATE','Old name',5,0,0,'unidad','integer') RETURNING id`,
      [organizationA],
    );
    updateProductId = updateProduct.rows[0]!.id;

    const fractional = await client.query<{ id: string }>(
      `INSERT INTO products (organization_id,sku,name,price_usd,cost_usd,minimum_stock,unit,quantity_mode)
       VALUES ($1,'IMPORT-FRACTIONAL','Fractional product',10,0,0,'kg','fractional') RETURNING id`,
      [organizationA],
    );
    fractionalProductId = fractional.rows[0]!.id;

    const branch = await client.query<{ id: string }>(
      "INSERT INTO branches (organization_id,name,slug) VALUES ($1,'Import Test Branch',$2) RETURNING id",
      [organizationA, "import-" + crypto.randomUUID().slice(0, 8)],
    );
    branchId = branch.rows[0]!.id;
    const warehouse = await client.query<{ id: string }>(
      "INSERT INTO warehouses (organization_id,branch_id,code,name) VALUES ($1,$2,$3,'Import Test Warehouse') RETURNING id",
      [organizationA, branchId, "imp-" + crypto.randomUUID().slice(0, 8)],
    );
    warehouseId = warehouse.rows[0]!.id;

    // A fractional draft count is a live 0028 guard fixture. It is intentionally
    // read-only from the catalog import API and remains scoped to this tenant.
    const count = await client.query<{ id: string }>(
      `INSERT INTO inventory_counts
        (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
       VALUES ($1,$2,$3,'physical','Catalog import fractional guard', $4) RETURNING id`,
      [organizationA, branchId, warehouseId, fixtures.ownerA.userId],
    );
    await client.query(
      `INSERT INTO inventory_count_lines
        (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
         expected_on_hand_quantity,expected_balance_version)
       VALUES ($1,$2,$3,$4,$5,1.250,NULL,0.000,0)`,
      [organizationA, branchId, warehouseId, count.rows[0]!.id, fractionalProductId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    if (organizationIds.length) {
      await client.query("BEGIN");
      try {
        await client.query("ALTER TABLE catalog_import_batches DISABLE TRIGGER USER");
        await client.query("ALTER TABLE audit_logs DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines DISABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_counts DISABLE TRIGGER USER");
        await client.query("DELETE FROM catalog_import_batches WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("DELETE FROM audit_logs WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("DELETE FROM inventory_count_lines WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("DELETE FROM inventory_counts WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("ALTER TABLE catalog_import_batches ENABLE TRIGGER USER");
        await client.query("ALTER TABLE audit_logs ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_count_lines ENABLE TRIGGER USER");
        await client.query("ALTER TABLE inventory_counts ENABLE TRIGGER USER");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      await client.query("DELETE FROM products WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM warehouses WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM branches WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])", [userIds]);
      await client.query("DELETE FROM organization_members WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM app_users WHERE id = ANY($1::uuid[])", [userIds]);
    }
    await client.end();
  });

  it("preview is read-only and classifies create, update, decimal unchanged, and missing create fields", async () => {
    const before = await client.query<{ products: string; batches: string; audits: string }>(
      `SELECT
        (SELECT count(*) FROM products WHERE organization_id=$1)::text AS products,
        (SELECT count(*) FROM catalog_import_batches WHERE organization_id=$1)::text AS batches,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1)::text AS audits`,
      [organizationA],
    );
    // Duplicate SKU is intentionally prohibited by the parser, so use a second
    // existing SKU fixture for the update/unchanged classification.
    const uniqueSource = csv([
      ["IMPORT-EXISTING", "Existing product", "10"],
      ["IMPORT-UPDATE", "Updated name", "5"],
      ["NEW-PREVIEW", "New product", "5"],
      ["MISSING-NAME", "", "4"],
    ]);
    const response = await request(fixtures.ownerA, organizationA, "preview", uniqueSource);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      can_apply: boolean;
      summary: { creates: number; updates: number; unchanged: number; errors: number };
      errors: Array<{ code: string }>;
    };
    expect(body.can_apply).toBe(false);
    expect(body.summary.creates).toBe(1);
    expect(body.summary.updates).toBe(1);
    expect(body.summary.unchanged).toBe(1);
    expect(body.errors.some((error) => error.code === "MISSING_REQUIRED_FIELD")).toBe(true);
    const after = await client.query<{ products: string; batches: string; audits: string }>(
      `SELECT
        (SELECT count(*) FROM products WHERE organization_id=$1)::text AS products,
        (SELECT count(*) FROM catalog_import_batches WHERE organization_id=$1)::text AS batches,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1)::text AS audits`,
      [organizationA],
    );
    expect(after.rows).toEqual(before.rows);
    expect(existingProductId).toBeTruthy();
    expect(updateProductId).toBeTruthy();
  });

  it("applies more than 100 rows atomically, records one batch/audit, and leaves inventory ledgers untouched", async () => {
    const rows: string[][] = [["IMPORT-EXISTING", "Updated by import", "12"]];
    for (let index = 0; index < 104; index += 1) rows.push([`IMPORT-BULK-${index}`, `Bulk ${index}`, "2.50"]);
    const source = csv(rows);
    const beforeInventory = await client.query<{ balances: string; movements: string }>(
      `SELECT
        (SELECT count(*) FROM inventory_balances WHERE organization_id=$1)::text AS balances,
        (SELECT count(*) FROM warehouse_inventory_movements WHERE organization_id=$1)::text AS movements`,
      [organizationA],
    );
    const response = await request(fixtures.ownerA, organizationA, "apply", source, "bulk-import-105");
    expect(response.status).toBe(200);
    const body = await response.json() as { replayed: boolean; summary: { total_rows: number; creates: number; updates: number } };
    expect(body.replayed).toBe(false);
    expect(body.summary).toMatchObject({ total_rows: 105, creates: 104, updates: 1 });
    const persisted = await client.query<{ batches: string; audits: string; products: string }>(
      `SELECT
        (SELECT count(*) FROM catalog_import_batches WHERE organization_id=$1 AND idempotency_key='bulk-import-105')::text AS batches,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND action='catalog.import.applied' AND entity_id=(SELECT id::text FROM catalog_import_batches WHERE organization_id=$1 AND idempotency_key='bulk-import-105'))::text AS audits,
        (SELECT count(*) FROM products WHERE organization_id=$1 AND sku LIKE 'IMPORT-BULK-%')::text AS products`,
      [organizationA],
    );
    expect(persisted.rows[0]).toEqual({ batches: "1", audits: "1", products: "104" });
    const afterInventory = await client.query<{ balances: string; movements: string }>(
      `SELECT
        (SELECT count(*) FROM inventory_balances WHERE organization_id=$1)::text AS balances,
        (SELECT count(*) FROM warehouse_inventory_movements WHERE organization_id=$1)::text AS movements`,
      [organizationA],
    );
    expect(afterInventory.rows).toEqual(beforeInventory.rows);
  });

  it("replays an identical key without writes and rejects a different request hash", async () => {
    const source = csv([["IMPORT-IDEMPOTENT", "Idempotent", "3"]]);
    const first = await request(fixtures.ownerA, organizationA, "apply", source, "same-import-key");
    expect(first.status).toBe(200);
    const before = await client.query<{ products: string; audits: string }>(
      `SELECT
        (SELECT count(*) FROM products WHERE organization_id=$1 AND sku='IMPORT-IDEMPOTENT')::text AS products,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND action='catalog.import.applied')::text AS audits`,
      [organizationA],
    );
    const replay = await request(fixtures.ownerA, organizationA, "apply", source, "same-import-key");
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({ replayed: true });
    const after = await client.query<{ products: string; audits: string }>(
      `SELECT
        (SELECT count(*) FROM products WHERE organization_id=$1 AND sku='IMPORT-IDEMPOTENT')::text AS products,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND action='catalog.import.applied')::text AS audits`,
      [organizationA],
    );
    expect(after.rows).toEqual(before.rows);
    const conflict = await request(fixtures.ownerA, organizationA, "apply", csv([["IMPORT-IDEMPOTENT-2", "Different", "4"]]), "same-import-key");
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: "IDEMPOTENCY_KEY_CONFLICT" });
  });

  it("serializes concurrent apply requests sharing an organization key", async () => {
    const source = csv([["IMPORT-CONCURRENT", "Concurrent", "6"]]);
    const responses = await Promise.all([
      request(fixtures.ownerA, organizationA, "apply", source, "concurrent-import-key"),
      request(fixtures.ownerA, organizationA, "apply", source, "concurrent-import-key"),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json() as Promise<{ replayed: boolean }>));
    expect(bodies.filter((body) => body.replayed === false)).toHaveLength(1);
    expect(bodies.filter((body) => body.replayed === true)).toHaveLength(1);
    const count = await client.query<{ products: string; audits: string }>(
      `SELECT
        (SELECT count(*) FROM products WHERE organization_id=$1 AND sku='IMPORT-CONCURRENT')::text AS products,
        (SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND action='catalog.import.applied' AND entity_id=(SELECT id::text FROM catalog_import_batches WHERE organization_id=$1 AND idempotency_key='concurrent-import-key'))::text AS audits`,
      [organizationA],
    );
    expect(count.rows[0]).toEqual({ products: "1", audits: "1" });
  });

  it("rejects barcode collisions without leaving earlier rows behind", async () => {
    const before = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM products WHERE organization_id=$1",
      [organizationA],
    );
    const source = csv([
      ["IMPORT-ROLLBACK-FIRST", "Must roll back", "2"],
      ["IMPORT-ROLLBACK-LAST", "Barcode collision", "3", "BARCODE-EXISTING"],
    ], ["sku", "name", "price_usd", "barcode"]);
    const response = await request(fixtures.ownerA, organizationA, "apply", source, "rollback-import-key");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "PRODUCT_CONFLICT" });
    const after = await client.query<{ count: string; first: string }>(
      `SELECT count(*)::text AS count,
        (SELECT count(*) FROM products WHERE organization_id=$1 AND sku='IMPORT-ROLLBACK-FIRST')::text AS first
       FROM products WHERE organization_id=$1`,
      [organizationA],
    );
    expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
    expect(after.rows[0]!.first).toBe("0");
  });

  it("enforces the 0028 fractional-to-integer guard in preview and apply", async () => {
    const source = csv([["IMPORT-FRACTIONAL", "Fractional product", "10", "integer", "0"]], [
      "sku", "name", "price_usd", "quantity_mode", "minimum_stock",
    ]);
    const preview = await request(fixtures.ownerA, organizationA, "preview", source);
    expect(preview.status).toBe(200);
    await expect(preview.json()).resolves.toMatchObject({ can_apply: false });
    const apply = await request(fixtures.ownerA, organizationA, "apply", source, "fractional-import-key");
    expect(apply.status).toBe(409);
    await expect(apply.json()).resolves.toMatchObject({ error: "FRACTIONAL_INVENTORY_BALANCE_CONFLICT" });
    const stored = await client.query<{ quantity_mode: string }>(
      "SELECT quantity_mode FROM products WHERE organization_id=$1 AND id=$2",
      [organizationA, fractionalProductId],
    );
    expect(stored.rows[0]!.quantity_mode).toBe("fractional");
  });

  it("enforces role and tenant authorization and scopes idempotency keys by organization", async () => {
    const deniedPreview = await request(fixtures.cashier, organizationA, "preview", csv([["DENIED", "Denied", "1"]]));
    const deniedApply = await request(fixtures.inventory, organizationA, "apply", csv([["DENIED-2", "Denied", "1"]]), "denied-key");
    expect(deniedPreview.status).toBe(403);
    expect(deniedApply.status).toBe(403);

    const crossTenant = await request(fixtures.ownerA, organizationB, "preview", csv([["CROSS", "Cross tenant", "1"]]));
    expect([403, 404]).toContain(crossTenant.status);

    const sameKeyA = await request(fixtures.ownerA, organizationA, "apply", csv([["SAME-KEY-A", "A", "1"]]), "shared-key");
    const sameKeyB = await request(fixtures.ownerB, organizationB, "apply", csv([["SAME-KEY-B", "B", "1"]]), "shared-key");
    expect(sameKeyA.status).toBe(200);
    expect(sameKeyB.status).toBe(200);
  });

  it("checks expected_hash against the server canonical hash", async () => {
    const source = csv([["IMPORT-HASH", "Hash check", "1"]]);
    const response = await request(fixtures.ownerA, organizationA, "apply", source, "hash-import-key", "0".repeat(64));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "HASH_MISMATCH" });
  });
});
