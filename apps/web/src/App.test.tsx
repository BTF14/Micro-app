import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";

describe("Micro app session bootstrap", () => {
  it("checks the existing cookie session before showing protected workspace data", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Comprobando tu sesión");
    expect(html).not.toContain("Sesión activa");
    expect(html).not.toContain("Mi negocio");
  });
});
