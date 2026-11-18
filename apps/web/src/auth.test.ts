// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError } from "./auth";

describe("apiRequest resilience", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("aborts a request after 15 seconds", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const pending = apiRequest("/api/slow");
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).rejects.toThrow("La solicitud tardó demasiado");
  });

  it("preserves caller cancellation", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const pending = apiRequest("/api/slow", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow("La solicitud fue cancelada");
  });

  it("announces protected 401 responses but excludes initial session and opt-out", async () => {
    const listener = vi.fn();
    window.addEventListener("micro-app:unauthorized", listener);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: "expired" }), { status: 401, headers: { "Content-Type": "application/json" } }));
    await expect(apiRequest("/api/private")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    await expect(apiRequest("/auth/me")).rejects.toBeInstanceOf(ApiError);
    await expect(apiRequest("/api/private", { skipAuth401Handling: true })).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("micro-app:unauthorized", listener);
  });
});
