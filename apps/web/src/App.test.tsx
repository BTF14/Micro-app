// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = { id: "user-1", email: "ana@example.com", display_name: "Ana Pérez" };
const organizations = [{ id: "org-1", name: "Mi tienda", slug: "mi-tienda", role: "owner" }];
const authResponse = { user, organizations };
const bcvSyncStateResponse = {
  source: "BCV_OFFICIAL_HTML_V1",
  health: "succeeded" as const,
  lastAttemptAt: "2026-11-05T18:00:00.000Z",
  lastSuccessAt: "2026-11-05T18:00:00.000Z",
  lastOutcome: "inserted",
  lastErrorCode: null,
  lastEffectiveDate: "2026-11-05",
  updatedAt: "2026-11-05T18:00:00.000Z",
  attemptAgeSeconds: 60,
};

const bcvRateResponse = {
  rate: "894.88760000",
  effectiveDate: "2026-11-05",
  fetchedAt: "2026-11-05T18:00:00.000Z",
  source: "BCV_OFFICIAL_HTML_V1",
  status: "current" as const,
};

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function renderApp() {
  await act(async () => { root.render(<App />); });
}

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn());
  window.history.replaceState({}, "", "/");
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState({}, "", "/");
});

describe("Micro app authentication flow", () => {
  it("checks the cookie session before showing protected workspace data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401));
    await renderApp();
    await settle();
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.textContent).not.toContain("Sesión activa");
    expect(container.textContent).not.toContain("Hola, Ana");
  });

  it("links the Google sign-in button straight to the OAuth start endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401));
    await renderApp();
    await settle();

    const googleLink = [...container.querySelectorAll("a")].find((link) => link.textContent?.includes("Continuar con Google"));
    if (!googleLink) throw new Error("Google sign-in link not found");
    expect(googleLink.getAttribute("href")).toContain("/auth/google");
  });

  it("shows a friendly, admin-contact message for a failed Google callback and clears it from the URL", async () => {
    window.history.replaceState({}, "", "/?auth_error=not_allowlisted");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401));
    await renderApp();
    await settle();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Comunícate con el administrador");
    expect(window.location.search).toBe("");
    const whatsappLink = alert?.querySelector("a");
    expect(whatsappLink?.getAttribute("href")).toContain("https://wa.me/584243104520");
  });

  it("opens the FAQ and privacy help modals from the login screen and closes them", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401));
    await renderApp();
    await settle();

    const faqButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Preguntas frecuentes"));
    if (!faqButton) throw new Error("FAQ button not found");
    await act(async () => { faqButton.click(); });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain("¿Qué es Micro app?");

    const closeButton = dialog?.querySelector<HTMLButtonElement>(".help-modal-close");
    if (!closeButton) throw new Error("Close button not found");
    await act(async () => { closeButton.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    const privacyButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Privacidad"));
    if (!privacyButton) throw new Error("Privacy button not found");
    await act(async () => { privacyButton.click(); });
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Qué datos guardamos");
  });

  it("shows help links (WhatsApp support, FAQ, privacy) on the authenticated dashboard footer", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();

    const supportLink = [...container.querySelectorAll("a")].find((link) => link.textContent?.includes("Escríbenos por WhatsApp"));
    expect(supportLink?.getAttribute("href")).toContain("https://wa.me/584243104520");

    const faqButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Preguntas frecuentes"));
    if (!faqButton) throw new Error("FAQ button not found");
    await act(async () => { faqButton.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it("shows the official BCV rate, effective date and freshness on the dashboard", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse);
    await renderApp();
    await settle();

    const panel = container.querySelector(".exchange-rate-panel");
    expect(panel?.textContent).toContain("894,88760000");
    expect(panel?.textContent).toContain("noviembre de 2026");
    expect(panel?.textContent).toContain("Vigente");
    expect(panel?.textContent).toContain("Banco Central de Venezuela");
    expect(container.querySelector(".bcv-admin-panel")?.textContent).toContain("Sincronización BCV");
    expect(container.querySelector(".bcv-admin-panel")?.textContent).toContain("Sincronización exitosa");
    expect(vi.mocked(fetch).mock.calls[2]?.[1]?.cache).toBe("no-store");
  });

  it("revalidates the BCV rate when the Caracas effective date changes at midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T03:59:00.000Z")); // Friday 23:59 in Caracas.
    const fridayRate = {
      ...bcvRateResponse,
      effectiveDate: "2026-11-06",
      fetchedAt: "2026-11-07T03:58:00.000Z",
    };
    const mondayRate = {
      ...bcvRateResponse,
      effectiveDate: "2026-11-09",
      fetchedAt: "2026-11-07T04:00:00.000Z",
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(fridayRate))
      .mockResolvedValueOnce(jsonResponse(mondayRate));
    await renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("6 de noviembre");

    vi.setSystemTime(new Date("2026-11-07T04:00:00.000Z")); // Saturday 00:00 in Caracas.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    expect(vi.mocked(fetch).mock.calls[3]?.[1]?.cache).toBe("no-store");
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("9 de noviembre");
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("Vigente");
  });

  it("passes the current official BCV rate into the catalog conversion", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse)
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: "product-2",
          is_active: true,
          sku: "WATER-001",
          barcode: null,
          name: "Agua",
          description: null,
          unit: "unidad",
          price_usd: "23.8500",
        }],
        nextCursor: null,
        limit: 100,
      }));
    await renderApp();
    await settle();

    const productsButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Productos"));
    if (!productsButton) throw new Error("Products navigation button not found");
    await act(async () => { productsButton.click(); });
    await settle();

    expect(container.textContent).toContain("US$ 23,85");
    expect(container.textContent).toContain("Bs. 21.343,07");
  });

  it("opens the authenticated catalog and shows exact USD prices without inventing a VES conversion", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse({ message: "Todavía no hay una tasa BCV validada." }, 503))
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: "product-1",
          is_active: true,
          sku: "COFFEE-001",
          barcode: null,
          name: "Café",
          description: null,
          unit: "kg",
          price_usd: "23.8500",
          cost_usd: "10.0000",
        }],
        nextCursor: null,
        limit: 100,
      }));
    await renderApp();
    await settle();

    const productsButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Productos"));
    if (!productsButton) throw new Error("Products navigation button not found");
    await act(async () => { productsButton.click(); });
    await settle();

    expect(container.textContent).toContain("Catálogo");
    expect(container.textContent).toContain("Café");
    expect(container.textContent).toContain("US$ 23,85");
    expect(container.textContent).toContain("US$ 10,00");
    expect(container.textContent).toContain("No hay una tasa BCV validada");
    expect(container.textContent).not.toContain("Bs. 870,53");
    expect(vi.mocked(fetch).mock.calls[3][0]).toBe("/api/orgs/org-1/catalog?limit=100");
  });

  it("revokes the session on logout and returns to the login screen", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await renderApp();
    await settle();
    expect(container.textContent).toContain("Hola, Ana.");

    const logoutButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Cerrar sesión"));
    if (!logoutButton) throw new Error("Logout button not found");
    await act(async () => { logoutButton.click(); });
    await settle();

    expect(vi.mocked(fetch).mock.calls[3][0]).toBe("/auth/logout");
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.textContent).toContain("Has cerrado la sesión de forma segura.");
  });
});
