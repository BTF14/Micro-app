import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";

describe("Micro app starter screen", () => {
  it("clearly identifies the app and does not claim POS features are ready", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Micro app");
    expect(html).toContain("Fundamentos iniciales en construcción");
    expect(html).toContain("no se habilitarán hasta contar con API");
  });
});
