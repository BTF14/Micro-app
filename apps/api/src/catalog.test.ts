import { describe, expect, it } from "vitest";
import app from "./index";

const organizationId = "11111111-2222-4333-8444-555555555555";
const sessionCookie = "microapp_session=synthetic-session-token";

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
