import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";
const productId = "22222222-3333-4444-8555-666666666666";
const frontendOrigin = "https://frontend.example";

async function request(path: string, init: RequestInit, origin = frontendOrigin): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Origin", origin);
  return await app.fetch(
    new Request("https://api.example" + path, { ...init, headers }),
    { FRONTEND_ORIGIN: frontendOrigin },
  );
}

describe("PATCH /api/orgs/:organizationId/catalog/:productId guards", () => {
  it("rejects invalid organization or product UUIDs before database access", async () => {
    const response = await request("/api/orgs/" + organizationId + "/catalog/not-a-uuid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_RESOURCE_ID" });
  });

  it("requires the configured frontend Origin", async () => {
    const response = await request("/api/orgs/" + organizationId + "/catalog/" + productId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }, "https://attacker.example");
    expect(response.status).toBe(403);
  });

  it("rejects unauthenticated requests before parsing their body", async () => {
    const response = await request("/api/orgs/" + organizationId + "/catalog/" + productId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(401);
  });

  it("rejects empty patches and client-supplied stock fields", async () => {
    const headers = { "Content-Type": "application/json", Cookie: "microapp_session=synthetic-token" };
    const empty = await request("/api/orgs/" + organizationId + "/catalog/" + productId, {
      method: "PATCH", headers, body: "{}",
    });
    const forgedStock = await request("/api/orgs/" + organizationId + "/catalog/" + productId, {
      method: "PATCH", headers,
      body: JSON.stringify({ stock_quantity: 100 }),
    });
    expect(empty.status).toBe(400);
    expect(forgedStock.status).toBe(400);
    await expect(forgedStock.json()).resolves.toMatchObject({ error: "INVALID_PRODUCT_PATCH" });
  });
});
