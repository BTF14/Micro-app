// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InventoryPanel from "./InventoryPanel";

let container: HTMLDivElement;
let root: Root;

const ORG = "11111111-2222-4333-8444-555555555555";
const BRANCH_A = "22222222-3333-4444-8555-666666666666";
const BRANCH_B = "22222222-3333-4444-8555-777777777777";
const WAREHOUSE = "33333333-4444-4555-8666-777777777777";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

async function renderPanel() {
  await act(async () => { root.render(<InventoryPanel organizationId={ORG} />); });
  await flush();
  await flush();
  await flush();
}

const balance = (overrides: Record<string, unknown> = {}) => ({
  product_id: "00000000-0000-4000-8000-000000000001",
  is_active: true,
  sku: "SKU-1",
  name: "Harina",
  unit: "kg",
  price_usd: "2.0000",
  minimum_stock: "2.000",
  on_hand_quantity: "15.000",
  reserved_quantity: "2.000",
  available_quantity: "13.000",
  balance_version: "1",
  ...overrides,
});

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

describe("inventory panel", () => {
  it("loads the only branch and warehouse and renders exact quantities, showing cost only when returned", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ branches: [{ id: BRANCH_A, name: "Central", slug: "central" }] }))
      .mockResolvedValueOnce(jsonResponse({ warehouses: [{ id: WAREHOUSE, code: "main", name: "Principal", is_active: true }] }))
      .mockResolvedValueOnce(jsonResponse({
        items: [
          balance({ cost_usd: "4.2500" }),
          balance({ product_id: "00000000-0000-4000-8000-000000000002", sku: "SKU-2", name: "Azúcar", on_hand_quantity: "2.000", reserved_quantity: "0.000", available_quantity: "2.000" }),
        ],
        nextCursor: null,
        limit: 100,
      }));
    await renderPanel();

    const urls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain(`/api/orgs/${ORG}/branches`);
    expect(urls[1]).toContain(`/branches/${BRANCH_A}/warehouses`);
    expect(urls[2]).toContain(`/warehouses/${WAREHOUSE}/inventory?limit=100`);
    expect(container.textContent).toContain("Sucursal: Central");
    expect(container.textContent).toContain("Almacén: Principal");
    expect(container.textContent).toContain("Harina");
    expect(container.textContent).toContain("15");
    expect(container.textContent).toContain("13");
    expect(container.textContent).toContain("US$ 4,25");
    expect(container.textContent).toContain("Stock bajo");
    expect(container.textContent).toContain("Normal");
  });

  it("explains when the member has no branch assigned without calling other endpoints", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ branches: [] }));
    await renderPanel();
    expect(container.textContent).toContain("No tienes sucursales asignadas.");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows the API message when inventory reads are not enabled in the database", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ branches: [{ id: BRANCH_A, name: "Central", slug: "central" }] }))
      .mockResolvedValueOnce(jsonResponse({ warehouses: [{ id: WAREHOUSE, code: "main", name: "Principal", is_active: true }] }))
      .mockResolvedValueOnce(jsonResponse({ error: "INVENTORY_READ_NOT_ENABLED", message: "La lectura de inventario todavía no está habilitada en esta base de datos." }, 503));
    await renderPanel();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("todavía no está habilitada");
  });

  it("offers a branch selector only when several branches are in scope and ignores inactive warehouses", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ branches: [
        { id: BRANCH_A, name: "Central", slug: "central" },
        { id: BRANCH_B, name: "Norte", slug: "norte" },
      ] }))
      .mockResolvedValueOnce(jsonResponse({ warehouses: [{ id: WAREHOUSE, code: "old", name: "Cerrado", is_active: false }] }));
    await renderPanel();
    expect(container.querySelector('select[aria-label="Sucursal"]')).not.toBeNull();
    expect(container.textContent).toContain("todavía no tiene almacenes activos");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
