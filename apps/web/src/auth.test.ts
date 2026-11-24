// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiDownload, apiRequest, ApiError } from "./auth";

describe("apiRequest resilience", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("aborts a request after 15 seconds", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const pending = apiRequest("/api/slow");
    const rejection = expect(pending).rejects.toThrow("La solicitud tardó demasiado");
    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
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

describe("apiDownload security and errors", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("uses the shared API transport for binary downloads", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("sale_number,total\\n1,10.00", { status: 200 }));
    const blob = await apiDownload("/api/orgs/example/reports/sales.csv");
    expect(await blob.text()).toBe("sale_number,total\\n1,10.00");
    expect(fetch).toHaveBeenCalledWith(
      "/api/orgs/example/reports/sales.csv",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        redirect: "error",
      }),
    );
  });

  it("preserves API error messages and unauthorized handling for downloads", async () => {
    const listener = vi.fn();
    window.addEventListener("micro-app:unauthorized", listener);
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    await expect(apiDownload("/api/private/report.csv")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Inicia sesión para continuar.",
    });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("micro-app:unauthorized", listener);
  });
});
