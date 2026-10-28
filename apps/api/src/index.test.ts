import { describe, expect, it } from "vitest";
import app from "./index";

describe("Micro app API scaffold", () => {
  it("returns a healthy service response without environment bindings", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "micro-app-api",
      stage: "scaffold",
    });
  });

  it("sets baseline security headers on every response, and no-store on auth routes", async () => {
    const health = await app.request("/health");
    expect(health.headers.get("x-content-type-options")).toBe("nosniff");
    expect(health.headers.get("referrer-policy")).toBe("no-referrer");
    expect(health.headers.get("x-frame-options")).toBe("DENY");
    expect(health.headers.get("cache-control")).not.toBe("no-store");

    const auth = await app.request("/auth/me");
    expect(auth.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a JSON 404 for unknown routes without environment bindings", async () => {
    const response = await app.request("/unknown");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "NOT_FOUND",
    });
  });

  it("fails closed when CORS configuration is missing", async () => {
    const response = await app.request("/health", {
      headers: { Origin: "https://untrusted.example" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "https://untrusted.example",
    );
  });

  it("rejects a configured URL that contains a path", async () => {
    const response = await app.request(
      "/health",
      { headers: { Origin: "https://micro-app.pages.dev" } },
      { FRONTEND_ORIGIN: "https://micro-app.pages.dev/dashboard" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "https://micro-app.pages.dev",
    );
  });

  it("rejects insecure non-local frontend origins", async () => {
    const response = await app.request(
      "/health",
      { headers: { Origin: "http://micro-app.example" } },
      { FRONTEND_ORIGIN: "http://micro-app.example" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "http://micro-app.example",
    );
  });

  it("allows local HTTP origins for development", async () => {
    const response = await app.request(
      "/health",
      { headers: { Origin: "http://localhost:5173" } },
      { FRONTEND_ORIGIN: "http://localhost:5173" },
    );
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
  });

  it("answers a credentialed CORS preflight for the configured frontend origin", async () => {
    const response = await app.request(
      "/auth/me",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://micro-app-63i.pages.dev",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,authorization,idempotency-key",
        },
      },
      { FRONTEND_ORIGIN: "https://micro-app-63i.pages.dev" },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://micro-app-63i.pages.dev",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    const allowedHeaders = response.headers.get("access-control-allow-headers") ?? "";
    expect(allowedHeaders.toLowerCase()).toContain("content-type");
    expect(allowedHeaders.toLowerCase()).toContain("authorization");
    expect(allowedHeaders.toLowerCase()).toContain("idempotency-key");
    expect(response.headers.get("access-control-max-age")).toBe("600");
  });

  it("does not authorize a CORS preflight from an untrusted origin", async () => {
    const response = await app.request(
      "/auth/me",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://attacker.example",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      },
      { FRONTEND_ORIGIN: "https://micro-app-63i.pages.dev" },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows CORS only for the configured frontend origin", async () => {
    const allowed = await app.request(
      "/health",
      { headers: { Origin: "https://micro-app.pages.dev" } },
      { FRONTEND_ORIGIN: "https://micro-app.pages.dev" },
    );
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://micro-app.pages.dev",
    );

    const blocked = await app.request(
      "/health",
      { headers: { Origin: "https://untrusted.example" } },
      { FRONTEND_ORIGIN: "https://micro-app.pages.dev" },
    );
    expect(blocked.headers.get("access-control-allow-origin")).not.toBe(
      "https://untrusted.example",
    );
  });

  it("rejects authentication mutations from an untrusted Origin before touching the database", async () => {
    const response = await app.request(
      "/auth/register",
      {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          displayName: "Example User",
          password: "a-long-test-password",
          organizationName: "Example Shop",
        }),
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "ORIGIN_NOT_ALLOWED",
    });
  });

  it("blocks public registration before parsing input or accessing the database", async () => {
    const response = await app.request(
      "/auth/register",
      {
        method: "POST",
        headers: {
          Origin: "https://micro-app.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "not-an-email",
          displayName: "A",
          password: "short",
          organizationName: "",
        }),
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "REGISTRATION_DISABLED",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps password login disabled regardless of credential input (D4)", async () => {
    const response = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: {
          Origin: "https://micro-app.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "", password: "" }),
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "PASSWORD_LOGIN_DISABLED",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects login and logout when Origin is missing before accessing the database", async () => {
    const bindings = { FRONTEND_ORIGIN: "https://micro-app.example" };

    const login = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "a-long-test-password" }),
      },
      bindings,
    );
    expect(login.status).toBe(403);
    await expect(login.json()).resolves.toMatchObject({ error: "ORIGIN_NOT_ALLOWED" });

    const logout = await app.request(
      "/auth/logout",
      { method: "POST" },
      bindings,
    );
    expect(logout.status).toBe(403);
    await expect(logout.json()).resolves.toMatchObject({ error: "ORIGIN_NOT_ALLOWED" });
  });

  it("rejects registration when Origin is missing before accessing the database", async () => {
    const response = await app.request(
      "/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          displayName: "Example User",
          password: "a-long-test-password",
          organizationName: "Example Shop",
        }),
      },
      { FRONTEND_ORIGIN: "https://micro-app.example" },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "ORIGIN_NOT_ALLOWED",
    });
  });

  it("enables credentialed CORS only for the configured origin", async () => {
    const allowed = await app.request(
      "/health",
      { headers: { Origin: "https://micro-app.example" } },
      { FRONTEND_ORIGIN: "https://micro-app.example" },
    );

    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://micro-app.example",
    );
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not clear the session cookie when server-side logout revocation fails", async () => {
    const response = await app.request(
      "/auth/logout",
      {
        method: "POST",
        headers: {
          Origin: "https://micro-app.example",
          Cookie: "microapp_session=synthetic-session-token",
        },
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        DATABASE_URL: "not-a-valid-database-url",
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "LOGOUT_FAILED",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });


  it("does not clear the session cookie when session lookup fails", async () => {
    const response = await app.request(
      "/auth/me",
      {
        headers: {
          Cookie: "microapp_session=synthetic-session-token",
        },
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        DATABASE_URL: "not-a-valid-database-url",
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "SESSION_LOOKUP_FAILED",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });


  it("keeps password login disabled even when a database URL is configured", async () => {
    const response = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: {
          Origin: "https://micro-app.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "user@example.test", password: "a-long-test-password" }),
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        DATABASE_URL: "not-a-valid-database-url",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "PASSWORD_LOGIN_DISABLED" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps public registration disabled even when a database URL is configured", async () => {
    const response = await app.request(
      "/auth/register",
      {
        method: "POST",
        headers: {
          Origin: "https://micro-app.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "new-user@example.test",
          displayName: "Example User",
          password: "a-long-test-password",
          organizationName: "Example Shop",
        }),
      },
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        DATABASE_URL: "not-a-valid-database-url",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "REGISTRATION_DISABLED" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

});
