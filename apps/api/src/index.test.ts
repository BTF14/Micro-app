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
