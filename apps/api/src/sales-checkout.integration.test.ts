import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { convertUsdToVes, formatNumeric, parseNumeric } from "@micro-app/money";
import { persistBcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

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
const databaseUrlAdmin = environment?.DATABASE_URL_ADMIN;
const databaseUrlBcv = environment?.BCV_DATABASE_URL;
const isCi = Boolean(environment?.CI);

function isDisposableCheckoutDatabaseUrl(value: string | undefined, expectedRole: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname === "/microapp_test" &&
      url.username === expectedRole &&
      (url.protocol === "postgres:" || url.protocol === "postgresql:");
  } catch {
    return false;
  }
}

const isDisposableCheckoutDatabase =
  isDisposableCheckoutDatabaseUrl(databaseUrl, "microapp_runtime") &&
  isDisposableCheckoutDatabaseUrl(databaseUrlAdmin, "microapp");
const isDisposableBcvProducerDatabase = isDisposableCheckoutDatabaseUrl(databaseUrlBcv, "microapp_bcv_sync");

if ((databaseUrl || databaseUrlAdmin) && !isDisposableCheckoutDatabase) {
  throw new Error("Checkout integration tests require separate localhost microapp_runtime and microapp connections to the disposable microapp_test database; refusing non-disposable targets.");
}
if (isCi && (!isDisposableCheckoutDatabase || !isDisposableBcvProducerDatabase)) {
  throw new Error("CI must provide disposable runtime/admin/BCV-producer PostgreSQL LOGIN URLs; refusing to skip checkout integration tests.");
}

const BCV_SOURCE = "BCV_OFFICIAL_HTML_V1";
const FRONTEND_ORIGIN = "https://frontend.example";

