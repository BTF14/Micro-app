import { describe, expect, it } from "vitest";
import app from "./index";
import { buildInventoryReadQuery } from "./inventory-read";

const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "22222222-3333-4444-8555-666666666666";
const warehouseId = "33333333-4444-4555-8666-777777777777";

function expectSequentialSqlParameters(statement: string, values: unknown[]) {
  const placeholders = [...statement.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
  const maxPlaceholder = Math.max(0, ...placeholders);
  expect(maxPlaceholder).toBe(values.length);
  expect(new Set(placeholders).size).toBe(values.length);
  for (let index = 1; index <= values.length; index += 1) {
    expect(placeholders).toContain(index);
  }
}

async function request(path: string, cookie?: string): Promise<Response> {
  return app.fetch(new Request("https://api.example" + path, {
    headers: cookie ? { Cookie: "microapp_session=" + cookie } : {},
  }), { FRONTEND_ORIGIN: "https://frontend.example" });
}

describe("inventory read route guards", () => {
  it("rejects malformed resource identifiers before database access", async () => {
    const response = await request("/api/orgs/not-a-uuid/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory", "token");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_RESOURCE" });
  });

  it("rejects invalid balance pagination and movement filters before database access", async () => {
    const invalidLimit = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory?limit=0", "token");
    expect(invalidLimit.status).toBe(400);
    expect(await invalidLimit.json()).toMatchObject({ error: "INVALID_INVENTORY_QUERY" });

    const invalidProduct = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory/movements?product_id=bad", "token");
    expect(invalidProduct.status).toBe(400);
    expect(await invalidProduct.json()).toMatchObject({ error: "INVALID_MOVEMENT_QUERY" });
  });

  it("rejects inventory searches longer than 120 characters", async () => {
    const response = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory?q=" + "x".repeat(121), "token");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_INVENTORY_QUERY" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("requires a session before accessing inventory reads", async () => {
    const response = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "UNAUTHENTICATED" });
  });
  it.each(["active_only=TRUE", "active_only=1", "active_only=", "sort=rank", "sort=alphabetical", "sort=Relevance", "sort=", "sort=relevance&cursor=00000000-0000-4000-8000-000000000001"])(
    "rejects invalid active_only/sort values before database access (%s)", async (query) => {
      const response = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory?" + query, "token");
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "INVALID_INVENTORY_QUERY" });
    },
  );
  it("filters strictly active products while preserving zero-balance rows", () => {
    const query = buildInventoryReadQuery({ organizationId, branchId, warehouseId, search: "", activeOnly: true, limit: 30, sort: "id", canReadCost: false });
    expect(query.statement).toContain("p.is_active = true");
    expect(query.statement).not.toContain("b.balance_version IS NOT NULL");
    expect(query.statement).toContain("COALESCE(b.on_hand_quantity, 0)");
    expect(query.statement).toContain("ORDER BY p.id ASC");
  });
  it("preserves legacy filtering and id cursor pagination by default", () => {
    const query = buildInventoryReadQuery({ organizationId, branchId, warehouseId, search: "750123", activeOnly: false, cursor: "00000000-0000-4000-8000-000000000001", limit: 30, sort: "id", canReadCost: false });
    expect(query.statement).toContain("(p.is_active = true OR b.balance_version IS NOT NULL)");
    expect(query.statement).toContain("p.id > $");
    expect(query.statement).toContain("ORDER BY p.id ASC");
    expect(query.values).toEqual([organizationId, branchId, warehouseId, "750123", "%750123%", "00000000-0000-4000-8000-000000000001", 31]);
    expectSequentialSqlParameters(query.statement, query.values);
  });
  it("returns quantity mode and paginates by normalized name plus product id", () => {
    const cursor = "00000000-0000-4000-8000-000000000001";
    const query = buildInventoryReadQuery({
      organizationId, branchId, warehouseId, search: "", activeOnly: true,
      cursor, cursorName: "harina", limit: 25, sort: "name", canReadCost: false,
    });
    expect(query.statement).toContain("p.quantity_mode");
    expect(query.statement).toContain("(lower(p.name), p.id) > ($4, $5)");
    expect(query.statement).toContain("ORDER BY lower(p.name) ASC, p.id ASC");
    expect(query.values).toEqual([organizationId, branchId, warehouseId, "harina", cursor, 26]);
    expectSequentialSqlParameters(query.statement, query.values);
  });
  it("keeps exact barcode/SKU matches first for name sorting", () => {
    const query = buildInventoryReadQuery({
      organizationId, branchId, warehouseId, search: "750123", activeOnly: true,
      limit: 25, sort: "name", canReadCost: false,
    });
    expect(query.statement).toContain("CASE WHEN p.barcode = $4 THEN 0 WHEN lower(p.sku) = lower($4) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC");
    expectSequentialSqlParameters(query.statement, query.values);
  });
  it("continues from an exact Z barcode match to an A partial match with the full search-rank keyset", () => {
    const cursor = "00000000-0000-4000-8000-000000000001";
    // The cursor row is an exact barcode match (rank 0, name Z...).
    // A later partial match (rank 2, name A...) must still be on the next page.
    const query = buildInventoryReadQuery({
      organizationId, branchId, warehouseId, search: "SKU-42", activeOnly: true,
      cursor, cursorName: "z exact product", cursorRank: 0, limit: 1, sort: "name", canReadCost: false,
    });
    expect(query.statement).toContain("(CASE WHEN p.barcode = $4 THEN 0 WHEN lower(p.sku) = lower($4) THEN 1 ELSE 2 END, lower(p.name), p.id) > ($6, $7, $8)");
    expect(query.statement).toContain("ORDER BY CASE WHEN p.barcode = $4 THEN 0 WHEN lower(p.sku) = lower($4) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC");
    expect(query.values).toEqual([organizationId, branchId, warehouseId, "SKU-42", "%SKU-42%", 0, "z exact product", cursor, 2]);
    expectSequentialSqlParameters(query.statement, query.values);
  });
  it("orders relevance by exact barcode, exact SKU, then partial match and stable name/id", () => {
    const query = buildInventoryReadQuery({ organizationId, branchId, warehouseId, search: "750123", activeOnly: true, limit: 30, sort: "relevance", canReadCost: false });
    expect(query.statement.indexOf("WHEN p.barcode = $4")).toBeLessThan(query.statement.indexOf("WHEN lower(p.sku) = lower($4)"));
    expect(query.statement).toContain("lower(p.name) ASC, p.id ASC");
    expect(query.statement).toContain("p.barcode ILIKE $5");
    expect(query.statement).toContain("p.barcode ILIKE $6");
    expect(query.statement).toContain("LIMIT $7");
    expect(query.values).toEqual([organizationId, branchId, warehouseId, "750123", "%750123%", "750123%", 31]);
    expectSequentialSqlParameters(query.statement, query.values);
  });
});
