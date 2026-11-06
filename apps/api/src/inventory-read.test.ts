import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "22222222-3333-4444-8555-666666666666";
const warehouseId = "33333333-4444-4555-8666-777777777777";

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

  it("requires a session before accessing inventory reads", async () => {
    const response = await request("/api/orgs/" + organizationId + "/branches/" + branchId + "/warehouses/" + warehouseId + "/inventory");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "UNAUTHENTICATED" });
  });
});