describe.skipIf(!isDisposableCheckoutDatabase || !isDisposableBcvProducerDatabase)("atomic sales checkout PostgreSQL integration", () => {
  let client: Client;
  let runtimeClient: Client;
  let producerClient: Client;
  let organizationId = "";
  let userId = "";
  let inventoryUserId = "";
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
  let previousBcvSyncState: {
    attempt_id: string | null; last_attempt_at: Date | null; last_success_at: Date | null;
    last_outcome: string | null; last_error_code: string | null;
    last_effective_date: string | null; updated_at: Date;
  } | null = null;
  let createdRate = false;
  let suffix = "";
  let fxOwnerId = "";
  let fxOwnerToken = "";
  let fxReferenceRateId = "";
  let fxReferenceRateCreated = false;
  let fxFutureRateId = "";
  let fxFutureRateCreated = false;
  let previousFxFutureRate: { rate: string; validation_status: string; fetched_at: Date } | null = null;
  const fxAttemptIds: string[] = [];
  let previousFxReferenceRate: { rate: string; validation_status: string; fetched_at: Date } | null = null;

  async function request(
    body: unknown,
    idempotencyKey = "checkout-" + crypto.randomUUID(),
    pathOrganizationId = organizationId,
    pathBranchId = branchId,
    clientIp = "203.0.113.10",
    fxEnabled = false,
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
          "CF-Connecting-IP": clientIp,
        },
        body: JSON.stringify(body),
      },
    ), {
      DATABASE_URL: databaseUrl,
      FRONTEND_ORIGIN,
      GOOGLE_CLIENT_SECRET: "checkout-integration-test-hmac-pepper-2026",
      FX_CONTINGENCY_ENABLED: fxEnabled ? "true" : "false",
    });
  }

  async function readFxContingency(fxEnabled = true): Promise<Response> {
    return app.fetch(new Request(
      "https://api.example/api/orgs/" + organizationId + "/branches/" + branchId + "/fx-contingency",
      {
        method: "GET",
        headers: { Cookie: "microapp_session=" + (fxOwnerToken || token), Origin: FRONTEND_ORIGIN },
      },
    ), {
      DATABASE_URL: databaseUrl,
      FRONTEND_ORIGIN,
      GOOGLE_CLIENT_SECRET: "checkout-integration-test-hmac-pepper-2026",
      FX_CONTINGENCY_ENABLED: fxEnabled ? "true" : "false",
    });
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
      const projection = await client.query<{ enabled: boolean }>(
        "SELECT pg_catalog.to_regprocedure('public.project_inventory_movement_to_balance()') IS NOT NULL AS enabled",
      );
      if (!projection.rows[0]?.enabled) {
        // Compatibility path for the pre-0019 checkout branch.
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
      } else if (onHand !== "0.000") {
        const reason = "Checkout integration fixture";
        const count = await client.query<{ id: string }>(
          `INSERT INTO public.inventory_counts
            (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
           VALUES ($1,$2,$3,'physical',$4,$5) RETURNING id`,
          [organizationId, branchId, warehouseId, reason, inventoryUserId],
        );
        await client.query(
          `INSERT INTO public.inventory_count_lines
            (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
             expected_on_hand_quantity,expected_balance_version)
           VALUES ($1,$2,$3,$4,$5,$6::numeric,2.0000,0.000,0)`,
          [organizationId, branchId, warehouseId, count.rows[0]!.id, productId, onHand],
        );
        await client.query(
          "UPDATE public.inventory_counts SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1",
          [count.rows[0]!.id, inventoryUserId],
        );
        await client.query(
          `INSERT INTO public.warehouse_inventory_movements
            (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,
             reason,count_id,actor_user_id)
           VALUES ($1,$2,$3,$4,'count_adjustment',$5::numeric,2.0000,$6,$7,$8)`,
          [organizationId, branchId, warehouseId, productId, onHand, reason, count.rows[0]!.id, inventoryUserId],
        );
        if (reserved !== "0.000") {
          // Reservation APIs are not implemented yet; only this disposable
          // admin fixture bypasses the direct-write guard to seed a reservation.
          await client.query("ALTER TABLE public.inventory_balances DISABLE TRIGGER inventory_balances_direct_write_guard");
          await client.query(
            "UPDATE public.inventory_balances SET reserved_quantity=$4::numeric WHERE organization_id=$1 AND warehouse_id=$2 AND product_id=$3",
            [organizationId, warehouseId, productId, reserved],
          );
          await client.query("ALTER TABLE public.inventory_balances ENABLE TRIGGER inventory_balances_direct_write_guard");
        }
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


  async function createFxAuthorization(rate = "104.00000000"): Promise<string> {
    const expiryParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (key: string) => Number(expiryParts.find((item) => item.type === key)?.value ?? 0);
    const nextMidnightUtc = Date.UTC(part("year"), part("month") - 1, part("day") + 1, 4, 0, 0);
    const expiresAt = new Date(Math.min(Date.now() + 20 * 60_000, nextMidnightUtc - 2_000)).toISOString();
    const result = await client.query<{ id: string }>(
      "SELECT public.create_fx_contingency_authorization($1::uuid,$2::uuid,$3::numeric,100.00000000,$4::uuid,'Manual contingency recovery integration',$5::timestamptz,$6::uuid,'owner',NULL,'authorized') AS id",
      [organizationId, branchId, rate, fxReferenceRateId, expiresAt, fxOwnerId],
    );
    return result.rows[0]!.id;
  }

  async function recordFxBcvSuccess(
    outcome: "inserted" | "unchanged", effectiveDate: string, lastSuccessAt: Date,
  ): Promise<string> {
    const attemptId = crypto.randomUUID();
    fxAttemptIds.push(attemptId);
    await producerClient.query(
      "UPDATE public.bcv_sync_state SET attempt_id=$1::uuid,last_attempt_at=pg_catalog.clock_timestamp(),last_success_at=$2::timestamptz,last_outcome=$3,last_error_code=NULL,last_effective_date=$4::date,updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      [attemptId, lastSuccessAt, outcome, effectiveDate],
    );
    return attemptId;
  }

  async function setBcvSyncState(
    outcome: "running" | "inserted" | "unchanged" | "older" | "failed",
    effectiveDate = rateDate,
    successfulAtPresent = true,
  ): Promise<void> {
    const attemptId = crypto.randomUUID();
    fxAttemptIds.push(attemptId);
    await client.query(
      `UPDATE public.bcv_sync_state
          SET attempt_id=$4::uuid,
              last_outcome=$1,
              last_success_at=CASE WHEN $3 THEN now() ELSE NULL END,
              last_effective_date=$2::date,
              last_error_code=CASE WHEN $1='failed' THEN 'BCV_SYNC_UNKNOWN' ELSE NULL END,
              updated_at=now()
        WHERE singleton=true`,
      [outcome, effectiveDate, successfulAtPresent, attemptId],
    );
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrlAdmin });
    runtimeClient = new Client({ connectionString: databaseUrl });
    producerClient = new Client({ connectionString: databaseUrlBcv });
    await Promise.all([client.connect(), runtimeClient.connect(), producerClient.connect()]);
    await client.query('SELECT pg_advisory_lock(20261117, 260026)');
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
    const inventoryUser = await client.query<{ id: string }>(
      "INSERT INTO public.app_users(email,display_name) VALUES($1,$2) RETURNING id",
      ["checkout-inventory-" + suffix + "@example.test", "Checkout Inventory Member"],
    );
    inventoryUserId = inventoryUser.rows[0]!.id;
    await client.query(
      "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'inventory')",
      [organizationId, inventoryUserId],
    );
    await client.query(
      "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
      [organizationId, branchId, inventoryUserId],
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
    const today = rateDateResult.rows[0]!.effective_date;
    // Integration fixtures represent an official row effective on the operation date.
    // A prepublished next-business-day row is usable on weekends only under the 0027 healthy-sync contract.
    rateDate = today;
    const initialSyncState = await client.query<{
      attempt_id: string | null; last_attempt_at: Date | null; last_success_at: Date | null;
      last_outcome: string | null; last_error_code: string | null;
      last_effective_date: string | null; updated_at: Date;
    }>(
      `SELECT attempt_id::text AS attempt_id,last_attempt_at,last_success_at,last_outcome,
              last_error_code,last_effective_date::text AS last_effective_date,updated_at
         FROM public.bcv_sync_state WHERE singleton=true`,
    );
    previousBcvSyncState = initialSyncState.rows[0]!;
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
    await setBcvSyncState("inserted", rateDate, true);
    const syncState = await runtimeClient.query<{ last_outcome: string; last_effective_date: string; last_success_at: Date | string }>(
      "SELECT last_outcome,last_effective_date::text AS last_effective_date,last_success_at FROM public.lock_bcv_sync_state()",
    );
    const applicableRate = await runtimeClient.query<{ effective_date: string; validation_status: string; fetched_at: Date | string }>(
      "SELECT effective_date::text AS effective_date,validation_status,fetched_at FROM public.exchange_rates WHERE id=$1",
      [rateId],
    );
    expect(syncState.rows[0]).toMatchObject({ last_outcome: "inserted", last_effective_date: rateDate });
    expect(syncState.rows[0]?.last_success_at).toBeTruthy();
    expect(applicableRate.rows[0]).toMatchObject({ effective_date: rateDate, validation_status: "valid" });
    expect(applicableRate.rows[0]?.fetched_at).toBeTruthy();
  });

  beforeEach(async () => {
    const product = await client.query<{ id: string }>(
      `INSERT INTO public.products(organization_id,sku,name,price_usd,cost_usd,quantity_mode)
       VALUES($1,$2,'Checkout Product',23.85,2.00,'fractional') RETURNING id`,
      [organizationId, "CHECKOUT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12)],
    );
    productId = product.rows[0]!.id;
    const legacyStock = await client.query<{ stock_quantity: string | null }>(
      "SELECT stock_quantity::text FROM public.products WHERE id=$1",
      [productId],
    );
    legacyStockBefore = legacyStock.rows[0]!.stock_quantity;
  });

  afterEach(async () => {
    if (!client || !organizationId || !branchId || !fxOwnerId) return;
    const active = await client.query<{ id: string }>(
      "SELECT id FROM public.fx_contingency_authorizations WHERE organization_id=$1 AND branch_id=$2 AND status='active'",
      [organizationId, branchId],
    );
    for (const authorization of active.rows) {
      await client.query(
        "SELECT public.transition_fx_contingency_authorization($1,$2,$3,'revoked',$4,'owner','integration test cleanup')",
        [organizationId, branchId, authorization.id, fxOwnerId],
      );
    }
  });

  afterAll(async () => {
    if (!client) return;
    if (organizationId) {
      await client.query("BEGIN");
      try {
        for (const table of [
          "public.sales", "public.sale_items", "public.payments",
          "public.warehouse_inventory_movements", "public.inventory_balances", "public.audit_logs",
          "public.inventory_count_lines", "public.inventory_counts", "public.fx_contingency_events", "public.bcv_sync_success_observations",
        ]) {
          await client.query("ALTER TABLE " + table + " DISABLE TRIGGER ALL");
        }
        await client.query("DELETE FROM public.audit_logs WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.fx_contingency_events WHERE organization_id=$1", [organizationId]);
        if (fxAttemptIds.length) await client.query("DELETE FROM public.bcv_sync_success_observations WHERE attempt_id=ANY($1::uuid[])", [fxAttemptIds]);
        await client.query("DELETE FROM public.payments WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.sale_items WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.sales WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.fx_contingency_authorizations WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.warehouse_inventory_movements WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.inventory_count_lines WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.inventory_counts WHERE organization_id=$1", [organizationId]);
        await client.query("DELETE FROM public.inventory_balances WHERE organization_id=$1", [organizationId]);
        for (const table of [
          "public.sales", "public.sale_items", "public.payments",
          "public.warehouse_inventory_movements", "public.inventory_balances", "public.audit_logs",
          "public.inventory_count_lines", "public.inventory_counts", "public.register_shifts",
        ]) {
          await client.query("ALTER TABLE " + table + " ENABLE TRIGGER ALL");
        }
        await client.query("ALTER TABLE public.bcv_sync_success_observations ENABLE TRIGGER ALL");
        await client.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_10_append_only_rows");
        await client.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_20_append_only_truncate");
        await client.query("ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_10_append_only_rows");
        await client.query("ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_20_append_only_truncate");
        await client.query("ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER audit_logs_10_append_only_rows");
        await client.query("ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER audit_logs_20_append_only_truncate");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      // Register shifts are append-only by design. This test database is ephemeral,
      // so retain the closed shift and its scope rows rather than bypass lifecycle guards.
      if (fxOwnerId) {
        await client.query("DELETE FROM public.auth_sessions WHERE user_id=$1",[fxOwnerId]);
        await client.query("DELETE FROM public.branch_memberships WHERE organization_id=$1 AND branch_id=$2 AND user_id=$3",[organizationId,branchId,fxOwnerId]);
        await client.query("DELETE FROM public.organization_members WHERE organization_id=$1 AND user_id=$2", [organizationId, fxOwnerId]);
      }
      if (fxFutureRateId) {
        if (fxFutureRateCreated) await client.query("DELETE FROM public.exchange_rates WHERE id=$1", [fxFutureRateId]);
        else if (previousFxFutureRate) await client.query("UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1", [fxFutureRateId, previousFxFutureRate.rate, previousFxFutureRate.validation_status, previousFxFutureRate.fetched_at]);
      }
      if (fxReferenceRateId) {
        if (fxReferenceRateCreated) await client.query("DELETE FROM public.exchange_rates WHERE id=$1", [fxReferenceRateId]);
        else if (previousFxReferenceRate) await client.query("UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1", [fxReferenceRateId, previousFxReferenceRate.rate, previousFxReferenceRate.validation_status, previousFxReferenceRate.fetched_at]);
      }
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
    if (previousBcvSyncState) {
      await client.query("ALTER TABLE public.bcv_sync_state DISABLE TRIGGER bcv_sync_success_observation_capture");
      await client.query(
        `UPDATE public.bcv_sync_state
            SET attempt_id=$1::uuid,last_attempt_at=$2::timestamptz,last_success_at=$3::timestamptz,
                last_outcome=$4,last_error_code=$5,last_effective_date=$6::date,updated_at=$7::timestamptz
          WHERE singleton=true`,
        [
          previousBcvSyncState.attempt_id, previousBcvSyncState.last_attempt_at,
          previousBcvSyncState.last_success_at, previousBcvSyncState.last_outcome,
          previousBcvSyncState.last_error_code, previousBcvSyncState.last_effective_date,
          previousBcvSyncState.updated_at,
        ],
      );
      await client.query("ALTER TABLE public.bcv_sync_state ENABLE TRIGGER bcv_sync_success_observation_capture");
    }
    await client.query('SELECT pg_advisory_unlock(20261117, 260026)').catch(() => undefined);
    await Promise.all([producerClient.end(), runtimeClient.end(), client.end()]);
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
      bcv_rate: string; operation_date: string; exchange_rate_effective_date: string;
      lines: Array<{ quantity: string; line_total_usd: string; line_total_ves: string }>;
    };
    expect(sale.status).toBe("completed");
    expect(sale.operation_date).toBe(rateDate);
    expect(sale.exchange_rate_effective_date).toBe(rateDate);
    await expect(client.query(
      "UPDATE public.sales SET operation_date=operation_date + 1 WHERE id=$1",
      [sale.id],
    )).rejects.toThrow(/SALE_BCV_DATE_SNAPSHOT_IMMUTABLE/);
    await expect(client.query(
      "UPDATE public.sales SET exchange_rate_effective_date=exchange_rate_effective_date + 1 WHERE id=$1",
      [sale.id],
    )).rejects.toThrow(/SALE_BCV_DATE_SNAPSHOT_IMMUTABLE/);
    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1",[rateId]);
    const immutableSnapshot = await client.query(
      "SELECT operation_date::text,exchange_rate_effective_date::text,exchange_rate_snapshot::text FROM public.sales WHERE id=$1",
      [sale.id],
    );
    expect(immutableSnapshot.rows[0]).toEqual({
      operation_date: rateDate,
      exchange_rate_effective_date: rateDate,
      exchange_rate_snapshot: "250.12345678",
    });
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",[rateId]);
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
      quantity: "1.250", unit_snapshot: "unidad", quantity_mode_snapshot: "fractional", line_total_usd: "29.8125",
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

  it("holds a runtime-readable shared lock against a new BCV sync until checkout transaction ends", async () => {
    const runtimeLockClient = new Client({ connectionString: databaseUrl });
    await runtimeLockClient.connect();
    try {
      await runtimeLockClient.query("BEGIN");
      await runtimeLockClient.query("SELECT * FROM public.lock_bcv_sync_state()");

      await producerClient.query("SET lock_timeout='250ms'");
      const blockedUpdate = await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='running' WHERE singleton=true",
      ).then(() => null, (error: { code?: string }) => error);
      await producerClient.query("RESET lock_timeout");
      expect(blockedUpdate).toMatchObject({ code: "55P03" });
    } finally {
      await runtimeLockClient.query("ROLLBACK");
      await runtimeLockClient.end();
    }

    // Once the checkout transaction releases its shared lock, sync can own the row.
    await setBcvSyncState("unchanged");
  });

  it("keeps today's valid rate usable when the latest successful BCV sync prepublished a future effective date", async () => {
    await seedBalance("2.000");
    const futureDate = await client.query<{ effective_date: string }>(
      "SELECT ($1::date + 3)::text AS effective_date",
      [rateDate],
    );
    const existingFuture = await client.query<{ id: string; validation_status: string }>(
      "SELECT id,validation_status FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [BCV_SOURCE,futureDate.rows[0]!.effective_date],
    );
    let prepublishedRateId = existingFuture.rows[0]?.id ?? "";
    const priorPrepublishedStatus = existingFuture.rows[0]?.validation_status ?? null;
    if (!prepublishedRateId) {
      const inserted = await client.query<{id:string}>(
        "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',333.12345678,$1,$2::date,'valid') RETURNING id",
        [BCV_SOURCE,futureDate.rows[0]!.effective_date],
      );
      prepublishedRateId = inserted.rows[0]!.id;
    } else {
      await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",[prepublishedRateId]);
    }
    try {
      await setBcvSyncState("unchanged", futureDate.rows[0]!.effective_date);
      const response = await request(
        checkoutBody("1.000", "23.8500"),
        "future-prepublication-" + crypto.randomUUID(),
      );
      expect(response.status).toBe(201);
      expect((await readBalance()).on_hand_quantity).toBe("1.000");

      // A later failed producer attempt revokes eligibility for subsequent
      // checkouts even though the prepublished row and prior success remain.
      await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN',updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      );
      const revoked = await request(
        checkoutBody("1.000", "23.8500"),
        "future-prepublication-revoked-" + crypto.randomUUID(),
      );
      expect(revoked.status).toBe(409);
      expect((await readBalance()).on_hand_quantity).toBe("1.000");
    } finally {
      await setBcvSyncState("inserted");
      await client.query("UPDATE public.exchange_rates SET validation_status=$2 WHERE id=$1",[prepublishedRateId,priorPrepublishedStatus ?? "stale"]);
    }
  });

  it("database guard blocks direct runtime sale completion after the latest BCV sync failed", async () => {
    const runtimeClient = new Client({ connectionString: databaseUrl });
    await runtimeClient.connect();
    try {
      await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN' WHERE singleton=true",
      );
      await runtimeClient.query("BEGIN");
      const rate = await runtimeClient.query<{ rate: string }>(
        "SELECT rate::text AS rate FROM public.exchange_rates WHERE id=$1",
        [rateId],
      );
      expect(rate.rows[0]?.rate).toBeDefined();

      const sale = await runtimeClient.query<{ id: string }>(
        `INSERT INTO public.sales (
           organization_id,idempotency_key,status,subtotal_usd,total_usd,
           exchange_rate_id,exchange_rate_snapshot,total_ves_snapshot,created_by,
           branch_id,register_shift_id,warehouse_id,settlement_currency,request_hash
         ) VALUES ($1,$2,'draft',1.0000,1.0000,$3,$4::numeric,1.00,$5,$6,$7,$8,'USD',$9)
         RETURNING id`,
        [
          organizationId, "direct-runtime-" + crypto.randomUUID(), rateId, rate.rows[0]!.rate,
          userId, branchId, shiftId, warehouseId, "a".repeat(64),
        ],
      );
      const guardError = await runtimeClient.query(
        "UPDATE public.sales SET status='completed',completed_at=now() WHERE id=$1",
        [sale.rows[0]!.id],
      ).then(() => null, (error: { code?: string; message?: string }) => error);
      expect(guardError).toMatchObject({ code: "23514" });
      expect(guardError?.message).toContain("SALE_REQUIRES_CURRENT_BCV_RATE");
    } finally {
      await runtimeClient.query("ROLLBACK");
    }

    const runtimeWrite = await runtimeClient.query(
      "UPDATE public.bcv_sync_state SET last_success_at=now(),last_outcome='unchanged' WHERE singleton=true",
    ).then(() => null, (error: { code?: string }) => error);
    expect(runtimeWrite).toMatchObject({ code: "42501" });
    await runtimeClient.end();
    await setBcvSyncState("unchanged");
  });

  it("blocks a new sale after the latest BCV sync attempt fails, despite a valid same-day rate", async () => {
    await seedBalance("2.000");
    const key = "sync-failed-" + crypto.randomUUID();
    try {
      await setBcvSyncState("failed");
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
      await setBcvSyncState("unchanged");
    }
  });


  it("rejects direct runtime completion with past/future rates and with failed or running sync state", async () => {
    const dates = await client.query<{ past: string; future: string }>(
      "SELECT ($1::date-1)::text AS past,($1::date+2)::text AS future",
      [rateDate],
    );
    const candidates: Array<{ id: string; rate: string }> = [];
    const createdCandidateIds: string[] = [];
    for (const effectiveDate of [dates.rows[0]!.past, dates.rows[0]!.future]) {
      const existing = await client.query<{ id: string; rate: string }>(
        "SELECT id,rate::text AS rate FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date LIMIT 1",
        [BCV_SOURCE,effectiveDate],
      );
      if (existing.rows[0]) candidates.push(existing.rows[0]);
      else {
        const inserted = await client.query<{ id: string; rate: string }>(
          "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',333.12345678,$1,$2::date,'valid') RETURNING id,rate::text AS rate",
          [BCV_SOURCE,effectiveDate],
        );
        candidates.push(inserted.rows[0]!);
        createdCandidateIds.push(inserted.rows[0]!.id);
      }
    }
    const directInsert = (candidate: {id:string;rate:string}, key: string) => runtimeClient.query(
      `INSERT INTO public.sales (
         organization_id,idempotency_key,status,subtotal_usd,total_usd,exchange_rate_id,
         exchange_rate_snapshot,total_ves_snapshot,created_by,branch_id,register_shift_id,
         warehouse_id,settlement_currency,request_hash,fx_source,completed_at
       ) VALUES ($1,$2,'completed',1.0000,1.0000,$3,$4::numeric,1.00,$5,$6,$7,$8,'USD',$9,'bcv_official',pg_catalog.clock_timestamp())`,
      [organizationId,key,candidate.id,candidate.rate,userId,branchId,shiftId,warehouseId,"b".repeat(64)],
    );
    try {
      await setBcvSyncState("inserted",rateDate,true);
      for (const candidate of candidates) {
        await expect(directInsert(candidate,"direct-invalid-rate-"+crypto.randomUUID()))
          .rejects.toThrow(/SALE_REQUIRES_CURRENT_BCV_RATE/);
      }
      await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN',updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      );
      await expect(directInsert({id:rateId,rate:"250.12345678"},"direct-failed-sync-"+crypto.randomUUID()))
        .rejects.toThrow(/SALE_REQUIRES_CURRENT_BCV_RATE/);
      await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='running',last_error_code=NULL,updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      );
      await expect(directInsert({id:rateId,rate:"250.12345678"},"direct-running-sync-"+crypto.randomUUID()))
        .rejects.toThrow(/SALE_REQUIRES_CURRENT_BCV_RATE/);
    } finally {
      await setBcvSyncState("inserted");
      for (const id of createdCandidateIds) await client.query("DELETE FROM public.exchange_rates WHERE id=$1",[id]);
    }
  });

  it("blocks a new sale while a stale BCV sync attempt remains running", async () => {
    await seedBalance("2.000");
    const key = "sync-stale-running-" + crypto.randomUUID();
    try {
      await setBcvSyncState("running");
      await client.query("UPDATE public.bcv_sync_state SET last_attempt_at=pg_catalog.clock_timestamp()-interval '2 hours' WHERE singleton=true");
      const response = await request(checkoutBody("1.000", "23.8500"), key);
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("BCV_RATE_NOT_CURRENT");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
    } finally {
      await setBcvSyncState("inserted");
    }
  });

  it("blocks when the last successful sync effective date does not match today", async () => {
    await seedBalance("2.000");
    const key = "sync-date-mismatch-" + crypto.randomUUID();
    try {
      await setBcvSyncState("unchanged", "1900-01-01");
      const response = await request(checkoutBody("1.000", "23.8500"), key);
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("BCV_RATE_NOT_CURRENT");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
    } finally {
      await setBcvSyncState("unchanged");
    }
  });

  it("recovers checkout only after an identical official confirmation restores a stale row", async () => {
    await seedBalance("2.000");
    const blockedKey = "sync-recovery-blocked-" + crypto.randomUUID();
    const acceptedKey = "sync-recovery-accepted-" + crypto.randomUUID();
    try {
      await setBcvSyncState("failed");
      await client.query(
        "UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1",
        [rateId],
      );

      const blocked = await request(checkoutBody("1.000", "23.8500"), blockedKey);
      expect(blocked.status).toBe(409);
      expect((await readBalance()).on_hand_quantity).toBe("2.000");

      const storedRate = await client.query<{ rate: string }>(
        "SELECT rate::text AS rate FROM public.exchange_rates WHERE id=$1",
        [rateId],
      );
      await expect(persistBcvOfficialRate(
        producerClient as unknown as DatabaseClient,
        { rate: storedRate.rows[0]!.rate, effectiveDate: rateDate },
      )).resolves.toBe("unchanged");

      const recoveredRate = await client.query<{ validation_status: string }>(
        "SELECT validation_status FROM public.exchange_rates WHERE id=$1",
        [rateId],
      );
      expect(recoveredRate.rows[0]?.validation_status).toBe("valid");

      await setBcvSyncState("unchanged");
      await client.query(
        "UPDATE public.bcv_sync_state SET last_success_at=now(),last_outcome='unchanged',last_effective_date=$1::date WHERE singleton=true",
        [rateDate],
      );
      const accepted = await request(checkoutBody("1.000", "23.8500"), acceptedKey);
      expect(accepted.status).toBe(201);
      expect((await readBalance()).on_hand_quantity).toBe("1.000");
    } finally {
      await client.query(
        "UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",
        [rateId],
      );
      await setBcvSyncState("inserted");
    }
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

  it("rejects a database-tampered line amount and rolls back stock, sale and ledger", async () => {
    await seedBalance("2.000");
    const key = "line-arithmetic-guard-" + crypto.randomUUID();
    const beforeMovements = await client.query(
      "SELECT count(*)::int AS count FROM public.warehouse_inventory_movements WHERE organization_id=$1",
      [organizationId],
    );
    await client.query("CREATE OR REPLACE FUNCTION public.test_corrupt_checkout_line() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS 'BEGIN NEW.line_total_usd := NEW.line_total_usd + 0.0001; RETURN NEW; END;'");
    await client.query("GRANT EXECUTE ON FUNCTION public.test_corrupt_checkout_line() TO microapp_runtime");
    await client.query(
      "CREATE TRIGGER zz_test_corrupt_checkout_line BEFORE INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.test_corrupt_checkout_line()",
    );
    try {
      const response = await request(checkoutBody("1.000", "23.8500"), key);
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("CHECKOUT_REJECTED");
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
      await client.query("DROP TRIGGER IF EXISTS zz_test_corrupt_checkout_line ON public.sale_items");
      await client.query("DROP FUNCTION IF EXISTS public.test_corrupt_checkout_line()");
    }
  });

  it("accepts split VES payments and persists independently verifiable allocation positions", async () => {
    await seedBalance("2.000");
    const key = "split-ves-payment-" + crypto.randomUUID();
    const totalUsd = "23.8500";
    const totalVes = convertUsdToVes(totalUsd, "250.12345678");
    const totalVesUnits = parseNumeric(totalVes, 16, 2);
    const firstAmount = formatNumeric(totalVesUnits / 3n, 16, 2);
    const secondAmount = formatNumeric(totalVesUnits - totalVesUnits / 3n, 16, 2);
    const body = {
      warehouse_id: warehouseId,
      lines: [{ product_id: productId, quantity: "1.000" }],
      payments: [
        { method: "cash", currency: "VES", amount: firstAmount },
        { method: "transfer", currency: "VES", amount: secondAmount },
      ],
    };
    const response = await request(body, key);
    expect(response.status).toBe(201);
    const sale = await client.query<{ id: string }>(
      "SELECT id FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2",
      [organizationId, key],
    );
    const payments = await client.query<{
      allocation_position: number; amount: string; usd_equivalent_snapshot: string;
    }>(
      "SELECT allocation_position,amount::text,usd_equivalent_snapshot::text FROM public.payments WHERE organization_id=$1 AND sale_id=$2 ORDER BY allocation_position",
      [organizationId, sale.rows[0]!.id],
    );
    expect(payments.rows.map((row) => row.allocation_position)).toEqual([1, 2]);
    expect(payments.rows.reduce((sum, row) => sum + parseNumeric(row.amount, 14, 4) / 100n, 0n)).toBe(totalVesUnits);
    const totalUsdUnits = parseNumeric(totalUsd, 14, 4);
    const firstExpected = (parseNumeric(payments.rows[0]!.amount, 14, 4) / 100n) * totalUsdUnits / totalVesUnits;
    const lastExpected = totalUsdUnits - firstExpected;
    expect(payments.rows.map((row) => row.usd_equivalent_snapshot)).toEqual([
      formatNumeric(firstExpected, 14, 4),
      formatNumeric(lastExpected, 14, 4),
    ]);
    expect((await readBalance()).on_hand_quantity).toBe("1.000");
  });

  it("rate limits checkout by trusted client IP before parsing the request body", async () => {
    const ip = "203.0.113.250";
    let lastResponse: Response | null = null;
    for (let attempt = 1; attempt <= 61; attempt += 1) {
      lastResponse = await request(
        null,
        "checkout-rate-limit-" + attempt,
        organizationId,
        branchId,
        ip,
      );
      if (attempt < 61) expect(lastResponse.status).toBe(400);
    }
    expect(lastResponse?.status).toBe(429);
    expect((await lastResponse!.json() as { error: string }).error).toBe("RATE_LIMITED");
    expect(Number(lastResponse!.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("rejects a tampered per-payment VES allocation even when the aggregate USD equivalent still reconciles", async () => {
    await seedBalance("2.000");
    const key = "payment-allocation-guard-" + crypto.randomUUID();
    const totalVes = convertUsdToVes("23.8500", "250.12345678");
    const totalUnits = parseNumeric(totalVes, 16, 2);
    const firstAmount = formatNumeric(totalUnits / 2n, 16, 2);
    const secondAmount = formatNumeric(totalUnits - totalUnits / 2n, 16, 2);
    const body = {
      warehouse_id: warehouseId,
      lines: [{ product_id: productId, quantity: "1.000" }],
      payments: [
        { method: "cash", currency: "VES", amount: firstAmount },
        { method: "transfer", currency: "VES", amount: secondAmount },
      ],
    };
    const beforeMovements = await client.query(
      "SELECT count(*)::int AS count FROM public.warehouse_inventory_movements WHERE organization_id=$1",
      [organizationId],
    );
    await client.query(
      "CREATE OR REPLACE FUNCTION public.test_corrupt_checkout_payment_allocation() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS 'BEGIN IF NEW.allocation_position = 1 THEN NEW.usd_equivalent_snapshot := NEW.usd_equivalent_snapshot + 0.0001; ELSIF NEW.allocation_position = 2 THEN NEW.usd_equivalent_snapshot := NEW.usd_equivalent_snapshot - 0.0001; END IF; RETURN NEW; END;'",
    );
    await client.query("GRANT EXECUTE ON FUNCTION public.test_corrupt_checkout_payment_allocation() TO microapp_runtime");
    await client.query(
      "CREATE TRIGGER zz_test_corrupt_checkout_payment_allocation BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.test_corrupt_checkout_payment_allocation()",
    );
    try {
      const response = await request(body, key);
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("CHECKOUT_REJECTED");
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
      await client.query("DROP TRIGGER IF EXISTS zz_test_corrupt_checkout_payment_allocation ON public.payments");
      await client.query("DROP FUNCTION IF EXISTS public.test_corrupt_checkout_payment_allocation()");
    }
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

  it("uses a scoped manual authorization only with rate-bound cashier ACK and preserves idempotent replay", async () => {
    await seedBalance("5.000");
    const owner = await client.query<{ id: string }>(
      "INSERT INTO public.app_users(email,display_name) VALUES($1,'FX Checkout Owner') RETURNING id",
      ["fx-checkout-owner-" + crypto.randomUUID() + "@example.test"],
    );
    fxOwnerId = owner.rows[0]!.id;
    await client.query(
      "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
      [organizationId, fxOwnerId],
    );
    await client.query(
      "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
      [organizationId,branchId,fxOwnerId],
    );
    fxOwnerToken = "fx-owner-session-" + crypto.randomUUID();
    const fxOwnerDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fxOwnerToken));
    const fxOwnerTokenHash = Array.from(new Uint8Array(fxOwnerDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client.query(
      "INSERT INTO public.auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [fxOwnerId,fxOwnerTokenHash],
    );

    const yesterdayResult = await client.query<{ effective_date: string }>(
      "SELECT ((pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date - 1)::text AS effective_date",
    );
    const yesterday = yesterdayResult.rows[0]!.effective_date;
    const previousReference = await client.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
      "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [BCV_SOURCE, yesterday],
    );
    if (previousReference.rows[0]) {
      fxReferenceRateId = previousReference.rows[0].id;
      previousFxReferenceRate = previousReference.rows[0];
      await client.query("UPDATE public.exchange_rates SET rate=100.00000000,validation_status='valid' WHERE id=$1", [fxReferenceRateId]);
    } else {
      const reference = await client.query<{ id: string }>(
        "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',100.00000000,$1,$2::date,'valid') RETURNING id",
        [BCV_SOURCE, yesterday],
      );
      fxReferenceRateId = reference.rows[0]!.id;
      fxReferenceRateCreated = true;
    }

    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [rateId]);
    await setBcvSyncState("failed", rateDate, true);
    const expiryParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (key: string) => Number(expiryParts.find((item) => item.type === key)?.value ?? 0);
    const nextMidnightUtc = Date.UTC(part("year"), part("month") - 1, part("day") + 1, 4, 0, 0);
    const expiresAt = new Date(Math.min(Date.now() + 20 * 60_000, nextMidnightUtc - 2_000)).toISOString();
    const authorization = await client.query<{ id: string }>(
      "SELECT public.create_fx_contingency_authorization($1::uuid,$2::uuid,104.00000000,100.00000000,$3::uuid,'Manual contingency integration fixture',$4::timestamptz,$5::uuid,'owner',NULL,'authorized') AS id",
      [organizationId, branchId, fxReferenceRateId, expiresAt, fxOwnerId],
    );
    const authorizationId = authorization.rows[0]!.id;

    const key = "manual-fx-" + crypto.randomUUID();
    const base = checkoutBody("1.000", "23.8500");
    const disabledCommercial = await request({
      ...base, manual_fx_acknowledged: true, manual_fx_acknowledged_rate: "104.00000000",
    }, key + "-ac6-off", organizationId, branchId, "203.0.113.10", false);
    expect(disabledCommercial.status).toBe(409);
    expect((await disabledCommercial.json() as { error: string }).error).toBe("FX_RATE_NOT_AVAILABLE");
    const missingAck = await request({ ...base, manual_fx_acknowledged: false }, key, organizationId, branchId, "203.0.113.10", true);
    expect(missingAck.status).toBe(409);
    expect((await missingAck.json() as { error: string }).error).toBe("MANUAL_FX_ACK_REQUIRED");
    expect((await readBalance()).on_hand_quantity).toBe("5.000");

    const mismatchedAck = await request({
      ...base, manual_fx_acknowledged: true, manual_fx_acknowledged_rate: "104.00000001",
    }, key + "-mismatch", organizationId, branchId, "203.0.113.10", true);
    expect(mismatchedAck.status).toBe(409);
    expect((await mismatchedAck.json() as { error: string }).error).toBe("MANUAL_FX_ACK_REQUIRED");

    const acknowledgedBody = {
      ...base, manual_fx_acknowledged: true, manual_fx_acknowledged_rate: "104.00000000",
    };
    const response = await request(acknowledgedBody, key, organizationId, branchId, "203.0.113.10", true);
    expect(response.status).toBe(201);
    const sale = await response.json() as {
      id: string; fx_source: string; fx_rate: string; bcv_rate: string | null;
      fx_receipt_label: string; fx_authorization_id: string;
      manual_fx_acknowledged_at: string | null;
    };
    expect(sale.fx_source).toBe("manual_contingency");
    expect(sale.fx_rate).toBe("104.00000000");
    expect(sale.bcv_rate).toBeNull();
    expect(sale.fx_authorization_id).toBe(authorizationId);
    expect(sale.manual_fx_acknowledged_at).toBeTruthy();
    expect(sale.fx_receipt_label).toBe("Tasa manual de contingencia (no oficial BCV)");

    const stored = await client.query(
      "SELECT fx_source,fx_authorization_id,manual_fx_acknowledged_at,manual_fx_acknowledged_by_user_id,created_by FROM public.sales WHERE id=$1",
      [sale.id],
    );
    expect(stored.rows[0]).toMatchObject({
      fx_source: "manual_contingency", fx_authorization_id: authorizationId,
      manual_fx_acknowledged_by_user_id: userId, created_by: userId,
    });

    await client.query(
      "SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'revoked',$4::uuid,'owner','integration replay after revocation')",
      [organizationId, branchId, authorizationId, fxOwnerId],
    );
    const replay = await request(acknowledgedBody, key, organizationId, branchId, "203.0.113.10", true);
    expect(replay.status).toBe(200);
    expect((await replay.json() as { id: string }).id).toBe(sale.id);
    expect((await readBalance()).on_hand_quantity).toBe("4.000");
  });


  it("serializes a revocation that wins the FX lock before a manual checkout", async () => {
    const before = await readBalance();
    const authorizationId = await createFxAuthorization();
    await client.query("BEGIN");
    let responsePromise: Promise<Response> | null = null;
    try {
      await client.query(
        "SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'revoked',$4::uuid,'owner','revoke wins checkout lock race')",
        [organizationId, branchId, authorizationId, fxOwnerId],
      );
      responsePromise = request({
        ...checkoutBody("1.000", "23.8500"),
        manual_fx_acknowledged: true,
        manual_fx_acknowledged_rate: "104.00000000",
      }, "fx-revocation-race-" + crypto.randomUUID(), organizationId, branchId, "203.0.113.10", true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await client.query("COMMIT");
      const response = await responsePromise;
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("FX_RATE_NOT_AVAILABLE");
      expect(await readBalance()).toEqual(before);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  });

  it("commits bcv_restored in a separate transaction after the checkout rollback for inserted recovery", async () => {
    await seedBalance("5.000");
    const authorizationId = await createFxAuthorization();
    const auth = await client.query<{ starts_at: Date }>("SELECT starts_at FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    await client.query("UPDATE public.exchange_rates SET validation_status='valid',fetched_at=pg_catalog.clock_timestamp() WHERE id=$1", [rateId]);
    await recordFxBcvSuccess("inserted", rateDate, new Date(auth.rows[0]!.starts_at.getTime() - 1000));

    const response = await readFxContingency(true);
    expect(response.status, await response.clone().text()).toBe(200);
    const state = await response.json() as { authorization: unknown; bcv: { status: string } };
    expect(state.authorization).toBeNull();
    expect(state.bcv.status).toBe("current");
    const status = await client.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    expect(status.rows[0].status).toBe("bcv_restored");
    const event = await client.query("SELECT count(*)::int AS count FROM public.fx_contingency_events WHERE authorization_id=$1 AND event_type='bcv_restored'", [authorizationId]);
    expect(event.rows[0].count).toBe(1);
    expect((await readBalance()).on_hand_quantity).toBe("5.000");
  });

  it("recognizes unchanged recovery after authorization start without requiring fetched_at or last_success_at to advance", async () => {
    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [rateId]);
    await setBcvSyncState("failed", rateDate, true);
    await seedBalance("5.000");
    const authorizationId = await createFxAuthorization();
    const auth = await client.query<{ starts_at: Date }>("SELECT starts_at FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    const fetchedBefore = await client.query<{ fetched_at: Date }>("SELECT fetched_at FROM public.exchange_rates WHERE id=$1", [rateId]);
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1", [rateId]);
    const oldSuccess = new Date(auth.rows[0]!.starts_at.getTime() - 1000);
    const attemptId = await recordFxBcvSuccess("unchanged", rateDate, oldSuccess);
    const observation = await client.query(
      "SELECT observed_at,last_success_at,rate_fetched_at FROM public.bcv_sync_success_observations WHERE attempt_id=$1",
      [attemptId],
    );
    expect(observation.rows[0].observed_at.getTime()).toBeGreaterThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0].last_success_at.getTime()).toBeLessThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0].rate_fetched_at.getTime()).toBe(fetchedBefore.rows[0]!.fetched_at.getTime());

    const response = await readFxContingency(true);
    expect(response.status).toBe(200);
    const state = await response.json() as { authorization: unknown; bcv: { status: string } };
    expect(state.authorization).toBeNull();
    expect(state.bcv.status).toBe("current");
    const status = await client.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    expect(status.rows[0].status).toBe("bcv_restored");
    expect((await readBalance()).on_hand_quantity).toBe("5.000");
  });

  it("does not restore today's contingency for a future-effective BCV rate", async () => {
    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [rateId]);
    await setBcvSyncState("failed", rateDate, true);
    await seedBalance("5.000");
    const authorizationId = await createFxAuthorization();
    const tomorrowResult = await client.query<{ tomorrow: string }>(
      "SELECT (($1::date + 1)::date)::text AS tomorrow", [rateDate],
    );
    const tomorrow = tomorrowResult.rows[0]!.tomorrow;
    const existingFuture = await client.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
      "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [BCV_SOURCE, tomorrow],
    );
    if (existingFuture.rows[0]) {
      fxFutureRateId = existingFuture.rows[0].id;
      previousFxFutureRate = existingFuture.rows[0];
      await client.query("UPDATE public.exchange_rates SET rate=300.00000000,validation_status='valid',fetched_at=pg_catalog.clock_timestamp() WHERE id=$1", [fxFutureRateId]);
    } else {
      const future = await client.query<{ id: string }>(
        "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',300.00000000,$1,$2::date,'valid') RETURNING id",
        [BCV_SOURCE, tomorrow],
      );
      fxFutureRateId = future.rows[0]!.id;
      fxFutureRateCreated = true;
    }
    const auth = await client.query<{ starts_at: Date }>("SELECT starts_at FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    await recordFxBcvSuccess("inserted", tomorrow, new Date(auth.rows[0]!.starts_at.getTime() - 24 * 60 * 60 * 1000));

    const response = await request({
      ...checkoutBody("1.000", "23.8500"),
      manual_fx_acknowledged: true,
      manual_fx_acknowledged_rate: "104.00000000",
    }, "future-bcv-" + crypto.randomUUID(), organizationId, branchId, "203.0.113.10", true);
    expect(response.status).toBe(201);
    const sale = await response.json() as { fx_source: string; fx_authorization_id: string };
    expect(sale.fx_source).toBe("manual_contingency");
    expect(sale.fx_authorization_id).toBe(authorizationId);
    const status = await client.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authorizationId]);
    expect(status.rows[0].status).toBe("active");
  });

  it("completes a 0027 weekday same-day-sync sale with a future effective BCV snapshot and preserves it", async () => {
    const tomorrowResult = await client.query<{ tomorrow: string }>(
      "SELECT ($1::date + 1)::text AS tomorrow", [rateDate],
    );
    const tomorrow = tomorrowResult.rows[0]!.tomorrow;
    if (!fxFutureRateId) {
      const existingFuture = await client.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
        "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
        [BCV_SOURCE, tomorrow],
      );
      if (existingFuture.rows[0]) {
        fxFutureRateId = existingFuture.rows[0].id;
        previousFxFutureRate = existingFuture.rows[0];
      } else {
        const insertedFuture = await client.query<{ id: string }>(
          "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',300.00000000,$1,$2::date,'valid') RETURNING id",
          [BCV_SOURCE, tomorrow],
        );
        fxFutureRateId = insertedFuture.rows[0]!.id;
        fxFutureRateCreated = true;
      }
    }
    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [rateId]);
    await client.query(
      "UPDATE public.exchange_rates SET rate=300.00000000,validation_status='valid',fetched_at=pg_catalog.clock_timestamp() WHERE id=$1",
      [fxFutureRateId],
    );
    const futureRate = await client.query<{ rate: string; validation_status: string }>(
      "SELECT rate::text,validation_status FROM public.exchange_rates WHERE id=$1",
      [fxFutureRateId],
    );
    expect(futureRate.rows[0]).toMatchObject({ rate: "300.00000000", validation_status: "valid" });

    await setBcvSyncState("inserted", tomorrow, true);
    await seedBalance("2.000");
    const response = await request(checkoutBody("1.000", "23.8500"), "0027-positive-" + crypto.randomUUID());
    expect(response.status, await response.clone().text()).toBe(201);
    const sale = await response.json() as {
      id: string; status: string; operation_date: string; exchange_rate_effective_date: string; bcv_rate: string;
    };
    expect(sale).toMatchObject({
      status: "completed",
      operation_date: rateDate,
      exchange_rate_effective_date: tomorrow,
      bcv_rate: "300.00000000",
    });

    const reconciliation = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.sale_items WHERE organization_id=$1 AND sale_id=$2) AS lines,
         (SELECT count(*)::int FROM public.payments WHERE organization_id=$1 AND sale_id=$2) AS payments,
         (SELECT count(*)::int FROM public.warehouse_inventory_movements WHERE organization_id=$1 AND reference_type='sale' AND reference_id=$2) AS movements,
         (SELECT count(*)::int FROM public.audit_logs WHERE organization_id=$1 AND action='sale.completed' AND entity_id=$2::text) AS audits
      `,
      [organizationId, sale.id],
    );
    expect(reconciliation.rows[0]).toEqual({ lines: 1, payments: 1, movements: 1, audits: 1 });

    await client.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [fxFutureRateId]);
    await expect(client.query(
      "UPDATE public.sales SET operation_date=operation_date + 1 WHERE id=$1", [sale.id],
    )).rejects.toThrow(/SALE_BCV_DATE_SNAPSHOT_IMMUTABLE/);
    await expect(client.query(
      "UPDATE public.sales SET exchange_rate_effective_date=exchange_rate_effective_date + 1 WHERE id=$1", [sale.id],
    )).rejects.toThrow(/SALE_BCV_DATE_SNAPSHOT_IMMUTABLE/);
    const preserved = await client.query(
      "SELECT operation_date::text,exchange_rate_effective_date::text,exchange_rate_snapshot::text FROM public.sales WHERE id=$1",
      [sale.id],
    );
    expect(preserved.rows[0]).toEqual({
      operation_date: rateDate,
      exchange_rate_effective_date: tomorrow,
      exchange_rate_snapshot: "300.00000000",
    });
  });

  it("rejects a closed operator shift", async () => {
    await seedBalance("2.000");
    await client.query(
      `UPDATE public.register_shifts
          SET closed_at=now(),closing_cash_usd=0,closing_cash_ves=0,closed_by_user_id=$2
        WHERE organization_id=$1 AND id=$3`,
      [organizationId, userId, shiftId],
    );
    try {
      const response = await request(checkoutBody("1.000", "23.8500"), "closed-shift-" + crypto.randomUUID());
      expect(response.status).toBe(409);
      expect((await response.json() as { error: string }).error).toBe("OPEN_SHIFT_REQUIRED");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
    } finally {
      // This suite intentionally closes the original shift above. Restore an
      // active shift before the following lock-order test so checkout reaches
      // findApplicableCheckoutRate() instead of returning OPEN_SHIFT_REQUIRED.
      const reopenedShift = await client.query<{ id: string }>(
        "INSERT INTO public.register_shifts(organization_id,branch_id,register_id,cashier_user_id) VALUES($1,$2,$3,$4) RETURNING id",
        [organizationId, branchId, registerId, userId],
      );
      shiftId = reopenedShift.rows[0]!.id;
    }
  });



  it("checkout waits for a sync failure that locked BCV first and then rejects with 409", async () => {
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",[rateId]);
    await setBcvSyncState("inserted");
    const eligible = await client.query("SELECT * FROM public.select_bcv_rate_for_operation($1::date)",[rateDate]);
    expect(eligible.rows).toHaveLength(1);
    await seedBalance("2.000");
    await producerClient.query("BEGIN");
    let responsePromise: Promise<Response> | null = null;
    try {
      await producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN' WHERE singleton=true",
      );
      let settled = false;
      responsePromise = request(checkoutBody("1.000","23.8500"),"sync-fails-first-"+crypto.randomUUID())
        .finally(() => { settled = true; });
      await new Promise((resolve) => setTimeout(resolve,100));
      expect(settled).toBe(false);
      await producerClient.query("COMMIT");
      const response = await responsePromise;
      expect(response.status).toBe(409);
      expect((await response.json() as {error:string}).error).toBe("BCV_RATE_NOT_CURRENT");
      expect((await readBalance()).on_hand_quantity).toBe("2.000");
    } finally {
      await producerClient.query("ROLLBACK").catch(() => undefined);
      if(responsePromise) await responsePromise.catch(() => undefined);
      await setBcvSyncState("inserted");
    }
  });

  it("lets a checkout-side shared lock finish before a waiting sync update", async () => {
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",[rateId]);
    await setBcvSyncState("inserted");
    const eligible = await client.query("SELECT * FROM public.select_bcv_rate_for_operation($1::date)",[rateDate]);
    expect(eligible.rows).toHaveLength(1);
    await runtimeClient.query("BEGIN");
    try {
      const locked = await runtimeClient.query("SELECT * FROM public.lock_bcv_sync_state_with_error()");
      expect(locked.rows[0]?.last_outcome).toBe("inserted");
      let syncSettled = false;
      const sync = producerClient.query(
        "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN' WHERE singleton=true",
      ).finally(() => { syncSettled = true; });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(syncSettled).toBe(false);
      await runtimeClient.query("COMMIT");
      await sync;
      expect(syncSettled).toBe(true);
    } finally {
      await runtimeClient.query("ROLLBACK").catch(() => undefined);
      await setBcvSyncState("inserted");
    }
  });

  it("allows N parallel checkouts to share the same eligible BCV rate and sync snapshot", async () => {
    // The closed-shift test above restores shiftId in finally; reuse that
    // active shift rather than violating the one-open-shift-per-register index.
    await client.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1",[rateId]);
    await setBcvSyncState("inserted");
    const eligible = await client.query("SELECT * FROM public.select_bcv_rate_for_operation($1::date)",[rateDate]);
    expect(eligible.rows).toHaveLength(1);
    await seedBalance("10.000");
    const keys = Array.from({ length: 4 }, () => "parallel-bcv-0027-" + crypto.randomUUID());
    const responses = await Promise.all(keys.map((key) => request(checkoutBody("1.000", "23.8500"), key)));
    const outcomes = await Promise.all(responses.map(async (response) => ({ status: response.status, body: await response.clone().text() })));
    expect(outcomes, JSON.stringify(outcomes)).toEqual([
      { status: 201, body: expect.any(String) },
      { status: 201, body: expect.any(String) },
      { status: 201, body: expect.any(String) },
      { status: 201, body: expect.any(String) },
    ]);
    const sales = await client.query(
      "SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key=ANY($2::text[]) AND status='completed'",
      [organizationId, keys],
    );
    expect(sales.rows[0].count).toBe(4);
    expect((await readBalance()).on_hand_quantity).toBe("6.000");
  });

  it("rolls back all runtime side effects for uncovered past and future BCV rates", async () => {
    await seedBalance("10.000");
    const dates = await client.query<{ past: string; future: string }>(
      "SELECT ($1::date - 1)::text AS past,($1::date + 6)::text AS future", [rateDate],
    );
    const candidates: Array<{ id: string; rate: string; previous: { rate: string; validation_status: string; fetched_at: Date } | null; created: boolean }> = [];
    try {
      for (const effectiveDate of [dates.rows[0]!.past, dates.rows[0]!.future]) {
        const existing = await client.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
          "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
          [BCV_SOURCE, effectiveDate],
        );
        if (existing.rows[0]) {
          const prior = existing.rows[0];
          await client.query(
            "UPDATE public.exchange_rates SET rate=333.12345678,validation_status='valid',fetched_at=pg_catalog.clock_timestamp() WHERE id=$1",
            [prior.id],
          );
          candidates.push({ id: prior.id, rate: "333.12345678", previous: prior, created: false });
        } else {
          const inserted = await client.query<{ id: string }>(
            "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',333.12345678,$1,$2::date,'valid') RETURNING id",
            [BCV_SOURCE, effectiveDate],
          );
          candidates.push({ id: inserted.rows[0]!.id, rate: "333.12345678", previous: null, created: true });
        }
      }
      await setBcvSyncState("inserted", rateDate, true);

      for (const candidate of candidates) {
        const key = "direct-uncovered-0027-" + crypto.randomUUID();
        let saleId = "";
        await runtimeClient.query("BEGIN");
        try {
          const inserted = await runtimeClient.query<{ id: string }>(
            `INSERT INTO public.sales (
               organization_id,idempotency_key,status,subtotal_usd,total_usd,
               exchange_rate_id,exchange_rate_snapshot,total_ves_snapshot,created_by,
               branch_id,register_shift_id,warehouse_id,settlement_currency,request_hash,fx_source
             ) VALUES ($1,$2,'draft',1.0000,1.0000,$3,$4::numeric,$5::numeric,$6,$7,$8,$9,'USD',$10,'bcv_official')
             RETURNING id`,
            [organizationId,key,candidate.id,candidate.rate,convertUsdToVes("1.0000",candidate.rate),userId,branchId,shiftId,warehouseId,"c".repeat(64)],
          );
          saleId = inserted.rows[0]!.id;
          await runtimeClient.query(
            `INSERT INTO public.sale_items
              (organization_id,sale_id,product_id,product_name_snapshot,sku_snapshot,quantity,unit_price_usd,unit_cost_usd,line_total_usd,line_total_ves)
             VALUES ($1,$2,$3,'Checkout Product','DIRECT-0027-UNCOVERED',1.000,1.0000,0.5000,1.0000,$4::numeric)`,
            [organizationId,saleId,productId,convertUsdToVes("1.0000",candidate.rate)],
          );
          await runtimeClient.query(
            `INSERT INTO public.warehouse_inventory_movements
              (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,reason,reference_type,reference_id,actor_user_id)
             VALUES ($1,$2,$3,$4,'sale',-1.000,0.5000,'Uncovered BCV 0027 rollback','sale',$5,$6)`,
            [organizationId,branchId,warehouseId,productId,saleId,userId],
          );
          await runtimeClient.query(
            `INSERT INTO public.payments
              (organization_id,sale_id,method,currency,amount,usd_equivalent_snapshot,exchange_rate_snapshot,reference,received_by,allocation_position)
             VALUES ($1,$2,'cash','USD',1.0000,1.0000,$3::numeric,NULL,$4,1)`,
            [organizationId,saleId,candidate.rate,userId],
          );
          await runtimeClient.query(
            "INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'sale.completed','sale',$3,'{}'::jsonb)",
            [organizationId,userId,saleId],
          );
          await expect(runtimeClient.query(
            "UPDATE public.sales SET status='completed',completed_at=pg_catalog.clock_timestamp() WHERE id=$1", [saleId],
          )).rejects.toThrow(/SALE_REQUIRES_CURRENT_BCV_RATE/);
        } finally {
          await runtimeClient.query("ROLLBACK");
        }

        const counts = await client.query(
          `SELECT
             (SELECT count(*)::int FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2 AND status='completed') AS completed_sales,
             (SELECT count(*)::int FROM public.payments WHERE organization_id=$1 AND sale_id=$3) AS payments,
             (SELECT count(*)::int FROM public.warehouse_inventory_movements WHERE organization_id=$1 AND reference_type='sale' AND reference_id=$3) AS movements,
             (SELECT count(*)::int FROM public.audit_logs WHERE organization_id=$1 AND action='sale.completed' AND entity_id=$3::text) AS audits`,
          [organizationId,key,saleId],
        );
        expect(counts.rows[0]).toEqual({ completed_sales: 0, payments: 0, movements: 0, audits: 0 });
      }
      expect((await readBalance()).on_hand_quantity).toBe("10.000");
    } finally {
      for (const candidate of candidates) {
        if (candidate.created) {
          await client.query("DELETE FROM public.exchange_rates WHERE id=$1", [candidate.id]);
        } else if (candidate.previous) {
          await client.query(
            "UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1",
            [candidate.id,candidate.previous.rate,candidate.previous.validation_status,candidate.previous.fetched_at],
          );
        }
      }
      await setBcvSyncState("inserted");
    }
  });

  it("rolls back every direct runtime write when BCV becomes ineligible before sale completion", async () => {
    await seedBalance("10.000");
    const key = "direct-runtime-rollback-" + crypto.randomUUID();
    await producerClient.query(
      "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN',updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
    );
    await runtimeClient.query("BEGIN");
    let saleId = "";
    try {
      const inserted = await runtimeClient.query<{ id: string }>(
        `INSERT INTO public.sales (
           organization_id,idempotency_key,status,subtotal_usd,total_usd,
           exchange_rate_id,exchange_rate_snapshot,total_ves_snapshot,created_by,
           branch_id,register_shift_id,warehouse_id,settlement_currency,request_hash,fx_source
         ) VALUES ($1,$2,'draft',1.0000,1.0000,$3,$4::numeric,$5::numeric,$6,$7,$8,$9,'USD',$10,'bcv_official')
         RETURNING id`,
        [organizationId,key,rateId,"250.12345678",convertUsdToVes("1.0000","250.12345678"),userId,branchId,shiftId,warehouseId,"a".repeat(64)],
      );
      saleId = inserted.rows[0]!.id;
      await runtimeClient.query(
        `INSERT INTO public.sale_items
          (organization_id,sale_id,product_id,product_name_snapshot,sku_snapshot,quantity,unit_price_usd,unit_cost_usd,line_total_usd,line_total_ves)
         VALUES ($1,$2,$3,'Checkout Product','DIRECT-0027',1.000,1.0000,0.5000,1.0000,$4::numeric)`,
        [organizationId,saleId,productId,convertUsdToVes("1.0000","250.12345678")],
      );
      await runtimeClient.query(
        `INSERT INTO public.warehouse_inventory_movements
          (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,reason,reference_type,reference_id,actor_user_id)
         VALUES ($1,$2,$3,$4,'sale',-1.000,0.5000,'Direct 0027 rollback','sale',$5,$6)`,
        [organizationId,branchId,warehouseId,productId,saleId,userId],
      );
      await runtimeClient.query(
        `INSERT INTO public.payments
          (organization_id,sale_id,method,currency,amount,usd_equivalent_snapshot,exchange_rate_snapshot,reference,received_by,allocation_position)
         VALUES ($1,$2,'cash','USD',1.0000,1.0000,250.12345678,NULL,$3,1)`,
        [organizationId,saleId,userId],
      );
      await runtimeClient.query(
        "INSERT INTO public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'sale.completed','sale',$3,'{}'::jsonb)",
        [organizationId,userId,saleId],
      );
      await expect(runtimeClient.query("UPDATE public.sales SET status='completed',completed_at=pg_catalog.clock_timestamp() WHERE id=$1",[saleId]))
        .rejects.toThrow(/SALE_REQUIRES_CURRENT_BCV_RATE/);
    } finally {
      await runtimeClient.query("ROLLBACK");
      await setBcvSyncState("inserted");
    }
    const counts = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.sales WHERE organization_id=$1 AND idempotency_key=$2 AND status='completed') AS completed_sales,
         (SELECT count(*)::int FROM public.payments WHERE organization_id=$1 AND sale_id=$3) AS payments,
         (SELECT count(*)::int FROM public.warehouse_inventory_movements WHERE organization_id=$1 AND reference_type='sale' AND reference_id=$3) AS movements,
         (SELECT count(*)::int FROM public.audit_logs WHERE organization_id=$1 AND action='sale.completed' AND entity_id=$3::text) AS audits`,
      [organizationId,key,saleId],
    );
    expect(counts.rows[0]).toEqual({ completed_sales: 0, payments: 0, movements: 0, audits: 0 });
    expect((await readBalance()).on_hand_quantity).toBe("10.000");
  });

  it("rejects fractional checkout quantities for integer products", async () => {
    await client.query("UPDATE public.products SET quantity_mode='integer' WHERE organization_id=$1 AND id=$2", [organizationId, productId]);
    const response = await request(checkoutBody("0.500", "11.9250"), "integer-quantity-" + crypto.randomUUID());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INTEGER_PRODUCT_QUANTITY_MUST_BE_WHOLE" });
    const sales = await client.query("SELECT count(*)::int AS count FROM public.sales WHERE organization_id=$1 AND idempotency_key LIKE 'integer-quantity-%'", [organizationId]);
    expect(sales.rows[0]?.count).toBe(0);
  });

});
