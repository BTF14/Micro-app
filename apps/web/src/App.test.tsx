import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";

describe("Micro app dashboard shell", () => {
  it("identifies the product and its main planned modules", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("micro app");
    expect(html).toContain("Caja y ventas");
    expect(html).toContain("Inventario");
    expect(html).toContain("Productos");
    expect(html).toContain("Tasa BCV");
  });

  it("clearly states that real commercial data is not connected yet", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Sin datos comerciales conectados");
    expect(html).toContain("Aún no se guardan ventas ni productos reales.");
    expect(html).toContain('aria-disabled="true"');
  });

  it("labels the screen as a development environment", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Entorno de desarrollo");
    expect(html).toContain("Pendiente de implementación");
    expect(html).toContain("Pendiente de integración");
  });
});
