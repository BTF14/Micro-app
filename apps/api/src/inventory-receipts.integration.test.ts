import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client {
    constructor(connectionString: string) { super({ connectionString }); }
  } };
});

const app = (await import("./index")).default;
const databaseUrl = (globalThis as typeof globalThis & { process?: { env?: Record<string,string|undefined> } }).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & { process?: { env?: Record<string,string|undefined> } }).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;
const runtimeUrl = (globalThis as typeof globalThis & { process?: { env?: Record<string,string|undefined> } }).process?.env?.RUNTIME_DATABASE_URL ?? databaseUrl;
const isCi = Boolean((globalThis as typeof globalThis & { process?: { env?: Record<string,string|undefined> } }).process?.env?.CI);
if (isCi && !databaseUrl) throw new Error("DATABASE_URL is required in CI; refusing to skip inventory receipt integration tests.");

describe.skipIf(!databaseUrl)("inventory receipt API against PostgreSQL 18", () => {
  let admin: Client;
  let runtime: Client;
  let organizationId = "";
  let userId = "";
  let branchId = "";
  let warehouseId = "";
  let productId = "";
  let foreignProductId = "";
  let foreignOrganizationId = "";
  let foreignBranchId = "";
  let foreignWarehouseId = "";
  let otherWarehouseId = "";
  let token = "";

  const root = () => `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/receipts`;

  async function post(path: string, body: unknown, key = "receipt-" + crypto.randomUUID(), origin = "https://frontend.example") {
    return app.fetch(new Request("https://api.example" + path, {
      method: "POST",
      headers: {
        Cookie: "microapp_session=" + token,
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  async function get(path: string) {
    return app.fetch(new Request("https://api.example" + path, {
      headers: { Cookie: "microapp_session=" + token },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  const body = (quantity = "3.125") => ({
    reason: "Recepción de proveedor",
    lines: [{ product_id: productId, quantity, unit_cost_usd: "1.2500" }],
  });

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrlAdmin });
    await admin.connect();
    runtime = new Client({ connectionString: runtimeUrl });
    await runtime.connect();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const org = await admin.query<{ id: string }>("INSERT INTO organizations(name,slug) VALUES($1,$2) RETURNING id", ["Receipt " + suffix, "receipt-" + suffix]);
    organizationId = org.rows[0]!.id;
    const user = await admin.query<{ id: string }>("INSERT INTO app_users(email,display_name) VALUES($1,$2) RETURNING id", ["receipt-" + suffix + "@example.test", "Receipt Owner"]);
    userId = user.rows[0]!.id;
    await admin.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')", [organizationId,userId]);
    token = "receipt-session-" + suffix;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2,"0")).join("");
    await admin.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')", [userId,tokenHash]);
    const branch = await admin.query<{id:string}>("INSERT INTO branches(organization_id,name,slug) VALUES($1,'Receipt Branch',$2) RETURNING id",[organizationId,"receipt-branch-"+suffix]);
    branchId = branch.rows[0]!.id;
    const otherBranch = await admin.query<{id:string}>("INSERT INTO branches(organization_id,name,slug) VALUES($1,$2,$3) RETURNING id",[organizationId,"Other Receipt Branch","receipt-other-branch-"+suffix]);
    const otherWarehouse = await admin.query<{id:string}>("INSERT INTO warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,$4) RETURNING id",[organizationId,otherBranch.rows[0]!.id,"other","Other Receipt Warehouse"]);
    otherWarehouseId = otherWarehouse.rows[0]!.id;
    const foreignOrg = await admin.query<{id:string}>("INSERT INTO organizations(name,slug) VALUES($1,$2) RETURNING id",["Receipt Foreign "+suffix,"receipt-foreign-"+suffix]);
    foreignOrganizationId = foreignOrg.rows[0]!.id;
    const foreignBranch = await admin.query<{id:string}>("INSERT INTO branches(organization_id,name,slug) VALUES($1,$2,$3) RETURNING id",[foreignOrganizationId,"Foreign Receipt Branch","receipt-foreign-branch-"+suffix]);
    foreignBranchId = foreignBranch.rows[0]!.id;
    const foreignWarehouse = await admin.query<{id:string}>("INSERT INTO warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,$4) RETURNING id",[foreignOrganizationId,foreignBranchId,"foreign","Foreign Receipt Warehouse"]);
    foreignWarehouseId = foreignWarehouse.rows[0]!.id;
    const foreignProduct = await admin.query<{id:string}>("INSERT INTO products(organization_id,sku,name,price_usd) VALUES($1,$2,'Foreign product',1) RETURNING id",[foreignOrg.rows[0]!.id,"RECEIPT-FOREIGN-"+suffix]);
    foreignProductId = foreignProduct.rows[0]!.id;
  });

  beforeEach(async () => {
    const suffix = crypto.randomUUID().replace(/-/g,"").slice(0,12);
    const warehouse = await admin.query<{id:string}>("INSERT INTO warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,'Receipt test warehouse') RETURNING id",[organizationId,branchId,"rcpt-"+suffix]);
    warehouseId = warehouse.rows[0]!.id;
    const product = await admin.query<{id:string}>("INSERT INTO products(organization_id,sku,name,price_usd) VALUES($1,$2,'Receipt test product',1) RETURNING id",[organizationId,"RECEIPT-"+suffix]);
    productId = product.rows[0]!.id;
  });

  afterAll(async () => {
    if (admin) await admin.end();
    if (runtime) await runtime.end();
  });

  it("records a receipt, appends the ledger, projects balance, and audits atomically", async () => {
    const response = await post(root(), body());
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const created = await response.json() as { id:string; replayed:boolean };
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.replayed).toBe(false);
    const persisted = await admin.query(
      `SELECT r.reason, count(l.product_id)::text AS lines,
        (SELECT count(*)::text FROM warehouse_inventory_movements m WHERE m.reference_id=r.id AND m.reference_type='inventory_receipt') AS movements,
        (SELECT on_hand_quantity::text FROM inventory_balances b WHERE b.organization_id=r.organization_id AND b.warehouse_id=r.warehouse_id AND b.product_id=$3) AS balance,
        (SELECT count(*)::text FROM audit_logs a WHERE a.entity_id=r.id::text AND a.action='inventory.receipt.created') AS audits
       FROM inventory_receipts r LEFT JOIN inventory_receipt_lines l ON l.organization_id=r.organization_id AND l.receipt_id=r.id
       WHERE r.organization_id=$1 AND r.id=$2 GROUP BY r.id`,
      [organizationId,created.id,productId],
    );
    expect(persisted.rows[0]).toEqual({reason:"Recepción de proveedor",lines:"1",movements:"1",balance:"3.125",audits:"1"});
    const listed = await get(root());
    expect(listed.status).toBe(200);
    expect(listed.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await listed.json() as {receipts:Array<{id:string}>}).receipts[0]?.id).toBe(created.id);
  });

  it("replays identical idempotency keys and returns 409 for a changed payload", async () => {
    const key = "receipt-idempotency-" + crypto.randomUUID();
    const first = await post(root(),body("2.000"),key);
    const replay = await post(root(),body("2.000"),key);
    const conflict = await post(root(),body("4.000"),key);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({replayed:true});
    expect(conflict.status).toBe(409);
    expect(await admin.query("SELECT count(*)::text AS n FROM inventory_receipts WHERE organization_id=$1 AND created_by=$2 AND idempotency_key=$3",[organizationId,userId,key])).toMatchObject({rows:[{n:"1"}]});
  });

  it("enforces idempotency header, content type, body limit, and decimal precision", async () => {
    const validBody = body();
    const missingKey = await app.fetch(new Request("https://api.example" + root(), {
      method: "POST", headers: { Cookie: "microapp_session=" + token, Origin: "https://frontend.example", "Content-Type": "application/json" }, body: JSON.stringify(validBody),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(missingKey.status).toBe(400);
    const unsupported = await app.fetch(new Request("https://api.example" + root(), {
      method: "POST", headers: { Cookie: "microapp_session=" + token, Origin: "https://frontend.example", "Content-Type": "text/plain", "Idempotency-Key": "bad-content-type" }, body: "{}",
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(unsupported.status).toBe(415);
    expect((await post(root(), { reason: "precision", lines: [{ product_id: productId, quantity: "1.0001", unit_cost_usd: "1.0000" }] })).status).toBe(400);
    expect((await post(root(), { reason: "negative cost", lines: [{ product_id: productId, quantity: "1.000", unit_cost_usd: "-0.0001" }] })).status).toBe(400);
    expect((await post(root(), { reason: "too many", lines: Array.from({ length: 501 }, () => ({ product_id: productId, quantity: "1.000", unit_cost_usd: "0.0000" })) })).status).toBe(400);
    const oversized = await app.fetch(new Request("https://api.example" + root(), {
      method: "POST", headers: { Cookie: "microapp_session=" + token, Origin: "https://frontend.example", "Content-Type": "application/json", "Idempotency-Key": "oversized-body", "Content-Length": String(128 * 1024 + 1) }, body: "{}",
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
    expect(oversized.status).toBe(413);
  });

  it("serializes concurrent receipts for the same product without losing stock", async () => {
    const [one,two] = await Promise.all([
      post(root(),body("1.000"),"concurrent-a-"+crypto.randomUUID()),
      post(root(),body("2.000"),"concurrent-b-"+crypto.randomUUID()),
    ]);
    expect(one.status).toBe(201);
    expect(two.status).toBe(201);
    const balance = await admin.query<{quantity:string}>("SELECT on_hand_quantity::text AS quantity FROM inventory_balances WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3",[organizationId,warehouseId,productId]);
    expect(balance.rows[0]?.quantity).toBe("3.000");
  });

  it("rejects untrusted origins, foreign products, and cashier writes", async () => {
    const untrusted = await post(root(),body(),"untrusted-"+crypto.randomUUID(),"https://evil.example");
    expect(untrusted.status).toBe(403);
    const foreign = await post(root(),{reason:"foreign",lines:[{product_id:foreignProductId,quantity:"1",unit_cost_usd:"0"}]});
    expect(foreign.status).toBe(400);
    await admin.query("UPDATE organization_members SET role='cashier' WHERE organization_id=$1 AND user_id=$2",[organizationId,userId]);
    const cashier = await post(root(),body());
    expect(cashier.status).toBe(403);
    await admin.query("UPDATE organization_members SET role='owner' WHERE organization_id=$1 AND user_id=$2",[organizationId,userId]);
    const rows = await admin.query("SELECT count(*)::text AS n FROM inventory_receipts WHERE organization_id=$1 AND warehouse_id=$2",[organizationId,warehouseId]);
    expect(rows.rows[0]?.n).toBe("0");
  });

  it("rolls back receipt, movement and balance if audit insertion fails", async () => {
    await admin.query(`CREATE OR REPLACE FUNCTION public.fail_receipt_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action='inventory.receipt.created' THEN RAISE EXCEPTION 'TEST_AUDIT_FAILURE'; END IF; RETURN NEW; END $$`);
    await admin.query("CREATE TRIGGER fail_receipt_audit_test BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.fail_receipt_audit_test()");
    try {
      const response = await post(root(),body(),"audit-failure-"+crypto.randomUUID());
      expect(response.status).toBe(500);
      const state = await admin.query(
        `SELECT (SELECT count(*)::text FROM inventory_receipts WHERE organization_id=$1 AND warehouse_id=$2) AS receipts,
          (SELECT count(*)::text FROM warehouse_inventory_movements WHERE organization_id=$1 AND warehouse_id=$2) AS movements,
          (SELECT count(*)::text FROM inventory_balances WHERE organization_id=$1 AND warehouse_id=$2) AS balances`,
        [organizationId,warehouseId],
      );
      expect(state.rows[0]).toEqual({receipts:"0",movements:"0",balances:"0"});
    } finally {
      await admin.query("DROP TRIGGER IF EXISTS fail_receipt_audit_test ON public.audit_logs");
      await admin.query("DROP FUNCTION IF EXISTS public.fail_receipt_audit_test()");
    }
  });

  it("rejects cross-tenant resources and a warehouse outside the requested branch", async () => {
    const foreignPath = "/api/orgs/" + foreignOrganizationId + "/branches/" + foreignBranchId + "/warehouses/" + foreignWarehouseId + "/receipts";
    expect((await get(foreignPath)).status).toBe(401);
    expect((await post(foreignPath, { reason: "foreign", lines: [{ product_id: foreignProductId, quantity: "1", unit_cost_usd: "0" }] })).status).toBe(401);
    const wrongBranchPath = "/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + otherWarehouseId + "/receipts";
    expect((await get(wrongBranchPath)).status).toBe(404);
    expect((await post(wrongBranchPath, body())).status).toBe(403);
  });

  it("does not grant direct balance writes to the runtime login", async () => {
    await expect(runtime.query(
      "INSERT INTO inventory_balances(organization_id,branch_id,warehouse_id,product_id,on_hand_quantity) VALUES($1,$2,$3,$4,1)",
      [organizationId,branchId,warehouseId,productId],
    )).rejects.toMatchObject({code:"42501"});
  });
});
