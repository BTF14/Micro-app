// @vitest-environment jsdom
import { act, useEffect } from "react";
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

function setInput(name: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`Input not found: ${name}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function submitForm() {
  const form = container.querySelector("form");
  if (!form) throw new Error("Authentication form not found");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle();
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

describe("Micro app authentication flow", () => {
  it("checks the cookie session before showing protected workspace data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401));
    await renderApp();
    expect(container.textContent).toContain("Comprobando tu sesión");
    await settle();
    expect(container.textContent).toContain("Inicia sesión");
    expect(container.textContent).not.toContain("Sesión activa");
    expect(container.textContent).not.toContain("Hola, Ana");
  });

  it("submits login credentials and opens the authenticated workspace", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401))
      .mockResolvedValueOnce(jsonResponse(authResponse));
    await renderApp();
    await settle();

    setInput("email", "ana@example.com");
    setInput("password", "correct-horse-battery");
    await submitForm();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/auth/login");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({
      email: "ana@example.com",
      password: "correct-horse-battery",
    });
    expect(vi.mocked(fetch).mock.calls[1][1]?.credentials).toBe("include");
    expect(container.textContent).toContain("Hola, Ana.");
    expect(container.textContent).toContain("Mi tienda");
    expect(container.textContent).toContain("Cerrar sesión");
  });

  it("collects organization details for registration and reports API errors accessibly", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: "No hay sesión activa" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "El correo ya está registrado." }, 409));
    await renderApp();
    await settle();

    const switchButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Crear cuenta"));
    if (!switchButton) throw new Error("Registration switch not found");
    await act(async () => { switchButton.click(); });

    setInput("displayName", "Ana Pérez");
    setInput("organizationName", "Mi tienda");
    setInput("email", "ana@example.com");
    setInput("password", "a-strong-password-12");
    await submitForm();

    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/auth/register");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({
      email: "ana@example.com",
      password: "a-strong-password-12",
      displayName: "Ana Pérez",
      organizationName: "Mi tienda",
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("El correo ya está registrado.");
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
