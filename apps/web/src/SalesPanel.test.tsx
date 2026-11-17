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
      <button type="button" onClick={() => onSelect({ product_id: "00000000-0000-4000-8000-000000000003", is_active: true, sku: "C-1", barcode: null, name: "Producto C", unit: "kg", price_usd: "1000.0000", available_quantity: "5.000" })}>Agregar producto C</button>
      <button type="button" onClick={() => onSelect({ product_id: "00000000-0000-4000-8000-000000000004", is_active: true, sku: "D-1", barcode: null, name: "Producto D", unit: "kg", price_usd: "10.0000", available_quantity: "0.500" })}>Agregar producto D</button>
    </div>
  ),
}));

const ORG = "11111111-2222-4333-8444-555555555555";
const BRANCH = "22222222-3333-4444-8555-666666666666";
const WAREHOUSE = "33333333-4444-4555-8666-777777777777";
const shift = { shift_id: "shift-1", branch_id: BRANCH, branch_name: "Central", register_name: "Caja 1", opened_at: "2026-11-14T14:00:00Z" };
const warehouses = [{ id: WAREHOUSE, name: "Principal", code: "main", is_active: true }];
let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
async function render(status: "current" | "stale" | "unavailable" = "current", rate: string | null = "36.50000000") {
  await act(async () => { root.render(<SalesPanel organizationId={ORG} exchangeRate={rate} exchangeRateStatus={status} onGoToRegister={vi.fn()} />); });
  await settle(); await settle();
}
function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function setSelectValue(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
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
    expect(container.textContent).toContain("El cobro se habilita cuando exista una tasa BCV vigente o una contingencia autorizada y habilitada");
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
      subtotal_usd: "0.0004", total_usd: "0.0004", total_ves: "0.02", bcv_rate: "36.50000000", fx_rate: "36.50000000", fx_source: "bcv_official", fx_receipt_label: "Tasa BCV", fx_authorization_id: null,
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
      manual_fx_acknowledged: false,
      manual_fx_acknowledged_rate: null,
    });
    expect(container.textContent).toContain("V-000042");
    expect(container.textContent).toContain("Comprobante de venta");
    expect(container.textContent).not.toContain("cost_usd");
    expect(container.textContent).not.toContain("unit_cost");
    expect(container.querySelector(".sales-workspace")).toBeNull();
    await act(async () => { click("Nueva venta"); });
    expect(container.querySelector(".sales-receipt")).toBeNull();
    expect(container.querySelector(".sales-workspace")).not.toBeNull();
    expect(container.textContent).toContain("Tu carrito está vacío");
  });

  it("formats thousands separators and accepts alphanumeric payment references and split VES payments", async () => {
    const receipt = {
      sale_number: "V-000043", created_at: "2026-11-14T15:05:00Z", currency: "VES",
      subtotal_usd: "1000.0000", total_usd: "1000.0000", total_ves: "36500.00", bcv_rate: "36.50000000", fx_rate: "36.50000000", fx_source: "bcv_official", fx_receipt_label: "Tasa BCV", fx_authorization_id: null,
      lines: [{ product_name_snapshot: "Producto C", sku_snapshot: "C-1", quantity: "1.000", unit_price_usd: "1000.0000", line_total_usd: "1000.0000", line_total_ves: "36500.00" }],
      payments: [
        { method: "mobile_payment", currency: "VES", amount: "20000.00", reference: "REF-12345" },
        { method: "cash", currency: "VES", amount: "16500.00", reference: null },
      ],
    };
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never).mockResolvedValueOnce(receipt as never);
    await render();
    await act(async () => { click("Agregar producto C"); });
    expect(container.textContent).toContain("US$ 1.000,00");
    expect(container.textContent).toContain("Bs. 36.500,00");
    const currencySelect = container.querySelector<HTMLSelectElement>(".sales-payments-heading select")!;
    await act(async () => { setSelectValue(currencySelect, "VES"); });
    await act(async () => { click("Agregar pago"); });
    const paymentRows = container.querySelectorAll(".sales-payment-row");
    const firstMethod = paymentRows[0]!.querySelector<HTMLSelectElement>("select")!;
    const firstAmount = paymentRows[0]!.querySelectorAll<HTMLInputElement>("input")[0]!;
    const firstRef = paymentRows[0]!.querySelectorAll<HTMLInputElement>("input")[1]!;
    await act(async () => { setSelectValue(firstMethod, "mobile_payment"); setInputValue(firstAmount, "20000"); setInputValue(firstRef, " REF-12345 "); });
    await act(async () => { click("Monto exacto"); });
    const chargeButton = container.querySelector<HTMLButtonElement>(".sales-charge-button")!;
    expect(chargeButton.disabled).toBe(false);
    await act(async () => { chargeButton.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const [, init] = vi.mocked(apiRequest).mock.calls[2] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).payments).toEqual([
      { method: "mobile_payment", currency: "VES", amount: "20000", reference: "REF-12345" },
      { method: "cash", currency: "VES", amount: "16500.00", reference: null },
    ]);
  });

  it("allows keyboard fractional quantities with comma or dot and blocks charging while quantity is empty", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never);
    await render();
    await act(async () => { click("Agregar producto C"); });
    const qtyInput = container.querySelector<HTMLInputElement>('[aria-label="Cantidad de Producto C"]')!;
    await act(async () => { setInputValue(qtyInput, ""); });
    await act(async () => { click("Monto exacto"); });
    expect(qtyInput.value).toBe("");
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
    await act(async () => { setInputValue(qtyInput, "0,"); });
    expect(qtyInput.value).toBe("0.");
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
    await act(async () => { setInputValue(qtyInput, "0,5"); });
    expect(qtyInput.value).toBe("0.5");
    expect(container.textContent).toContain("US$ 500,00");
    await act(async () => { qtyInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
    expect(qtyInput.value).toBe("0.500");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Restar Producto C"]')?.disabled).toBe(true);
    await act(async () => { setInputValue(qtyInput, "1."); });
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
    await act(async () => { qtyInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
    expect(qtyInput.value).toBe("1.000");
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(false);
  });

  it("caps initial fractional stock, rejects control characters in payment reference, and clears cart on branch change", async () => {
    const BRANCH_2 = "99999999-3333-4444-8555-666666666666";
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never)
      .mockResolvedValueOnce({ shift: { ...shift, branch_id: BRANCH_2, branch_name: "Norte" } } as never)
      .mockResolvedValueOnce({ warehouses: [{ id: "55555555-4444-4555-8666-777777777777", name: "Norte 1", code: "n1", is_active: true }] } as never);
    await render();
    await act(async () => { click("Agregar producto D"); });
    const qtyD = container.querySelector<HTMLInputElement>('[aria-label="Cantidad de Producto D"]')!;
    expect(qtyD.value).toBe("0.500");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Restar Producto D"]')?.disabled).toBe(true);
    await act(async () => { click("Monto exacto"); });
    const refInput = container.querySelectorAll<HTMLInputElement>(".sales-payment-row input")[1]!;
    await act(async () => { setInputValue(refInput, "REF\u0007BAD"); });
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
    await act(async () => { setInputValue(refInput, "REF-200"); });
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(false);
    await act(async () => { click("Actualizar"); });
    await settle(); await settle();
    expect(container.textContent).toContain("Tu carrito está vacío");
    expect(container.textContent).toContain("Norte");
  });

  it("reuses Idempotency-Key across retries on unchanged payload and regenerates after edit", async () => {
    let seq = 0;
    vi.stubGlobal("crypto", { ...crypto, randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`) });
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses } as never)
      .mockRejectedValueOnce(new Error("Error temporal"))
      .mockResolvedValueOnce({ sale_number: "V-000044", created_at: "2026-11-14T15:10:00Z", currency: "USD", subtotal_usd: "0.0002", total_usd: "0.0002", total_ves: "0.01", bcv_rate: "36.50000000", fx_rate: "36.50000000", fx_source: "bcv_official", fx_receipt_label: "Tasa BCV", fx_authorization_id: null, lines: [], payments: [] } as never);
    await render();
    await act(async () => { click("Agregar producto A"); });
    await act(async () => { click("Monto exacto"); });
    await act(async () => { click("Cobrar venta"); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain("Error temporal");
    await act(async () => { click("Cobrar venta"); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const firstKey = new Headers((vi.mocked(apiRequest).mock.calls[2]![1] as RequestInit).headers).get("Idempotency-Key");
    const retryKey = new Headers((vi.mocked(apiRequest).mock.calls[3]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(firstKey).toBe(retryKey);
    await act(async () => { click("Nueva venta"); });
    await act(async () => { click("Agregar producto A"); });
    await act(async () => { click("Monto exacto"); });
    vi.mocked(apiRequest).mockResolvedValueOnce({ sale_number: "V-000045", created_at: "2026-11-14T15:12:00Z", currency: "USD", subtotal_usd: "0.0002", total_usd: "0.0002", total_ves: "0.01", bcv_rate: "36.50000000", lines: [], payments: [] } as never);
    await act(async () => { click("Cobrar venta"); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const nextKey = new Headers((vi.mocked(apiRequest).mock.calls[4]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(nextKey).not.toBe(firstKey);
  });

  it("clears the cart when changing warehouses", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ shift } as never).mockResolvedValueOnce({ warehouses: [
      { id: WAREHOUSE, name: "Principal", code: "main", is_active: true },
      { id: "44444444-5555-4666-8777-888888888888", name: "Secundario", code: "sec", is_active: true },
    ] } as never);
    await render();
    const warehouseSelect = container.querySelector<HTMLSelectElement>(".sales-context select")!;
    await act(async () => { setSelectValue(warehouseSelect, WAREHOUSE); });
    await act(async () => { click("Agregar producto A"); });
    expect(container.textContent).toContain("Producto A");
    await act(async () => { setSelectValue(warehouseSelect, "44444444-5555-4666-8777-888888888888"); });
    expect(container.textContent).toContain("Tu carrito está vacío");
    expect(container.textContent).toContain("Cambiaste de almacén");
  });

  it("requires cashier disclosure and binds the acknowledgement to the displayed manual rate", async () => {
    const receipt = {
      id: "sale-manual-1", sale_number: "V-MAN-001", created_at: "2026-11-17T15:00:00Z",
      currency: "USD", subtotal_usd: "0.0002", total_usd: "0.0002", total_ves: "0.02",
      bcv_rate: null, fx_rate: "104.00000000", fx_source: "manual_contingency",
      fx_receipt_label: "Tasa manual de contingencia (no oficial BCV)",
      fx_authorization_id: "auth-1", manual_fx_acknowledged_at: "2026-11-17T15:00:00Z",
      lines: [{ product_name_snapshot: "Producto A", sku_snapshot: "A-1", quantity: "1.000", unit_price_usd: "0.0002", line_total_usd: "0.0002", line_total_ves: "0.02" }],
      payments: [{ method: "cash", currency: "USD", amount: "0.0002", reference: null }],
    };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ shift } as never)
      .mockResolvedValueOnce({ warehouses } as never)
      .mockResolvedValueOnce({
        commercial_enabled: true,
        authorization: { id: "auth-1", rate: "104.00000000", expires_at: "2026-11-17T23:00:00Z" },
      } as never)
      .mockResolvedValueOnce(receipt as never);
    await render("stale", null);
    expect(container.textContent).toContain("Tasa manual de contingencia (no oficial BCV)");
    await act(async () => { click("Agregar producto A"); });
    await act(async () => { click("Monto exacto"); });
    const charge = container.querySelector<HTMLButtonElement>(".sales-charge-button")!;
    expect(charge.disabled).toBe(true);
    const acknowledgement = container.querySelector<HTMLInputElement>(".sales-manual-fx-ack input")!;
    await act(async () => { acknowledgement.click(); });
    expect(charge.disabled).toBe(false);
    await act(async () => { charge.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const [, init] = vi.mocked(apiRequest).mock.calls[3] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      manual_fx_acknowledged: true,
      manual_fx_acknowledged_rate: "104.00000000",
    });
    expect(container.textContent).toContain("Tasa manual de contingencia (no oficial BCV)");
  });

  it("keeps manual contingency unavailable while the commercial AC-6 gate is off", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ shift } as never)
      .mockResolvedValueOnce({ warehouses } as never)
      .mockResolvedValueOnce({
        commercial_enabled: false,
        authorization: { id: "auth-1", rate: "104.00000000", expires_at: "2026-11-17T23:00:00Z" },
      } as never);
    await render("stale", null);
    expect(container.textContent).not.toContain("Tasa manual de contingencia (no oficial BCV)");
    expect(container.querySelector<HTMLButtonElement>(".sales-charge-button")?.disabled).toBe(true);
  });

});
