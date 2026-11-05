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
  throw new Error("DATABASE_URL is required in CI; refusing to skip product-create PostgreSQL integration tests.");
}

type Fixture = { token: string; userId: string };

describe.skipIf(!databaseUrl)("catalog product creation against PostgreSQL", () => {
  let client: Client | undefined;
  let organizationA = "";
  let organizationB = "";
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  const fixtures = {} as Record<"owner" | "admin" | "inventory" | "cashier", Fixture>;

  async function createOrganization(label: string): Promise<string> {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const result = await client!.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [label + " " + suffix, "product-create-" + suffix],
    );
    organizationIds.push(result.rows[0]!.id);
    return result.rows[0]!.id;
  }

  async function createMember(organizationId: string, role: keyof typeof fixtures): Promise<Fixture> {
    const suffix = crypto.randomUUID();
    const user = await client!.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name) VALUES ($1, $2) RETURNING id",
      ["product-create-" + suffix + "@example.test", "Product Create " + role],
    );
    const userId = user.rows[0]!.id;
    userIds.push(userId);
    await client!.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
      [organizationId, userId, role],
    );
    const token = "product-create-session-" + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await client!.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [userId, tokenHash],
    );
    return { token, userId };
  }

  async function createRequest(
    fixture: Fixture,
    organizationId: string,
    payload: unknown,
    origin = "https://frontend.example",
  ): Promise<Response> {
    return app.fetch(
      new Request("https://api.example/api/orgs/" + organizationId + "/catalog", {
        method: "POST",
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
    organizationA = await createOrganization("Product Create Tenant A");
    organizationB = await createOrganization("Product Create Tenant B");
    for (const role of ["owner", "admin", "inventory", "cashier"] as const) {
      fixtures[role] = await createMember(organizationA, role);
    }
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

  it.each(["owner", "admin"] as const)("%s can create a product and its audit event atomically", async (role) => {
    const sku = "CREATE-" + role.toUpperCase();
    const response = await createRequest(fixtures[role], organizationA, {
      sku, name: "Created " + role, price_usd: "12.5000", cost_usd: "4.2500", minimum_stock: "3.000",
    });
    expect(response.status).toBe(201);
    const product = await response.json() as { id: string; cost_usd: string; price_usd: string };
    expect(product.cost_usd).toBe("4.2500");
    expect(product.price_usd).toBe("12.5000");

    const stored = await client!.query<{ stock_quantity: string; cost_usd: string }>(
      "SELECT stock_quantity::text, cost_usd::text FROM products WHERE id = $1 AND organization_id = $2",
      [product.id, organizationA],
    );
    expect(stored.rows[0]).toEqual({ stock_quantity: "0.000", cost_usd: "4.2500" });

    const audit = await client!.query<{ actor_user_id: string; action: string; entity_id: string; metadata: { snapshot?: { sku?: string; price_usd?: string } } }>(
      "SELECT actor_user_id, action, entity_id, metadata FROM audit_logs WHERE organization_id = $1 AND entity_id = $2",
      [organizationA, product.id],
    );
    expect(audit.rows[0]).toMatchObject({
      actor_user_id: fixtures[role].userId,
      action: "product.created",
      entity_id: product.id,
      metadata: { snapshot: { sku, price_usd: "12.5000" } },
    });
  });

  it.each(["inventory", "cashier"] as const)("%s cannot create products", async (role) => {
    const response = await createRequest(fixtures[role], organizationA, {
      sku: "DENIED-" + role, name: "Denied", price_usd: "1.00",
    });
    expect(response.status).toBe(403);
    const rows = await client!.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM products WHERE organization_id = $1 AND sku = $2",
      [organizationA, "DENIED-" + role],
    );
    expect(rows.rows[0]!.count).toBe("0");
  });

  it("does not allow a tenant A owner to create a product in tenant B", async () => {
    const response = await createRequest(fixtures.owner, organizationB, {
      sku: "CROSS-TENANT", name: "Forbidden", price_usd: "1.00",
    });
    expect(response.status).toBe(401);
    const rows = await client!.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM products WHERE organization_id = $1 AND sku = 'CROSS-TENANT'",
      [organizationB],
    );
    expect(rows.rows[0]!.count).toBe("0");
  });

  it("rejects attempts to supply stock or unknown fields before writing", async () => {
    const response = await createRequest(fixtures.owner, organizationA, {
      sku: "FORGED-STOCK", name: "Forbidden stock", price_usd: "1.00", stock_quantity: 999,
    });
    expect(response.status).toBe(400);
    const rows = await client!.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM products WHERE organization_id = $1 AND sku = 'FORGED-STOCK'",
      [organizationA],
    );
    expect(rows.rows[0]!.count).toBe("0");
  });

  it("rejects untrusted origins and invalid numeric precision", async () => {
    const origin = await createRequest(fixtures.owner, organizationA, {
      sku: "BAD-ORIGIN", name: "Bad origin", price_usd: "1.00",
    }, "https://attacker.example");
    const precision = await createRequest(fixtures.owner, organizationA, {
      sku: "BAD-PRECISION", name: "Bad precision", price_usd: "1.12345",
    });
    expect(origin.status).toBe(403);
    expect(precision.status).toBe(400);
  });

  it("maps duplicate tenant SKU to conflict without creating a second audit event", async () => {
    const payload = { sku: "DUPLICATE-SKU", name: "First", price_usd: "1.00" };
    const first = await createRequest(fixtures.owner, organizationA, payload);
    const second = await createRequest(fixtures.admin, organizationA, payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    const audit = await client!.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM audit_logs WHERE organization_id = $1 AND entity_type = 'product' AND action = 'product.created' AND metadata->'snapshot'->>'sku' = 'DUPLICATE-SKU'",
      [organizationA],
    );
    expect(audit.rows[0]!.count).toBe("1");
  });
  it("rolls back product creation when audit persistence fails", async () => {
    await client!.query(`CREATE FUNCTION test_fail_product_audit() RETURNS trigger
      LANGUAGE plpgsql AS $test_fail_product_audit$
      BEGIN
        IF NEW.action = 'product.created'
          AND NEW.metadata->'snapshot'->>'sku' = 'AUDIT-ROLLBACK' THEN
          RAISE EXCEPTION 'forced product audit persistence failure';
        END IF;
        RETURN NEW;
      END;
      $test_fail_product_audit$`);
    await client!.query(`CREATE TRIGGER test_fail_product_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_fail_product_audit()`);

    let response: Response;
    try {
      response = await createRequest(fixtures.owner, organizationA, {
        sku: "AUDIT-ROLLBACK",
        name: "Must roll back when audit fails",
        price_usd: "12.5000",
        cost_usd: "4.2500",
        minimum_stock: "3.000",
      });
    } finally {
      await client!.query("DROP TRIGGER IF EXISTS test_fail_product_audit ON audit_logs");
      await client!.query("DROP FUNCTION IF EXISTS test_fail_product_audit()");
    }

    expect(response!.status).toBe(500);
    const persisted = await client!.query<{ products: string; audits: string }>(
      `SELECT
        (SELECT count(*)::text FROM products
         WHERE organization_id = $1 AND sku = 'AUDIT-ROLLBACK') AS products,
        (SELECT count(*)::text FROM audit_logs
         WHERE organization_id = $1 AND action = 'product.created'
           AND metadata->'snapshot'->>'sku' = 'AUDIT-ROLLBACK') AS audits`,
      [organizationA],
    );
    expect(persisted.rows[0]).toEqual({ products: "0", audits: "0" });
  });

});
