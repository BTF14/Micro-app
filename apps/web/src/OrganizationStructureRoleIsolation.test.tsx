// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let container: HTMLDivElement;
let root: Root;

function installSession(role: "owner" | "admin" | "cashier" | "inventory") {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    let payload: unknown;
    if (url.endsWith("/auth/me")) {
      payload = { user: { id: "user-1", email: "user@example.test", display_name: "Test User" },
        organizations: [{ id: "aaaaaaaa-2222-4333-8444-555555555555", name: "Test Org", slug: "test-org", role }] };
    } else if (url.endsWith("/api/exchange-rates/latest")) {
      payload = { rate: "123.450000", effectiveDate: "2026-11-13", fetchedAt: "2026-11-13T12:00:00Z", source: "BCV", status: "current" };
    } else {
      payload = { source: "BCV", health: "succeeded", lastAttemptAt: null, lastSuccessAt: null, lastOutcome: null,
        lastErrorCode: null, lastEffectiveDate: null, updatedAt: "2026-11-13T12:00:00Z", attemptAgeSeconds: null };
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  window.history.replaceState({}, "", "/");
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

describe("organization structure navigation role isolation", () => {
  it("exposes the administration section only to Owner", async () => {
    installSession("owner");
    await act(async () => { root.render(<App />); await Promise.resolve(); await Promise.resolve(); });
    expect([...container.querySelectorAll("button")].some((button) => button.textContent?.includes("Estructura"))).toBe(true);
  });

  it.each(["admin", "cashier", "inventory"] as const)("does not expose administration to %s", async (role) => {
    installSession(role);
    await act(async () => { root.render(<App />); await Promise.resolve(); await Promise.resolve(); });
    expect([...container.querySelectorAll("button")].some((button) => button.textContent?.includes("Estructura"))).toBe(false);
  });
});
