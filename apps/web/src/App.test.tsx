// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = { id: "user-1", email: "ana@example.com", display_name: "Ana Pérez" };
const organizations = [{ id: "org-1", name: "Mi tienda", slug: "mi-tienda", role: "owner" }];
const authResponse = { user, organizations };

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
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(authResponse));
    await renderApp();
    await settle();

    const supportLink = [...container.querySelectorAll("a")].find((link) => link.textContent?.includes("Escríbenos por WhatsApp"));
    expect(supportLink?.getAttribute("href")).toContain("https://wa.me/584243104520");

    const faqButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Preguntas frecuentes"));
    if (!faqButton) throw new Error("FAQ button not found");
    await act(async () => { faqButton.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it("revokes the session on logout and returns to the login screen", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await renderApp();
    await settle();
    expect(container.textContent).toContain("Hola, Ana.");

    const logoutButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Cerrar sesión"));
    if (!logoutButton) throw new Error("Logout button not found");
    await act(async () => { logoutButton.click(); });
    await settle();

    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/auth/logout");
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.textContent).toContain("Has cerrado la sesión de forma segura.");
  });
});
