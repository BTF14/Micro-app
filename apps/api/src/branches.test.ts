import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";

async function request(path: string, cookie?: string): Promise<Response> {
  return app.fetch(new Request("https://api.example" + path, {
    headers: cookie ? { Cookie: "microapp_session=" + cookie } : {},
  }), { FRONTEND_ORIGIN: "https://frontend.example" });
}

describe("branch list route guards", () => {
  it("rejects a malformed organization id before database access", async () => {
    const response = await request("/api/orgs/not-a-uuid/branches", "token");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_ORGANIZATION_ID" });
  });

  it("requires a session cookie and never caches tenant data", async () => {
    const response = await request("/api/orgs/" + organizationId + "/branches");
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ error: "UNAUTHENTICATED" });
  });

  it("rejects an oversized session token before database access", async () => {
    const response = await request("/api/orgs/" + organizationId + "/branches", "x".repeat(129));
    expect(response.status).toBe(401);
  });
});
