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
const isCi = Boolean(env?.CI);
if (isCi && (!adminUrl || !runtimeUrl)) throw new Error("CI requires direct admin and runtime PostgreSQL logins for register-shift API integration tests.");

type Role = "owner" | "admin" | "cashier" | "inventory";
type Fixture = { organizationId: string; branchId: string; userId: string; token: string; registerId: string };

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe.skipIf(!adminUrl || !runtimeUrl)("own register-shift API against PostgreSQL runtime LOGIN", () => {
  let admin: Client;
  let runtime: Client;
  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    runtime = new Client({ connectionString: runtimeUrl });
    await Promise.all([admin.connect(), runtime.connect()]);
  });
  afterAll(async () => {
    if (runtime) await runtime.end();
    if (admin) await admin.end();
  });

  async function seed(role: Role): Promise<Fixture> {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const org = await admin.query<{ id: string }>("INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id", ["Shift API " + suffix, "shift-api-" + suffix]);
    const organizationId = org.rows[0]!.id;
    const user = await admin.query<{ id: string }>("INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id", ["shift-api-" + suffix + "@example.invalid", role]);
    const userId = user.rows[0]!.id;
    await admin.query("INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)", [organizationId, userId, role]);
    const branch = await admin.query<{ id: string }>("INSERT INTO branches (organization_id, name, slug) VALUES ($1, $2, $3) RETURNING id", [organizationId, "Main", "main-" + suffix]);
    const branchId = branch.rows[0]!.id;
    await admin.query("INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)", [organizationId, branchId, userId]);
    const register = await admin.query<{ id: string }>("INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id", [organizationId, branchId, "Front", "front-" + suffix]);
    const token = "shift-api-session-" + crypto.randomUUID();
    await admin.query("INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')", [userId, await sha256Hex(token)]);
    return { organizationId, branchId, userId, token, registerId: register.rows[0]!.id };
  }

  function root(f: Fixture) { return "/api/orgs/" + f.organizationId + "/branches/" + f.branchId; }
  async function request(f: Fixture, method: string, path: string, body?: unknown): Promise<Response> {
    return app.fetch(new Request("https://api.example" + path, {
      method,
      headers: { Cookie: "microapp_session=" + f.token, ...(method === "POST" ? { Origin: "https://frontend.example", "Content-Type": "application/json" } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { DATABASE_URL: runtimeUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }
  async function open(f: Fixture, cashUsd = "10.0000", cashVes = "100.00") {
    return request(f, "POST", root(f) + "/register-shifts", { register_id: f.registerId, opening_cash_usd: cashUsd, opening_cash_ves: cashVes });
  }
  async function current(f: Fixture) { return request(f, "GET", root(f) + "/register-shifts/current"); }
  async function close(f: Fixture, shiftId: string, cashUsd = "12.0000", cashVes = "120.00") {
    return request(f, "POST", root(f) + "/register-shifts/" + shiftId + "/close", { closing_cash_usd: cashUsd, closing_cash_ves: cashVes });
  }

  it("lets Owner, Admin and Cashier open, read and close only their own shift", async () => {
    for (const role of ["owner", "admin", "cashier"] as const) {
      const f = await seed(role);
      const registers = await request(f, "GET", root(f) + "/registers");
      expect(registers.status).toBe(200);
      expect((await registers.json() as { items: Array<{ id: string }> }).items.map((x) => x.id)).toContain(f.registerId);
      expect((await current(f)).status).toBe(200);
      const opened = await open(f);
      expect(opened.status).toBe(201);
      const openedBody = await opened.json() as { shift: { id: string; cashier_user_id: string; opening_cash_usd: string; opening_cash_ves: string } };
      expect(openedBody.shift.cashier_user_id).toBe(f.userId);
      expect(openedBody.shift.opening_cash_usd).toBe("10.0000");
      expect(openedBody.shift.opening_cash_ves).toBe("100.00");
      const closed = await close(f, openedBody.shift.id);
      expect(closed.status).toBe(200);
      expect((await closed.json() as { replayed: boolean }).replayed).toBe(false);
      const replay = await close(f, openedBody.shift.id);
      expect(replay.status).toBe(200);
      expect((await replay.json() as { replayed: boolean }).replayed).toBe(true);
      expect((await close(f, openedBody.shift.id, "13.0000", "130.00")).status).toBe(409);
      await expect((await current(f)).json()).resolves.toMatchObject({ shift: null });
    }
  });

  it("denies Inventory and a member without active branch assignment", async () => {
    const inventory = await seed("inventory");
    expect((await open(inventory)).status).toBe(403);
    const owner = await seed("owner");
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const unassigned = await admin.query<{ id: string }>("INSERT INTO branches (organization_id, name, slug) VALUES ($1, $2, $3) RETURNING id", [owner.organizationId, "Unassigned", "unassigned-" + suffix]);
    const otherBranchId = unassigned.rows[0]!.id;
    await admin.query("INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, $3, $4)", [owner.organizationId, otherBranchId, "Other", "other-" + suffix]);
    const response = await request(owner, "GET", "/api/orgs/" + owner.organizationId + "/branches/" + otherBranchId + "/registers");
    expect(response.status).toBe(403);
  });

  it("does not allow a member to close a shift owned by another cashier", async () => {
    const first = await seed("cashier");
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const otherUser = await admin.query<{ id: string }>("INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id", ["other-" + suffix + "@example.invalid", "Other cashier"]);
    const otherUserId = otherUser.rows[0]!.id;
    await admin.query("INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'cashier')", [first.organizationId, otherUserId]);
    await admin.query("INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)", [first.organizationId, first.branchId, otherUserId]);
    const otherRegister = await admin.query<{ id: string }>("INSERT INTO registers (organization_id, branch_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id", [first.organizationId, first.branchId, "Other", "other-" + suffix]);
    const otherToken = "shift-api-other-" + crypto.randomUUID();
    await admin.query("INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')", [otherUserId, await sha256Hex(otherToken)]);
    const otherFixture: Fixture = { ...first, userId: otherUserId, token: otherToken, registerId: otherRegister.rows[0]!.id };
    const opened = await open(otherFixture);
    expect(opened.status).toBe(201);
    const shiftId = (await opened.json() as { shift: { id: string } }).shift.id;
    expect((await close(first, shiftId)).status).toBe(409);
  });

  it("serializes concurrent opens and keeps direct runtime table writes denied", async () => {
    const f = await seed("cashier");
    const results = await Promise.all([open(f), open(f)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const shift = (await (await current(f)).json() as { shift: { id: string } }).shift;
    await expect(runtime.query("INSERT INTO public.register_shifts (organization_id, branch_id, register_id, cashier_user_id) VALUES ($1, $2, $3, $4)", [f.organizationId, f.branchId, f.registerId, f.userId])).rejects.toMatchObject({ code: "42501" });
    await expect(runtime.query("UPDATE public.register_shifts SET opening_cash_usd = 11 WHERE id = $1", [shift.id])).rejects.toMatchObject({ code: "42501" });
  });
});
