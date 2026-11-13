import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";
const branchId = "22222222-2222-4333-8444-555555555555";

async function request(path: string, init: RequestInit = {}, origin = "https://frontend.example"): Promise<Response> {
  const headers = new Headers(init.headers);
  if (origin) headers.set("Origin", origin);
  return app.fetch(new Request("https://api.example" + path, { ...init, headers }), {
    FRONTEND_ORIGIN: "https://frontend.example",
  });
}

describe("organization structure route guards", () => {
  it("rejects malformed organization and branch UUIDs before database access", async () => {
    const structure = await request("/api/orgs/not-a-uuid/structure", { headers: { Cookie: "microapp_session=token" } });
    expect(structure.status).toBe(400);
    expect(await structure.json()).toMatchObject({ error: "INVALID_ORGANIZATION_ID" });

    const assignment = await request(`/api/orgs/${organizationId}/branches/not-a-uuid/members/${branchId}`, {
      method: "PATCH", headers: { Cookie: "microapp_session=token", "Content-Type": "application/json" }, body: JSON.stringify({ is_active: true }),
    });
    expect(assignment.status).toBe(400);
    expect(await assignment.json()).toMatchObject({ error: "INVALID_RESOURCE" });
  });

  it("rejects untrusted origins before session or database access", async () => {
    const response = await request(`/api/orgs/${organizationId}/branches`, {
      method: "POST", headers: { Cookie: "microapp_session=token", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Centro", slug: "centro" }),
    }, "https://attacker.example");
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "ORIGIN_NOT_ALLOWED" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("rejects invalid JSON, unsupported media types and oversized bodies", async () => {
    const base = `/api/orgs/${organizationId}/branches`;
    const invalidJson = await request(base, {
      method: "POST", headers: { Cookie: "microapp_session=token", "Content-Type": "application/json" }, body: "{",
    });
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toMatchObject({ error: "INVALID_JSON" });

    const media = await request(base, {
      method: "POST", headers: { Cookie: "microapp_session=token", "Content-Type": "text/plain" }, body: "x",
    });
    expect(media.status).toBe(415);

    const large = await request(base, {
      method: "POST", headers: { Cookie: "microapp_session=token", "Content-Type": "application/json", "Content-Length": "4097" },
      body: JSON.stringify({ name: "x", slug: "x" }),
    });
    expect(large.status).toBe(413);
  });

  it("requires a session for owner-only reads and mutations", async () => {
    const read = await request(`/api/orgs/${organizationId}/structure`);
    expect(read.status).toBe(401);
    expect(read.headers.get("Cache-Control")).toContain("no-store");
    const write = await request(`/api/orgs/${organizationId}/branches`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Centro", slug: "centro" }),
    });
    expect(write.status).toBe(401);
  });
});
