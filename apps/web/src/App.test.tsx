import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";

describe("Micro app authentication screen", () => {
  it("shows the sign-in form and a way to create an account", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Inicia sesión");
    expect(html).toContain('id="email"');
    expect(html).toContain('id="password"');
    expect(html).toContain("Crear cuenta");
  });

  it("does not present demo credentials or pretend a session exists", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("No se crean cuentas de demostración");
    expect(html).toContain("El acceso necesita que la API esté configurada");
    expect(html).not.toContain("Sesión activa");
  });
});
