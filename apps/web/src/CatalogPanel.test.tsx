// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPanel from "./CatalogPanel";

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function renderPanel(props: ComponentProps<typeof CatalogPanel>) {
  await act(async () => { root.render(<CatalogPanel {...props} />); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
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

describe("catalog panel", () => {
  it("renders exact USD and BCV VES prices and only displays costs returned by the API", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      items: [{
        id: "00000000-0000-4000-8000-000000000001",
        is_active: true,
        sku: "SKU-1",
        barcode: null,
        name: "Producto exacto",
        description: null,
        unit: "unidad",
        price_usd: "23.8500",
        cost_usd: "10.0000",
      }],
      nextCursor: null,
      limit: 100,
    }));

    await renderPanel({
      organizationId: "00000000-0000-4000-8000-000000000010",
      exchangeRate: "36.50000000",
      exchangeRateStatus: "current",
    });

    expect(container.textContent).toContain("Producto exacto");
    expect(container.textContent).toContain("US$ 23,85");
    expect(container.textContent).toContain("Bs. 870,53");
    expect(container.textContent).toContain("US$ 10,00");
    expect(container.textContent).toContain("Costo USD");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "/api/orgs/00000000-0000-4000-8000-000000000010/catalog?limit=100",
    );
  });

  it("does not convert with a stale BCV rate or render costs absent from the API response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      items: [{
        id: "00000000-0000-4000-8000-000000000002",
        is_active: true,
        sku: "SKU-2",
        barcode: null,
        name: "Producto sin costo visible",
        description: null,
        unit: "unidad",
        price_usd: "1.2500",
      }],
      nextCursor: null,
      limit: 100,
    }));

    await renderPanel({
      organizationId: "00000000-0000-4000-8000-000000000010",
      exchangeRate: "36.50000000",
      exchangeRateStatus: "stale",
    });

    expect(container.textContent).toContain("La última tasa BCV está desactualizada");
    expect(container.textContent).toContain("US$ 1,25");
    expect(container.textContent).not.toContain("Bs. 45,63");
    expect(container.textContent).not.toContain("Costo USD");
  });

  it("loads the next cursor page without replacing the products already shown", async () => {
    const cursor = "00000000-0000-4000-8000-000000000020";
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: cursor, is_active: true, sku: "SKU-1", barcode: null, name: "Primero",
          description: null, unit: "unidad", price_usd: "1.0000",
        }],
        nextCursor: cursor,
        limit: 100,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: "00000000-0000-4000-8000-000000000021", is_active: true, sku: "SKU-2",
          barcode: null, name: "Segundo", description: null, unit: "unidad", price_usd: "2.0000",
        }],
        nextCursor: null,
        limit: 100,
      }));

    await renderPanel({
      organizationId: "00000000-0000-4000-8000-000000000010",
      exchangeRate: null,
      exchangeRateStatus: "unavailable",
    });

    const loadMore = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Cargar más"));
    if (!loadMore) throw new Error("Load more button not found");
    await act(async () => { loadMore.click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(container.textContent).toContain("Primero");
    expect(container.textContent).toContain("Segundo");
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(`cursor=${cursor}`);
  });
});
