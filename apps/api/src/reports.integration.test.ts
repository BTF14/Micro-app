import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client { constructor(connectionString: string) { super({ connectionString }); } } };
});
const app = (await import("./index")).default;
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const adminUrl = env?.DATABASE_URL_ADMIN ?? env?.DATABASE_URL;
const runtimeUrl = env?.DATABASE_URL_RUNTIME;
if (env?.CI && (!adminUrl || !runtimeUrl)) throw new Error("CI requires admin and runtime PostgreSQL logins for reports integration tests.");

type Role = "owner" | "admin" | "inventory" | "cashier";
type Actor = { role: Role; userId: string; token: string };
describe.skipIf(!adminUrl || !runtimeUrl)("reports API with restricted PostgreSQL runtime login", () => {
  let admin: Client;
  let runtime: Client;
  let organizationId: string;
  let branchId: string;
  let cashierShiftId: string;
  let productId: string;
  let warehouseId: string;
  let secondBranchId: string;
  let secondWarehouseId: string;
  let secondProductId: string;
  const actors = new Map<Role, Actor>();

  async function hash(value: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    runtime = new Client({ connectionString: runtimeUrl });
    await Promise.all([admin.connect(), runtime.connect()]);
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    organizationId = (await admin.query("INSERT INTO organizations(name,slug) VALUES($1,$2) RETURNING id", ["Reports " + suffix, "reports-" + suffix])).rows[0].id;
    const branch = await admin.query("INSERT INTO branches(organization_id,name,slug) VALUES($1,'Main',$2) RETURNING id", [organizationId,"main-" + suffix]);
    branchId = branch.rows[0].id;
    for (const role of ["owner","admin","inventory","cashier"] as const) {
      const userId = (await admin.query("INSERT INTO app_users(email,display_name) VALUES($1,$2) RETURNING id", [role+"-"+suffix+"@example.invalid",role])).rows[0].id;
      await admin.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3)",[organizationId,userId,role]);
      await admin.query("INSERT INTO branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",[organizationId,branchId,userId]);
      const token = "reports-session-" + crypto.randomUUID();
      await admin.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",[userId,await hash(token)]);
      actors.set(role,{role,userId,token});
    }
    warehouseId = (await admin.query("INSERT INTO warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,'Main warehouse') RETURNING id",[organizationId,branchId,"main-"+suffix])).rows[0].id;
    productId = (await admin.query("INSERT INTO products(organization_id,sku,name,unit,cost_usd,price_usd,quantity_mode) VALUES($1,$2,' +SUM(1,1)','unidad',12.3400,20.0000,'fractional') RETURNING id",[organizationId,"=CMD(1+1)-"+suffix])).rows[0].id;
    const mainCountId = (await admin.query(
      "INSERT INTO inventory_counts(organization_id,branch_id,warehouse_id,count_type,reason,created_by) VALUES($1,$2,$3,'physical','Reports integration seed',$4) RETURNING id",
      [organizationId,branchId,warehouseId,actors.get("owner")!.userId],
    )).rows[0].id;
    await admin.query(
      "INSERT INTO inventory_count_lines(organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,expected_on_hand_quantity,expected_balance_version) VALUES($1,$2,$3,$4,$5,5.000,12.3400,0.000,0)",
      [organizationId,branchId,warehouseId,mainCountId,productId],
    );
    await admin.query("UPDATE inventory_counts SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1",[mainCountId,actors.get("owner")!.userId]);
    await admin.query(
      "INSERT INTO warehouse_inventory_movements(organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,reason,count_id,actor_user_id) VALUES($1,$2,$3,$4,'count_adjustment',5.000,12.3400,'Reports integration seed',$5,$6)",
      [organizationId,branchId,warehouseId,productId,mainCountId,actors.get("owner")!.userId],
    );
    secondBranchId = (await admin.query("INSERT INTO branches(organization_id,name,slug) VALUES($1,'Second','second-'||$2) RETURNING id",[organizationId,suffix])).rows[0].id;
    secondWarehouseId = (await admin.query("INSERT INTO warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,'Second warehouse') RETURNING id",[organizationId,secondBranchId,"second-"+suffix])).rows[0].id;
    secondProductId = (await admin.query("INSERT INTO products(organization_id,sku,name,unit,cost_usd,price_usd,quantity_mode) VALUES($1,$2,'Second branch product','unidad',0,0,'fractional') RETURNING id",[organizationId,"SECOND-"+suffix])).rows[0].id;
    const secondCountId = (await admin.query(
      "INSERT INTO inventory_counts(organization_id,branch_id,warehouse_id,count_type,reason,created_by) VALUES($1,$2,$3,'physical','Second branch seed',$4) RETURNING id",
      [organizationId,secondBranchId,secondWarehouseId,actors.get("owner")!.userId],
    )).rows[0].id;
    await admin.query(
      "INSERT INTO inventory_count_lines(organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,expected_on_hand_quantity,expected_balance_version) VALUES($1,$2,$3,$4,$5,1.000,0,0.000,0)",
      [organizationId,secondBranchId,secondWarehouseId,secondCountId,secondProductId],
    );
    await admin.query("UPDATE inventory_counts SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1",[secondCountId,actors.get("owner")!.userId]);
    await admin.query(
      "INSERT INTO warehouse_inventory_movements(organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,reason,count_id,actor_user_id) VALUES($1,$2,$3,$4,'count_adjustment',1.000,0,'Second branch seed',$5,$6)",
      [organizationId,secondBranchId,secondWarehouseId,secondProductId,secondCountId,actors.get("owner")!.userId],
    );
    const cashier = actors.get("cashier")!;
    const registerId = (await admin.query("INSERT INTO registers(organization_id,branch_id,name,code) VALUES($1,$2,'Front',$3) RETURNING id",[organizationId,branchId,"front-"+suffix])).rows[0].id;
    cashierShiftId = (await admin.query("INSERT INTO register_shifts(organization_id,branch_id,register_id,cashier_user_id,opening_cash_usd,opening_cash_ves) VALUES($1,$2,$3,$4,10.0000,100.00) RETURNING id",[organizationId,branchId,registerId,cashier.userId])).rows[0].id;
  });
  afterAll(async () => { if (runtime) await runtime.end(); if (admin) await admin.end(); });
  async function request(role: Role, path: string) {
    const actor = actors.get(role)!;
    return app.fetch(new Request("https://api.example"+path,{headers:{Cookie:"microapp_session="+actor.token}}),
      {DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:"https://frontend.example",GOOGLE_CLIENT_SECRET:"test-google-client-secret"});
  }
  const orgPath = () => "/api/orgs/"+organizationId;
  it("returns inventory valuation only to Owner; Admin and Inventory SQL projections omit cost", async () => {
    const owner = await request("owner",orgPath()+"/reports/inventory");
    expect(owner.status).toBe(200);
    const ownerBody = await owner.json() as {items:Array<Record<string,unknown>>};
    const valued = ownerBody.items.find((item) => item.product_id === productId);
    expect(valued).toHaveProperty("on_hand","5.000");
    expect(valued).toHaveProperty("cost_usd","12.3400");
    expect(valued).toHaveProperty("cost_valuation_usd","61.7000");
    expect(ownerBody).toHaveProperty("total_cost_valuation_usd","61.7000");
    expect(ownerBody.items.some((item) => item.branch_id === secondBranchId && item.product_id === secondProductId)).toBe(true);
    for (const role of ["admin","inventory"] as const) {
      const response = await request(role,orgPath()+"/reports/inventory");
      expect(response.status).toBe(200);
      const body = await response.json() as {items:Array<Record<string,unknown>>};
      expect(body.items[0]).not.toHaveProperty("cost_usd");
      expect(body.items[0]).not.toHaveProperty("cost_valuation_usd");
      const csv = await request(role,orgPath()+"/reports/inventory.csv");
      expect(csv.status).toBe(200);
      const csvText = await csv.text();
      expect(csvText).not.toContain("cost_valuation_usd");
      expect(csvText).toContain("\"'=CMD(1+1)-");
      expect(csvText).toContain("\"' +SUM(1,1)\"");
    }
    const inventoryBody = await (await request("inventory",orgPath()+"/reports/inventory")).json() as {items:Array<{branch_id:string;product_id:string}>};
    expect(inventoryBody.items.every((item) => item.branch_id === branchId)).toBe(true);
    expect(inventoryBody.items.some((item) => item.branch_id === secondBranchId)).toBe(false);
    expect((await request("cashier",orgPath()+"/reports/inventory")).status).toBe(403);
  });
  it("limits Cashier shift listing and closure summary to their own shift", async () => {
    const shifts = await request("cashier",orgPath()+"/register-shifts");
    expect(shifts.status).toBe(200);
    const list = await shifts.json() as {items:Array<{id:string}>};
    expect(list.items.map((item)=>item.id)).toContain(cashierShiftId);
    const summary = await request("cashier",orgPath()+"/branches/"+branchId+"/register-shifts/"+cashierShiftId+"/closure-summary");
    expect(summary.status).toBe(200);
    const body = await summary.json() as Record<string,unknown>;
    expect(body.expected_cash_usd).toBe("10.0000");
    expect(body.expected_cash_ves).toBe("100.00");
    expect(body.difference_cash_usd).toBeNull();
    expect(body.disclaimer).toBe("COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL");
    await admin.query("UPDATE register_shifts SET closed_at=now(),closing_cash_usd=9.0000,closing_cash_ves=120.00,closed_by_user_id=$2 WHERE id=$1",[cashierShiftId,actors.get("cashier")!.userId]);
    const closed = await request("cashier",orgPath()+"/branches/"+branchId+"/register-shifts/"+cashierShiftId+"/closure-summary");
    const closedBody = await closed.json() as Record<string,unknown>;
    expect(closed.status).toBe(200);
    expect(closedBody.difference_cash_usd).toBe("-1.0000");
    expect(closedBody.difference_cash_ves).toBe("20.00");
    expect(await request("inventory",orgPath()+"/register-shifts")).toHaveProperty("status",403);
  });
  it("executes sales report queries under the runtime role and denies Inventory", async () => {
    const owner = await request("owner",orgPath()+"/reports/sales?period=daily&date=2026-11-21");
    expect(owner.status).toBe(200);
    expect((await owner.json() as {items:unknown[]}).items).toEqual([]);
    const cashier = await request("cashier",orgPath()+"/reports/sales?period=daily&date=2026-11-21");
    expect(cashier.status).toBe(200);
    expect((await request("inventory",orgPath()+"/reports/sales")).status).toBe(403);
  });
});
