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
        quantity_mode: "integer",
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
      canManage: true,
    });

    expect(container.textContent).toContain("Producto exacto");
    expect(container.textContent).toContain("Unidad entera");
    expect(container.textContent).toContain("US$ 23,85");
    expect(container.textContent).toContain("Bs. 870,53");
    expect(container.textContent).toContain("US$ 10,00");
    expect(container.textContent).toContain("Costo USD");
    expect(container.textContent).toContain("Nuevo producto");
    expect(container.textContent).toContain("Editar");
    expect([...container.querySelectorAll("tbody tr td")].map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Producto", "Precio USD", "Equivalente VES", "Costo USD", "Estado", "Acciones",
    ]);
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
        quantity_mode: "integer",
        price_usd: "1.2500",
      }],
      nextCursor: null,
      limit: 100,
    }));

    await renderPanel({
      organizationId: "00000000-0000-4000-8000-000000000010",
      exchangeRate: "36.50000000",
      exchangeRateStatus: "stale",
      canManage: false,
    });

    expect(container.textContent).toContain("La última tasa BCV está desactualizada");
    expect(container.textContent).toContain("US$ 1,25");
    expect(container.textContent).not.toContain("Bs. 45,63");
    expect(container.textContent).not.toContain("Costo USD");
    expect(container.textContent).not.toContain("Nuevo producto");
    expect(container.textContent).not.toContain("Editar");
    expect([...container.querySelectorAll("tbody tr td")].map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Producto", "Precio USD", "Equivalente VES", "Estado",
    ]);
  });

  it("searches by text or barcode and displays USD and VES prices", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({items:[],nextCursor:null,limit:100}))
      .mockResolvedValueOnce(jsonResponse({items:[{
        id:"p1",is_active:true,sku:"SKU-FAST",barcode:"750123",name:"Café molido",description:null,unit:"bolsa",quantity_mode:"integer",price_usd:"4.2500",
      }],nextCursor:null,limit:100}));
    await renderPanel({organizationId:"00000000-0000-4000-8000-000000000010",exchangeRate:"36.50000000",exchangeRateStatus:"current",canManage:false});
    const input=container.querySelector<HTMLInputElement>("#catalog-quick-search");
    if(!input)throw new Error("Catalog search missing");
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    await act(async()=>{setter?.call(input,"750123");input.dispatchEvent(new Event("input",{bubbles:true}));});
    await act(async()=>{container.querySelector<HTMLFormElement>(".catalog-search")?.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
    expect(String(vi.mocked(fetch).mock.calls[1]?.[0])).toContain("q=750123");
    expect(container.textContent).toContain("Café molido");
    expect(container.textContent).toContain("US$ 4,25");
    expect(container.textContent).toContain("Bs. 155,13");
  });

  it("shows an explicit empty state when a catalog search has no results", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({items:[],nextCursor:null,limit:100})).mockResolvedValueOnce(jsonResponse({items:[],nextCursor:null,limit:100}));
    await renderPanel({organizationId:"00000000-0000-4000-8000-000000000010",exchangeRate:null,exchangeRateStatus:"unavailable",canManage:false});
    const input=container.querySelector<HTMLInputElement>("#catalog-quick-search");
    if(!input)throw new Error("Catalog search missing");
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    await act(async()=>{setter?.call(input,"missing");input.dispatchEvent(new Event("input",{bubbles:true}));});
    await act(async()=>{container.querySelector<HTMLFormElement>(".catalog-search")?.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
    expect(container.textContent).toContain("No se encontraron productos.");
  });

  it("loads the next cursor page without replacing the products already shown", async () => {
    const cursor = "00000000-0000-4000-8000-000000000020";
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: cursor, is_active: true, sku: "SKU-1", barcode: null, name: "Primero",
          description: null, unit: "unidad",
        quantity_mode: "integer", price_usd: "1.0000",
        }],
        nextCursor: cursor,
        limit: 100,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          id: "00000000-0000-4000-8000-000000000021", is_active: true, sku: "SKU-2",
          barcode: null, name: "Segundo", description: null, unit: "unidad",
        quantity_mode: "integer", price_usd: "2.0000",
        }],
        nextCursor: null,
        limit: 100,
      }));

    await renderPanel({
      organizationId: "00000000-0000-4000-8000-000000000010",
      exchangeRate: null,
      exchangeRateStatus: "unavailable",
      canManage: false,
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


describe("catalog CSV import", () => {
  const props: ComponentProps<typeof CatalogPanel> = {
    organizationId: "00000000-0000-4000-8000-000000000010",
    exchangeRate: null, exchangeRateStatus: "unavailable", canManage: true,
  };
  const preview = {
    delimiter: ",", canonical_hash: "a".repeat(64), can_apply: true,
    summary: { total_rows: 1, creates: 1, updates: 0, unchanged: 0, errors: 0 },
    items: [{ row: 2, sku: "CSV-NEW", action: "create", errors: [] }], errors: [],
  };
  async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
  async function openImporter() {
    await renderPanel(props);
    await act(async () => { container.querySelector<HTMLButtonElement>(".catalog-import-open")?.click(); });
  }
  async function chooseCsv(contents: string | ArrayBuffer) {
    const input = container.querySelector<HTMLInputElement>('.catalog-import input[type="file"]');
    if (!input) throw new Error("CSV file input missing");
    const file = new File([contents], "catalogo.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
  }
  async function previewCsv() {
    await act(async () => { container.querySelector<HTMLButtonElement>(".catalog-import-primary")?.click(); });
    await settle();
  }
  async function confirmCsv() {
    const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.includes("Confirmar importación"));
    await act(async () => { button?.click(); });
    await settle();
  }

  it("shows Importar CSV only when canManage is true", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await renderPanel(props);
    expect(container.querySelector(".catalog-import-open")).not.toBeNull();
    await act(async () => { root.render(<CatalogPanel {...props} canManage={false} />); });
    expect(container.querySelector(".catalog-import-open")).toBeNull();
  });

  it("rejects files larger than 256 KiB locally without calling fetch for preview", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await openImporter();
    const before = vi.mocked(fetch).mock.calls.length;
    await chooseCsv("x".repeat(262145));
    await previewCsv();
    expect(container.textContent).toContain("supera el límite de 256 KiB");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(before);
  });

  it("rejects invalid UTF-8 locally without sending a preview request", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await openImporter();
    const before = vi.mocked(fetch).mock.calls.length;
    const invalidUtf8 = new ArrayBuffer(2);
    new Uint8Array(invalidUtf8).set([0xc3, 0x28]);
    await chooseCsv(invalidUtf8);
    await previewCsv();
    expect(container.textContent).toContain("UTF-8 válido");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(before);
  });

  it("shows preview actions and row errors and disables confirmation when can_apply is false", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }))
      .mockResolvedValueOnce(jsonResponse({
        ...preview, can_apply: false,
        summary: { total_rows: 3, creates: 1, updates: 1, unchanged: 0, errors: 1 },
        items: [
          { row: 2, sku: "CSV-NEW", action: "create", errors: [] },
          { row: 3, sku: "CSV-UPDATE", action: "update", errors: [] },
          { row: 4, sku: "CSV-BAD", action: "invalid", errors: [{ row: 4, field: "price_usd", message: "El precio no es válido." }] },
        ],
        errors: [{ row: 4, field: "price_usd", message: "El precio no es válido." }],
      }));
    await openImporter();
    await chooseCsv("sku,name,price_usd\nCSV-NEW,Nuevo,1\nCSV-UPDATE,Actualizado,2\nCSV-BAD,Error,");
    await previewCsv();
    expect(container.textContent).toContain("Altas");
    expect(container.textContent).toContain("Actualizaciones");
    expect(container.textContent).toContain("Alta");
    expect(container.textContent).toContain("Actualizar");
    expect(container.textContent).toContain("Error");
    expect(container.textContent).toContain("Fila 4, Precio (USD): El precio no es válido.");
    expect([...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.includes("Confirmar importación"))?.disabled).toBe(true);
  });

  it("applies with Idempotency-Key and expected_hash and refreshes the catalog", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }))
      .mockResolvedValueOnce(jsonResponse(preview))
      .mockResolvedValueOnce(jsonResponse({ replayed: false, summary: preview.summary }))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await openImporter();
    await chooseCsv("sku,name,price_usd\nCSV-NEW,Nuevo,1.0000");
    await previewCsv();
    await confirmCsv();
    const call = vi.mocked(fetch).mock.calls[2];
    const init = call?.[1] as RequestInit;
    expect(new Headers(init.headers).get("Idempotency-Key")).toMatch(/^csv-/);
    expect(JSON.parse(String(init.body))).toMatchObject({ expected_hash: preview.canonical_hash, delimiter: "," });
    expect(vi.mocked(fetch).mock.calls[3]?.[0]).toContain("/catalog?limit=100");
    expect(container.textContent).toContain("Importación completada");
  });

  it("reuses the same Idempotency-Key after a transient apply failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }))
      .mockResolvedValueOnce(jsonResponse(preview))
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(jsonResponse({ replayed: true, summary: preview.summary }))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }));
    await openImporter();
    await chooseCsv("sku,name,price_usd\nCSV-NEW,Nuevo,1.0000");
    await previewCsv();
    await confirmCsv();
    await confirmCsv();
    const calls = vi.mocked(fetch).mock.calls;
    const first = new Headers((calls[2]?.[1] as RequestInit).headers).get("Idempotency-Key");
    const second = new Headers((calls[3]?.[1] as RequestInit).headers).get("Idempotency-Key");
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(container.textContent).toContain("no se duplicaron cambios");
  });

  it("shows structured row errors and the message from a 409 apply response", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null, limit: 100 }))
      .mockResolvedValueOnce(jsonResponse(preview))
      .mockResolvedValueOnce(jsonResponse({
        message: "El producto cambió desde la revisión.",
        errors: [{ row: 2, field: "barcode", message: "El código de barras ya está en uso." }],
      }, 409));
    await openImporter();
    await chooseCsv("sku,name,price_usd\nCSV-NEW,Nuevo,1.0000");
    await previewCsv();
    await confirmCsv();
    expect(container.textContent).toContain("El producto cambió desde la revisión.");
    expect(container.textContent).toContain("Fila 2, Código de barras: El código de barras ya está en uso.");
  });
});
