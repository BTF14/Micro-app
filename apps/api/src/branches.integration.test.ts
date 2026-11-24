import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) { super({ connectionString }); }
    },
  };
});

const app = (await import("./index")).default;
const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
const databaseUrl = env.DATABASE_URL;
const databaseUrlAdmin = env.DATABASE_URL_ADMIN ?? databaseUrl;

if (Boolean(env.CI) && !databaseUrl) throw new Error("DATABASE_URL is required in CI; refusing to skip branch list integration tests.");

async function makeSession(): Promise<{ token: string; hash: string }> {
  const token = "branch-list-" + crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return { token, hash: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") };
}

describe.skipIf(!databaseUrl)("branch list API against PostgreSQL", () => {
  let admin: Client;
  let organizationId = "";
  let foreignOrganizationId = "";
  const tokens: Record<string, string> = {};
  const branches: Record<string, string> = {};

  async function list(orgId: string, token?: string): Promise<Response> {
    return app.fetch(new Request(`https://api.example/api/orgs/${orgId}/branches`, {
      headers: token ? { Cookie: "microapp_session=" + token } : {},
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" });
  }

  async function addMember(role: string, suffix: string): Promise<string> {
    const user = await admin.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      [`branch-list-${role}-${suffix}@example.test`, "Branch List " + role],
    );
    const userId = user.rows[0]!.id;
    await admin.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
      [organizationId, userId, role],
    );
    const session = await makeSession();
    tokens[role] = session.token;
    await admin.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [userId, session.hash],
    );
    return userId;
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrlAdmin });
    await admin.connect();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
    const organization = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Branch List " + suffix, "branch-list-" + suffix],
    );
    organizationId = organization.rows[0]!.id;
    const foreign = await admin.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Foreign Branch List " + suffix, "branch-list-foreign-" + suffix],
    );
    foreignOrganizationId = foreign.rows[0]!.id;

    for (const [key, name] of [["alpha", "Alpha"], ["beta", "Beta"], ["inactive", "Inactive"]] as const) {
      const row = await admin.query<{ id: string }>(
        "INSERT INTO branches (organization_id, name, slug, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
        [organizationId, name + " Branch", `branch-list-${key}-${suffix}`, key !== "inactive"],
      );
      branches[key] = row.rows[0]!.id;
    }
    await admin.query(
      "INSERT INTO branches (organization_id, name, slug) VALUES ($1, 'Foreign Branch', $2)",
      [foreignOrganizationId, "branch-list-foreign-" + suffix],
    );

    await addMember("owner", suffix);
    await addMember("admin", suffix);
    const cashierId = await addMember("cashier", suffix);
    await addMember("inventory", suffix);
    // Cashier is assigned to Alpha and to the inactive branch only.
    for (const key of ["alpha", "inactive"]) {
      await admin.query(
        "INSERT INTO branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3)",
        [organizationId, branches[key], cashierId],
      );
    }
  });

  afterAll(async () => {
    if (admin) await admin.end();
  });

  it("gives owner and admin every active branch, never inactive or foreign ones", async () => {
    for (const role of ["owner", "admin"]) {
      const response = await list(organizationId, tokens[role]);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      const body = await response.json() as { branches: Array<{ id: string; name: string }> };
      expect(body.branches.map((branch) => branch.id)).toEqual([branches.alpha, branches.beta]);
    }
  });

  it("limits cashier to active assigned branches", async () => {
    const response = await list(organizationId, tokens.cashier);
    expect(response.status).toBe(200);
    const body = await response.json() as { branches: Array<{ id: string }> };
    expect(body.branches.map((branch) => branch.id)).toEqual([branches.alpha]);
  });

  it("returns an empty list to an inventory member without branch assignments", async () => {
    const response = await list(organizationId, tokens.inventory);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ branches: [] });
  });

  it("does not disclose another tenant's branches or accept a missing session", async () => {
    const foreign = await list(foreignOrganizationId, tokens.owner);
    expect(foreign.status).toBe(401);
    const anonymous = await list(organizationId);
    expect(anonymous.status).toBe(401);
  });
});
