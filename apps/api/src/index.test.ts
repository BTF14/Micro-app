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

  it("validates registration input before accessing the database", async () => {
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_REGISTRATION",
    });
  });

  it("rejects incomplete login input without a database connection", async () => {
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

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_CREDENTIALS",
    });
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

});
