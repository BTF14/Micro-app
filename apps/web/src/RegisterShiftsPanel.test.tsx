// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterShiftsPanel from "./RegisterShiftsPanel";

const organizationId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const registerId = "33333333-3333-4333-8333-333333333333";
const shiftId = "44444444-4444-4444-8444-444444444444";
const branch = { id: branchId, name: "Principal", slug: "principal" };
const register = { id: registerId, name: "Caja 1", code: "C1" };
const openedShift = {
  id: shiftId, organization_id: organizationId, branch_id: branchId, register_id: registerId,
  cashier_user_id: "55555555-5555-4555-8555-555555555555",
  opened_at: "2026-11-11T10:00:00.000Z", opening_cash_usd: "20.0000", opening_cash_ves: "500.00",
};
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let activeShift: Record<string, unknown> | null;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); }

beforeEach(() => {
  activeShift = null;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (url.pathname.endsWith("/register-shifts/current") && url.pathname.includes("/branches/")) return jsonResponse({ shift: activeShift && { id: shiftId, organizationId, branchId, registerId, cashierUserId: openedShift.cashier_user_id, openedAt: openedShift.opened_at, openingCashUsd: "20.0000", openingCashVes: "500.00" } });
    if (url.pathname.endsWith("/register-shifts/current")) return jsonResponse({ shift: activeShift ? { branch_id: branchId } : null });
    if (url.pathname.endsWith("/branches")) return jsonResponse({ items: [branch] });
    if (url.pathname.endsWith("/registers")) return jsonResponse({ items: [register] });
    if (url.pathname.endsWith("/register-shifts") && method === "POST") { activeShift = openedShift; return jsonResponse({ shift: openedShift }, 201); }
    if (url.pathname.endsWith("/close") && method === "POST") { activeShift = null; return jsonResponse({ shift: {}, replayed: false }); }
    return jsonResponse({ message: "Not found" }, 404);
  }));
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

describe("Register shifts workspace", () => {
  it("loads assigned branches and registers, opens a shift, then closes it", async () => {
    await act(async () => { root.render(<RegisterShiftsPanel organizationId={organizationId} userName="Ana Pérez" />); });
    await settle();
    expect(container.textContent).toContain("Prepara tu caja");
    expect(container.textContent).toContain("Principal");

    const openButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Abrir turno");
    if (!openButton) throw new Error("Open shift button not found");
    await act(async () => { openButton.click(); });
    await settle();
    expect(container.textContent).toContain("Turno abierto");
    expect(container.textContent).toContain("$ 20,0000");

    const closeInputs = [...container.querySelectorAll<HTMLInputElement>(".register-shift-form input")];
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (closeInputs.length !== 2 || !valueSetter) throw new Error("Closing count inputs not found");
    await act(async () => {
      valueSetter.call(closeInputs[0], "21.0000");
      closeInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      valueSetter.call(closeInputs[1], "510.00");
      closeInputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    });
    const reviewButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Revisar cierre");
    if (!reviewButton) throw new Error("Review close button not found");
    await act(async () => { reviewButton.click(); });
    expect(container.textContent).toContain("no se puede editar después");
    const closeButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Confirmar cierre");
    if (!closeButton) throw new Error("Close shift button not found");
    await act(async () => { closeButton.click(); });
    await settle();
    expect(container.textContent).toContain("Sin turno abierto");
    expect(container.textContent).toContain("Turno cerrado y registrado en auditoría.");
  });

  it("shows a safe message when the API denies branch access", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ message: "Forbidden" }, 403));
    await act(async () => { root.render(<RegisterShiftsPanel organizationId={organizationId} userName="Ana Pérez" />); });
    await settle();
    expect(container.textContent).toContain("no tiene una sucursal habilitada");
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });
});
