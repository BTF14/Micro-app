import { describe, expect, it } from "vitest";
import { hashAuthRateLimitKey } from "./auth-rate-limit";
import app from "./index";

describe("authentication rate-limit key handling", () => {
  it("stores a deterministic SHA-256 hash instead of the raw scoped key", async () => {
    const raw = "google:start:198.51.100.24";
    const pepper = "test-google-client-secret";
    const first = await hashAuthRateLimitKey(raw, pepper);
    const second = await hashAuthRateLimitKey(raw, pepper);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("198.51.100.24");
  });

  it("fails closed when Cloudflare does not provide a client IP", async () => {
    const response = await app.fetch(
      new Request("https://api.example/auth/google"),
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
        GOOGLE_REDIRECT_URI: "https://api.example/auth/google/callback",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "RATE_LIMIT_UNAVAILABLE" });
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when the rate-limit database is unavailable", async () => {
    const response = await app.fetch(
      new Request("https://api.example/auth/google", {
        headers: { "CF-Connecting-IP": "198.51.100.25" },
      }),
      {
        FRONTEND_ORIGIN: "https://micro-app.example",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_REDIRECT_URI: "https://api.example/auth/google/callback",
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "RATE_LIMIT_UNAVAILABLE" });
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
