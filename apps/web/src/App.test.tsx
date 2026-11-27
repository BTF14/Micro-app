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
  window.sessionStorage.clear();
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

  it("returns to login and clears the BCV snapshot when an authenticated request expires", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    expect(container.textContent).toContain("Hola, Ana.");
    window.sessionStorage.setItem("micro-app:active-view", "reports");
    window.sessionStorage.setItem("micro-app:sales:draft:org-1:shift-1:warehouse-1", "{}");
    window.sessionStorage.setItem("micro-app:sales:draft:org-1:shift-2:warehouse-2", "{}");
    await act(async () => {
      window.dispatchEvent(new CustomEvent("micro-app:unauthorized"));
    });
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Tu sesión expiró. Inicia sesión nuevamente.");
    expect(container.textContent).not.toContain("Hola, Ana.");
    expect(window.sessionStorage.getItem("micro-app:active-view")).toBeNull();
    expect(window.sessionStorage.getItem("micro-app:sales:draft:org-1:shift-1:warehouse-1")).toBeNull();
    expect(window.sessionStorage.getItem("micro-app:sales:draft:org-1:shift-2:warehouse-2")).toBeNull();
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
    expect(dialog?.textContent).toContain("Es el sistema interno de gestión comercial de tu negocio: inventario, ventas y precios en dólares con conversión a bolívares según la tasa del BCV.");
    expect(dialog?.textContent).not.toContain("Varias partes todavía están en construcción.");

    const closeButton = dialog?.querySelector<HTMLButtonElement>(".help-modal-close");
    if (!closeButton) throw new Error("Close button not found");
    await act(async () => { closeButton.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    const privacyButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Privacidad"));
    if (!privacyButton) throw new Error("Privacy button not found");
    await act(async () => { privacyButton.click(); });
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Qué datos guardamos");
    const privacyDialog = container.querySelector('[role="dialog"]');
    expect(privacyDialog?.textContent).toContain("Tu nombre y correo de la cuenta de Google con la que inicias sesión, y la información del negocio que se registre en el sistema (catálogo, inventario, caja y ventas).");
    expect(privacyDialog?.textContent).toContain("Este es un aviso de privacidad básico para uso interno del negocio. Si el negocio empieza a manejar datos de clientes o el sistema se abre al público, conviene una revisión legal formal antes de ese paso.");
    expect(privacyDialog?.textContent).not.toContain("todavía en desarrollo");
    expect(privacyDialog?.textContent).not.toContain("a medida que esas funciones se habiliten");
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
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();

    const panel = container.querySelector(".exchange-rate-panel");
    expect(panel?.textContent).toContain("894,88760000");
    expect(panel?.textContent).toContain("noviembre de 2026");
    expect(panel?.textContent).toContain("Válida para hoy");
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
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("Válida para hoy");
  });

  it("passes the current official BCV rate into the catalog conversion", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse))
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
    expect(vi.mocked(fetch).mock.calls[3][0]).toBe("/api/orgs/org-1/catalog?limit=25&sort=name");
  });

  it("revokes the session on logout and returns to the login screen", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await renderApp();
    await settle();
    expect(container.textContent).toContain("Hola, Ana.");

    window.sessionStorage.setItem("micro-app:active-view", "reports");
    window.sessionStorage.setItem("micro-app:sales:draft:org-1:shift-1:warehouse-1", "{}");
    window.sessionStorage.setItem("micro-app:sales:draft:org-1:shift-2:warehouse-2", "{}");
    const logoutButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Cerrar sesión"));
    if (!logoutButton) throw new Error("Logout button not found");
    await act(async () => { logoutButton.click(); });
    await settle();

    expect(vi.mocked(fetch).mock.calls[3][0]).toBe("/auth/logout");
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.textContent).toContain("Has cerrado la sesión de forma segura.");
    expect(window.sessionStorage.getItem("micro-app:active-view")).toBeNull();
    expect(window.sessionStorage.getItem("micro-app:sales:draft:org-1:shift-1:warehouse-1")).toBeNull();
    expect(window.sessionStorage.getItem("micro-app:sales:draft:org-1:shift-2:warehouse-2")).toBeNull();
  });

  it("labels a future BCV publication as scheduled and keeps operation date separate from BCV value date", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse({
        ...bcvRateResponse,
        effectiveDate: "2026-11-09",
        operationDate: "2026-11-07",
        status: "scheduled",
      }));
    await renderApp();
    await settle();

    const panel = container.querySelector(".exchange-rate-panel");
    expect(panel?.textContent).toContain("Publicada; aún no aplicable");
    expect(panel?.textContent).toContain("Fecha de operación: 7 de noviembre de 2026");
    expect(panel?.textContent).toContain("Fecha valor BCV: 9 de noviembre de 2026");
  });

  it("revalidates the BCV rate when the document becomes visible again", async () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse))
      .mockResolvedValueOnce(jsonResponse({
        ...bcvRateResponse,
        effectiveDate: "2026-11-09",
        operationDate: "2026-11-07",
        status: "scheduled",
      }));
    await renderApp();
    await settle();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });
    await settle();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("Publicada; aún no aplicable");
    expect(container.querySelector(".exchange-rate-panel")?.textContent).toContain("9 de noviembre de 2026");
  });

});


