// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SalesPanel from "./SalesPanel";
import { apiRequest } from "./auth";

vi.mock("./auth", () => ({ apiRequest: vi.fn() }));
vi.mock("./QuickProductLookup", () => ({
  default: ({ onSelect }: { onSelect: (product: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onSelect({
        product_id: "00000000-0000-4000-8000-000000000001", is_active: true, sku: "A-1",
        barcode: null, name: "Producto A", unit: "unidad", price_usd: "0.0002", available_quantity: "2.000",
      })}>Agregar producto A</button>
      <button type="button" onClick={() => onSelect({
        product_id: "00000000-0000-4000-8000-000000000002", is_active: true, sku: "B-1",
        barcode: null, name: "Producto B", unit: "unidad", price_usd: "0.0002", available_quantity: "1.000",
      })}>Agregar producto B</button>
    </div>
  ),
}));

const ORG = "11111111-2222-4333-8444-555555555555";
const BRANCH = "22222222-3333-4444-8555-666666666666";
const WAREHOUSE = "33333333-4444-4555-8666-777777777777";
const shift = { id: "shift-1", branch_id: BRANCH, branch_name: "Central", register_name: "Caja 1", opened_at: "2026-11-14T14:00:00Z" };
const warehouses = [{ id: WAREHOUSE, name: "Principal", code: "main", is_active: true }];
let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
async function render(status: "current" | "stale" | "unavailable" = "current", rate: string | null = "36.50000000") {
  await act(async () => { root.render(<SalesPanel organizationId={ORG} exchangeRate={rate} exchangeRateStatus={status} onGoToRegister={vi.fn()} />); });
  await settle(); await settle();
}
function click(text: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  button.click();
}
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(apiRequest).mockReset();
  vi.stubGlobal("crypto", { ...crypto, randomUUID: vi.fn(() => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee") });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
describe("SalesPanel", () => {
  it("shows a direct action when the user has no open shift", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift: null } as never);
    await render();
    expect(container.textContent).toContain("Abre tu turno antes de vender");
    expect(container.textContent).toContain("Ir a Caja y turnos");
    expect(container.querySelector(".sales-charge-button")).toBeNull();
  });

  it("blocks checkout when the BCV rate is stale or unavailable", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never);
    await render("stale", "36.50000000");
    expect(container.textContent).toContain("No se puede completar la venta sin una tasa BCV vigente del día");
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
  });

  it("adds products without exceeding warehouse stock", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never);
    await render();
    await act(async () => { click("Agregar producto A"); click("Agregar producto A"); click("Agregar producto A"); });
    expect(container.textContent).toContain("Producto A");
    expect(container.textContent).toContain("No puedes superar la existencia disponible de Producto A.");
    expect(container.querySelector<HTMLInputElement>('[aria-label="Cantidad de Producto A"]')?.value).toBe("2.000");
  });

  it("sums rounded VES per line with @micro-app/money arithmetic", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never);
    await render();
    await act(async () => { click("Agregar producto A"); click("Agregar producto B"); });
    // Each $0.0002 line converts to Bs. 0.01; backend sums lineVes, not a converted subtotal.
    expect(container.textContent).toContain("Bs. 0,02");
  });

  it("posts the exact checkout contract with Idempotency-Key and renders a safe receipt", async () => {
    const receipt = {
      sale_number: "V-000042", created_at: "2026-11-14T15:00:00Z", currency: "USD",
      subtotal_usd: "0.0004", total_usd: "0.0004", total_ves: "0.02", bcv_rate: "36.50000000",
      lines: [
        { product_name_snapshot: "Producto A", sku_snapshot: "A-1", quantity: "1.000", unit_price_usd: "0.0002", line_total_usd: "0.0002", line_total_ves: "0.01" },
        { product_name_snapshot: "Producto B", sku_snapshot: "B-1", quantity: "1.000", unit_price_usd: "0.0002", line_total_usd: "0.0002", line_total_ves: "0.01" },
      ],
      payments: [{ method: "cash", currency: "USD", amount: "0.0004", reference: null }],
    };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ shift } as never)
      .mockResolvedValueOnce({ warehouses } as never)
      .mockResolvedValueOnce(receipt as never);
    await render();
    await act(async () => { click("Agregar producto A"); click("Agregar producto B"); });
    await act(async () => { click("Monto exacto"); });
    await act(async () => { click("Cobrar venta"); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(apiRequest).toHaveBeenCalledTimes(3);
    const [path, init] = vi.mocked(apiRequest).mock.calls[2] as unknown as [string, RequestInit];
    expect(path).toBe(`/api/orgs/${ORG}/branches/${BRANCH}/checkout`);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(JSON.parse(String(init.body))).toEqual({
      warehouse_id: WAREHOUSE,
      lines: [
        { product_id: "00000000-0000-4000-8000-000000000001", quantity: "1.000" },
        { product_id: "00000000-0000-4000-8000-000000000002", quantity: "1.000" },
      ],
      payments: [{ method: "cash", currency: "USD", amount: "0.0004", reference: null }],
    });
    expect(container.textContent).toContain("V-000042");
    expect(container.textContent).toContain("Comprobante de venta");
    expect(container.textContent).not.toContain("cost_usd");
    expect(container.textContent).not.toContain("unit_cost");
  });
});
