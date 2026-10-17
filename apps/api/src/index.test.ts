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
});