describe("Hash navigation", () => {
 async function renderWithRole(role:string){vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({...authResponse,organizations:[{...organizations[0],role}]}));if(role==="owner"||role==="admin")vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse));vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(bcvRateResponse));await renderApp();await settle();}
 it("prioritizes an explicit #resumen hash over a stored module",async()=>{window.sessionStorage.setItem("micro-app:active-view","reports");window.history.replaceState({}, "", "/#resumen");await renderWithRole("owner");expect(container.querySelector("#reports-title")).toBeNull();expect(window.location.hash).toBe("#resumen");expect(window.sessionStorage.getItem("micro-app:active-view")).toBe("overview")});
 it("restores #reportes after authentication",async()=>{window.history.replaceState({},"","/#reportes");await renderWithRole("owner");expect(container.querySelector("#reports-title")?.textContent).toBe("Reportes");expect(window.location.hash).toBe("#reportes")});
 it("restores #ventas after authentication",async()=>{window.history.replaceState({},"","/#ventas");await renderWithRole("owner");const b=[...container.querySelectorAll("button")].find(x=>x.textContent?.includes("Ventas"));expect(b?.getAttribute("aria-current")).toBe("page");expect(window.location.hash).toBe("#ventas")});
 it("handles browser hashchange navigation",async()=>{await renderWithRole("owner");window.history.pushState({},"","/#reportes");await act(async()=>window.dispatchEvent(new HashChangeEvent("hashchange")));expect(container.querySelector("#reports-title")?.textContent).toBe("Reportes");window.history.pushState({},"","/#ventas");await act(async()=>window.dispatchEvent(new HashChangeEvent("hashchange")));expect([...container.querySelectorAll("button")].find(x=>x.textContent?.includes("Ventas"))?.getAttribute("aria-current")).toBe("page")});
 it("restores a stored module after reload when the URL hash is generic",async()=>{
  await renderWithRole("owner");
  const reports=[...container.querySelectorAll("button")].find(x=>x.textContent?.includes("Reportes"));
  await act(async()=>reports?.click());
  expect(window.sessionStorage.getItem("micro-app:active-view")).toBe("reports");
  await act(async()=>root.unmount());
  root=createRoot(container);
  window.history.replaceState({}, "", "/");
  await renderWithRole("owner");
  expect(container.querySelector("#reports-title")?.textContent).toBe("Reportes");
 });
 it("keeps an explicit overview selection across reload",async()=>{
  await renderWithRole("owner");
  const overview=[...container.querySelectorAll("a")].find(x=>x.textContent?.includes("Resumen"));
  await act(async()=>overview?.click());
  expect(window.sessionStorage.getItem("micro-app:active-view")).toBe("overview");
  await act(async()=>root.unmount()); root=createRoot(container); window.history.replaceState({}, "", "/"); await renderWithRole("owner");
  expect(container.querySelector("#reports-title")).toBeNull(); expect(window.sessionStorage.getItem("micro-app:active-view")).toBe("overview");
 });
 it("falls back to overview when the role cannot access #ventas",async()=>{window.history.replaceState({},"","/#ventas");await renderWithRole("inventory");expect(container.textContent).toContain("Hola, Ana.");expect(container.querySelector("#reports-title")).toBeNull();expect(window.location.hash).toBe("#resumen");expect(vi.mocked(fetch).mock.calls.some(call=>String(call[0]).includes("/register-shifts"))).toBe(false)});
});

describe("Reports navigation", () => {
  it("enables Reportes and navigates to its view", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Reportes"));
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);
    await act(async () => { button?.click(); });
    expect(container.querySelector("#reports-title")?.textContent).toBe("Reportes");
  });
});


