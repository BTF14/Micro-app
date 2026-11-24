import { describe, expect, it } from "vitest";
import app from "./index";

describe("pre-go-live API smoke readiness (no external credentials)", () => {
  it("serves the API health endpoint with baseline security headers", async () => {
    const response = await app.fetch(new Request("https://api.example/health"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "micro-app-api",
    });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("fails closed for invalid/password credentials while password login remains disabled", async () => {
    const response = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://micro-app.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "invalid@example.invalid", password: "not-a-valid-password" }),
    }), { FRONTEND_ORIGIN: "https://micro-app.example" });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "PASSWORD_LOGIN_DISABLED" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps public registration fail-closed during pre-go-live smoke", async () => {
    const response = await app.fetch(new Request("https://api.example/auth/register", {
      method: "POST",
      headers: {
        Origin: "https://micro-app.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "invalid@example.invalid",
        displayName: "Invalid Smoke User",
        password: "not-a-valid-password",
        organizationName: "Invalid Smoke Organization",
      }),
    }), { FRONTEND_ORIGIN: "https://micro-app.example" });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "REGISTRATION_DISABLED" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
