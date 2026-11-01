import { describe, expect, it } from "vitest";
import app from "./index";
import { buildCatalogQuery } from "./catalog";

const organizationId = "11111111-2222-4333-8444-555555555555";
const sessionCookie = "microapp_session=synthetic-session-token";


describe("catalog SQL projection", () => {
  it("does not select cost or stock for Cashier and keeps tenant/cursor values parameterized", () => {
    const query = buildCatalogQuery(
      "cashier",
      organizationId,
      "22222222-3333-4444-8555-666666666666",
      25,
    );

    expect(query.canReadCost).toBe(false);
    expect(query.statement).not.toContain("cost_usd");
    expect(query.statement).not.toContain("stock_quantity");
    expect(query.statement).toContain("is_active");
    expect(query.statement).not.toContain("AND is_active = true");
    expect(query.statement).toContain("organization_id = $1");
    expect(query.statement).toContain("id > $2");
    expect(query.statement).toContain("LIMIT $3");
    expect(query.statement).not.toContain("22222222-3333-4444-8555-666666666666");
    expect(query.values).toEqual([
      organizationId,
      "22222222-3333-4444-8555-666666666666",
      26,
    ]);
  });

  it.each(["owner", "admin", "inventory"] as const)(
    "%s may select cost but never stock",
    (role) => {
      const query = buildCatalogQuery(role, organizationId, undefined, 10);

      expect(query.canReadCost).toBe(true);
      expect(query.statement).toContain("cost_usd::text AS cost_usd");
      expect(query.statement).not.toContain("stock_quantity");
      expect(query.statement).not.toContain("AND is_active = true");
      expect(query.values).toEqual([organizationId, 11]);
    },
  );
});

describe("GET /api/orgs/:organizationId/catalog", () => {
  it("rejects an invalid organization UUID before database access", async () => {
    const response = await app.request("/api/orgs/not-a-uuid/catalog", {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_ORGANIZATION_ID",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("requires a session before opening a database connection", async () => {
    const response = await app.request("/api/orgs/" + organizationId + "/catalog");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "UNAUTHENTICATED",
    });
  });

  it("rejects invalid pagination values before database access", async () => {
    const invalidLimit = await app.request(
      "/api/orgs/" + organizationId + "/catalog?limit=0",
      { headers: { Cookie: sessionCookie } },
    );
    const invalidCursor = await app.request(
      "/api/orgs/" + organizationId + "/catalog?cursor=not-a-uuid",
      { headers: { Cookie: sessionCookie } },
    );
    const excessiveLimit = await app.request(
      "/api/orgs/" + organizationId + "/catalog?limit=201",
      { headers: { Cookie: sessionCookie } },
    );

    expect(invalidLimit.status).toBe(400);
    expect(invalidCursor.status).toBe(400);
    expect(excessiveLimit.status).toBe(400);
    await expect(invalidLimit.json()).resolves.toMatchObject({
      error: "INVALID_CATALOG_QUERY",
    });
  });
});
