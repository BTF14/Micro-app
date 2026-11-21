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
const bcvUrl = env?.BCV_DATABASE_URL ?? env?.DATABASE_URL_BCV;
if (env?.CI && (!adminUrl || !runtimeUrl || !bcvUrl)) throw new Error("CI requires admin, runtime, and BCV producer PostgreSQL logins for reports integration tests.");

type Role = "owner" | "admin" | "inventory" | "cashier";
type Actor = { role: Role; userId: string; token: string };
describe.skipIf(!adminUrl || !runtimeUrl || !bcvUrl)("reports API with restricted PostgreSQL runtime login", () => {
  let admin: Client;
  let runtime: Client;
  let organizationId: string;
  let branchId: string;
  let cashierShiftId: string;
  let secondCashier: Actor;
  let bcvProducer: Client;
  let rateId: string;
  let futureRateId: string | null = null;
  let futureRatePrevious: {rate:string;validation_status:string;fetched_at:Date} | null = null;
  let futureRateWasCreated = false;
  let rateDate: string;
  let originalRate: { rate: string; validation_status: string; fetched_at: Date } | null = null;
  let rateWasCreated = false;
  let previousBcvState: { attempt_id: string | null; last_attempt_at: Date | null; last_success_at: Date | null; last_outcome: string | null; last_error_code: string | null; last_effective_date: string | null; updated_at: Date } | null = null;
  const observationAttemptIds: string[] = [];
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
    bcvProducer = new Client({ connectionString: bcvUrl! });
    await Promise.all([admin.connect(), runtime.connect(), bcvProducer.connect()]);
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
    await admin.query("INSERT INTO branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",[organizationId,secondBranchId,actors.get("owner")!.userId]);
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
    const secondCashierUserId = (await admin.query("INSERT INTO app_users(email,display_name) VALUES($1,'Second cashier') RETURNING id",["cashier-second-"+suffix+"@example.invalid"])).rows[0].id;
    await admin.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'cashier')",[organizationId,secondCashierUserId]);
    await admin.query("INSERT INTO branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",[organizationId,branchId,secondCashierUserId]);
    const secondCashierToken = "reports-second-cashier-" + crypto.randomUUID();
    await admin.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",[secondCashierUserId,await hash(secondCashierToken)]);
    secondCashier = {role:"cashier",userId:secondCashierUserId,token:secondCashierToken};
    const cashier = actors.get("cashier")!;
    const registerId = (await admin.query("INSERT INTO registers(organization_id,branch_id,name,code) VALUES($1,$2,'Front',$3) RETURNING id",[organizationId,branchId,"front-"+suffix])).rows[0].id;
    cashierShiftId = (await admin.query("INSERT INTO register_shifts(organization_id,branch_id,register_id,cashier_user_id,opening_cash_usd,opening_cash_ves) VALUES($1,$2,$3,$4,10.0000,100.00) RETURNING id",[organizationId,branchId,registerId,cashier.userId])).rows[0].id;
    rateDate = (await admin.query("SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS day")).rows[0].day;
    const state = await admin.query("SELECT attempt_id::text,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date::text,updated_at FROM bcv_sync_state WHERE singleton=true");
    previousBcvState = state.rows[0];
    const existingRate = await admin.query("SELECT id,rate::text,validation_status,fetched_at FROM exchange_rates WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=$1::date",[rateDate]);
    if (existingRate.rows[0]) {
      rateId = existingRate.rows[0].id;
      originalRate = existingRate.rows[0];
      await admin.query("UPDATE exchange_rates SET rate=35.00000000,validation_status='valid',fetched_at=now() WHERE id=$1",[rateId]);
    } else {
      rateId = (await admin.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',35.00000000,'BCV_OFFICIAL_HTML_V1',$1::date,'valid') RETURNING id",[rateDate])).rows[0].id;
      rateWasCreated = true;
    }
    const attemptId = crypto.randomUUID();
    observationAttemptIds.push(attemptId);
    await bcvProducer.query("UPDATE bcv_sync_state SET attempt_id=$1::uuid,last_attempt_at=clock_timestamp(),last_success_at=clock_timestamp(),last_outcome='inserted',last_error_code=NULL,last_effective_date=$2::date,updated_at=clock_timestamp() WHERE singleton=true",[attemptId,rateDate]);
  });
  afterAll(async () => {
    if (bcvProducer) {
      if (previousBcvState) await bcvProducer.query("UPDATE bcv_sync_state SET attempt_id=$1,last_attempt_at=$2,last_success_at=$3,last_outcome=$4,last_error_code=$5,last_effective_date=$6,updated_at=$7 WHERE singleton=true",
        [previousBcvState.attempt_id,previousBcvState.last_attempt_at,previousBcvState.last_success_at,previousBcvState.last_outcome,previousBcvState.last_error_code,previousBcvState.last_effective_date,previousBcvState.updated_at]).catch(()=>undefined);
      await bcvProducer.end();
    }
    if (admin && organizationId) {
      await admin.query("ALTER TABLE bcv_sync_success_observations DISABLE TRIGGER bcv_sync_success_observations_10_append_only_rows");
      if (observationAttemptIds.length) await admin.query("DELETE FROM bcv_sync_success_observations WHERE attempt_id=ANY($1::uuid[])",[observationAttemptIds]);
      await admin.query("ALTER TABLE bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_10_append_only_rows");
      if (futureRateId) {
        if (futureRateWasCreated) await admin.query("DELETE FROM exchange_rates WHERE id=$1",[futureRateId]);
        else if (futureRatePrevious) await admin.query("UPDATE exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1",[futureRateId,futureRatePrevious.rate,futureRatePrevious.validation_status,futureRatePrevious.fetched_at]);
      }
      if (rateWasCreated && rateId) await admin.query("DELETE FROM exchange_rates WHERE id=$1",[rateId]);
      else if (rateId && originalRate) await admin.query("UPDATE exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1",[rateId,originalRate.rate,originalRate.validation_status,originalRate.fetched_at]);
    }
    if (runtime) await runtime.end();
    if (admin) await admin.end();
  });
  async function request(role: Role, path: string) {
    const actor = actors.get(role)!;
    return app.fetch(new Request("https://api.example"+path,{headers:{Cookie:"microapp_session="+actor.token}}),
      {DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:"https://frontend.example",GOOGLE_CLIENT_SECRET:"test-google-client-secret"});
  }
  async function checkout(payments: Array<{method:"cash"|"other";currency:"USD"|"VES";amount:string;reference?:string}>) {
    return app.fetch(new Request("https://api.example"+orgPath()+"/branches/"+branchId+"/checkout",{
      method:"POST",
      headers:{Cookie:"microapp_session="+actors.get("cashier")!.token,Origin:"https://frontend.example","Content-Type":"application/json","Idempotency-Key":"reports-"+crypto.randomUUID(),"CF-Connecting-IP":"203.0.113.77"},
      body:JSON.stringify({warehouse_id:warehouseId,lines:[{product_id:productId,quantity:"1.000"}],payments}),
    }),{DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:"https://frontend.example",GOOGLE_CLIENT_SECRET:"test-google-client-secret"});
  }
  const orgPath = () => "/api/orgs/"+organizationId;
  it("returns inventory valuation only to Owner; Admin and Inventory SQL projections omit cost", async () => {
    const owner = await request("owner",orgPath()+"/reports/inventory");
    expect(owner.status).toBe(200);
    const ownerBody = await owner.json() as {items:Array<Record<string,unknown>>};
    const valued = ownerBody.items.find((item) => item.product_id === productId);
    expect(valued).toHaveProperty("on_hand","5.000");
    expect(valued).toHaveProperty("retail_valuation_usd","100.0000");
    expect(valued).toHaveProperty("cost_usd","12.3400");
    expect(valued).toHaveProperty("cost_valuation_usd","61.7000");
    expect(ownerBody).toHaveProperty("total_cost_valuation_usd","61.7000");
    const ownerCsv = await request("owner",orgPath()+"/reports/inventory.csv");
    expect(ownerCsv.status).toBe(200);
    expect(await ownerCsv.text()).toContain("61.7000");
    expect(ownerBody.items.some((item) => item.branch_id === secondBranchId && item.product_id === secondProductId)).toBe(true);
    for (const role of ["admin","inventory"] as const) {
      const response = await request(role,orgPath()+"/reports/inventory");
      expect(response.status).toBe(200);
      const body = await response.json() as {items:Array<Record<string,unknown>>};
      expect(body.items[0]).toHaveProperty("retail_valuation_usd");
      expect(body.items[0]).not.toHaveProperty("cost_usd");
      expect(body.items[0]).not.toHaveProperty("cost_valuation_usd");
      const csv = await request(role,orgPath()+"/reports/inventory.csv");
      expect(csv.status).toBe(200);
      const csvText = await csv.text();
      expect(csvText).not.toContain("cost_valuation_usd");
      expect(csvText).not.toContain("valor_costo_usd");
      expect(csvText).not.toContain("12.3400");
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
    expect(await request("inventory",orgPath()+"/register-shifts")).toHaveProperty("status",403);
  });
  it("executes completed sales, closure, Caracas-midnight and CSV queries under microapp_runtime", async () => {
    const usdCheckout = await checkout([
      {method:"cash",currency:"USD",amount:"10.0000"},
      {method:"other",currency:"USD",amount:"10.0000",reference:"+SUM(2,2)"},
    ]);
    expect(usdCheckout.status,await usdCheckout.clone().text()).toBe(201);
    const usdSale = await usdCheckout.json() as {id:string};
    const usdSnapshot = await admin.query("SELECT exchange_rate_snapshot::text FROM sales WHERE id=$1",[usdSale.id]);
    expect(usdSnapshot.rows[0].exchange_rate_snapshot).toBe("35.00000000");

    const vesCheckout = await checkout([{method:"cash",currency:"VES",amount:"700.00"}]);
    expect(vesCheckout.status,await vesCheckout.clone().text()).toBe(201);
    const vesSale = await vesCheckout.json() as {id:string};
    const vesSnapshot = await admin.query("SELECT exchange_rate_snapshot::text FROM sales WHERE id=$1",[vesSale.id]);
    expect(vesSnapshot.rows[0].exchange_rate_snapshot).toBe("35.00000000");

    const voidCheckout = await checkout([{method:"cash",currency:"USD",amount:"20.0000"}]);
    expect(voidCheckout.status,await voidCheckout.clone().text()).toBe(201);
    const voidSale = await voidCheckout.json() as {id:string};

    const tomorrow = (await admin.query("SELECT ($1::date+1)::text AS day",[rateDate])).rows[0].day;
    const existingFutureRate = await admin.query("SELECT id,rate::text,validation_status,fetched_at FROM exchange_rates WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=$1::date",[tomorrow]);
    if (existingFutureRate.rows[0]) {
      futureRateId = existingFutureRate.rows[0].id;
      futureRatePrevious = existingFutureRate.rows[0];
      await admin.query("UPDATE exchange_rates SET rate=40.00000000,validation_status='valid',fetched_at=now() WHERE id=$1",[futureRateId]);
    } else {
      futureRateId = (await admin.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',40.00000000,'BCV_OFFICIAL_HTML_V1',$1::date,'valid') RETURNING id",[tomorrow])).rows[0].id;
      futureRateWasCreated = true;
    }
    const adjustmentDate = await admin.query(
      "SELECT ($1::date::timestamp AT TIME ZONE 'UTC')+interval '4 hours' AS caracas_midnight",
      [rateDate],
    );
    const midnight = adjustmentDate.rows[0].caracas_midnight as Date;
    const beforeMidnight = new Date(midnight.getTime()-1000);
    const afterMidnight = new Date(midnight.getTime()+1000);
    await admin.query("ALTER TABLE sales DISABLE TRIGGER sales_checkout_lifecycle_guard");
    await admin.query("ALTER TABLE sales DISABLE TRIGGER sales_completed_reconciliation");
    try {
      await admin.query("UPDATE sales SET created_at=$2::timestamptz-interval '1 day',completed_at=$3::timestamptz WHERE id=$1",[usdSale.id,midnight,afterMidnight]);
      await admin.query("UPDATE sales SET completed_at=$2::timestamptz WHERE id=$1",[vesSale.id,beforeMidnight]);
      await admin.query("UPDATE sales SET status='void',created_at=$2::timestamptz,completed_at=NULL WHERE id=$1",[voidSale.id,afterMidnight]);
    } finally {
      await admin.query("ALTER TABLE sales ENABLE TRIGGER sales_completed_reconciliation");
      await admin.query("ALTER TABLE sales ENABLE TRIGGER sales_checkout_lifecycle_guard");
    }
    const stored = await admin.query("SELECT exchange_rate_snapshot::text,status FROM sales WHERE id=$1",[usdSale.id]);
    expect(stored.rows[0]).toEqual({exchange_rate_snapshot:"35.00000000",status:"completed"});

    await admin.query("UPDATE register_shifts SET closed_at=now(),closing_cash_usd=20.0000,closing_cash_ves=800.00,closed_by_user_id=$2 WHERE id=$1",[cashierShiftId,actors.get("cashier")!.userId]);
    const summary = await request("cashier",orgPath()+"/branches/"+branchId+"/register-shifts/"+cashierShiftId+"/closure-summary");
    expect(summary.status).toBe(200);
    const closure = await summary.json() as Record<string,any>;
    expect(closure.completed_sales_count).toBe("2");
    expect(closure.non_completed_sales_count).toBe("1");
    expect(closure.expected_cash_usd).toBe("20.0000");
    expect(closure.expected_cash_ves).toBe("800.00");
    expect(closure.difference_cash_usd).toBe("0.0000");
    expect(closure.difference_cash_ves).toBe("0.00");
    expect(closure.payments).toEqual(expect.arrayContaining([
      expect.objectContaining({method:"cash",currency:"USD",amount:"10.0000"}),
      expect.objectContaining({method:"other",currency:"USD",amount:"10.0000"}),
      expect.objectContaining({method:"cash",currency:"VES",amount:"700.00"}),
    ]));
    expect(closure.sale_snapshots).toEqual(expect.arrayContaining([
      expect.objectContaining({exchange_rate_snapshot:"35.00000000"}),
    ]));
    const secondCashierSummary = await app.fetch(new Request("https://api.example"+orgPath()+"/branches/"+branchId+"/register-shifts/"+cashierShiftId+"/closure-summary",{
      headers:{Cookie:"microapp_session="+secondCashier.token},
    }),{DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:"https://frontend.example"});
    expect(secondCashierSummary.status).toBe(403);

    const daily = await request("owner",orgPath()+"/reports/sales?period=daily&date="+rateDate);
    expect(daily.status).toBe(200);
    const dailyBody = await daily.json() as {items:Array<{id:string}>;excluded_non_completed_count:string};
    expect(dailyBody.items.map((item)=>item.id)).toContain(usdSale.id);
    expect(dailyBody.items.map((item)=>item.id)).not.toContain(vesSale.id);
    expect(dailyBody.items.map((item)=>item.id)).not.toContain(voidSale.id);
    expect(dailyBody.excluded_non_completed_count).toBe("1");

    const csv = await request("owner",orgPath()+"/reports/sales.csv?period=daily&date="+rateDate);
    expect(csv.status).toBe(200);
    const csvText = await csv.text();
    expect(csvText.charCodeAt(0)).toBe(0xFEFF);
    expect(csvText).toContain("\"'+SUM(2,2)\"");
    expect(csvText).toContain("20.0000");
    expect(csvText).toContain("COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL");
    expect(csvText).not.toContain("\"'20.0000\"");

    expect((await request("inventory",orgPath()+"/reports/sales")).status).toBe(403);
    expect((await app.fetch(new Request("https://api.example"+orgPath()+"/reports/sales"),{DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:"https://frontend.example"})).status).toBe(401);
    const crossTenant = await request("owner","/api/orgs/00000000-0000-4000-8000-000000000001/reports/sales");
    expect([401,403]).toContain(crossTenant.status);
  });
});
