import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";
const frontendOrigin = "https://frontend.example";

function request(path: string, init: RequestInit, origin = frontendOrigin): Promise<Response> {
  return app.fetch(
    new Request("https://api.example" + path, {
      ...init,
      headers: { Origin: origin, ...(init.headers ?? {}) },
    }),
    { FRONTEND_ORIGIN: frontendOrigin },
  );
}

describe("POST /api/orgs/:organizationId/catalog input and origin guards", () => {
  it("rejects invalid organization IDs before parsing or database access", async () => {
    const response = await request("/api/orgs/not-a-uuid/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_ORGANIZATION_ID" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("requires an exact trusted Origin", async () => {
    const response = await request(
      "/api/orgs/" + organizationId + "/catalog",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      "https://attacker.example",
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "ORIGIN_NOT_ALLOWED" });
  });

  it("requires application/json", async () => {
    const response = await request("/api/orgs/" + organizationId + "/catalog", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    expect(response.status).toBe(415);
  });

  it("rejects malformed JSON and client-supplied stock fields before database access", async () => {
    const malformed = await request("/api/orgs/" + organizationId + "/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const forgedStock = await request("/api/orgs/" + organizationId + "/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "X", name: "X", price_usd: "1.00", stock_quantity: 100 }),
    });
    expect(malformed.status).toBe(400);
    expect(forgedStock.status).toBe(400);
    await expect(forgedStock.json()).resolves.toMatchObject({ error: "INVALID_PRODUCT" });
  });
});
