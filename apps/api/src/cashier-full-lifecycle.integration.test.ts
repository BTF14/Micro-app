import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client {
    constructor(connectionString: string) { super({ connectionString }); }
  } };
});

const app = (await import("./index")).default;
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const runtimeUrl = env?.DATABASE_URL_RUNTIME ?? env?.DATABASE_URL;
const adminUrl = env?.DATABASE_URL_ADMIN;
const bcvUrl = env?.DATABASE_URL_BCV;
const isCi = Boolean(env?.CI);
const frontendOrigin = "https://cashier-lifecycle.example";
const googleEmail = `cashier-lifecycle-${crypto.randomUUID()}@example.test`;
const googleSub = `google-cashier-${crypto.randomUUID()}`;
const pepper = "cashier-lifecycle-test-hmac-pepper";
const oauthEnv = {
  DATABASE_URL: runtimeUrl,
  FRONTEND_ORIGIN: frontendOrigin,
  GOOGLE_CLIENT_ID: "cashier-lifecycle-client",
  GOOGLE_CLIENT_SECRET: pepper,
  GOOGLE_REDIRECT_URI: "https://api.example/auth/google/callback",
};
const isDisposable = (value: string | undefined, role: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname === "/microapp_test" && url.username === role &&
      ["postgres:", "postgresql:"].includes(url.protocol);
  } catch { return false; }
};
if (isCi && (!isDisposable(runtimeUrl, "microapp_runtime") ||
    !isDisposable(adminUrl, "microapp") ||
    !isDisposable(bcvUrl, "microapp_bcv_sync"))) {
  throw new Error("Cashier lifecycle requires disposable PostgreSQL 18 LOGINs microapp_runtime, microapp admin, and microapp_bcv_sync; refusing to skip or use a remote database.");
}
if ((runtimeUrl || adminUrl || bcvUrl) &&
    (!isDisposable(runtimeUrl, "microapp_runtime") || !isDisposable(adminUrl, "microapp") ||
     !isDisposable(bcvUrl, "microapp_bcv_sync"))) {
  throw new Error("Refusing non-local or non-disposable database URLs in cashier lifecycle test.");
}

function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const combined = response.headers.get("set-cookie");
  return combined ? combined.split(/,(?=\s*[A-Za-z0-9_]+=)/) : [];
}
function cookieMap(response: Response): Record<string, string> {
  const result: Record<string, string> = {};
  for (const cookie of setCookies(response)) {
    const pair = cookie.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    if (index > 0) result[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return result;
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function integrationIp(): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return `2001:db8:${id.slice(0,4)}:${id.slice(4,8)}:${id.slice(8,12)}:${id.slice(12,16)}:${id.slice(16,20)}:${id.slice(20,24)}`;
}
async function apiRequest(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Cookie", `microapp_session=${token}`);
  return app.fetch(new Request("https://api.example" + path, { ...init, headers }), {
    ...oauthEnv,
    DATABASE_URL: runtimeUrl,
  });
}
async function loginAsCashier(): Promise<{ token: string; cookie: string }> {
  const start = await apiRequest("/auth/google", {
    headers: { "CF-Connecting-IP": integrationIp() },
  });
  expect(start.status).toBe(302);
  expect(start.headers.get("location")).toContain("accounts.google.com");
  const oauthCookies = cookieMap(start);
  expect(oauthCookies.microapp_oauth_state).toBeTruthy();
  expect(oauthCookies.microapp_oauth_verifier).toBeTruthy();
  const oauthCookieHeader = Object.entries(oauthCookies).map(([key, value]) => `${key}=${value}`).join("; ");
  const cookieAttributes = setCookies(start).join("\n");
  expect(cookieAttributes).toContain("HttpOnly");
  expect(cookieAttributes).toContain("Secure");
  expect(cookieAttributes).toContain("SameSite=Lax");
  expect(cookieAttributes).toContain("Path=/auth/google");

  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
    const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "synthetic-google-access-token" }), { status: 200 });
    }
    if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
      return new Response(JSON.stringify({
        sub: googleSub, email: googleEmail, email_verified: true, name: "Synthetic Cashier",
      }), { status: 200 });
    }
    throw new Error("Unexpected external request in isolated OAuth test: " + new URL(url).origin);
  });
  try {
    const callback = await apiRequest(
      "/auth/google/callback?code=synthetic-code&state=" + encodeURIComponent(oauthCookies.microapp_oauth_state!),
      { headers: { Cookie: oauthCookieHeader, "CF-Connecting-IP": integrationIp() } },
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(frontendOrigin + "/");
    const sessionCookie = cookieMap(callback).microapp_session;
    expect(sessionCookie).toBeTruthy();
    const sessionSetCookie = setCookies(callback).find(cookie => cookie.startsWith("microapp_session=")) ?? "";
    expect(sessionSetCookie).toContain("HttpOnly");
    expect(sessionSetCookie).toContain("Secure");
    expect(sessionSetCookie).toContain("SameSite=Lax");
    expect(sessionSetCookie).toContain("Path=/");
    return { token: sessionCookie!, cookie: sessionSetCookie };
  } finally {
    fetchSpy.mockRestore();
  }
}

