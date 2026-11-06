import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { convertUsdToVes } from "@micro-app/money";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client {
    constructor(connectionString: string) { super({ connectionString }); }
  } };
});

const app = (await import("./index")).default;
const environment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const databaseUrl = environment?.DATABASE_URL;
const databaseUrlAdmin = environment?.DATABASE_URL_ADMIN ?? databaseUrl;
const isCi = Boolean(environment?.CI);

if (isCi && (!databaseUrl || !databaseUrlAdmin)) {
  throw new Error("DATABASE_URL and DATABASE_URL_ADMIN are required; refusing to skip checkout integration tests.");
}

const BCV_SOURCE = "BCV_OFFICIAL_HTML_V1";
const FRONTEND_ORIGIN = "https://frontend.example";

describe.skipIf(!databaseUrl || !databaseUrlAdmin)("atomic sales checkout PostgreSQL integration", () => {
  let client: Client;
  let organizationId = "";
  let userId = "";
  let unauthorizedUserId = "";
  let branchId = "";
  let warehouseId = "";
  let registerId = "";
  let shiftId = "";
  let productId = "";
  let legacyStockBefore: string | null = null;
  let foreignOrganizationId = "";
  let token = "";
  let rateId = "";
  let rateDate = "";
  let previousRate: { id: string; rate: string; validation_status: string; fetched_at: string } | null = null;
  let createdRate = false;
  let suffix = "";

  async function request(
    body: unknown,
    idempotencyKey = "checkout-" + crypto.randomUUID(),
    pathOrganizationId = organizationId,
    pathBranchId = branchId,
  ): Promise<Response> {
    return app.fetch(new Request(
      "https://api.example/api/orgs/" + pathOrganizationId + "/branches/" + pathBranchId + "/checkout",
      {
        method: "POST",
        headers: {
          Cookie: "microapp_session=" + token,
          Origin: FRONTEND_ORIGIN,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      },
    ), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN });
  }

  function checkoutBody(
    quantity: string,
    amount: string,
    currency: "USD" | "VES" = "USD",
    targetProductId = productId,
    targetWarehouseId = warehouseId,
  ) {
    return {
      warehouse_id: targetWarehouseId,
      lines: [{ product_id: targetProductId, quantity }],
      payments: [{ method: "cash", currency, amount }],
    };
  }

  async function seedBalance(onHand: string, reserved = "0.000"): Promise<void> {
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO public.inventory_balances
          (organization_id,branch_id,warehouse_id,product_id,on_hand_quantity,reserved_quantity)
         VALUES ($1,$2,$3,$4,$5::numeric,$6::numeric)`,
        [organizationId, branchId, warehouseId, productId, onHand, reserved],
      );
      if (onHand !== "0.000") {
        await client.query(
          `INSERT INTO public.warehouse_inventory_movements
            (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,reason,actor_user_id)
           VALUES ($1,$2,$3,$4,'purchase_receipt',$5::numeric,'Checkout integration fixture',$6)`,
          [organizationId, branchId, warehouseId, productId, onHand, userId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  async function readBalance(): Promise<{ on_hand_quantity: string; reserved_quantity: string }> {
    const result = await client.query(
      `SELECT on_hand_quantity::text,reserved_quantity::text
         FROM public.inventory_balances
        WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3`,
      [organizationId, warehouseId, productId],
    );
    return result.rows[0];
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrlAdmin });
    await client.connect();
    suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const org = await client.query<{ id: string }>(
      "INSERT INTO public.organizations(name,slug) VALUES($1,$2) RETURNING id",
      ["Checkout " + suffix, "checkout-" + suffix],
    );
    organizationId = org.rows[0]!.id;

    const user = await client.query<{ id: string }>(
      "INSERT INTO public.app_users(email,display_name) VALUES($1,$2) RETURNING id",
      ["checkout-" + suffix + "@example.test", "Checkout Owner"],
    );
    userId = user.rows[0]!.id;
    await client.query(
      "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'cashier')",
      [organizationId, userId],
    );

    const branch = await client.query<{ id: string }>(
      "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,$2,$3) RETURNING id",
      [organizationId, "Checkout Branch", "checkout-" + suffix],
    );
    branchId = branch.rows[0]!.id;
    await client.query(
      "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
      [organizationId, branchId, userId],
    );

    const warehouse = await client.query<{ id: string }>(
      "INSERT INTO public.warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,$4) RETURNING id",
      [organizationId, branchId, "main-" + suffix, "Checkout Warehouse"],
    );
    warehouseId = warehouse.rows[0]!.id;

    const register = await client.query<{ id: string }>(
      "INSERT INTO public.registers(organization_id,branch_id,name,code) VALUES($1,$2,$3,$4) RETURNING id",
      [organizationId, branchId, "Checkout Register", "register-" + suffix],
    );
    registerId = register.rows[0]!.id;
    const shift = await client.query<{ id: string }>(
      "INSERT INTO public.register_shifts(organization_id,branch_id,register_id,cashier_user_id) VALUES($1,$2,$3,$4) RETURNING id",
      [organizationId, branchId, registerId, userId],
    );
    shiftId = shift.rows[0]!.id;

    token = "checkout-session-" + suffix;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client.query(
      "INSERT INTO public.auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [userId, tokenHash],
    );

    const unauthorizedUser = await client.query<{ id: string }>(
      "INSERT INTO public.app_users(email,display_name) VALUES($1,$2) RETURNING id",
      ["checkout-cashier-" + suffix + "@example.test", "Unassigned Cashier"],
    );
    unauthorizedUserId = unauthorizedUser.rows[0]!.id;
    await client.query(
      "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'cashier')",
      [organizationId, unauthorizedUserId],
    );
    const unauthorizedToken = "checkout-cashier-session-" + suffix;
    const unauthorizedDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(unauthorizedToken));
    const unauthorizedTokenHash = Array.from(new Uint8Array(unauthorizedDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client.query(
      "INSERT INTO public.auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [unauthorizedUserId, unauthorizedTokenHash],
    );



    const rateDateResult = await client.query<{ effective_date: string }>(
      "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS effective_date",
    );
    rateDate = rateDateResult.rows[0]!.effective_date;
    const existingRate = await client.query<{ id: string; rate: string; validation_status: string; fetched_at: string }>(
      "SELECT id,rate::text,validation_status,fetched_at::text FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [BCV_SOURCE, rateDate],
    );
    if (existingRate.rows[0]) {
      previousRate = existingRate.rows[0];
      rateId = previousRate.id;
      await client.query(
        "UPDATE public.exchange_rates SET rate=250.12345678,validation_status='valid',fetched_at=now() WHERE id=$1",
        [rateId],
      );
    } else {
      const insertedRate = await client.query<{ id: string }>(
        `INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status)
         VALUES('USD','VES',250.12345678,$1,$2::date,'valid') RETURNING id`,
        [BCV_SOURCE, rateDate],
      );
      rateId = insertedRate.rows[0]!.id;
      createdRate = true;
    }
  });

  beforeEach(async () => {
    const product = await client.query<{ id: string }>(
      `INSERT INTO public.products(organization_id,sku,name,price_usd,cost_usd)
       VALUES($1,$2,'Checkout Product',23.85,2.00) RETURNING id`,
      [organizationId, "CHECKOUT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12)],
    );
    productId = product.rows[0]!.id;
    const legacyStock = await client.query<{ stock_quantity: string | null }>(
      "SELECT stock_quantity::text FROM public.products WHERE id=$1",
      [productId],
    );
    legacyStockBefore = legacyStock.rows[0]!.stock_quantity;
  });

  afterAll(async () => {
    if (!client) return;
    if (organizationId) {
      await client.query("BEGIN");
      try {
        for (const table of [
          "public.sales", "public.sale_items", "public.payments",
          "public.warehouse_inventory_movements", "public.inventory_balances", "public.audit_logs",
        ]) {
          await client.query("ALTER TABLE " + table + " DISABLE TRIGGER USER");
        }
        await client.query("DELETE FROM public.audit_logs WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.payments WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.sale_items WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.sales WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.warehouse_inventory_movements WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.inventory_balances WHERE organization_id=$1", [organizationId]);
        for (const table of [
          "public.sales", "public.sale_items", "public.payments",
          "public.warehouse_inventory_movements", "public.inventory_balances", "public.audit_logs",
          "public.register_shifts",
        ]) {
          await client.query("ALTER TABLE " + table + " ENABLE TRIGGER USER");
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      // Register shifts are append-only by design. This test database is ephemeral,
      // so retain the closed shift and its scope rows rather than bypass lifecycle guards.
      await client.query("DELETE FROM public.warehouses WHERE organization_id=$1", [organizationId]);
      await client.query("DELETE FROM public.products WHERE organization_id=$1", [organizationId]);
    }
    if (foreignOrganizationId) {
      await client.query("DELETE FROM public.products WHERE organization_id=$1", [foreignOrganizationId]);
      await client.query("DELETE FROM public.branches WHERE organization_id=$1", [foreignOrganizationId]);
      await client.query("DELETE FROM public.organizations WHERE id=$1", [foreignOrganizationId]);
    }
    if (rateId) {
      if (createdRate) {
        await client.query("DELETE FROM public.exchange_rates WHERE id=$1", [rateId]);
      } else if (previousRate) {
        await client.query(
          "UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4::timestamptz WHERE id=$1",
          [previousRate.id, previousRate.rate, previousRate.validation_status, previousRate.fetched_at],
        );
      }
    }
    await client.end();
  });

  it("prevents a draft sale from committing without completed reconciliation", async () => {
    const key = "draft-guard-" + crypto.randomUUID();
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO public.sales (
          organization_id,idempotency_key,status,subtotal_usd,total_usd,created_by,
          branch_id,register_shift_id,warehouse_id,settlement_currency,
          exchange_rate_id,exchange_rate_snapshot,total_ves_snapshot,request_hash
        ) VALUES ($1,$2,'draft',0,0,$3,$4,$5,$6,'USD',$7,250.12345678,0,pg_catalog.repeat('a',64))`,
        [organizationId, key, userId, branchId, shiftId, warehouseId, rateId],
      );
      await expect(client.query("COMMIT")).rejects.toThrow(/SALE_DRAFT_MUST_NOT_COMMIT/);
    } finally {
      await client.query("ROLLBACK");
    }
    const persisted = await client.query(
      "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
      [organizationId, key],
    );
    expect(persisted.rows[0].count).toBe(0);
  });

  it("completes a USD sale with exact decimals, current BCV, own shift and ledger reconciliation", async () => {
    await seedBalance("10.000", "1.000");
    const response = await request(checkoutBody("1.250", "29.8125"), "usd-" + crypto.randomUUID());
    expect(response.status).toBe(201);
    const sale = await response.json() as {
      id: string; status: string; subtotal_usd: string; total_usd: string; total_ves: string;
      bcv_rate: string; lines: Array<{ quantity: string; line_total_usd: string; line_total_ves: string }>;
    };
    expect(sale.status).toBe("completed");
    const operator = await client.query(
      "SELECT created_by,register_shift_id FROM public.sales WHERE id=$1",
      [sale.id],
    );
    expect(operator.rows[0].created_by).toBe(userId);
    expect(operator.rows[0].register_shift_id).toBe(shiftId);
    expect(sale.subtotal_usd).toBe("29.8125");
    expect(sale.total_usd).toBe("29.8125");
    expect(sale.bcv_rate).toBe("250.12345678");
    expect(sale.lines[0]).toMatchObject({
      quantity: "1.250", line_total_usd: "29.8125",
      line_total_ves: convertUsdToVes("29.8125", "250.12345678"),
    });
    expect(sale.lines[0]).not.toHaveProperty("unit_cost_usd");
    expect(sale.total_ves).toBe(convertUsdToVes("29.8125", "250.12345678"));

    const balance = await readBalance();
    expect(balance).toEqual({ on_hand_quantity: "8.750", reserved_quantity: "1.000" });
    const movement = await client.query(
      "SELECT movement_type,quantity_delta::text,reference_type,reference_id FROM public.warehouse_inventory_movements WHERE organization_id=$1 AND reference_id=$2",
      [organizationId, sale.id],
    );
    expect(movement.rows).toHaveLength(1);
    expect(movement.rows[0]).toMatchObject({
      movement_type: "sale", quantity_delta: "-1.250", reference_type: "sale", reference_id: sale.id,
    });
    const audit = await client.query(
      "SELECT count(*)::int AS count FROM public.audit_logs WHERE organization_id=$1 AND action='sale.completed' AND entity_id=$2",
      [organizationId, sale.id],
    );
    expect(audit.rows[0].count).toBe(1);
    const legacyStock = await client.query("SELECT stock_quantity::text FROM public.products WHERE id=$1", [productId]);
    expect(legacyStock.rows[0].stock_quantity).toBe(legacyStockBefore);
  });

  it("replays an identical idempotency key and rejects a changed payload without consuming stock twice", async () => {
    await seedBalance("5.000");
    const key = "replay-" + crypto.randomUUID();
    const body = checkoutBody("1.000", "23.8500");
    const first = await request(body, key);
    expect(first.status).toBe(201);
    const firstSale = await first.json() as { id: string };

    const replay = await request(body, key);
    expect(replay.status).toBe(200);
    expect((await replay.json() as { id: string }).id).toBe(firstSale.id);

    const conflict = await request(checkoutBody("2.000", "47.7000"), key);
    expect(conflict.status).toBe(409);
    expect((await readBalance()).on_hand_quantity).toBe("4.000");
    const sales = await client.query(
      "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
      [organizationId, key],
    );
    expect(sales.rows[0].count).toBe(1);
  });

  it("serializes concurrent identical idempotency requests into one sale and one stock movement", async () => {
    await seedBalance("5.000");
    const key = "concurrent-replay-" + crypto.randomUUID();
    const body = checkoutBody("1.000", "23.8500");

    const [first, second] = await Promise.all([
      request(body, key),
      request(body, key),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);

    const [firstSale, secondSale] = await Promise.all([
      first.json() as Promise<{ id: string }>,
      second.json() as Promise<{ id: string }>,
    ]);
    expect(firstSale.id).toBe(secondSale.id);
    expect((await readBalance()).on_hand_quantity).toBe("4.000");

    const persisted = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2) AS sales,
         (SELECT count(*)::int FROM public.sale_items WHERE organization_id=$1 AND sale_id=$3) AS lines,
         (SELECT count(*)::int FROM public.payments WHERE organization_id=$1 AND sale_id=$3) AS payments,
         (SELECT count(*)::int FROM public.warehouse_inventory_movements WHERE organization_id=$1 AND reference_type='sale' AND reference_id=$3) AS movements,
         (SELECT count(*)::int FROM public.audit_logs WHERE organization_id=$1 AND action='sale.completed' AND entity_id=$3::text) AS audits`,
      [organizationId, key, firstSale.id],
    );
    expect(persisted.rows[0]).toEqual({ sales: 1, lines: 1, payments: 1, movements: 1, audits: 1 });
  });

  it("settles VES with two-decimal amount and exact USD-equivalent snapshot", async () => {
    await seedBalance("3.000");
    const totalVes = convertUsdToVes("23.8500", "250.12345678");
    const response = await request(checkoutBody("1.000", totalVes, "VES"), "ves-" + crypto.randomUUID());
    expect(response.status).toBe(201);
    const sale = await response.json() as {
      id: string; total_usd: string; total_ves: string;
      payments: Array<{ currency: string; amount: string }>;
    };
    expect(sale.total_usd).toBe("23.8500");
    expect(sale.total_ves).toBe(totalVes);
    expect(sale.payments[0]).toMatchObject({ currency: "VES", amount: totalVes });
    const payment = await client.query(
      "SELECT currency,amount::text,usd_equivalent_snapshot::text,exchange_rate_snapshot::text FROM public.payments WHERE organization_id=$1 AND sale_id=$2",
      [organizationId, sale.id],
    );
    expect(payment.rows[0]).toEqual({
      currency: "VES", amount: totalVes + "00", usd_equivalent_snapshot: "23.8500",
      exchange_rate_snapshot: "250.12345678",
    });
  });

  it("fails closed for stale BCV and leaves no sale or stock change", async () => {
    await seedBalance("2.000");
    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [rateId]);
    const key = "stale-" + crypto.randomUUID();
    const response = await request(checkoutBody("1.000", "23.8500"), key);
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toBe("BCV_RATE_NOT_CURRENT");
    expect((await readBalance()).on_hand_quantity).toBe("2.000");
    const sales = await client.query("SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2", [organizationId, key]);
    expect(sales.rows[0].count).toBe(0);
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1", [rateId]);
  });

  it("fails closed when no BCV row has the current Caracas effective date", async () => {
    await seedBalance("2.000");
    await client.query("UPDATE public.exchange_rates SET effective_date='1900-01-01'::date WHERE id=$1", [rateId]);
    try {
      const key = "missing-rate-" + crypto.randomUUID();
      const response = await request(checkoutBody("1.000", "23.8500"), key);
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("BCV_RATE_NOT_CURRENT");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
      const sales = await client.query(
        "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
        [organizationId, key],
      );
      expect(sales.rows[0].count).toBe(0);
    } finally {
      await client.query("UPDATE public.exchange_rates SET effective_date=$2::date WHERE id=$1", [rateId, rateDate]);
    }
  });

  it("rejects insufficient stock before creating a sale draft", async () => {
    await seedBalance("1.000");
    const key = "stock-" + crypto.randomUUID();
    const response = await request(checkoutBody("2.000", "47.7000"), key);
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toBe("INSUFFICIENT_STOCK");
    const sales = await client.query("SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2", [organizationId, key]);
    expect(sales.rows[0].count).toBe(0);
    expect((await readBalance()).on_hand_quantity).toBe("1.000");
  });

  it("allows only one concurrent sale to consume the last unit", async () => {
    await seedBalance("1.000");
    const keyA = "race-a-" + crypto.randomUUID();
    const keyB = "race-b-" + crypto.randomUUID();
    const [first, second] = await Promise.all([
      request(checkoutBody("1.000", "23.8500"), keyA),
      request(checkoutBody("1.000", "23.8500"), keyB),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect((await readBalance()).on_hand_quantity).toBe("0.000");
    const sales = await client.query(
      "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key IN ($2,$3)",
      [organizationId, keyA, keyB],
    );
    expect(sales.rows[0].count).toBe(1);
  });

  it("rolls back sale, balance and ledger for failures at movement, line, payment and audit writes", async () => {
    await seedBalance("2.000");
    await client.query(`CREATE OR REPLACE FUNCTION public.test_fail_checkout_write()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'TEST_CHECKOUT_WRITE_FAILURE';
      END $$`);
    const failureTables = [
      "warehouse_inventory_movements",
      "sale_items",
      "payments",
      "audit_logs",
    ] as const;

    try {
      for (const table of failureTables) {
        const key = "write-fail-" + table + "-" + crypto.randomUUID();
        const beforeMovements = await client.query(
          "SELECT count(*)::int AS count FROM public.warehouse_inventory_movements WHERE organization_id=$1",
          [organizationId],
        );
        await client.query(
          "CREATE TRIGGER zz_test_fail_checkout_write BEFORE INSERT ON public." + table +
          " FOR EACH ROW EXECUTE FUNCTION public.test_fail_checkout_write()",
        );
        try {
          const response = await request(checkoutBody("1.000", "23.8500"), key);
          expect(response.status).toBe(500);
          expect((await readBalance()).on_hand_quantity).toBe("2.000");
          const sales = await client.query(
            "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
            [organizationId, key],
          );
          expect(sales.rows[0].count).toBe(0);
          const afterMovements = await client.query(
            "SELECT count(*)::int AS count FROM public.warehouse_inventory_movements WHERE organization_id=$1",
            [organizationId],
          );
          expect(afterMovements.rows[0].count).toBe(beforeMovements.rows[0].count);
        } finally {
          await client.query("DROP TRIGGER IF EXISTS zz_test_fail_checkout_write ON public." + table);
        }
      }
    } finally {
      await client.query("DROP FUNCTION IF EXISTS public.test_fail_checkout_write()");
    }
  });


  it("rejects a warehouse from another branch and a product from another tenant", async () => {
    await seedBalance("2.000");
    const otherBranch = await client.query<{ id: string }>(
      "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,'Other Branch',$2) RETURNING id",
      [organizationId, "other-" + suffix],
    );
    const otherWarehouse = await client.query<{ id: string }>(
      "INSERT INTO public.warehouses(organization_id,branch_id,code,name) VALUES($1,$2,'other','Other Warehouse') RETURNING id",
      [organizationId, otherBranch.rows[0]!.id],
    );
    const foreignOrg = await client.query<{ id: string }>(
      "INSERT INTO public.organizations(name,slug) VALUES('Foreign Checkout','foreign-checkout-" + suffix + "') RETURNING id",
    );
    foreignOrganizationId = foreignOrg.rows[0]!.id;
    const foreignProduct = await client.query<{ id: string }>(
      "INSERT INTO public.products(organization_id,sku,name,price_usd) VALUES($1,'FOREIGN-CHECKOUT','Foreign Product',1) RETURNING id",
      [foreignOrganizationId],
    );

    const warehouseResponse = await request(
      checkoutBody("1.000", "23.8500", "USD", productId, otherWarehouse.rows[0]!.id),
      "cross-branch-" + crypto.randomUUID(),
    );
    expect(warehouseResponse.status).toBe(404);

    const productResponse = await request(
      checkoutBody("1.000", "23.8500", "USD", foreignProduct.rows[0]!.id),
      "cross-tenant-" + crypto.randomUUID(),
    );
    expect(productResponse.status).toBe(409);
  });

  it("rejects a missing inventory balance without creating a sale", async () => {
    const key = "missing-balance-" + crypto.randomUUID();
    const response = await request(checkoutBody("1.000", "23.8500"), key);
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toBe("INSUFFICIENT_STOCK");
    const sales = await client.query(
      "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
      [organizationId, key],
    );
    expect(sales.rows[0].count).toBe(0);
    const balances = await client.query(
      "SELECT count(*)::int AS count FROM public.inventory_balances WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3",
      [organizationId, warehouseId, productId],
    );
    expect(balances.rows[0].count).toBe(0);
  });

  it("rejects partial or overpaid settlement before creating a sale", async () => {
    await seedBalance("2.000");
    for (const amount of ["23.8400", "23.8600"]) {
      const key = "payment-mismatch-" + crypto.randomUUID();
      const response = await request(checkoutBody("1.000", amount), key);
      expect(response.status).toBe(400);
      expect((await response.json() as { error: string }).error).toBe("PAYMENT_TOTAL_INVALID");
      const sales = await client.query(
        "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
        [organizationId, key],
      );
      expect(sales.rows[0].count).toBe(0);
    }
    expect((await readBalance()).on_hand_quantity).toBe("2.000");
  });


  it("rejects a cashier who has no active branch membership", async () => {
    await seedBalance("2.000");
    const originalToken = token;
    const unauthorizedToken = "checkout-cashier-session-" + suffix;
    try {
      token = unauthorizedToken;
      const response = await request(checkoutBody("1.000", "23.8500"), "unassigned-cashier-" + crypto.randomUUID());
      expect(response.status).toBe(403);
      expect((await response.json() as { error: string }).error).toBe("BRANCH_FORBIDDEN");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
    } finally {
      token = originalToken;
    }
  });

  it("rejects a closed operator shift", async () => {
    await seedBalance("2.000");
    await client.query(
      `UPDATE public.register_shifts
          SET closed_at=now(),closing_cash_usd=0,closing_cash_ves=0,closed_by_user_id=$2
        WHERE organization_id=$1 AND id=$3`,
      [organizationId, userId, shiftId],
    );
    const response = await request(checkoutBody("1.000", "23.8500"), "closed-shift-" + crypto.randomUUID());
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toBe("OPEN_SHIFT_REQUIRED");
    expect((await readBalance()).on_hand_quantity).toBe("2.000");
  });
});
