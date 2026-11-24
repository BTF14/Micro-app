// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function BrokenScreen(): never { throw new Error("private diagnostic detail"); }

describe("ErrorBoundary", () => {
  it("shows an accessible Spanish recovery screen without exposing the exception", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await act(async () => { root.render(createElement(ErrorBoundary, null, createElement(BrokenScreen))); });
      expect(container.querySelector('[role="alert"]')).toBeTruthy();
      expect(container.textContent).toContain("No pudimos mostrar esta pantalla");
      expect(container.textContent).not.toContain("private diagnostic detail");
      expect(container.querySelector("button")?.textContent).toContain("Volver a cargar");
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      errorSpy.mockRestore();
    }
  });
});
