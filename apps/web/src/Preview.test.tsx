// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let container: HTMLDivElement;
let root: Root;

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
});

describe("Cloudflare Pages preview isolation", () => {
  it("does not call the production API and disables Google sign-in", async () => {
    await act(async () => { root.render(<App />); });
    expect(container.textContent).toContain("Vista previa aislada");
    expect(container.textContent).toContain("deshabilitados para proteger producción");
    expect([...container.querySelectorAll("a")].some((link) => link.textContent?.includes("Continuar con Google"))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
