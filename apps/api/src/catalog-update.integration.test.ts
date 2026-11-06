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
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const databaseUrlAdmin = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL_ADMIN ?? databaseUrl;
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);

if (isCi && !databaseUrl) {
  throw new Error("DATABASE_URL is required in CI; refusing to skip product-update PostgreSQL integration tests.");
}

type Fixture = { token: string; userId: string };

describe.skipIf(!databaseUrl)("catalog product updates against PostgreSQL", () => {
  let client: Client | undefined;
  let organizationA = "";
  let organizationB = "";
  let productA = "";
  let productB = "";
  let duplicateProductA = "";
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  const fixtures = {} as Record<"owner" | "admin" | "inventory" | "cashier", Fixture>;

  async function createOrganization(label: string): Promise<string> {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const result = await client!.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [label + " " + suffix, "product-update-" + suffix],
    );
    organizationIds.push(result.rows[0]!.id);
    return result.rows[0]!.id;
  }

  async function createMember(organizationId: string, role: keyof typeof fixtures): Promise<Fixture> {
    const suffix = crypto.randomUUID();
    const user = await client!.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      ["product-update-" + suffix + "@example.test", "Product Update " + role],
    );
    const userId = user.rows[0]!.id;
    userIds.push(userId);
    await client!.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
      [organizationId, userId, role],
    );
    const token = "product-update-session-" + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client!.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [userId, tokenHash],
    );
    return { token, userId };
  }

  async function updateRequest(
    fixture: Fixture,
    organizationId: string,
    targetProductId: string,
    payload: unknown,
    origin = "https://frontend.example",
  ): Promise<Response> {
    return app.fetch(
      new Request("https://api.example/api/orgs/" + organizationId + "/catalog/" + targetProductId, {
        method: "PATCH",
        headers: {
          Cookie: "microapp_session=" + fixture.token,
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
      { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: "https://frontend.example" },
    );
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrlAdmin });
    await client.connect();
    organizationA = await createOrganization("Product Update Tenant A");
    organizationB = await createOrganization("Product Update Tenant B");
    for (const role of ["owner", "admin", "inventory", "cashier"] as const) {
      fixtures[role] = await createMember(organizationA, role);
    }

    const a = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'UPDATE-A', 'Product A', 10) RETURNING id",
      [organizationA],
    );
    productA = a.rows[0]!.id;
    const duplicate = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'DUPLICATE-A', 'Duplicate A', 10) RETURNING id",
      [organizationA],
    );
    duplicateProductA = duplicate.rows[0]!.id;
    const b = await client.query<{ id: string }>(
      "INSERT INTO products (organization_id, sku, name, price_usd) VALUES ($1, 'UPDATE-B', 'Product B', 20) RETURNING id",
      [organizationB],
    );
    productB = b.rows[0]!.id;
  });

  afterAll(async () => {
    if (!client) return;
    if (organizationIds.length) {
      await client.query("BEGIN");
      try {
        // Test teardown runs with the disposable database owner. Temporarily
        // disable only user triggers so fixtures can be removed; runtime roles
        // never receive ownership or trigger-management privileges.
        await client.query("ALTER TABLE audit_logs DISABLE TRIGGER USER");
        await client.query("DELETE FROM audit_logs WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("ALTER TABLE audit_logs ENABLE TRIGGER USER");
        await client.query("DELETE FROM products WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    if (userIds.length) await client.query("DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])", [userIds]);
    if (organizationIds.length) {
      await client.query("DELETE FROM organization_members WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await client.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [organizationIds]);
    }
    if (userIds.length) await client.query("DELETE FROM app_users WHERE id = ANY($1::uuid[])", [userIds]);
    await client.end();
  });

  it("Owner can update price and description with an audit event", async () => {
    const response = await updateRequest(fixtures.owner, organizationA, productA, {
      price_usd: "15.2500", description: "Updated description",
    });
    expect(response.status).toBe(200);
    const product = await response.json() as { price_usd: string; description: string };
    expect(product.price_usd).toBe("15.2500");
    expect(product.description).toBe("Updated description");

    const audit = await client!.query<{ actor_user_id: string; action: string; entity_id: string; metadata: { changes?: { price_usd?: { before: string; after: string } } } }>(
      "SELECT actor_user_id, action, entity_id, metadata FROM audit_logs WHERE organization_id = $1 AND entity_id = $2",
      [organizationA, productA],
    );
    expect(audit.rows[0]).toMatchObject({
      actor_user_id: fixtures.owner.userId,
      action: "product.updated",
      entity_id: productA,
      metadata: { changes: { price_usd: { before: "10.0000", after: "15.2500" } } },
    });
  });

  it("Admin can soft-deactivate a product without deleting its history", async () => {
    const response = await updateRequest(fixtures.admin, organizationA, productA, { is_active: false });
    expect(response.status).toBe(200);
    const stored = await client!.query<{ is_active: boolean }>(
      "SELECT is_active FROM products WHERE organization_id = $1 AND id = $2",
      [organizationA, productA],
    );
    expect(stored.rows).toEqual([{ is_active: false }]);
    const audit = await client!.query<{ action: string }>(
      "SELECT action FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 ORDER BY id DESC LIMIT 1",
      [organizationA, productA],
    );
    expect(audit.rows[0]!.action).toBe("product.deactivated");
  });

  it.each(["inventory", "cashier"] as const)("%s cannot update products", async (role) => {
    const response = await updateRequest(fixtures[role], organizationA, duplicateProductA, { price_usd: "99.00" });
    expect(response.status).toBe(403);
    const stored = await client!.query<{ price_usd: string }>(
      "SELECT price_usd::text FROM products WHERE organization_id = $1 AND id = $2",
      [organizationA, duplicateProductA],
    );
    expect(stored.rows[0]!.price_usd).toBe("10.0000");
  });

  it("Tenant A cannot update a Tenant B product by changing the URL ID", async () => {
    const response = await updateRequest(fixtures.owner, organizationA, productB, { name: "Cross tenant" });
    expect(response.status).toBe(404);
    const stored = await client!.query<{ name: string }>(
      "SELECT name FROM products WHERE organization_id = $1 AND id = $2",
      [organizationB, productB],
    );
    expect(stored.rows[0]!.name).toBe("Product B");
  });

  it("rejects client-supplied stock fields and duplicate SKU without side effects", async () => {
    const forgedStock = await updateRequest(fixtures.owner, organizationA, duplicateProductA, { stock_quantity: 50 });
    const duplicateSku = await updateRequest(fixtures.owner, organizationA, productA, { sku: "DUPLICATE-A" });
    expect(forgedStock.status).toBe(400);
    expect(duplicateSku.status).toBe(409);
    const stored = await client!.query<{ sku: string; stock_quantity: string }>(
      "SELECT sku, stock_quantity::text FROM products WHERE organization_id = $1 AND id = $2",
      [organizationA, productA],
    );
    expect(stored.rows[0]).toEqual({ sku: "UPDATE-A", stock_quantity: "0.000" });
  });

  it("rejects invalid decimal precision", async () => {
    const response = await updateRequest(fixtures.owner, organizationA, duplicateProductA, { price_usd: "1.12345" });
    expect(response.status).toBe(400);
  });
});