describe("Resumen shortcuts and greeting", () => {
  async function renderDashboardAsRole(role: string) {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      ...authResponse,
      organizations: [{ ...organizations[0], role }],
    }));
    if (role === "owner" || role === "admin") {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse));
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
  }

  it.each(["owner", "admin"])("shows management descriptions for %s", async (role) => {
    await renderDashboardAsRole(role);
    const inventory = container.querySelector<HTMLAnchorElement>('.module-card-button[href="#inventario"]');
    const catalog = container.querySelector<HTMLAnchorElement>('.module-card-button[href="#productos"]');
    expect(inventory?.textContent).toContain("Controla existencias, recepciones y conteos por sucursal.");
    expect(catalog?.textContent).toContain("Administra el catálogo y consulta precios exactos en USD.");
  });

  it("shows read-only inventory and catalog descriptions for cashier", async () => {
    await renderDashboardAsRole("cashier");
    const inventory = container.querySelector<HTMLAnchorElement>('.module-card-button[href="#inventario"]');
    const catalog = container.querySelector<HTMLAnchorElement>('.module-card-button[href="#productos"]');
    expect(inventory?.textContent).toContain("Consulta existencias y disponibilidad por sucursal.");
    expect(catalog?.textContent).toContain("Consulta el catálogo y precios exactos en USD.");
  });

  it("shows the read-only catalog description for inventory", async () => {
    await renderDashboardAsRole("inventory");
    const catalog = container.querySelector<HTMLAnchorElement>('.module-card-button[href="#productos"]');
    expect(catalog?.textContent).toContain("Consulta el catálogo y precios exactos en USD.");
  });

  it("keeps each visible shortcut title at the start of its accessible name", async () => {
    await renderDashboardAsRole("owner");
    const shortcuts = [...container.querySelectorAll<HTMLAnchorElement>(".module-card-button")];
    expect(shortcuts.length).toBeGreaterThan(0);
    for (const shortcut of shortcuts) {
      const title = shortcut.querySelector("h3")?.textContent ?? "";
      expect(shortcut.getAttribute("aria-label")?.startsWith(`${title}: `)).toBe(true);
    }
    const caja = shortcuts.find((shortcut) => shortcut.textContent?.includes("Caja y turnos"));
    expect(caja?.getAttribute("aria-label")).toBe("Caja y turnos: abrir caja");
  });

  it("navigates to a module when a dashboard shortcut is selected", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await renderApp();
    await settle();
    const shortcut = container.querySelector<HTMLAnchorElement>(".module-card-button");
    expect(shortcut).toBeTruthy();
    await act(async () => { shortcut?.click(); });
    await settle();
    expect(window.location.hash).toBe("#ventas");
  });

  it("hides caja and ventas shortcuts for an inventory-only role", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ...authResponse, organizations: [{ ...organizations[0], role: "inventory" }] }))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    const shortcuts = [...container.querySelectorAll<HTMLAnchorElement>(".module-card-button")].map((item) => item.textContent ?? "");
    expect(shortcuts.some((label) => label.includes("Caja y turnos"))).toBe(false);
    expect(shortcuts.some((label) => label.includes("Ventas"))).toBe(false);
    expect(container.querySelector(".module-count")?.textContent).toContain("3 accesos disponibles");
  });

  it("shortens an email display name and translates the BCV inserted outcome", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ...authResponse, user: { ...user, display_name: "correo@dominio.com" } }))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    expect(container.querySelector(".welcome h1")?.textContent).toBe("Hola, correo.");
    expect(container.querySelector(".bcv-admin-outcome")?.textContent).toBe("Resultado: insertada");
  });

  it("preserves native modified-click behavior for dashboard shortcuts", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await renderApp();
    await settle();
    const shortcut = container.querySelector<HTMLAnchorElement>(".module-card-button");
    expect(shortcut?.getAttribute("href")).toBe("#ventas");
    expect(shortcut).toBeTruthy();
    const initialHash = window.location.hash;

    for (const modifiers of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...modifiers });
      const notCanceled = shortcut!.dispatchEvent(event);
      expect(notCanceled).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(window.location.hash).toBe(initialHash);
    }

    const prePreventedEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    shortcut!.addEventListener("click", (event) => event.preventDefault(), { once: true, capture: true });
    shortcut!.dispatchEvent(prePreventedEvent);
    expect(prePreventedEvent.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe(initialHash);
  });

  it.each(["older", "superseded"])("translates the BCV %s outcome in the summary", async (outcome) => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse({ ...bcvSyncStateResponse, lastOutcome: outcome }))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    const label = outcome === "older" ? "anterior descartada" : "reemplazada";
    expect(container.querySelector(".bcv-admin-outcome")?.textContent).toBe(`Resultado: ${label}`);
    expect(container.querySelector(".bcv-admin-outcome")?.textContent).not.toContain(outcome);
  });

});


describe("platform administration workspace", () => {
  it("routes a platform admin without tenant memberships directly to #plataforma", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ user, organizations: [], is_platform_admin: true }))
      .mockResolvedValueOnce(jsonResponse({ organizations: [], admins: [], audit_logs: [] }));
    window.history.replaceState({}, "", "/");
    await renderApp();
    await settle();
    expect(window.location.hash).toBe("#plataforma");
    expect(container.textContent).toContain("Administración de plataforma");
    expect(container.textContent).toContain("Crear organización");
    expect(container.textContent).not.toContain("Mi negocio");
  });

  it("does not render platform navigation for a normal tenant member", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ...authResponse, is_platform_admin: false }))
      .mockResolvedValueOnce(jsonResponse(bcvSyncStateResponse))
      .mockResolvedValueOnce(jsonResponse(bcvRateResponse));
    await renderApp();
    await settle();
    expect(container.textContent).not.toContain("Administración de plataforma");
    expect([...container.querySelectorAll("button")].some(button => button.textContent?.trim() === "Plataforma")).toBe(false);
  });
});
