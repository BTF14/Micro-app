import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client { constructor(connectionString: string) { super({ connectionString }); } } };
});

const app = (await import("./index")).default;
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const adminUrl = env?.DATABASE_URL_ADMIN ?? env?.DATABASE_URL;
const runtimeUrl = env?.DATABASE_URL_RUNTIME ?? env?.DATABASE_URL;
const isCi = Boolean(env?.CI);
if (isCi && (!adminUrl || !runtimeUrl)) throw new Error("CI requires direct admin and runtime PostgreSQL logins for organization structure integration tests.");

type Role = "owner" | "admin" | "cashier" | "inventory";
type UserFixture = { id: string; token: string };
type Fixture = { organizationId: string; users: Record<Role, UserFixture>; branchId?: string; registerId?: string };
const frontendOrigin = "https://frontend.example";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe.skipIf(!adminUrl || !runtimeUrl)("owner-only organization structure API on PostgreSQL runtime LOGIN", () => {
  let admin: Client;
  let runtime: Client;
  const organizations: string[] = [];

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    runtime = new Client({ connectionString: runtimeUrl });
    await Promise.all([admin.connect(), runtime.connect()]);
  });

  afterAll(async () => {
    if (runtime) await runtime.end();
    if (admin) {
      for (const organizationId of organizations) {
        await admin.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM organization_members WHERE organization_id=$1)", [organizationId]);
        await admin.query("DELETE FROM organizations WHERE id=$1", [organizationId]);
      }
      await admin.end();
    }
  });

  async function seed(): Promise<Fixture> {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
    const org = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name,slug) VALUES ($1,$2) RETURNING id",
      ["Structure API " + suffix, "structure-api-" + suffix],
    );
    const organizationId = org.rows[0]!.id;
    organizations.push(organizationId);
    const users = {} as Record<Role, UserFixture>;
    for (const role of ["owner", "admin", "cashier", "inventory"] as const) {
      const user = await admin.query<{ id: string }>(
        "INSERT INTO app_users (email,display_name) VALUES ($1,$2) RETURNING id",
        [role + "-" + suffix + "@example.test", role + " " + suffix],
      );
      const id = user.rows[0]!.id;
      await admin.query(
        "INSERT INTO organization_members (organization_id,user_id,role,is_active) VALUES ($1,$2,$3,true)",
        [organizationId,id,role],
      );
      const token = "structure-session-" + crypto.randomUUID();
      await admin.query(
        "INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 day')",
        [id,await sha256Hex(token)],
      );
      users[role] = { id, token };
    }
    return { organizationId, users };
  }

  function request(f: Fixture, role: Role, method: string, path: string, body?: unknown, origin = frontendOrigin) {
    return app.fetch(new Request("https://api.example" + path, {
      method,
      headers: {
        Cookie: "microapp_session=" + f.users[role].token,
        ...(method === "GET" ? {} : { Origin: origin, "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { DATABASE_URL: runtimeUrl, FRONTEND_ORIGIN: frontendOrigin });
  }

  it("completes branch → warehouse → register → member assignment and exposes immediate reads", async () => {
    const f = await seed();
    const root = "/api/orgs/" + f.organizationId;
    const empty = await request(f, "owner", "GET", root + "/structure");
    expect(empty.status).toBe(200);
    expect(await empty.json()).toMatchObject({ branches: [], members: expect.any(Array) });

    const createdBranch = await request(f, "owner", "POST", root + "/branches", { name: "North Branch", slug: "North Branch" });
    expect(createdBranch.status).toBe(201);
    const branchBody = await createdBranch.json() as { branch: { id: string; slug: string } };
    expect(branchBody.branch.slug).toBe("north-branch");
    f.branchId = branchBody.branch.id;

    const ownerAssignment = await admin.query(
      "SELECT is_active FROM branch_memberships WHERE organization_id=$1 AND branch_id=$2 AND user_id=$3",
      [f.organizationId,f.branchId,f.users.owner.id],
    );
    expect(ownerAssignment.rows).toEqual([{ is_active: true }]);

    const warehouse = await request(f, "owner", "POST", root + "/branches/" + f.branchId + "/warehouses", { name: "Main Warehouse", code: "Main Warehouse" });
    expect(warehouse.status).toBe(201);
    expect(await warehouse.json()).toMatchObject({ warehouse: { name: "Main Warehouse", code: "main-warehouse" } });

    const register = await request(f, "owner", "POST", root + "/branches/" + f.branchId + "/registers", { name: "Main Register", code: "Main Register" });
    expect(register.status).toBe(201);
    const registerBody = await register.json() as { register: { id: string; code: string } };
    expect(registerBody.register.code).toBe("main-register");
    f.registerId = registerBody.register.id;

    const assigned = await request(f, "owner", "PATCH", root + "/branches/" + f.branchId + "/members/" + f.users.cashier.id, { is_active: true });
    expect(assigned.status).toBe(200);
    const read = await request(f, "owner", "GET", root + "/structure");
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toMatchObject({
      branches: [{ id: f.branchId, warehouses: [{ code: "main-warehouse" }], registers: [{ code: "main-register" }] }],
      members: expect.arrayContaining([expect.objectContaining({
        user_id: f.users.cashier.id,
        branch_memberships: { [f.branchId]: true },
      })]),
    });
  });

  it("rejects duplicate codes, cross-tenant branches, and non-owner roles", async () => {
    const f = await seed();
    const root = "/api/orgs/" + f.organizationId;
    const branchResponse = await request(f, "owner", "POST", root + "/branches", { name: "Branch", slug: "branch" });
    const branchId = (await branchResponse.json() as { branch: { id: string } }).branch.id;
    const firstWarehouse = await request(f, "owner", "POST", root + "/branches/" + branchId + "/warehouses", { name: "One", code: "one" });
    expect(firstWarehouse.status).toBe(201);
    const duplicate = await request(f, "owner", "POST", root + "/branches/" + branchId + "/warehouses", { name: "Duplicate", code: "ONE" });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: "STRUCTURE_DUPLICATE" });

    const other = await admin.query<{ id: string; branch_id: string }>(
      `WITH org AS (
         INSERT INTO organizations (name,slug) VALUES ($1,$2) RETURNING id
       ), branch AS (
         INSERT INTO branches (organization_id,name,slug)
         SELECT id,'Foreign','foreign' FROM org RETURNING id,organization_id
       )
       SELECT org.id, branch.id AS branch_id FROM org JOIN branch ON branch.organization_id=org.id`,
      ["Foreign Structure " + crypto.randomUUID(), "foreign-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10)],
    );
    const foreignOrgId = other.rows[0]!.id;
    const foreignBranchId = other.rows[0]!.branch_id;
    organizations.push(foreignOrgId);
    const crossBranch = await request(f, "owner", "POST", root + "/branches/" + foreignBranchId + "/registers", { name: "Foreign", code: "foreign" });
    expect(crossBranch.status).toBe(403);

    for (const role of ["admin", "cashier", "inventory"] as const) {
      expect((await request(f, role, "GET", root + "/structure")).status).toBe(403);
      expect((await request(f, role, "POST", root + "/branches", { name: "Denied", slug: "denied-" + role })).status).toBe(403);
    }
  });

  it("requires trusted origin and refuses to revoke a cashier assignment with an open shift", async () => {
    const f = await seed();
    const root = "/api/orgs/" + f.organizationId;
    const branchResponse = await request(f, "owner", "POST", root + "/branches", { name: "Branch", slug: "branch" });
    const branchId = (await branchResponse.json() as { branch: { id: string } }).branch.id;
    const registerResponse = await request(f, "owner", "POST", root + "/branches/" + branchId + "/registers", { name: "Till", code: "till" });
    const registerId = (await registerResponse.json() as { register: { id: string } }).register.id;

    const untrusted = await request(f, "owner", "POST", root + "/branches", { name: "Bad", slug: "bad" }, "https://attacker.example");
    expect(untrusted.status).toBe(403);
    expect(untrusted.headers.get("Cache-Control")).toContain("no-store");

    expect((await request(f, "owner", "PATCH", root + "/branches/" + branchId + "/members/" + f.users.cashier.id, { is_active: true })).status).toBe(200);
    const opened = await request(f, "cashier", "POST", root + "/branches/" + branchId + "/register-shifts", {
      register_id: registerId, opening_cash_usd: "0.0000", opening_cash_ves: "0.00",
    });
    expect(opened.status).toBe(201);
    const deactivate = await request(f, "owner", "PATCH", root + "/branches/" + branchId + "/members/" + f.users.cashier.id, { is_active: false });
    expect(deactivate.status).toBe(409);
    expect(await deactivate.json()).toMatchObject({ error: "STRUCTURE_CONFLICT" });
  });

  it("keeps runtime direct DML denied on organization structure tables", async () => {
    const privileges = await admin.query<{ allowed: boolean }>(
      `SELECT NOT EXISTS (
        SELECT 1 FROM unnest(ARRAY['public.branches','public.warehouses','public.registers','public.branch_memberships','public.organization_members']) AS t(name)
        WHERE has_table_privilege('microapp_runtime',t.name,'INSERT')
           OR has_table_privilege('microapp_runtime',t.name,'UPDATE')
           OR has_table_privilege('microapp_runtime',t.name,'DELETE')
           OR has_table_privilege('microapp_runtime',t.name,'TRUNCATE')
      ) AS allowed`,
    );
    expect(privileges.rows[0]?.allowed).toBe(true);
    await expect(runtime.query("INSERT INTO public.branches (organization_id,name,slug) VALUES ($1,'Denied','runtime-denied')", [crypto.randomUUID()])).rejects.toMatchObject({ code: "42501" });
  });
});