describe.skipIf(!isDisposable(runtimeUrl, "microapp_runtime") ||
  !isDisposable(adminUrl, "microapp") ||
  !isDisposable(bcvUrl, "microapp_bcv_sync"))(
  "Cashier authenticated full lifecycle — isolated PostgreSQL 18",
  () => {
    let admin: Client;
    let bcv: Client;
    let organizationId = "";
    let branchId = "";
    let foreignOrganizationId = "";
    let foreignBranchId = "";
    let otherBranchId = "";
    let cashierId = "";
    let inventoryUserId = "";
    let warehouseId = "";
    let registerId = "";
    let productId = "";
    let suffix = "";
    let rateId = "";
    let createdRate = false;
    let previousRate: { rate: string; validation_status: string; fetched_at: string } | null = null;
    let previousSync: {
      attempt_id: string | null; last_attempt_at: Date | null; last_success_at: Date | null;
      last_outcome: string | null; last_error_code: string | null;
      last_effective_date: string | null; updated_at: Date;
    } | null = null;

    beforeAll(async () => {
      admin = new Client({ connectionString: adminUrl });
      bcv = new Client({ connectionString: bcvUrl });
      await Promise.all([admin.connect(), bcv.connect()]);
      suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const org = await admin.query<{ id: string }>(
        "INSERT INTO public.organizations(name,slug) VALUES($1,$2) RETURNING id",
        ["Cashier lifecycle " + suffix, "cashier-lifecycle-" + suffix],
      );
      organizationId = org.rows[0]!.id;
      const cashier = await admin.query<{ id: string }>(
        "INSERT INTO public.app_users(email,display_name,google_sub) VALUES($1,$2,$3) RETURNING id",
        [googleEmail, "Synthetic Cashier", googleSub],
      );
      cashierId = cashier.rows[0]!.id;
      await admin.query("INSERT INTO public.auth_allowlist(email,added_by) VALUES($1,'cashier-lifecycle-test')", [googleEmail]);
      await admin.query(
        "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'cashier')",
        [organizationId, cashierId],
      );
      const branch = await admin.query<{ id: string }>(
        "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,'Assigned Branch',$2) RETURNING id",
        [organizationId, "assigned-" + suffix],
      );
      branchId = branch.rows[0]!.id;
      await admin.query(
        "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
        [organizationId, branchId, cashierId],
      );
      const otherBranch = await admin.query<{ id: string }>(
        "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,'Unassigned Branch',$2) RETURNING id",
        [organizationId, "unassigned-" + suffix],
      );
      otherBranchId = otherBranch.rows[0]!.id;
      const foreignOrg = await admin.query<{ id: string }>(
        "INSERT INTO public.organizations(name,slug) VALUES($1,$2) RETURNING id",
        ["Foreign tenant " + suffix, "foreign-" + suffix],
      );
      foreignOrganizationId = foreignOrg.rows[0]!.id;
      const foreignBranch = await admin.query<{ id: string }>(
        "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,'Foreign Branch',$2) RETURNING id",
        [foreignOrganizationId, "foreign-branch-" + suffix],
      );
      foreignBranchId = foreignBranch.rows[0]!.id;

      const warehouse = await admin.query<{ id: string }>(
        "INSERT INTO public.warehouses(organization_id,branch_id,code,name) VALUES($1,$2,$3,$4) RETURNING id",
        [organizationId, branchId, "wh-" + suffix, "Cashier lifecycle warehouse"],
      );
      warehouseId = warehouse.rows[0]!.id;
      const register = await admin.query<{ id: string }>(
        "INSERT INTO public.registers(organization_id,branch_id,name,code) VALUES($1,$2,$3,$4) RETURNING id",
        [organizationId, branchId, "Front register", "reg-" + suffix],
      );
      registerId = register.rows[0]!.id;
      const inventoryUser = await admin.query<{ id: string }>(
        "INSERT INTO public.app_users(email,display_name) VALUES($1,$2) RETURNING id",
        ["inventory-" + suffix + "@example.test", "Inventory fixture actor"],
      );
      inventoryUserId = inventoryUser.rows[0]!.id;
      await admin.query(
        "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'inventory')",
        [organizationId, inventoryUserId],
      );
      await admin.query(
        "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
        [organizationId, branchId, inventoryUserId],
      );
      const product = await admin.query<{ id: string }>(
        "INSERT INTO public.products(organization_id,sku,name,price_usd,cost_usd) VALUES($1,$2,$3,23.85,2.00) RETURNING id",
        [organizationId, "SKU-" + suffix, "Synthetic checkout product"],
      );
      productId = product.rows[0]!.id;

      const inventoryCount = await admin.query<{ id: string }>(
        `INSERT INTO public.inventory_counts
          (organization_id,branch_id,warehouse_id,count_type,reason,created_by)
         VALUES($1,$2,$3,'physical','Cashier lifecycle synthetic opening stock',$4) RETURNING id`,
        [organizationId, branchId, warehouseId, inventoryUserId],
      );
      await admin.query(
        `INSERT INTO public.inventory_count_lines
          (organization_id,branch_id,warehouse_id,count_id,product_id,counted_quantity,unit_cost_usd,
           expected_on_hand_quantity,expected_balance_version)
         VALUES($1,$2,$3,$4,$5,10.000,2.0000,0.000,0)`,
        [organizationId, branchId, warehouseId, inventoryCount.rows[0]!.id, productId],
      );
      await admin.query(
        "UPDATE public.inventory_counts SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1",
        [inventoryCount.rows[0]!.id, inventoryUserId],
      );
      await admin.query(
        `INSERT INTO public.warehouse_inventory_movements
          (organization_id,branch_id,warehouse_id,product_id,movement_type,quantity_delta,unit_cost_usd,
           reason,count_id,actor_user_id)
         VALUES($1,$2,$3,$4,'count_adjustment',10.000,2.0000,'Cashier lifecycle synthetic opening stock',$5,$6)`,
        [organizationId, branchId, warehouseId, productId, inventoryCount.rows[0]!.id, inventoryUserId],
      );

      const today = await admin.query<{ effective_date: string }>(
        "SELECT (now() AT TIME ZONE 'America/Caracas')::date::text AS effective_date",
      );
      const effectiveDate = today.rows[0]!.effective_date;
      const sync = await admin.query(
        `SELECT attempt_id::text AS attempt_id,last_attempt_at,last_success_at,last_outcome,
                last_error_code,last_effective_date::text AS last_effective_date,updated_at
           FROM public.bcv_sync_state WHERE singleton=true`,
      );
      previousSync = sync.rows[0] ?? null;
      await admin.query(
        `UPDATE public.bcv_sync_state SET last_outcome='inserted',last_success_at=now(),
           last_effective_date=$1::date,last_error_code=NULL,updated_at=now() WHERE singleton=true`,
        [effectiveDate],
      );
      const existing = await admin.query<{ id: string; rate: string; validation_status: string; fetched_at: string }>(
        "SELECT id,rate::text,validation_status,fetched_at::text FROM public.exchange_rates WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=$1::date",
        [effectiveDate],
      );
      if (existing.rows[0]) {
        rateId = existing.rows[0].id;
        previousRate = existing.rows[0];
        await admin.query(
          "UPDATE public.exchange_rates SET rate=250.12345678,validation_status='valid',fetched_at=now() WHERE id=$1",
          [rateId],
        );
      } else {
        const inserted = await admin.query<{ id: string }>(
          `INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status)
           VALUES('USD','VES',250.12345678,'BCV_OFFICIAL_HTML_V1',$1::date,'valid') RETURNING id`,
          [effectiveDate],
        );
        rateId = inserted.rows[0]!.id;
        createdRate = true;
      }
    });

    afterAll(async () => {
      if (!admin) return;
      // All application records live only in the per-job PostgreSQL 18 service.
      // Restore the global BCV singleton/rate if the suite is ever reused locally.
      if (rateId) {
        if (createdRate) await admin.query("DELETE FROM public.exchange_rates WHERE id=$1", [rateId]);
        else if (previousRate) await admin.query(
          "UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4::timestamptz WHERE id=$1",
          [rateId, previousRate.rate, previousRate.validation_status, previousRate.fetched_at],
        );
      }
      if (previousSync) await admin.query(
        `UPDATE public.bcv_sync_state SET attempt_id=$1::uuid,last_attempt_at=$2::timestamptz,
           last_success_at=$3::timestamptz,last_outcome=$4,last_error_code=$5,
           last_effective_date=$6::date,updated_at=$7::timestamptz WHERE singleton=true`,
        [previousSync.attempt_id, previousSync.last_attempt_at, previousSync.last_success_at,
         previousSync.last_outcome, previousSync.last_error_code, previousSync.last_effective_date, previousSync.updated_at],
      );
      await bcv.end();
      await admin.end();
    });

    it("runs OAuth → authenticated cashier → inventory → open shift → checkout → reconcile/close → logout continuously", async () => {
      const health = await apiRequest("/health");
      expect(health.status).toBe(200);
      expect(health.headers.get("x-frame-options")).toBe("DENY");
      expect(health.headers.get("x-content-type-options")).toBe("nosniff");
      expect(health.headers.get("referrer-policy")).toBe("no-referrer");

      const { token } = await loginAsCashier();
      const me = await apiRequest("/auth/me", {}, token);
      expect(me.status).toBe(200);
      expect(me.headers.get("cache-control")).toContain("no-store");
      expect(me.headers.get("x-frame-options")).toBe("DENY");
      const identity = await me.json() as { user: { id: string }; organizations: Array<{ id: string; role: string }> };
      expect(identity.user.id).toBe(cashierId);
      expect(identity.organizations).toContainEqual(expect.objectContaining({ id: organizationId, role: "cashier" }));

      const inventoryPath = `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/inventory`;
      const inventory = await apiRequest(inventoryPath, {}, token);
      expect(inventory.status).toBe(200);
      expect(inventory.headers.get("cache-control")).toContain("no-store");

      const shiftPath = `/api/orgs/${organizationId}/branches/${branchId}/register-shifts`;
      const open = await apiRequest(shiftPath, {
        method: "POST",
        headers: { Origin: frontendOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ register_id: registerId, opening_cash_usd: "10.0000", opening_cash_ves: "100.00" }),
      }, token);
      expect(open.status).toBe(201);
      expect(open.headers.get("cache-control")).toContain("no-store");
      const opened = await open.json() as { shift: { id: string; cashier_user_id: string; opening_cash_usd: string; opening_cash_ves: string } };
      expect(opened.shift.cashier_user_id).toBe(cashierId);
      expect(opened.shift.opening_cash_usd).toBe("10.0000");
      expect(opened.shift.opening_cash_ves).toBe("100.00");

      const foreignBranchAttempt = await apiRequest(
        `/api/orgs/${organizationId}/branches/${otherBranchId}/register-shifts`,
        { method: "POST", headers: { Origin: frontendOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ register_id: registerId, opening_cash_usd: "0.0000", opening_cash_ves: "0.00" }) },
        token,
      );
      expect([401, 403, 404]).toContain(foreignBranchAttempt.status);
      const crossTenantAttempt = await apiRequest(
        `/api/orgs/${foreignOrganizationId}/branches/${foreignBranchId}/register-shifts`,
        { method: "POST", headers: { Origin: frontendOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ register_id: registerId, opening_cash_usd: "0.0000", opening_cash_ves: "0.00" }) },
        token,
      );
      expect([401, 403, 404]).toContain(crossTenantAttempt.status);

      const checkout = await apiRequest(
        `/api/orgs/${organizationId}/branches/${branchId}/checkout`,
        {
          method: "POST",
          headers: {
            Origin: frontendOrigin, "Content-Type": "application/json",
            "CF-Connecting-IP": "203.0.113.77", "Idempotency-Key": "cashier-lifecycle-" + suffix,
          },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            lines: [{ product_id: productId, quantity: "1.250" }],
            payments: [{ method: "cash", currency: "USD", amount: "29.8125" }],
          }),
        },
        token,
      );
      expect(checkout.status).toBe(201);
      const sale = await checkout.json() as { id: string; status: string; total_usd: string; total_ves: string; bcv_rate: string };
      expect(sale.status).toBe("completed");
      expect(sale.total_usd).toBe("29.8125");
      expect(sale.bcv_rate).toBe("250.12345678");

      const shiftForeignClose = await apiRequest(
        `/api/orgs/${organizationId}/branches/${branchId}/register-shifts/${crypto.randomUUID()}/close`,
        { method: "POST", headers: { Origin: frontendOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ closing_cash_usd: "39.8125", closing_cash_ves: "100.00" }) },
        token,
      );
      expect(shiftForeignClose.status).toBe(409);

      const close = await apiRequest(
        `${shiftPath}/${opened.shift.id}/close`,
        { method: "POST", headers: { Origin: frontendOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ closing_cash_usd: "39.8125", closing_cash_ves: "100.00" }) },
        token,
      );
      expect(close.status).toBe(200);
      const closed = await close.json() as { shift: { closed_at: string; closing_cash_usd: string; closing_cash_ves: string } };
      expect(closed.shift.closed_at).toBeTruthy();
      expect(closed.shift.closing_cash_usd).toBe("39.8125");
      expect(closed.shift.closing_cash_ves).toBe("100.00");

      const persisted = await admin.query<{
        sale_status: string; created_by: string; shift_id: string; payment_count: string;
        movement_count: string; balance: string; shift_closed_by: string;
      }>(
        `SELECT s.status AS sale_status,s.created_by::text,s.register_shift_id::text AS shift_id,
           (SELECT count(*)::text FROM public.payments p WHERE p.sale_id=s.id) AS payment_count,
           (SELECT count(*)::text FROM public.warehouse_inventory_movements m WHERE m.reference_id=s.id AND m.reference_type='sale') AS movement_count,
           (SELECT on_hand_quantity::text FROM public.inventory_balances b WHERE b.organization_id=s.organization_id AND b.warehouse_id=s.warehouse_id AND b.product_id=$2) AS balance,
           (SELECT closed_by_user_id::text FROM public.register_shifts rs WHERE rs.id=s.register_shift_id) AS shift_closed_by
         FROM public.sales s WHERE s.id=$1`,
        [sale.id, productId],
      );
      expect(persisted.rows).toEqual([{
        sale_status: "completed", created_by: cashierId, shift_id: opened.shift.id,
        payment_count: "1", movement_count: "1", balance: "8.750", shift_closed_by: cashierId,
      }]);
      const audit = await admin.query<{ action: string; actor_user_id: string }>(
        `SELECT action,actor_user_id::text FROM public.audit_logs
          WHERE organization_id=$1 AND entity_id IN ($2,$3)
          ORDER BY action`,
        [organizationId, sale.id, opened.shift.id],
      );
      expect(audit.rows).toEqual(expect.arrayContaining([
        { action: "register_shift.opened", actor_user_id: cashierId },
        { action: "register_shift.closed", actor_user_id: cashierId },
        { action: "sale.completed", actor_user_id: cashierId },
      ]));

      const logout = await apiRequest("/auth/logout", {
        method: "POST", headers: { Origin: frontendOrigin },
      }, token);
      expect(logout.status).toBe(204);
      expect(setCookies(logout).join("\n")).toContain("Max-Age=0");
      const afterLogout = await apiRequest("/auth/me", {}, token);
      expect(afterLogout.status).toBe(401);
    });
  },
);
