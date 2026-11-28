import { describe, expect, it } from "vitest";
import app from "./index";
import { buildCatalogQuery } from "./catalog";

const organizationId = "11111111-2222-4333-8444-555555555555";
const sessionCookie = "microapp_session=synthetic-session-token";

function nameCursorToken(payload: Record<string, unknown>): string {
  return btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}


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
    expect(query.statement).toContain("quantity_mode");
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

  it("prioritizes exact barcode/SKU and escapes wildcard search characters", () => {
    const query = buildCatalogQuery("cashier", organizationId, undefined, 20, "  CODE_%  ");
    expect(query.statement).toContain("barcode = $2");
    expect(query.statement).toContain("lower(sku) = lower($2)");
    expect(query.statement).toContain("name ILIKE $3 ESCAPE");
    expect(query.statement).toContain("ORDER BY CASE WHEN barcode = $2 OR lower(sku) = lower($2)");
    expect(query.statement).not.toContain("cost_usd");
    expect(query.values).toEqual([organizationId, "CODE_%", "%CODE\\_\\%%", 21]);
  });

  it("uses normalized name keyset pagination and keeps exact barcode/SKU matches first", () => {
    const cursor = "22222222-3333-4444-8555-666666666666";
    const query = buildCatalogQuery("cashier", organizationId, cursor, 25, "CODE", "name", "harina", 0);
    expect(query.statement).toContain("(CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name), p.id) > ($4, $5, $6)");
    expect(query.statement).toContain("ORDER BY CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC");
    expect(query.statement).toContain("p.id <> $6");
    expect(query.values).toEqual([organizationId, "CODE", "%CODE%", 0, "harina", cursor, 26]);
  });

  it("continues from an exact Z barcode match to an A partial match with the full search-rank keyset", () => {
    const cursor = "22222222-3333-4444-8555-666666666666";
    // The cursor row is an exact barcode match (rank 0, name Z...).
    // A later partial match (rank 2, name A...) must still be on the next page.
    const query = buildCatalogQuery("cashier", organizationId, cursor, 1, "SKU-42", "name", "z exact product", 0);
    expect(query.statement).toContain("(CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name), p.id) > ($4, $5, $6)");
    expect(query.statement).toContain("ORDER BY CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC");
    expect(query.values).toEqual([organizationId, "SKU-42", "%SKU-42%", 0, "z exact product", cursor, 2]);
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
  it("excludes a renamed-forward cursor product from the next name-sorted page", () => {
    const cursor = "22222222-3333-4444-8555-666666666666";
    const query = buildCatalogQuery("cashier", organizationId, cursor, 25, undefined, "name", "a frontier");
    expect(query.statement).toContain("(lower(p.name), p.id) > ($2, $3)");
    expect(query.statement).toContain("p.id <> $3");
    expect(query.values).toEqual([organizationId, "a frontier", cursor, 26]);
  });

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

  it("rejects catalog searches longer than 120 characters", async () => {
    const response = await app.request("/api/orgs/" + organizationId + "/catalog?q=" + "x".repeat(121), { headers: { Cookie: sessionCookie } });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_CATALOG_QUERY" });
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
    const invalidNameCursor = await app.request(
      "/api/orgs/" + organizationId + "/catalog?sort=name&cursor=not-a-token",
      { headers: { Cookie: sessionCookie } },
    );
    const invalidSearchRank = await app.request(
      "/api/orgs/" + organizationId + "/catalog?sort=name&q=SKU&cursor=" +
        nameCursorToken({ id: "22222222-3333-4444-8555-666666666666", name: "product", rank: 3 }),
      { headers: { Cookie: sessionCookie } },
    );
    const unexpectedRankWithoutSearch = await app.request(
      "/api/orgs/" + organizationId + "/catalog?sort=name&cursor=" +
        nameCursorToken({ id: "22222222-3333-4444-8555-666666666666", name: "product", rank: 0 }),
      { headers: { Cookie: sessionCookie } },
    );
    const invalidSort = await app.request(
      "/api/orgs/" + organizationId + "/catalog?sort=rank",
      { headers: { Cookie: sessionCookie } },
    );
    const excessiveLimit = await app.request(
      "/api/orgs/" + organizationId + "/catalog?limit=201",
      { headers: { Cookie: sessionCookie } },
    );

    expect(invalidLimit.status).toBe(400);
    expect(invalidCursor.status).toBe(400);
    expect(invalidNameCursor.status).toBe(400);
    expect(invalidSearchRank.status).toBe(400);
    expect(unexpectedRankWithoutSearch.status).toBe(400);
    expect(excessiveLimit.status).toBe(400);
    expect(invalidSort.status).toBe(400);
    await expect(invalidLimit.json()).resolves.toMatchObject({
      error: "INVALID_CATALOG_QUERY",
    });
  });

  it("accepts 240-character name cursors and rejects 241-character cursors before database access", async () => {
    const acceptedCursor = nameCursorToken({ id: "22222222-3333-4444-8555-666666666666", name: "n".repeat(240) });
    const rejectedCursor = nameCursorToken({ id: "22222222-3333-4444-8555-666666666666", name: "n".repeat(241) });
    const accepted = await app.request("/api/orgs/" + organizationId + "/catalog?sort=name&cursor=" + acceptedCursor);
    const rejected = await app.request("/api/orgs/" + organizationId + "/catalog?sort=name&cursor=" + rejectedCursor);

    // 401 proves the 240-character cursor passed validation and reached the session guard.
    expect(accepted.status).toBe(401);
    await expect(accepted.json()).resolves.toMatchObject({ error: "UNAUTHENTICATED" });
    expect(rejected.status).toBe(400);
    await expect(rejected.json()).resolves.toMatchObject({ error: "INVALID_CATALOG_QUERY" });
  });
  it("orders recent catalog pages by creation timestamp and id with exact matches first",()=>{const query=buildCatalogQuery("cashier",organizationId,"22222222-3333-4444-8555-666666666666",10,"SKU","recent",undefined,0,"2026-11-27T12:00:00.000Z");expect(query.statement).toContain("p.created_at DESC, p.id DESC");expect(query.statement).toContain("(p.created_at,p.id) <");expect(query.values).toEqual([organizationId,"SKU","%SKU%",0,"2026-11-27T12:00:00.000Z","22222222-3333-4444-8555-666666666666",11]);});

});
