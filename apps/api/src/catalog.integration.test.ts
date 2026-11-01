import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

// Exercise the real PostgreSQL protocol against the disposable CI database.
vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) {
        super({ connectionString });
      }
    },
  };
});

const app = (await import("./index")).default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);

if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip catalog PostgreSQL integration tests.");
}

type Role = "owner" | "admin" | "inventory" | "cashier";
type MemberFixture = { userId: string; token: string };

describe.skipIf(!databaseUrl)("catalog route against PostgreSQL", () => {
  let cleanupClient: Client | undefined;
  let organizationA = "";
  let organizationB = "";
  let inactiveOrganization = "";
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  const members = {} as Record<Role, MemberFixture>;
  let inactiveMember: MemberFixture;
  let inactiveUser: MemberFixture;
  let expiredMember: MemberFixture;
  let revokedMember: MemberFixture;
  let inactiveOrganizationMember: MemberFixture;

  async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function createOrganization(name: string, active: boolean): Promise<string> {
    const client = cleanupClient;
    if (!client) throw new Error("Integration database is not connected.");
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const result = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug, is_active) VALUES ($1, $2, $3) RETURNING id",
      [name + " " + suffix, "catalog-" + suffix, active],
    );
    const id = result.rows[0]!.id;
    organizationIds.push(id);
    return id;
  }

  async function createMember(
    organizationId: string,
    role: Role,
    options: { membershipActive?: boolean; userActive?: boolean; expired?: boolean; revoked?: boolean } = {},
  ): Promise<MemberFixture> {
    const client = cleanupClient;
    if (!client) throw new Error("Integration database is not connected.");

    const suffix = crypto.randomUUID();
    const userResult = await client.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name, is_active) VALUES ($1, $2, $3) RETURNING id",
      ["catalog-" + suffix + "@example.test", "Catalog Integration " + role, options.userActive ?? true],
    );
    const userId = userResult.rows[0]!.id;
    userIds.push(userId);

    await client.query(
      "INSERT INTO organization_members (organization_id, user_id, role, is_active) VALUES ($1, $2, $3, $4)",
      [organizationId, userId, role, options.membershipActive ?? true],
    );

    const token = "catalog-session-" + crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    await client.query(
      "INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at, revoked_at)" +
        " VALUES ($1, $2," +
        " CASE WHEN $3 THEN now() - interval '2 hours' ELSE now() - interval '1 minute' END," +
        " CASE WHEN $3 THEN now() - interval '1 hour' ELSE now() + interval '1 day' END," +
        " CASE WHEN $4 THEN now() ELSE NULL END)",
      [userId, tokenHash, options.expired ?? false, options.revoked ?? false],
    );

    return { userId, token };
  }

  async function requestCatalog(
    token: string,
    targetOrganizationId: string,
    query = "",
  ): Promise<Response> {
    return app.fetch(
      new Request("https://api.example/api/orgs/" + targetOrganizationId + "/catalog" + query, {
        headers: { Cookie: "microapp_session=" + token },
      }),
      { DATABASE_URL: databaseUrl },
    );
  }

  beforeAll(async () => {
    cleanupClient = new Client({ connectionString: databaseUrl });
    await cleanupClient.connect();

    organizationA = await createOrganization("Catalog Tenant A", true);
    organizationB = await createOrganization("Catalog Tenant B", true);
    inactiveOrganization = await createOrganization("Catalog Inactive Tenant", false);

    for (const role of ["owner", "admin", "inventory", "cashier"] as const) {
      members[role] = await createMember(organizationA, role);
    }
    inactiveMember = await createMember(organizationA, "owner", { membershipActive: false });
    inactiveUser = await createMember(organizationA, "owner", { userActive: false });
    expiredMember = await createMember(organizationA, "owner", { expired: true });
    revokedMember = await createMember(organizationA, "owner", { revoked: true });
    inactiveOrganizationMember = await createMember(inactiveOrganization, "owner");

    await cleanupClient.query(
      "INSERT INTO products (id, organization_id, sku, name, description, unit, cost_usd, price_usd, stock_quantity, is_active)" +
        " VALUES" +
        " ('10000000-0000-4000-8000-000000000001', $1, 'A-001', 'Tenant A Product One', 'Synthetic item one', 'unidad', 5.2500, 12.5000, 987, true)," +
        " ('10000000-0000-4000-8000-000000000002', $1, 'A-002', 'Tenant A Product Two', NULL, 'unidad', 6.0000, 15.0000, 654, false)," +
        " ('20000000-0000-4000-8000-000000000001', $2, 'B-001', 'Tenant B Secret Product', NULL, 'unidad', 90.0000, 190.0000, 321, true)",
      [organizationA, organizationB],
    );
  });

  afterAll(async () => {
    if (!cleanupClient) return;
    if (userIds.length > 0) {
      await cleanupClient.query("DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])", [userIds]);
    }
    if (organizationIds.length > 0) {
      await cleanupClient.query("DELETE FROM products WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await cleanupClient.query("DELETE FROM organization_members WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await cleanupClient.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [organizationIds]);
    }
    if (userIds.length > 0) {
      await cleanupClient.query("DELETE FROM app_users WHERE id = ANY($1::uuid[])", [userIds]);
    }
    await cleanupClient.end();
  });

  it.each(["owner", "admin", "inventory"] as const)(
    "%s receives catalog, sale price and cost",
    async (role) => {
      const response = await requestCatalog(members[role].token, organizationA);
      expect(response.status).toBe(200);
      const body = await response.json() as {
        items: Array<Record<string, unknown>>;
        nextCursor: string | null;
      };
      expect(body.items).toHaveLength(2);
      expect(body.items[0]).toHaveProperty("price_usd");
      expect(body.items[0]).toHaveProperty("cost_usd");
      expect(body.items.some((item) => item.is_active === false)).toBe(true);
      expect(JSON.stringify(body)).not.toContain("stock_quantity");
      expect(JSON.stringify(body)).not.toContain("Tenant B Secret Product");
    },
  );

  it("Cashier receives sale prices but neither cost_usd nor stock fields", async () => {
    const response = await requestCatalog(members.cashier.token, organizationA);
    expect(response.status).toBe(200);
    const body = await response.json() as { items: Array<Record<string, unknown>> };
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toHaveProperty("price_usd");
    expect(body.items.some((item) => item.is_active === false)).toBe(true);
    expect(body.items[0]).not.toHaveProperty("cost_usd");
    expect(JSON.stringify(body)).not.toContain("cost_usd");
    expect(JSON.stringify(body)).not.toContain("stock_quantity");
  });

  it("does not allow an organization A member to read organization B by changing the URL ID", async () => {
    const response = await requestCatalog(members.owner.token, organizationB);
    expect(response.status).toBe(401);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ error: "UNAUTHENTICATED" });
    expect(JSON.stringify(body)).not.toContain("Tenant B Secret Product");
  });

  it("rejects invalid, expired and revoked sessions", async () => {
    const invalid = await requestCatalog("unknown-session-token", organizationA);
    const expired = await requestCatalog(expiredMember.token, organizationA);
    const revoked = await requestCatalog(revokedMember.token, organizationA);

    expect(invalid.status).toBe(401);
    expect(expired.status).toBe(401);
    expect(revoked.status).toBe(401);
  });

  it("rejects inactive users, inactive memberships and inactive organizations", async () => {
    const inactiveMembership = await requestCatalog(inactiveMember.token, organizationA);
    const inactiveUserResponse = await requestCatalog(inactiveUser.token, organizationA);
    const inactiveOrg = await requestCatalog(inactiveOrganizationMember.token, inactiveOrganization);

    expect(inactiveMembership.status).toBe(401);
    expect(inactiveUserResponse.status).toBe(401);
    expect(inactiveOrg.status).toBe(401);
  });

  it("paginates with a validated UUID cursor and does not return extra rows", async () => {
    const firstResponse = await requestCatalog(members.owner.token, organizationA, "?limit=1");
    expect(firstResponse.status).toBe(200);
    const first = await firstResponse.json() as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBe(first.items[0]!.id);

    const secondResponse = await requestCatalog(
      members.owner.token,
      organizationA,
      "?limit=1&cursor=" + first.nextCursor,
    );
    expect(secondResponse.status).toBe(200);
    const second = await secondResponse.json() as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(second.items).toHaveLength(1);
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
    expect(second.nextCursor).toBeNull();
  });
});
